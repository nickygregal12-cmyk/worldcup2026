-- WC26 live fix: make knockout result scoring safe to rerun.
--
-- The admin panel may save a corrected result more than once. The original
-- function added the newly calculated points to profiles on every run, which
-- could duplicate KO totals. This replacement always recalculates prediction
-- rows first, then rebuilds affected profile totals from those stored rows.

begin;

create or replace function public.calculate_ko_prediction_points(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_pred record;
  v_base_points integer;
  v_outcome_bonus integer;
  v_first_goal_points integer;
  v_total integer;
  v_breakdown jsonb;
  v_joker_mult integer;
  v_actual_winner uuid;
  v_pred_winner uuid;
begin
  -- Allow the service role and authenticated admins only.
  if auth.uid() is not null and not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and coalesce(is_admin, false) = true
  ) then
    raise exception 'Admin access required';
  end if;

  select *
  into v_match
  from public.matches
  where id = p_match_id
    and status = 'completed';

  if not found then
    return;
  end if;

  for v_pred in
    select *
    from public.ko_predictions
    where match_id = p_match_id
  loop
    v_base_points := 0;
    v_outcome_bonus := 0;
    v_first_goal_points := 0;
    v_joker_mult := case when v_pred.is_joker then 2 else 1 end;

    v_actual_winner := v_match.winner_team_id;
    v_pred_winner := case
      when v_pred.outcome_type = '90mins' then
        case
          when v_pred.home_score > v_pred.away_score then v_match.home_team_id
          when v_pred.home_score < v_pred.away_score then v_match.away_team_id
          else null
        end
      else v_pred.winner_team_id
    end;

    if v_pred_winner is not null and v_pred_winner = v_actual_winner then
      -- home_score and away_score deliberately store the result after 90
      -- minutes, matching the score users entered in the KO predictor.
      if v_pred.home_score = v_match.home_score
         and v_pred.away_score = v_match.away_score then
        v_base_points := 10;
      else
        v_base_points := 5;
      end if;

      if v_pred.outcome_type = v_match.outcome_type then
        v_outcome_bonus := case v_match.outcome_type
          when 'et' then 3
          when 'penalties' then 5
          else 0
        end;
      elsif v_match.outcome_type <> '90mins' then
        v_base_points := 3;
      end if;
    end if;

    if v_pred.first_goal_band is not null
       and v_match.first_goal_band is not null
       and v_pred.first_goal_band = v_match.first_goal_band then
      v_first_goal_points := 3;
    end if;

    v_total := (v_base_points + v_outcome_bonus + v_first_goal_points) * v_joker_mult;

    v_breakdown := jsonb_build_object(
      'base', v_base_points,
      'outcome_bonus', v_outcome_bonus,
      'first_goal', v_first_goal_points,
      'joker_multiplier', v_joker_mult,
      'total', v_total
    );

    update public.ko_predictions
    set points_awarded = v_total,
        points_breakdown = v_breakdown,
        is_locked = true
    where id = v_pred.id;
  end loop;

  -- Rebuild profile totals from the stored prediction rows. This makes the
  -- function idempotent: saving or correcting the same match cannot add the
  -- same points twice.
  update public.profiles as p
  set ko_points = totals.ko_points,
      ko_exact_scores = totals.ko_exact_scores
  from (
    select
      kp.user_id,
      coalesce(sum(kp.points_awarded), 0)::integer as ko_points,
      count(*) filter (
        where coalesce((kp.points_breakdown ->> 'base')::integer, 0) = 10
      )::integer as ko_exact_scores
    from public.ko_predictions as kp
    where kp.user_id in (
      select distinct affected.user_id
      from public.ko_predictions as affected
      where affected.match_id = p_match_id
    )
    group by kp.user_id
  ) as totals
  where p.id = totals.user_id;
end;
$$;

revoke all on function public.calculate_ko_prediction_points(uuid) from public;
revoke all on function public.calculate_ko_prediction_points(uuid) from anon;
grant execute on function public.calculate_ko_prediction_points(uuid) to authenticated;
grant execute on function public.calculate_ko_prediction_points(uuid) to service_role;

commit;
