


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."award_type" AS ENUM (
    'golden_boot',
    'golden_glove',
    'player_of_tournament'
);


ALTER TYPE "public"."award_type" OWNER TO "postgres";


CREATE TYPE "public"."bracket_type" AS ENUM (
    'main',
    'knockout_restart'
);


ALTER TYPE "public"."bracket_type" OWNER TO "postgres";


CREATE TYPE "public"."league_visibility" AS ENUM (
    'strict',
    'fair',
    'open'
);


ALTER TYPE "public"."league_visibility" OWNER TO "postgres";


CREATE TYPE "public"."match_status" AS ENUM (
    'scheduled',
    'live',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."prediction_mode" AS ENUM (
    'full',
    'group_only'
);


ALTER TYPE "public"."prediction_mode" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_joker"("p_user_id" "uuid", "p_match_id" "uuid", "p_is_confident" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE predictions
  SET is_confident = p_is_confident
  WHERE user_id = p_user_id
    AND match_id = p_match_id;
END;
$$;


ALTER FUNCTION "public"."admin_set_joker"("p_user_id" "uuid", "p_match_id" "uuid", "p_is_confident" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_jokers_remaining"("p_user_id" "uuid", "p_remaining" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE profiles
  SET jokers_group_remaining = p_remaining
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_set_jokers_remaining"("p_user_id" "uuid", "p_remaining" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_award_points"("p_award_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.recalculate_all_points_safe();
END;
$$;


ALTER FUNCTION "public"."calculate_award_points"("p_award_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_goals_prediction_points"("p_stage" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only total_goals is now scored. Lock it when this result is finalised, then safely rebuild totals.
  IF p_stage = 'total' THEN
    UPDATE tournament_predictions
    SET is_locked = true
    WHERE prediction_type = 'total_goals';
  END IF;

  PERFORM public.recalculate_all_points_safe();
END;
$$;


ALTER FUNCTION "public"."calculate_goals_prediction_points"("p_stage" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_group_position_points"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_pts INTEGER := 0;
  group_rec RECORD;
  real_pos INTEGER;
  pred_pos INTEGER;
  group_correct INTEGER;
BEGIN
  -- For each group that has all 3 matches complete
  FOR group_rec IN
    SELECT DISTINCT g.group_name
    FROM group_standings g
    WHERE (
      SELECT COUNT(*) FROM matches m
      WHERE m.group_name = g.group_name AND m.status = 'completed'
    ) >= 3
  LOOP
    group_correct := 0;
    -- Check each team's predicted vs real position
    FOR real_pos IN 1..4 LOOP
      -- Get team at this real position
      DECLARE real_team_id UUID;
      DECLARE pred_team_id UUID;
      BEGIN
        SELECT team_id INTO real_team_id FROM group_standings
        WHERE group_name = group_rec.group_name AND position = real_pos LIMIT 1;
        -- Would need predicted standings here - complex
        -- For now award points based on qualification prediction
        IF real_pos <= 2 THEN
          total_pts := total_pts + 5;
          group_correct := group_correct + 1;
        END IF;
      END;
    END LOOP;
    -- Perfect group bonus
    IF group_correct = 4 THEN
      total_pts := total_pts + 10;
    END IF;
  END LOOP;
  RETURN total_pts;
END;
$$;


ALTER FUNCTION "public"."calculate_group_position_points"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_knockout_points"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.recalculate_all_points_safe();
END;
$$;


ALTER FUNCTION "public"."calculate_knockout_points"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_ko_prediction_points"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_match RECORD;
  v_pred RECORD;
  v_base_points INTEGER;
  v_outcome_bonus INTEGER;
  v_first_goal_points INTEGER;
  v_total INTEGER;
  v_breakdown JSONB;
  v_joker_mult INTEGER;
  v_actual_winner UUID;
  v_pred_winner UUID;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id AND status = 'completed';
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_pred IN SELECT * FROM ko_predictions WHERE match_id = p_match_id LOOP
    v_base_points      := 0;
    v_outcome_bonus    := 0;
    v_first_goal_points := 0;
    v_joker_mult       := CASE WHEN v_pred.is_joker THEN 2 ELSE 1 END;

    -- Determine winners
    v_actual_winner := v_match.winner_team_id;
    v_pred_winner   := CASE
      WHEN v_pred.outcome_type = '90mins' THEN
        CASE
          WHEN v_pred.home_score > v_pred.away_score THEN v_match.home_team_id
          WHEN v_pred.home_score < v_pred.away_score THEN v_match.away_team_id
          ELSE NULL
        END
      ELSE v_pred.winner_team_id
    END;

    -- Score points if correct winner
    IF v_pred_winner IS NOT NULL AND v_pred_winner = v_actual_winner THEN
      IF v_pred.home_score = v_match.home_score AND v_pred.away_score = v_match.away_score THEN
        v_base_points := 10;
      ELSE
        v_base_points := 5;
      END IF;

      -- Outcome bonus
      IF v_pred.outcome_type = v_match.outcome_type THEN
        v_outcome_bonus := CASE v_match.outcome_type
          WHEN 'et'          THEN 3
          WHEN 'penalties'   THEN 5
          ELSE 0
        END;
      ELSIF v_match.outcome_type != '90mins' THEN
        v_base_points := 3;
      END IF;
    END IF;

    -- First goal band bonus
    IF v_pred.first_goal_band IS NOT NULL
       AND v_match.first_goal_band IS NOT NULL
       AND v_pred.first_goal_band = v_match.first_goal_band THEN
      v_first_goal_points := 3;
    END IF;

    v_total := (v_base_points + v_outcome_bonus + v_first_goal_points) * v_joker_mult;

    v_breakdown := jsonb_build_object(
      'base', v_base_points,
      'outcome_bonus', v_outcome_bonus,
      'first_goal', v_first_goal_points,
      'joker_multiplier', v_joker_mult,
      'total', v_total
    );

    UPDATE ko_predictions SET
      points_awarded = v_total,
      points_breakdown = v_breakdown,
      is_locked = TRUE
    WHERE id = v_pred.id;

    UPDATE profiles SET
      ko_points = ko_points + v_total,
      ko_exact_scores = ko_exact_scores + CASE WHEN v_base_points = 10 THEN 1 ELSE 0 END
    WHERE id = v_pred.user_id;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."calculate_ko_prediction_points"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_prediction_points"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.recalculate_all_points_safe();
END;
$$;


ALTER FUNCTION "public"."calculate_prediction_points"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_final_four_bonus"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.recalculate_all_points_safe();
END;
$$;


ALTER FUNCTION "public"."check_final_four_bonus"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_group_bonuses"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.recalculate_all_points_safe();
END;
$$;


ALTER FUNCTION "public"."check_group_bonuses"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_offline_player"("p_claim_token" "text", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  claimed_player public.offline_players%rowtype;
  group_prediction_count integer := 0;
  knockout_pick_count integer := 0;
  ko_pick record;
begin
  if p_user_id is null then
    raise exception 'Authenticated user is required';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User account not found';
  end if;

  select *
  into claimed_player
  from public.offline_players
  where claim_token = p_claim_token
    and claim_token_expires is not null
    and claim_token_expires > now()
  for update;

  if not found then
    raise exception 'This claim link is invalid, expired or has already been used';
  end if;

  insert into public.predictions (
    user_id, match_id, home_score, away_score, is_confident, bracket_type
  )
  select
    p_user_id,
    offline_prediction.match_id,
    offline_prediction.home_score,
    offline_prediction.away_score,
    coalesce(offline_prediction.is_confident, false),
    'main'
  from public.offline_predictions offline_prediction
  join public.matches match_row on match_row.id = offline_prediction.match_id
  where offline_prediction.offline_player_id = claimed_player.id
    and match_row.stage = 'group'
    and offline_prediction.home_score is not null
    and offline_prediction.away_score is not null
  on conflict (user_id, match_id, bracket_type)
  do update set
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    is_confident = excluded.is_confident;

  get diagnostics group_prediction_count = row_count;

  for ko_pick in
    select
      match_row.match_number,
      match_row.stage,
      match_row.home_team_id,
      match_row.away_team_id,
      offline_prediction.picked_team_id
    from public.offline_predictions offline_prediction
    join public.matches match_row on match_row.id = offline_prediction.match_id
    where offline_prediction.offline_player_id = claimed_player.id
      and match_row.stage in ('r32', 'r16', 'qf', 'sf', '3rd', 'final')
      and offline_prediction.picked_team_id is not null
  loop
    update public.knockout_picks
    set
      stage = ko_pick.stage,
      team_id = ko_pick.picked_team_id,
      winner_team_id = ko_pick.picked_team_id,
      home_team_id = ko_pick.home_team_id,
      away_team_id = ko_pick.away_team_id,
      bracket_version = 'fifa_v2',
      is_unlocked = false
    where user_id = p_user_id
      and match_number = ko_pick.match_number;

    if not found then
      insert into public.knockout_picks (
        user_id, match_number, stage, team_id, winner_team_id,
        home_team_id, away_team_id, bracket_version, is_unlocked
      ) values (
        p_user_id, ko_pick.match_number, ko_pick.stage,
        ko_pick.picked_team_id, ko_pick.picked_team_id,
        ko_pick.home_team_id, ko_pick.away_team_id, 'fifa_v2', false
      );
    end if;

    knockout_pick_count := knockout_pick_count + 1;
  end loop;

  insert into public.league_members (league_id, user_id)
  values (claimed_player.league_id, p_user_id)
  on conflict (league_id, user_id) do nothing;

  delete from public.offline_predictions
  where offline_player_id = claimed_player.id;

  delete from public.offline_players
  where id = claimed_player.id;

  return jsonb_build_object(
    'displayName', claimed_player.display_name,
    'leagueId', claimed_player.league_id,
    'groupPredictions', group_prediction_count,
    'knockoutPicks', knockout_pick_count
  );
end;
$$;


ALTER FUNCTION "public"."claim_offline_player"("p_claim_token" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_admin_only_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.request_is_admin() then
    raise exception 'Admin access required';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


ALTER FUNCTION "public"."enforce_admin_only_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_knockout_pick_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_user_id public.knockout_picks.user_id%type;
  bracket_lock timestamptz;
  md1_match_count integer;
  md1_group_count integer;
  was_unlocked boolean := false;
  expected_stage text;
begin
  if public.request_is_admin() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  row_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  if auth.uid() is null or row_user_id is distinct from auth.uid() then
    raise exception 'You can only change your own knockout bracket';
  end if;

  if tg_op = 'UPDATE' and (
    new.user_id is distinct from old.user_id
    or new.match_number is distinct from old.match_number
  ) then
    raise exception 'Bracket ownership and match cannot be changed';
  end if;

  if tg_op <> 'INSERT' then
    was_unlocked := coalesce(old.is_unlocked, false);
  end if;

  if tg_op <> 'DELETE' then
    if coalesce(new.is_unlocked, false) and not was_unlocked then
      raise exception 'Only an admin can unlock a bracket pick';
    end if;

    expected_stage := case
      when new.match_number between 73 and 88 then 'r32'
      when new.match_number between 89 and 96 then 'r16'
      when new.match_number between 97 and 100 then 'qf'
      when new.match_number between 101 and 102 then 'sf'
      when new.match_number = 103 then '3rd'
      when new.match_number = 104 then 'final'
      else null
    end;

    if expected_stage is null then
      raise exception 'Invalid knockout match number';
    end if;

    new.stage := expected_stage;
    new.bracket_version := 'fifa_v2';
    new.team_id := new.winner_team_id;

    if new.home_team_id is not null
      and new.away_team_id is not null
      and new.winner_team_id is distinct from new.home_team_id
      and new.winner_team_id is distinct from new.away_team_id
    then
      raise exception 'Winner must be one of the teams in the predicted match';
    end if;
  end if;

  select
    max(kickoff_time) + interval '2 hours',
    count(*),
    count(distinct group_id)
  into bracket_lock, md1_match_count, md1_group_count
  from (
    select group_id, kickoff_time,
      row_number() over (partition by group_id order by kickoff_time) as group_match_number
    from public.matches
    where stage = 'group'
      and group_id is not null
      and kickoff_time is not null
  ) md1
  where group_match_number <= 2;

  if md1_match_count < 24 or md1_group_count < 12 then
    bracket_lock := '2026-06-18T06:00:00Z'::timestamptz;
  else
    bracket_lock := coalesce(bracket_lock, '2026-06-18T06:00:00Z'::timestamptz);
  end if;

  if now() >= bracket_lock and not was_unlocked then
    raise exception 'The main knockout bracket is locked';
  end if;

  if tg_op = 'UPDATE' and was_unlocked then
    new.is_unlocked := false;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


ALTER FUNCTION "public"."enforce_knockout_pick_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_profile_managed_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  managed_key text;
  managed_keys constant text[] := array[
    'is_admin', 'admin_level', 'is_banned', 'lock_bypass',
    'display_name_locked', 'total_points', 'group_position_points',
    'bracket_points', 'ko_points', 'exact_scores', 'streak_current',
    'streak_best', 'perfect_rounds', 'prediction_accuracy',
    'total_predictions', 'ko_streak_current', 'ko_exact_scores',
    'rank_at_kickoff', 'rank_snapshot_taken_at'
  ];
begin
  if public.request_is_admin() then
    return new;
  end if;

  if auth.uid() is null or new.id is distinct from auth.uid() or new.id is distinct from old.id then
    raise exception 'You can only update your own profile';
  end if;

  foreach managed_key in array managed_keys loop
    if to_jsonb(new) -> managed_key is distinct from to_jsonb(old) -> managed_key then
      raise exception 'Profile field % is server managed', managed_key;
    end if;
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_profile_managed_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_score_prediction_write"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  row_user_id public.predictions.user_id%type;
  row_match_id public.matches.id%type;
  kickoff timestamptz;
  joker_count integer;
  new_row jsonb;
  old_row jsonb;
begin
  if public.request_is_admin() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  new_row := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  old_row := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  row_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  row_match_id := case when tg_op = 'DELETE' then old.match_id else new.match_id end;

  if auth.uid() is null or row_user_id is distinct from auth.uid() then
    raise exception 'You can only change your own predictions';
  end if;

  if tg_op = 'UPDATE' and (
    new.user_id is distinct from old.user_id
    or new.match_id is distinct from old.match_id
  ) then
    raise exception 'Prediction ownership and match cannot be changed';
  end if;

  -- Points are calculated by trusted server functions, never by the browser.
  if tg_op = 'INSERT'
    and coalesce((new_row ->> 'points_awarded')::numeric, 0) <> 0
  then
    raise exception 'Prediction points are server managed';
  end if;

  if tg_op = 'UPDATE' and (
    new_row -> 'points_awarded' is distinct from old_row -> 'points_awarded'
    or new_row -> 'points_breakdown' is distinct from old_row -> 'points_breakdown'
  ) then
    raise exception 'Prediction points are server managed';
  end if;

  select kickoff_time into kickoff
  from public.matches
  where id = row_match_id;

  if kickoff is null then
    raise exception 'Match not found';
  end if;

  if now() >= kickoff then
    raise exception 'This prediction is locked because the match has kicked off';
  end if;

  -- Serialise joker changes per user so two near-simultaneous requests cannot
  -- both pass the count check.
  perform pg_advisory_xact_lock(hashtext(row_user_id::text));

  if tg_op <> 'DELETE'
    and tg_table_name = 'predictions'
    and coalesce((new_row ->> 'is_confident')::boolean, false)
  then
    if tg_op = 'INSERT' then
      select count(*) into joker_count
      from public.predictions
      where user_id = new.user_id and is_confident = true;
    else
      select count(*) into joker_count
      from public.predictions
      where user_id = new.user_id and is_confident = true and id <> old.id;
    end if;

    if joker_count >= 8 then
      raise exception 'Maximum of 8 group-stage jokers reached';
    end if;
  end if;

  if tg_op <> 'DELETE'
    and tg_table_name = 'ko_predictions'
    and coalesce((new_row ->> 'is_joker')::boolean, false)
  then
    if tg_op = 'INSERT' then
      select count(*) into joker_count
      from public.ko_predictions
      where user_id = new.user_id and is_joker = true;
    else
      select count(*) into joker_count
      from public.ko_predictions
      where user_id = new.user_id and is_joker = true and id <> old.id;
    end if;

    if joker_count >= 5 then
      raise exception 'Maximum of 5 KO Predictor jokers reached';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


ALTER FUNCTION "public"."enforce_score_prediction_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_username TEXT;
  new_display TEXT;
BEGIN
  -- Display name: use full_name exactly as typed by user
  new_display := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Username: clean version for unique identifier
  new_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    LOWER(REGEXP_REPLACE(new_display, '[^a-zA-Z0-9_]', '', 'g'))
  );

  -- Lowercase username
  new_username := LOWER(new_username);

  -- Fallback if empty
  IF new_username = '' THEN
    new_username := 'user_' || SUBSTR(NEW.id::TEXT, 1, 8);
  END IF;
  IF new_display IS NULL OR new_display = '' THEN
    new_display := new_username;
  END IF;

  -- Make username unique if taken
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
    new_username := new_username || FLOOR(RANDOM() * 100)::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    new_username,
    new_display,  -- exactly as typed e.g. "Jimmy Anderson"
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Auto-join global league
  INSERT INTO public.league_members (league_id, user_id)
  SELECT id, NEW.id FROM public.leagues WHERE is_global = TRUE;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_correct_answers"("p_question_id" "uuid", "p_correct_answer" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Step 1: Update is_correct on all answers for this question
  UPDATE daily_answers
  SET is_correct = (answer = p_correct_answer)
  WHERE question_id = p_question_id;

  -- Step 2: Recalculate profile totals from scratch for affected users
  -- (safe to run multiple times — always reflects actual DB state)
  UPDATE profiles p
  SET
    question_correct = (
      SELECT COUNT(*) FROM daily_answers da
      WHERE da.user_id = p.id AND da.is_correct = true
    ),
    question_total = (
      SELECT COUNT(*) FROM daily_answers da
      WHERE da.user_id = p.id AND da.is_correct IS NOT NULL
    )
  WHERE p.id IN (
    SELECT DISTINCT user_id FROM daily_answers WHERE question_id = p_question_id
  );
END;
$$;


ALTER FUNCTION "public"."mark_correct_answers"("p_question_id" "uuid", "p_correct_answer" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_r32_known_slots"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  -- Canonical R32 slot map. null away = a best-third slot (left alone here).
  v_map jsonb := '[
    {"mn":73,"h":"2A","a":"2B"}, {"mn":76,"h":"1C","a":"2F"}, {"mn":77,"h":"1I","a":null},
    {"mn":74,"h":"1E","a":null}, {"mn":79,"h":"1A","a":null}, {"mn":75,"h":"1F","a":"2C"},
    {"mn":80,"h":"1L","a":null}, {"mn":78,"h":"2E","a":"2I"}, {"mn":81,"h":"1D","a":null},
    {"mn":82,"h":"1G","a":null}, {"mn":83,"h":"2K","a":"2L"}, {"mn":87,"h":"1K","a":null},
    {"mn":84,"h":"1H","a":"2J"}, {"mn":85,"h":"1B","a":null}, {"mn":88,"h":"2D","a":"2G"},
    {"mn":86,"h":"1J","a":"2H"}
  ]'::jsonb;
  v_rec jsonb;
  v_mn  int;
  v_h   text;
  v_a   text;
  v_home uuid;
  v_away uuid;
BEGIN
  FOR v_rec IN SELECT jsonb_array_elements(v_map) LOOP
    v_mn := (v_rec->>'mn')::int;
    v_h  := v_rec->>'h';
    v_a  := v_rec->>'a';

    -- Resolve home position slot (e.g. '1F' = winner of group F) from finished groups.
    v_home := NULL;
    IF v_h ~ '^[12][A-L]$' THEN
      SELECT gs.team_id INTO v_home
      FROM group_standings gs JOIN groups g ON g.id = gs.group_id
      WHERE g.name = substr(v_h, 2, 1)
        AND gs.position = substr(v_h, 1, 1)::int
        AND gs.played = 3;
    END IF;

    -- Resolve away position slot (skip best-third slots, which are null in the map).
    v_away := NULL;
    IF v_a ~ '^[12][A-L]$' THEN
      SELECT gs.team_id INTO v_away
      FROM group_standings gs JOIN groups g ON g.id = gs.group_id
      WHERE g.name = substr(v_a, 2, 1)
        AND gs.position = substr(v_a, 1, 1)::int
        AND gs.played = 3;
    END IF;

    -- Fill only: write a resolved team, keep whatever's there if we couldn't resolve.
    UPDATE matches m
    SET home_team_id = COALESCE(v_home, m.home_team_id),
        away_team_id = COALESCE(v_away, m.away_team_id)
    WHERE m.stage = 'r32' AND m.match_number = v_mn;
  END LOOP;
END;
$_$;


ALTER FUNCTION "public"."populate_r32_known_slots"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_all_league_points_safe"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_league record;
BEGIN
  FOR v_league IN SELECT id FROM leagues LOOP
    PERFORM public.recalculate_league_points_safe(v_league.id);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."recalculate_all_league_points_safe"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_all_points_safe"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user record;
BEGIN
  PERFORM public.recalculate_prediction_rows_safe();

  FOR v_user IN SELECT id FROM profiles LOOP
    PERFORM public.recalculate_user_total_points(v_user.id);
  END LOOP;

  PERFORM public.recalculate_all_league_points_safe();
END;
$$;


ALTER FUNCTION "public"."recalculate_all_points_safe"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_league_points_safe"("p_league_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_league record;
  v_member record;
  v_scoring jsonb;
  v_use_snapshot boolean;
  v_total integer;
  v_add integer;
  v_correct integer;
  v_exact integer;
  v_multiplier integer;
  v_ko_correct integer;
  v_goal_exact integer;
  v_award_points integer;
  v_actual_goals integer;
  v_user_val integer;
  v_total_matches integer;
  v_completed_matches integer;
  v_group record;
  v_sf_teams uuid[];
  v_user_sf_picks uuid[];
  v_match_count integer;
BEGIN
  SELECT * INTO v_league FROM leagues WHERE id = p_league_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_scoring := COALESCE(v_league.custom_scoring, '{}'::jsonb);
  v_use_snapshot := (v_league.lock_type = 'pre_tournament' AND v_league.snapshot_taken_at IS NOT NULL);

  v_correct := COALESCE((v_scoring->>'group_correct')::integer, 3);
  v_exact := COALESCE((v_scoring->>'group_exact')::integer, 5);
  v_multiplier := COALESCE((v_scoring->>'joker_multiplier')::integer, 2);
  v_ko_correct := COALESCE((v_scoring->>'ko_correct')::integer, 3);
  v_goal_exact := COALESCE((v_scoring->>'goals_exact')::integer, 15);

  FOR v_member IN SELECT * FROM league_members WHERE league_id = p_league_id LOOP
    v_total := 0;

    -- Match predictions.
    IF v_use_snapshot THEN
      SELECT COALESCE(SUM(public.wc26_match_prediction_points(
        lp.home_score,
        lp.away_score,
        m.home_score,
        m.away_score,
        COALESCE(lp.is_confident, false),
        v_correct,
        v_exact,
        v_multiplier
      )), 0)
      INTO v_add
      FROM league_predictions lp
      JOIN matches m ON m.id = lp.match_id
      WHERE lp.league_id = p_league_id
        AND lp.user_id = v_member.user_id
        AND m.status = 'completed';
    ELSE
      SELECT COALESCE(SUM(public.wc26_match_prediction_points(
        p.home_score,
        p.away_score,
        m.home_score,
        m.away_score,
        COALESCE(p.is_confident, false),
        v_correct,
        v_exact,
        v_multiplier
      )), 0)
      INTO v_add
      FROM predictions p
      JOIN matches m ON m.id = p.match_id
      WHERE p.user_id = v_member.user_id
        AND m.status = 'completed';
    END IF;
    v_total := v_total + COALESCE(v_add, 0);

    -- Knockout picks. Custom KO scoring is scaled by round from ko_correct.
    IF v_use_snapshot THEN
      SELECT COALESCE(SUM(ROUND(v_ko_correct * (CASE m.stage
        WHEN 'r32' THEN 5
        WHEN 'r16' THEN 8
        WHEN 'qf' THEN 12
        WHEN 'sf' THEN 16
        WHEN 'final' THEN 20
        ELSE 0
      END)::float / 3)), 0)::integer
      INTO v_add
      FROM league_knockout_picks kp
      JOIN matches m ON m.match_number = kp.match_number AND m.stage = kp.stage
      WHERE kp.league_id = p_league_id
        AND kp.user_id = v_member.user_id
        AND m.status = 'completed'
        AND kp.team_id = m.winner_team_id;
    ELSE
      SELECT COALESCE(SUM(ROUND(v_ko_correct * (CASE m.stage
        WHEN 'r32' THEN 5
        WHEN 'r16' THEN 8
        WHEN 'qf' THEN 12
        WHEN 'sf' THEN 16
        WHEN 'final' THEN 20
        ELSE 0
      END)::float / 3)), 0)::integer
      INTO v_add
      FROM knockout_picks kp
      JOIN matches m ON m.match_number = kp.match_number AND m.stage = kp.stage
      WHERE kp.user_id = v_member.user_id
        AND m.status = 'completed'
        AND kp.team_id = m.winner_team_id;
    END IF;
    v_total := v_total + COALESCE(v_add, 0);

    -- Tournament winner pick. No dedicated custom key exists, so keep 25pts standard.
    IF v_use_snapshot THEN
      SELECT COALESCE(SUM(25), 0)
      INTO v_add
      FROM league_knockout_picks kp
      JOIN matches m ON m.stage = 'final'
      WHERE kp.league_id = p_league_id
        AND kp.user_id = v_member.user_id
        AND kp.stage = 'winner'
        AND m.status = 'completed'
        AND kp.team_id = m.winner_team_id;
    ELSE
      SELECT COALESCE(SUM(25), 0)
      INTO v_add
      FROM knockout_picks kp
      JOIN matches m ON m.stage = 'final'
      WHERE kp.user_id = v_member.user_id
        AND kp.stage = 'winner'
        AND m.status = 'completed'
        AND kp.team_id = m.winner_team_id;
    END IF;
    v_total := v_total + COALESCE(v_add, 0);

    -- Awards.
    IF v_use_snapshot THEN
      SELECT COALESCE(SUM(public.wc26_award_points_for_league(lap.award_type::text, v_scoring)), 0)
      INTO v_add
      FROM league_award_predictions lap
      JOIN award_results ar ON ar.award_type::text = lap.award_type::text
      WHERE lap.league_id = p_league_id
        AND lap.user_id = v_member.user_id
        AND ar.winner_name IS NOT NULL
        AND LOWER(TRIM(lap.predicted_player_name)) = LOWER(TRIM(ar.winner_name));
    ELSE
      SELECT COALESCE(SUM(public.wc26_award_points_for_league(ap.award_type::text, v_scoring)), 0)
      INTO v_add
      FROM award_predictions ap
      JOIN award_results ar ON ar.award_type::text = ap.award_type::text
      WHERE ap.user_id = v_member.user_id
        AND ar.winner_name IS NOT NULL
        AND LOWER(TRIM(ap.predicted_player_name)) = LOWER(TRIM(ar.winner_name));
    END IF;
    v_total := v_total + COALESCE(v_add, 0);

    -- Total goals prediction only. Score only after the full tournament is complete.
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_matches, v_completed_matches
    FROM matches;

    IF v_total_matches > 0 AND v_completed_matches = v_total_matches THEN
      SELECT COALESCE(SUM(home_score + away_score), 0) INTO v_actual_goals
      FROM matches WHERE status = 'completed';

      IF v_use_snapshot THEN
        SELECT int_value INTO v_user_val
        FROM league_tournament_predictions
        WHERE league_id = p_league_id
          AND user_id = v_member.user_id
          AND prediction_type = 'total_goals'
          AND int_value IS NOT NULL
        LIMIT 1;
      ELSE
        SELECT int_value INTO v_user_val
        FROM tournament_predictions
        WHERE user_id = v_member.user_id
          AND prediction_type = 'total_goals'
          AND int_value IS NOT NULL
        LIMIT 1;
      END IF;

      IF v_user_val IS NOT NULL THEN
        IF ABS(v_user_val - v_actual_goals) = 0 THEN
          v_total := v_total + v_goal_exact;
        ELSIF ABS(v_user_val - v_actual_goals) <= 5 THEN
          v_total := v_total + 5;
        ELSIF ABS(v_user_val - v_actual_goals) <= 10 THEN
          v_total := v_total + 3;
        END IF;
      END IF;
    END IF;

    -- Group bonuses.
    FOR v_group IN
      SELECT DISTINCT group_id FROM matches WHERE stage = 'group' AND group_id IS NOT NULL
    LOOP
      v_total := v_total + public.wc26_group_bonus_points(v_member.user_id, v_group.group_id, p_league_id, v_use_snapshot, v_scoring);
    END LOOP;

    -- Final four bonus.
    SELECT ARRAY_AGG(DISTINCT team_id) INTO v_sf_teams
    FROM (
      SELECT home_team_id AS team_id FROM matches WHERE stage = 'sf' AND status = 'completed'
      UNION ALL
      SELECT away_team_id AS team_id FROM matches WHERE stage = 'sf' AND status = 'completed'
    ) t;

    IF array_length(v_sf_teams, 1) >= 4 THEN
      IF v_use_snapshot THEN
        SELECT ARRAY_AGG(team_id) INTO v_user_sf_picks
        FROM league_tournament_predictions
        WHERE league_id = p_league_id
          AND user_id = v_member.user_id
          AND prediction_type = 'final_four';
      ELSE
        SELECT ARRAY_AGG(team_id) INTO v_user_sf_picks
        FROM tournament_predictions
        WHERE user_id = v_member.user_id
          AND prediction_type = 'final_four';
      END IF;

      SELECT COUNT(*) INTO v_match_count
      FROM unnest(v_sf_teams) t
      WHERE t = ANY(v_user_sf_picks);

      IF v_match_count = 4 AND array_length(v_user_sf_picks, 1) = 4 THEN
        v_total := v_total + 20;
      END IF;
    END IF;

    UPDATE league_members
    SET league_points = v_total
    WHERE league_id = p_league_id
      AND user_id = v_member.user_id;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."recalculate_league_points_safe"("p_league_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_match_user_points"("p_match_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user record;
  v_count integer := 0;
  v_match_number integer;
  v_stage text;
BEGIN
  SELECT match_number, stage INTO v_match_number, v_stage
  FROM matches WHERE id = p_match_id;

  FOR v_user IN
    SELECT DISTINCT user_id FROM predictions WHERE match_id = p_match_id
    UNION
    SELECT DISTINCT user_id FROM knockout_picks
      WHERE match_number = v_match_number AND stage = v_stage
  LOOP
    PERFORM recalculate_user_total_points(v_user.user_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."recalculate_match_user_points"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_prediction_rows_safe"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE predictions p
  SET points_awarded = public.wc26_match_prediction_points(
    p.home_score,
    p.away_score,
    m.home_score,
    m.away_score,
    COALESCE(p.is_confident, false),
    3,
    5,
    2
  )
  FROM matches m
  WHERE p.match_id = m.id
    AND m.status = 'completed';

  UPDATE predictions p
  SET points_awarded = 0
  FROM matches m
  WHERE p.match_id = m.id
    AND m.status <> 'completed';
END;
$$;


ALTER FUNCTION "public"."recalculate_prediction_rows_safe"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_user_ko_points"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE profiles SET
    ko_points = COALESCE((
      SELECT SUM(points_awarded) FROM ko_predictions WHERE user_id = p_user_id
    ), 0)
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."recalculate_user_ko_points"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_user_stats"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_pred RECORD;
  v_match RECORD;
  v_streak INTEGER := 0;
  v_best_streak INTEGER := 0;
  v_exact_scores INTEGER := 0;
  v_total_points INTEGER := 0;
  v_is_correct BOOLEAN;
  v_is_exact BOOLEAN;
BEGIN
  -- Loop through all predictions in chronological order
  FOR v_pred IN
    SELECT p.*, m.home_score as real_home, m.away_score as real_away,
           m.status as match_status, m.kickoff_time
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.user_id = p_user_id AND m.status = 'completed'
    ORDER BY m.kickoff_time ASC
  LOOP
    v_total_points := v_total_points + COALESCE(v_pred.points_awarded, 0);

    v_is_correct := (
      (v_pred.real_home > v_pred.real_away AND v_pred.home_score > v_pred.away_score) OR
      (v_pred.real_home = v_pred.real_away AND v_pred.home_score = v_pred.away_score) OR
      (v_pred.real_home < v_pred.real_away AND v_pred.home_score < v_pred.away_score)
    );

    v_is_exact := (v_pred.real_home = v_pred.home_score AND v_pred.real_away = v_pred.away_score);

    IF v_is_correct THEN
      v_streak := v_streak + 1;
      IF v_streak > v_best_streak THEN v_best_streak := v_streak; END IF;
    ELSE
      v_streak := 0;
    END IF;

    IF v_is_exact THEN
      v_exact_scores := v_exact_scores + 1;
    END IF;
  END LOOP;

  UPDATE profiles SET
    total_points = v_total_points,
    streak_current = v_streak,
    streak_best = v_best_streak,
    exact_scores = v_exact_scores,
    perfect_rounds = v_exact_scores -- keep perfect_rounds as alias for now
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."recalculate_user_stats"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_user_total_points"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total integer := 0;
  v_add integer := 0;
  v_bracket_pts integer := 0;
  v_group_bonus integer := 0;
  v_actual_goals integer;
  v_user_val integer;
  v_total_matches integer;
  v_completed_matches integer;
  v_group record;
BEGIN
  SELECT COALESCE(SUM(public.wc26_match_prediction_points(
    p.home_score, p.away_score, m.home_score, m.away_score,
    COALESCE(p.is_confident, false), 3, 5, 2
  )), 0) INTO v_add
  FROM predictions p JOIN matches m ON m.id = p.match_id
  WHERE p.user_id = p_user_id AND m.status = 'completed';
  v_total := v_total + COALESCE(v_add, 0);

  WITH
  real_r32 AS (
    SELECT home_team_id AS team_id FROM matches WHERE stage='r32' AND home_team_id IS NOT NULL
    UNION SELECT away_team_id FROM matches WHERE stage='r32' AND away_team_id IS NOT NULL
    UNION SELECT gs.team_id FROM group_standings gs WHERE gs.played = 3 AND gs.position <= 2
  ),
  real_r16 AS (SELECT winner_team_id AS team_id FROM matches WHERE stage='r32' AND status='completed' AND winner_team_id IS NOT NULL),
  real_qf  AS (SELECT winner_team_id AS team_id FROM matches WHERE stage='r16' AND status='completed' AND winner_team_id IS NOT NULL),
  real_sf  AS (SELECT winner_team_id AS team_id FROM matches WHERE stage='qf'  AND status='completed' AND winner_team_id IS NOT NULL),
  real_fin AS (SELECT winner_team_id AS team_id FROM matches WHERE stage='sf'  AND status='completed' AND winner_team_id IS NOT NULL),
  pred_standings AS (
    SELECT m.group_id, t.id AS team_id,
      SUM(CASE WHEN m.home_team_id = t.id AND p.home_score > p.away_score THEN 3
               WHEN m.away_team_id = t.id AND p.away_score > p.home_score THEN 3
               WHEN p.home_score = p.away_score THEN 1 ELSE 0 END) AS pts,
      SUM(CASE WHEN m.home_team_id = t.id THEN p.home_score - p.away_score ELSE p.away_score - p.home_score END) AS gd,
      SUM(CASE WHEN m.home_team_id = t.id THEN p.home_score ELSE p.away_score END) AS gf
    FROM matches m
    JOIN teams t ON (t.id = m.home_team_id OR t.id = m.away_team_id)
    JOIN predictions p ON p.match_id = m.id AND p.user_id = p_user_id
    WHERE m.stage = 'group'
    GROUP BY m.group_id, t.id
  ),
  pred_ranked AS (
    SELECT group_id, team_id, pts, gd, gf,
      ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY pts DESC, gd DESC, gf DESC, team_id) AS pos
    FROM pred_standings
  ),
  pred_top2 AS (SELECT team_id FROM pred_ranked WHERE pos <= 2),
  pred_thirds AS (
    SELECT team_id, ROW_NUMBER() OVER (ORDER BY pts DESC, gd DESC, gf DESC, team_id) AS third_rank
    FROM pred_ranked WHERE pos = 3
  ),
  pred_best_thirds AS (SELECT team_id FROM pred_thirds WHERE third_rank <= 8),
  user_r32_teams AS (
    SELECT team_id FROM pred_top2
    UNION
    SELECT team_id FROM pred_best_thirds
  ),
  user_r16_teams AS (SELECT DISTINCT winner_team_id AS team_id FROM knockout_picks WHERE user_id=p_user_id AND stage='r32' AND winner_team_id IS NOT NULL),
  user_qf_teams  AS (SELECT DISTINCT winner_team_id AS team_id FROM knockout_picks WHERE user_id=p_user_id AND stage='r16' AND winner_team_id IS NOT NULL),
  user_sf_teams  AS (SELECT DISTINCT winner_team_id AS team_id FROM knockout_picks WHERE user_id=p_user_id AND stage='qf'  AND winner_team_id IS NOT NULL),
  user_fin_teams AS (SELECT DISTINCT winner_team_id AS team_id FROM knockout_picks WHERE user_id=p_user_id AND stage='sf'  AND winner_team_id IS NOT NULL)
  SELECT COALESCE(
    (SELECT COUNT(*)*5  FROM user_r32_teams  WHERE team_id IN (SELECT team_id FROM real_r32))
  + (SELECT COUNT(*)*8  FROM user_r16_teams  WHERE team_id IN (SELECT team_id FROM real_r16))
  + (SELECT COUNT(*)*12 FROM user_qf_teams   WHERE team_id IN (SELECT team_id FROM real_qf))
  + (SELECT COUNT(*)*16 FROM user_sf_teams   WHERE team_id IN (SELECT team_id FROM real_sf))
  + (SELECT COUNT(*)*20 FROM user_fin_teams  WHERE team_id IN (SELECT team_id FROM real_fin))
  , 0) INTO v_bracket_pts;
  v_total := v_total + v_bracket_pts;

  SELECT COALESCE(SUM(25), 0) INTO v_add
  FROM knockout_picks kp JOIN matches m ON m.stage='final'
  WHERE kp.user_id=p_user_id AND kp.stage='final' AND m.status='completed' AND kp.winner_team_id=m.winner_team_id;
  v_total := v_total + COALESCE(v_add, 0);

  SELECT COALESCE(SUM(public.wc26_award_points(ap.award_type::text)), 0) INTO v_add
  FROM award_predictions ap JOIN award_results ar ON ar.award_type::text=ap.award_type::text
  WHERE ap.user_id=p_user_id AND ar.winner_name IS NOT NULL
    AND LOWER(TRIM(ap.predicted_player_name))=LOWER(TRIM(ar.winner_name));
  v_total := v_total + COALESCE(v_add, 0);

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status='completed')
  INTO v_total_matches, v_completed_matches FROM matches;
  IF v_total_matches > 0 AND v_completed_matches = v_total_matches THEN
    SELECT COALESCE(SUM(home_score+away_score),0) INTO v_actual_goals FROM matches WHERE status='completed';
    SELECT int_value INTO v_user_val FROM tournament_predictions
    WHERE user_id=p_user_id AND prediction_type='total_goals' AND int_value IS NOT NULL LIMIT 1;
    IF v_user_val IS NOT NULL THEN
      IF    ABS(v_user_val-v_actual_goals)=0  THEN v_total := v_total+15;
      ELSIF ABS(v_user_val-v_actual_goals)<=5 THEN v_total := v_total+5;
      ELSIF ABS(v_user_val-v_actual_goals)<=10 THEN v_total := v_total+3;
      END IF;
    END IF;
  END IF;

  v_group_bonus := 0;
  FOR v_group IN SELECT DISTINCT group_id FROM matches WHERE stage='group' AND group_id IS NOT NULL
  LOOP
    v_group_bonus := v_group_bonus + public.wc26_group_bonus_points(p_user_id, v_group.group_id, NULL, false, '{}'::jsonb);
  END LOOP;
  v_total := v_total + v_group_bonus;

  UPDATE profiles SET
    total_points=v_total, group_position_points=v_group_bonus, bracket_points=v_bracket_pts,
    exact_scores=(SELECT COALESCE(COUNT(*),0) FROM predictions p JOIN matches m ON m.id=p.match_id
      WHERE p.user_id=p_user_id AND m.status='completed'
        AND p.home_score=m.home_score AND p.away_score=m.away_score)
  WHERE id=p_user_id;

  UPDATE league_members SET league_points = v_total WHERE user_id = p_user_id;

  PERFORM public.update_user_streak_and_accuracy(p_user_id);
END;
$$;


ALTER FUNCTION "public"."recalculate_user_total_points"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(auth.role(), '') = 'service_role'
    or (auth.role() is null and session_user in ('postgres', 'supabase_admin'))
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and is_admin = true
    );
$$;


ALTER FUNCTION "public"."request_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."snapshot_all_ranks"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Global rank snapshot
  with ranked as (
    select id,
      row_number() over (order by total_points desc, id) as rank
    from profiles
    where is_banned = false or is_banned is null
  )
  update profiles p
  set rank_at_kickoff = r.rank,
      rank_snapshot_taken_at = now()
  from ranked r
  where p.id = r.id;

  -- Per-league rank snapshot
  with league_ranked as (
    select id,
      row_number() over (partition by league_id order by league_points desc, id) as rank
    from league_members
  )
  update league_members lm
  set rank_snapshot = lr.rank
  from league_ranked lr
  where lm.id = lr.id;
end;
$$;


ALTER FUNCTION "public"."snapshot_all_ranks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."snapshot_user_ranks"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Calculate current rank for each user and store it
  UPDATE profiles p
  SET 
    rank_at_kickoff = r.rank,
    rank_snapshot_taken_at = now()
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC) as rank
    FROM profiles
    WHERE total_points > 0 OR rank_at_kickoff IS NOT NULL
  ) r
  WHERE p.id = r.id;
END;
$$;


ALTER FUNCTION "public"."snapshot_user_ranks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak"("p_user_id" "uuid", "p_correct" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current INTEGER;
  v_best INTEGER;
BEGIN
  SELECT streak_current, streak_best INTO v_current, v_best
    FROM profiles WHERE id = p_user_id;

  IF p_correct THEN
    v_current := COALESCE(v_current, 0) + 1;
    IF v_current > COALESCE(v_best, 0) THEN
      v_best := v_current;
    END IF;
  ELSE
    v_current := 0;
  END IF;

  UPDATE profiles
    SET streak_current = v_current, streak_best = v_best
    WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_streak"("p_user_id" "uuid", "p_correct" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak_and_accuracy"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_streak_current integer := 0;
  v_streak_best integer := 0;
  v_correct integer := 0;
  v_total integer := 0;
  v_accuracy integer := 0;
  v_pred record;
  v_running_streak integer := 0;
BEGIN
  -- Walk all completed match predictions in kickoff order
  FOR v_pred IN
    SELECT
      p.home_score AS pred_home,
      p.away_score AS pred_away,
      m.home_score AS act_home,
      m.away_score AS act_away
    FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE p.user_id = p_user_id
      AND m.status = 'completed'
      AND p.home_score IS NOT NULL
      AND p.away_score IS NOT NULL
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL
    ORDER BY m.kickoff_time ASC
  LOOP
    v_total := v_total + 1;

    DECLARE
      v_pred_result text;
      v_act_result text;
    BEGIN
      v_pred_result := CASE
        WHEN v_pred.pred_home > v_pred.pred_away THEN 'H'
        WHEN v_pred.pred_home < v_pred.pred_away THEN 'A'
        ELSE 'D'
      END;
      v_act_result := CASE
        WHEN v_pred.act_home > v_pred.act_away THEN 'H'
        WHEN v_pred.act_home < v_pred.act_away THEN 'A'
        ELSE 'D'
      END;

      IF v_pred_result = v_act_result THEN
        v_correct := v_correct + 1;
        v_running_streak := v_running_streak + 1;
        IF v_running_streak > v_streak_best THEN
          v_streak_best := v_running_streak;
        END IF;
      ELSE
        v_running_streak := 0;
      END IF;
    END;
  END LOOP;

  v_streak_current := v_running_streak;
  v_accuracy := CASE WHEN v_total > 0 THEN ROUND((v_correct::numeric / v_total) * 100) ELSE 0 END;

  UPDATE profiles
  SET
    streak_current = v_streak_current,
    streak_best = GREATEST(COALESCE(streak_best, 0), v_streak_best),
    prediction_accuracy = v_accuracy
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_streak_and_accuracy"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wc26_award_points"("p_award_type" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE p_award_type::text
    WHEN 'golden_boot' THEN 15
    WHEN 'golden_glove' THEN 10
    WHEN 'player_of_tournament' THEN 10
    ELSE 0
  END;
$$;


ALTER FUNCTION "public"."wc26_award_points"("p_award_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wc26_award_points_for_league"("p_award_type" "text", "p_scoring" "jsonb") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE p_award_type::text
    WHEN 'golden_boot' THEN COALESCE((p_scoring->>'golden_boot')::integer, 15)
    WHEN 'golden_glove' THEN COALESCE((p_scoring->>'golden_glove')::integer, 10)
    WHEN 'player_of_tournament' THEN COALESCE((p_scoring->>'pott')::integer, 10)
    ELSE 0
  END;
$$;


ALTER FUNCTION "public"."wc26_award_points_for_league"("p_award_type" "text", "p_scoring" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wc26_group_bonus_points"("p_user_id" "uuid", "p_group_id" "uuid", "p_league_id" "uuid", "p_use_snapshot" boolean, "p_scoring" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_pos integer;
  v_actual_team_id uuid;
  v_pred_team_id uuid;
  v_correct_positions integer := 0;
  v_position_points integer := COALESCE((p_scoring->>'group_position')::integer, 2);
  v_perfect_points integer := COALESCE((p_scoring->>'perfect_group')::integer, 5);
  v_group_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM matches
    WHERE group_id = p_group_id AND stage = 'group' AND status <> 'completed'
  ) THEN RETURN 0; END IF;

  SELECT name INTO v_group_name FROM groups WHERE id = p_group_id;

  FOR v_pos IN 1..4 LOOP
    SELECT team_id INTO v_actual_team_id
    FROM (
      SELECT t.id AS team_id,
        SUM(CASE WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 3
                 WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 3
                 WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) AS pts,
        SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score - m.away_score ELSE m.away_score - m.home_score END) AS gd,
        SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score ELSE m.away_score END) AS gf
      FROM teams t
      JOIN group_teams gt ON gt.team_id = t.id AND gt.group_id = p_group_id
      JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
        AND m.group_id = p_group_id AND m.status = 'completed'
      GROUP BY t.id
      ORDER BY pts DESC, gd DESC, gf DESC, t.id
      LIMIT 1 OFFSET (v_pos - 1)
    ) actual;

    IF p_use_snapshot THEN
      SELECT team_id INTO v_pred_team_id
      FROM (
        SELECT t.id AS team_id,
          SUM(CASE WHEN m.home_team_id = t.id AND lp.home_score > lp.away_score THEN 3
                   WHEN m.away_team_id = t.id AND lp.away_score > lp.home_score THEN 3
                   WHEN lp.home_score = lp.away_score THEN 1 ELSE 0 END) AS pts,
          SUM(CASE WHEN m.home_team_id = t.id THEN lp.home_score - lp.away_score ELSE lp.away_score - lp.home_score END) AS gd,
          SUM(CASE WHEN m.home_team_id = t.id THEN lp.home_score ELSE lp.away_score END) AS gf
        FROM teams t
        JOIN group_teams gt ON gt.team_id = t.id AND gt.group_id = p_group_id
        JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.group_id = p_group_id
        JOIN league_predictions lp ON lp.match_id = m.id AND lp.user_id = p_user_id AND lp.league_id = p_league_id
        GROUP BY t.id
        ORDER BY pts DESC, gd DESC, gf DESC, t.id
        LIMIT 1 OFFSET (v_pos - 1)
      ) predicted;
    ELSE
      SELECT team_id INTO v_pred_team_id
      FROM (
        SELECT t.id AS team_id,
          SUM(CASE WHEN m.home_team_id = t.id AND p.home_score > p.away_score THEN 3
                   WHEN m.away_team_id = t.id AND p.away_score > p.home_score THEN 3
                   WHEN p.home_score = p.away_score THEN 1 ELSE 0 END) AS pts,
          SUM(CASE WHEN m.home_team_id = t.id THEN p.home_score - p.away_score ELSE p.away_score - p.home_score END) AS gd,
          SUM(CASE WHEN m.home_team_id = t.id THEN p.home_score ELSE p.away_score END) AS gf
        FROM teams t
        JOIN group_teams gt ON gt.team_id = t.id AND gt.group_id = p_group_id
        JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.group_id = p_group_id
        JOIN predictions p ON p.match_id = m.id AND p.user_id = p_user_id
        GROUP BY t.id
        ORDER BY pts DESC, gd DESC, gf DESC, t.id
        LIMIT 1 OFFSET (v_pos - 1)
      ) predicted;
    END IF;

    IF v_actual_team_id IS NOT NULL AND v_actual_team_id = v_pred_team_id THEN
      v_correct_positions := v_correct_positions + 1;
    END IF;

    -- Write breakdown to predicted_group_positions
    IF NOT p_use_snapshot AND v_pred_team_id IS NOT NULL THEN
      INSERT INTO predicted_group_positions (user_id, team_id, group_name, predicted_position, actual_position, points_awarded)
      VALUES (
        p_user_id, v_pred_team_id, v_group_name, v_pos, v_pos,
        CASE WHEN v_actual_team_id IS NOT NULL AND v_actual_team_id = v_pred_team_id THEN v_position_points ELSE 0 END
      )
      ON CONFLICT (user_id, team_id, group_name)
      DO UPDATE SET
        predicted_position = EXCLUDED.predicted_position,
        actual_position = EXCLUDED.actual_position,
        points_awarded = EXCLUDED.points_awarded,
        updated_at = now();
    END IF;
  END LOOP;

  RETURN (v_correct_positions * v_position_points) +
         CASE WHEN v_correct_positions = 4 THEN v_perfect_points ELSE 0 END;
END;
$$;


ALTER FUNCTION "public"."wc26_group_bonus_points"("p_user_id" "uuid", "p_group_id" "uuid", "p_league_id" "uuid", "p_use_snapshot" boolean, "p_scoring" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wc26_match_prediction_points"("p_pred_home" integer, "p_pred_away" integer, "p_actual_home" integer, "p_actual_away" integer, "p_joker" boolean DEFAULT false, "p_correct_points" integer DEFAULT 3, "p_exact_points" integer DEFAULT 5, "p_joker_multiplier" integer DEFAULT 2) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v_pred_result text;
  v_actual_result text;
  v_base integer := 0;
BEGIN
  IF p_pred_home IS NULL OR p_pred_away IS NULL OR p_actual_home IS NULL OR p_actual_away IS NULL THEN
    RETURN 0;
  END IF;

  v_pred_result := CASE WHEN p_pred_home > p_pred_away THEN 'H' WHEN p_pred_home < p_pred_away THEN 'A' ELSE 'D' END;
  v_actual_result := CASE WHEN p_actual_home > p_actual_away THEN 'H' WHEN p_actual_home < p_actual_away THEN 'A' ELSE 'D' END;

  IF v_pred_result <> v_actual_result THEN
    RETURN 0;
  END IF;

  v_base := p_correct_points;
  IF p_pred_home = p_actual_home AND p_pred_away = p_actual_away THEN
    v_base := p_exact_points;
  END IF;

  IF COALESCE(p_joker, false) THEN
    RETURN v_base * p_joker_multiplier;
  END IF;

  RETURN v_base;
END;
$$;


ALTER FUNCTION "public"."wc26_match_prediction_points"("p_pred_home" integer, "p_pred_away" integer, "p_actual_home" integer, "p_actual_away" integer, "p_joker" boolean, "p_correct_points" integer, "p_exact_points" integer, "p_joker_multiplier" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_table" "text",
    "target_id" "uuid",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."award_predictions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "award_type" "public"."award_type" NOT NULL,
    "bracket_type" "public"."bracket_type" DEFAULT 'main'::"public"."bracket_type",
    "predicted_player_name" "text" NOT NULL,
    "predicted_team_id" "uuid",
    "points_awarded" integer DEFAULT 0,
    "is_correct" boolean,
    "is_locked" boolean DEFAULT false,
    "submitted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."award_predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."award_results" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "award_type" "public"."award_type" NOT NULL,
    "winner_name" "text",
    "winner_team_id" "uuid",
    "goals_scored" integer,
    "finalized" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."award_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badge_definitions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."badge_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "answer" "text" NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "now"(),
    "is_correct" boolean
);


ALTER TABLE "public"."daily_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "type" "text" NOT NULL,
    "options" "jsonb",
    "scheduled_date" "date" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "correct_answer" "text",
    CONSTRAINT "daily_questions_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'live'::"text", 'expired'::"text"]))),
    CONSTRAINT "daily_questions_type_check" CHECK (("type" = ANY (ARRAY['yes_no'::"text", 'multiple_choice'::"text", 'number'::"text"])))
);


ALTER TABLE "public"."daily_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_standings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "played" integer DEFAULT 0,
    "won" integer DEFAULT 0,
    "drawn" integer DEFAULT 0,
    "lost" integer DEFAULT 0,
    "goals_for" integer DEFAULT 0,
    "goals_against" integer DEFAULT 0,
    "goal_difference" integer GENERATED ALWAYS AS (("goals_for" - "goals_against")) STORED,
    "points" integer DEFAULT 0,
    "position" integer,
    "qualified" boolean,
    "qualification_type" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."group_standings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL
);


ALTER TABLE "public"."group_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character(1) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."h2h_challenges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "challenger_id" "uuid" NOT NULL,
    "challenged_id" "uuid" NOT NULL,
    "league_id" "uuid",
    "match_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "challenger_points" integer DEFAULT 0,
    "challenged_points" integer DEFAULT 0,
    "winner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."h2h_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knockout_picks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "stage" "text" NOT NULL,
    "team_id" "uuid",
    "is_joker" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "match_number" integer,
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "winner_team_id" "uuid",
    "result_type" "text" DEFAULT 'normal'::"text",
    "bracket_version" "text" DEFAULT 'legacy_v1'::"text",
    "is_unlocked" boolean DEFAULT false
);


ALTER TABLE "public"."knockout_picks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ko_leaderboard_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "rank" integer,
    "snapshot_type" "text" DEFAULT 'previous'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ko_leaderboard_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ko_league_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ko_league_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ko_leagues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "invite_code" character(6) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "is_global" boolean DEFAULT false,
    "member_count" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ko_leagues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ko_predictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "match_id" "uuid" NOT NULL,
    "home_score" integer,
    "away_score" integer,
    "outcome_type" "text" DEFAULT '90mins'::"text",
    "winner_team_id" "uuid",
    "first_goal_band" "text",
    "first_goal_scorer" "text",
    "is_joker" boolean DEFAULT false,
    "points_awarded" integer DEFAULT 0,
    "points_breakdown" "jsonb",
    "bracket_type" "text" DEFAULT 'main'::"text",
    "is_locked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ko_predictions_first_goal_band_check" CHECK (("first_goal_band" = ANY (ARRAY['1-15'::"text", '16-30'::"text", '31-45'::"text", '46-60'::"text", '61-75'::"text", '76-90'::"text", 'et'::"text", 'no_goals'::"text"]))),
    CONSTRAINT "ko_predictions_outcome_type_check" CHECK (("outcome_type" = ANY (ARRAY['90mins'::"text", 'et'::"text", 'penalties'::"text"])))
);


ALTER TABLE "public"."ko_predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leaderboard_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "rank" integer,
    "snapshot_type" "text" DEFAULT 'previous'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."leaderboard_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_award_predictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_prediction_id" "uuid",
    "award_type" "text" NOT NULL,
    "bracket_type" "text" DEFAULT 'main'::"text",
    "predicted_player_name" "text",
    "predicted_team_id" "uuid",
    "points_awarded" integer DEFAULT 0,
    "is_correct" boolean,
    "is_locked" boolean DEFAULT true,
    "submitted_at" timestamp with time zone,
    "committed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."league_award_predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_knockout_picks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_pick_id" "uuid",
    "stage" "text",
    "team_id" "uuid",
    "is_joker" boolean DEFAULT false,
    "match_number" integer NOT NULL,
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "winner_team_id" "uuid",
    "result_type" "text",
    "committed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."league_knockout_picks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bracket_type" "public"."bracket_type" DEFAULT 'main'::"public"."bracket_type",
    "total_points" integer DEFAULT 0,
    "rank" integer,
    "previous_rank" integer,
    "rank_change" integer GENERATED ALWAYS AS (
CASE
    WHEN ("previous_rank" IS NULL) THEN 0
    ELSE ("previous_rank" - "rank")
END) STORED,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "league_points" integer DEFAULT 0,
    "rank_snapshot" integer
);


ALTER TABLE "public"."league_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_predictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid",
    "user_id" "uuid",
    "match_id" "uuid",
    "home_score" integer,
    "away_score" integer,
    "is_confident" boolean DEFAULT false,
    "picked_team_id" "uuid",
    "committed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."league_predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_tournament_predictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_prediction_id" "uuid",
    "prediction_type" "text" NOT NULL,
    "int_value" integer,
    "team_id" "uuid",
    "is_locked" boolean DEFAULT true,
    "source_created_at" timestamp with time zone,
    "source_updated_at" timestamp with time zone,
    "committed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."league_tournament_predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "invite_code" character(6) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "visibility_rule" "public"."league_visibility" DEFAULT 'fair'::"public"."league_visibility",
    "is_global" boolean DEFAULT false,
    "is_knockout_restart" boolean DEFAULT false,
    "parent_league_id" "uuid",
    "visibility_locked" boolean DEFAULT false,
    "member_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "scoring_preset" "text" DEFAULT 'standard'::"text",
    "custom_scoring" "jsonb",
    "lock_type" "text" DEFAULT 'rolling'::"text",
    "snapshot_taken_at" timestamp with time zone,
    CONSTRAINT "leagues_lock_type_check" CHECK (("lock_type" = ANY (ARRAY['rolling'::"text", 'pre_tournament'::"text"])))
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "player_name" "text",
    "event_type" "text" NOT NULL,
    "minute" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."match_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_reactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "league_id" "uuid" NOT NULL,
    "reaction" "text",
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "match_reactions_comment_check" CHECK (("char_length"("comment") <= 280))
);


ALTER TABLE "public"."match_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "match_number" integer NOT NULL,
    "stage" "text" NOT NULL,
    "group_id" "uuid",
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "home_team_placeholder" "text",
    "away_team_placeholder" "text",
    "venue_id" "uuid",
    "kickoff_time" timestamp with time zone NOT NULL,
    "status" "public"."match_status" DEFAULT 'scheduled'::"public"."match_status",
    "home_score" integer,
    "away_score" integer,
    "home_score_aet" integer,
    "away_score_aet" integer,
    "home_score_pens" integer,
    "away_score_pens" integer,
    "winner_team_id" "uuid",
    "external_match_id" "text",
    "api_synced_at" timestamp with time zone,
    "use_manual_override" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "outcome_type" "text" DEFAULT '90mins'::"text",
    "first_goal_band" "text",
    "aet_home_score" integer,
    "aet_away_score" integer,
    "live_minute" integer,
    "injury_time" integer,
    CONSTRAINT "matches_first_goal_band_check" CHECK (("first_goal_band" = ANY (ARRAY['1-15'::"text", '16-30'::"text", '31-45'::"text", '46-60'::"text", '61-75'::"text", '76-90'::"text", 'et'::"text", 'no_goals'::"text"]))),
    CONSTRAINT "matches_outcome_type_check" CHECK (("outcome_type" = ANY (ARRAY['90mins'::"text", 'et'::"text", 'penalties'::"text"])))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offline_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "league_id" "uuid",
    "display_name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "claim_token" "text",
    "claim_token_expires" timestamp with time zone,
    "league_points" integer DEFAULT 0
);


ALTER TABLE "public"."offline_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offline_predictions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offline_player_id" "uuid",
    "match_id" "uuid",
    "home_score" integer,
    "away_score" integer,
    "is_confident" boolean DEFAULT false,
    "points_awarded" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "picked_team_id" "uuid"
);


ALTER TABLE "public"."offline_predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "team_id" "uuid",
    "position" "text",
    "shirt_number" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."predicted_group_positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "team_id" "uuid",
    "group_name" "text" NOT NULL,
    "predicted_position" integer NOT NULL,
    "actual_position" integer,
    "points_awarded" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."predicted_group_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."predictions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "match_id" "uuid" NOT NULL,
    "bracket_type" "public"."bracket_type" DEFAULT 'main'::"public"."bracket_type",
    "home_score" integer NOT NULL,
    "away_score" integer NOT NULL,
    "is_confident" boolean DEFAULT false,
    "points_result" integer DEFAULT 0,
    "points_score" integer DEFAULT 0,
    "points_confident_bonus" integer DEFAULT 0,
    "points_total" integer DEFAULT 0,
    "is_locked" boolean DEFAULT false,
    "is_scored" boolean DEFAULT false,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "group_position_bonus" integer DEFAULT 0,
    "points_awarded" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "is_admin" boolean DEFAULT false,
    "is_guest" boolean DEFAULT false,
    "prediction_mode" "public"."prediction_mode" DEFAULT 'full'::"public"."prediction_mode",
    "dark_mode" boolean DEFAULT false,
    "total_points" integer DEFAULT 0,
    "global_rank" integer,
    "streak_current" integer DEFAULT 0,
    "streak_best" integer DEFAULT 0,
    "perfect_rounds" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "jokers_group_remaining" integer DEFAULT 8,
    "jokers_knockout_remaining" integer DEFAULT 3,
    "is_banned" boolean DEFAULT false,
    "final_four_bonus" integer DEFAULT 0,
    "goals_prediction_bonus" integer DEFAULT 0,
    "exact_scores" integer DEFAULT 0,
    "show_future_predictions" boolean DEFAULT false,
    "avatar_emoji" "text" DEFAULT '⚽'::"text",
    "prediction_accuracy" integer DEFAULT 0,
    "ko_points" integer DEFAULT 0,
    "ko_jokers_remaining" integer DEFAULT 5,
    "ko_streak_current" integer DEFAULT 0,
    "ko_streak_best" integer DEFAULT 0,
    "ko_exact_scores" integer DEFAULT 0,
    "ko_prediction_accuracy" integer DEFAULT 0,
    "knockout_picks_count" integer DEFAULT 0,
    "awards_done" integer DEFAULT 0,
    "admin_message" "text",
    "admin_message_read" boolean DEFAULT true,
    "group_position_points" integer DEFAULT 0,
    "is_offline" boolean DEFAULT false,
    "offline_league_id" "uuid",
    "admin_level" "text",
    "total_predictions" integer DEFAULT 0,
    "last_seen_at" timestamp with time zone,
    "push_enabled" boolean DEFAULT true,
    "question_streak" integer DEFAULT 0,
    "question_streak_updated" "date",
    "question_last_answered" "date",
    "question_correct" integer DEFAULT 0,
    "question_total" integer DEFAULT 0,
    "rank_at_kickoff" integer,
    "rank_snapshot_taken_at" timestamp with time zone,
    "lock_bypass" boolean DEFAULT false,
    "display_name_locked" boolean DEFAULT false,
    "bracket_points" integer DEFAULT 0
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qualifier_predictions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "bracket_type" "public"."bracket_type" DEFAULT 'main'::"public"."bracket_type",
    "first_place_team_id" "uuid",
    "second_place_team_id" "uuid",
    "third_place_advances" boolean DEFAULT false,
    "points_awarded" integer DEFAULT 0,
    "is_scored" boolean DEFAULT false,
    "submitted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qualifier_predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."r32_third_place_allocations" (
    "qualified_groups" "text" NOT NULL,
    "slot_1a" "text",
    "slot_1b" "text",
    "slot_1d" "text",
    "slot_1e" "text",
    "slot_1g" "text",
    "slot_1i" "text",
    "slot_1k" "text",
    "slot_1l" "text"
);


ALTER TABLE "public"."r32_third_place_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "short_code" character(3) NOT NULL,
    "flag_emoji" "text",
    "confederation" "text" NOT NULL,
    "fifa_ranking" integer,
    "is_host" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_predictions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "prediction_type" "text" NOT NULL,
    "int_value" integer,
    "team_id" "uuid",
    "is_locked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_scorers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_name" "text" NOT NULL,
    "player_id" integer,
    "team_name" "text",
    "team_flag" "text",
    "goals" integer DEFAULT 0,
    "assists" integer DEFAULT 0,
    "penalties" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tournament_scorers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_code" "text" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venues" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "country" "text" NOT NULL,
    "capacity" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_spotlights" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "week_number" integer NOT NULL,
    "matchday" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "league_id" "uuid",
    "points_this_round" integer NOT NULL,
    "correct_predictions" integer NOT NULL,
    "perfect_scores" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weekly_spotlights" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."award_predictions"
    ADD CONSTRAINT "award_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."award_predictions"
    ADD CONSTRAINT "award_predictions_user_id_award_type_bracket_type_key" UNIQUE ("user_id", "award_type", "bracket_type");



ALTER TABLE ONLY "public"."award_results"
    ADD CONSTRAINT "award_results_award_type_key" UNIQUE ("award_type");



ALTER TABLE ONLY "public"."award_results"
    ADD CONSTRAINT "award_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badge_definitions"
    ADD CONSTRAINT "badge_definitions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."badge_definitions"
    ADD CONSTRAINT "badge_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_answers"
    ADD CONSTRAINT "daily_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_answers"
    ADD CONSTRAINT "daily_answers_question_id_user_id_key" UNIQUE ("question_id", "user_id");



ALTER TABLE ONLY "public"."daily_questions"
    ADD CONSTRAINT "daily_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_questions"
    ADD CONSTRAINT "daily_questions_scheduled_date_key" UNIQUE ("scheduled_date");



ALTER TABLE ONLY "public"."group_standings"
    ADD CONSTRAINT "group_standings_group_id_team_id_key" UNIQUE ("group_id", "team_id");



ALTER TABLE ONLY "public"."group_standings"
    ADD CONSTRAINT "group_standings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_teams"
    ADD CONSTRAINT "group_teams_group_id_team_id_key" UNIQUE ("group_id", "team_id");



ALTER TABLE ONLY "public"."group_teams"
    ADD CONSTRAINT "group_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."h2h_challenges"
    ADD CONSTRAINT "h2h_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knockout_picks"
    ADD CONSTRAINT "knockout_picks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knockout_picks"
    ADD CONSTRAINT "knockout_picks_user_match_unique" UNIQUE ("user_id", "match_number");



ALTER TABLE ONLY "public"."ko_leaderboard_snapshots"
    ADD CONSTRAINT "ko_leaderboard_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ko_league_members"
    ADD CONSTRAINT "ko_league_members_league_id_user_id_key" UNIQUE ("league_id", "user_id");



ALTER TABLE ONLY "public"."ko_league_members"
    ADD CONSTRAINT "ko_league_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ko_leagues"
    ADD CONSTRAINT "ko_leagues_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."ko_leagues"
    ADD CONSTRAINT "ko_leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ko_predictions"
    ADD CONSTRAINT "ko_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ko_predictions"
    ADD CONSTRAINT "ko_predictions_user_id_match_id_bracket_type_key" UNIQUE ("user_id", "match_id", "bracket_type");



ALTER TABLE ONLY "public"."leaderboard_snapshots"
    ADD CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_award_predictions"
    ADD CONSTRAINT "league_award_predictions_league_id_user_id_award_type_brack_key" UNIQUE ("league_id", "user_id", "award_type", "bracket_type");



ALTER TABLE ONLY "public"."league_award_predictions"
    ADD CONSTRAINT "league_award_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_knockout_picks"
    ADD CONSTRAINT "league_knockout_picks_league_id_user_id_match_number_key" UNIQUE ("league_id", "user_id", "match_number");



ALTER TABLE ONLY "public"."league_knockout_picks"
    ADD CONSTRAINT "league_knockout_picks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_members"
    ADD CONSTRAINT "league_members_league_id_user_id_bracket_type_key" UNIQUE ("league_id", "user_id", "bracket_type");



ALTER TABLE ONLY "public"."league_members"
    ADD CONSTRAINT "league_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_predictions"
    ADD CONSTRAINT "league_predictions_league_id_user_id_match_id_key" UNIQUE ("league_id", "user_id", "match_id");



ALTER TABLE ONLY "public"."league_predictions"
    ADD CONSTRAINT "league_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_tournament_predictions"
    ADD CONSTRAINT "league_tournament_predictions_league_id_user_id_prediction__key" UNIQUE ("league_id", "user_id", "prediction_type", "team_id");



ALTER TABLE ONLY "public"."league_tournament_predictions"
    ADD CONSTRAINT "league_tournament_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_reactions"
    ADD CONSTRAINT "match_reactions_match_id_user_id_league_id_key" UNIQUE ("match_id", "user_id", "league_id");



ALTER TABLE ONLY "public"."match_reactions"
    ADD CONSTRAINT "match_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_match_number_key" UNIQUE ("match_number");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offline_players"
    ADD CONSTRAINT "offline_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offline_predictions"
    ADD CONSTRAINT "offline_predictions_offline_player_id_match_id_key" UNIQUE ("offline_player_id", "match_id");



ALTER TABLE ONLY "public"."offline_predictions"
    ADD CONSTRAINT "offline_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predicted_group_positions"
    ADD CONSTRAINT "predicted_group_positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predicted_group_positions"
    ADD CONSTRAINT "predicted_group_positions_user_id_team_id_group_name_key" UNIQUE ("user_id", "team_id", "group_name");



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_user_id_match_id_bracket_type_key" UNIQUE ("user_id", "match_id", "bracket_type");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."qualifier_predictions"
    ADD CONSTRAINT "qualifier_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qualifier_predictions"
    ADD CONSTRAINT "qualifier_predictions_user_id_group_id_bracket_type_key" UNIQUE ("user_id", "group_id", "bracket_type");



ALTER TABLE ONLY "public"."r32_third_place_allocations"
    ADD CONSTRAINT "r32_third_place_allocations_pkey" PRIMARY KEY ("qualified_groups");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_predictions"
    ADD CONSTRAINT "tournament_predictions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_scorers"
    ADD CONSTRAINT "tournament_scorers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_code_key" UNIQUE ("user_id", "badge_code");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_spotlights"
    ADD CONSTRAINT "weekly_spotlights_pkey" PRIMARY KEY ("id");



CREATE INDEX "daily_answers_question_id_idx" ON "public"."daily_answers" USING "btree" ("question_id");



CREATE INDEX "daily_answers_user_id_idx" ON "public"."daily_answers" USING "btree" ("user_id");



CREATE INDEX "idx_group_standings_group" ON "public"."group_standings" USING "btree" ("group_id");



CREATE INDEX "idx_ko_league_members_league" ON "public"."ko_league_members" USING "btree" ("league_id");



CREATE INDEX "idx_ko_league_members_user" ON "public"."ko_league_members" USING "btree" ("user_id");



CREATE INDEX "idx_ko_predictions_match" ON "public"."ko_predictions" USING "btree" ("match_id");



CREATE INDEX "idx_ko_predictions_user" ON "public"."ko_predictions" USING "btree" ("user_id");



CREATE INDEX "idx_league_members_league_id" ON "public"."league_members" USING "btree" ("league_id");



CREATE INDEX "idx_league_members_user_id" ON "public"."league_members" USING "btree" ("user_id");



CREATE INDEX "idx_match_reactions_match" ON "public"."match_reactions" USING "btree" ("match_id");



CREATE INDEX "idx_matches_kickoff" ON "public"."matches" USING "btree" ("kickoff_time");



CREATE INDEX "idx_matches_stage" ON "public"."matches" USING "btree" ("stage");



CREATE INDEX "idx_matches_status" ON "public"."matches" USING "btree" ("status");



CREATE INDEX "idx_predictions_bracket" ON "public"."predictions" USING "btree" ("bracket_type");



CREATE INDEX "idx_predictions_match_id" ON "public"."predictions" USING "btree" ("match_id");



CREATE INDEX "idx_predictions_user_id" ON "public"."predictions" USING "btree" ("user_id");



CREATE INDEX "knockout_picks_match_number_idx" ON "public"."knockout_picks" USING "btree" ("match_number", "stage");



CREATE INDEX "knockout_picks_user_id_idx" ON "public"."knockout_picks" USING "btree" ("user_id");



CREATE INDEX "league_award_predictions_league_idx" ON "public"."league_award_predictions" USING "btree" ("league_id");



CREATE INDEX "league_award_predictions_user_idx" ON "public"."league_award_predictions" USING "btree" ("user_id");



CREATE INDEX "league_knockout_picks_league_idx" ON "public"."league_knockout_picks" USING "btree" ("league_id");



CREATE INDEX "league_knockout_picks_user_idx" ON "public"."league_knockout_picks" USING "btree" ("user_id");



CREATE INDEX "league_members_league_id_idx" ON "public"."league_members" USING "btree" ("league_id");



CREATE INDEX "league_members_user_id_idx" ON "public"."league_members" USING "btree" ("user_id");



CREATE INDEX "league_tournament_predictions_league_idx" ON "public"."league_tournament_predictions" USING "btree" ("league_id");



CREATE INDEX "league_tournament_predictions_user_idx" ON "public"."league_tournament_predictions" USING "btree" ("user_id");



CREATE INDEX "match_reactions_user_id_idx" ON "public"."match_reactions" USING "btree" ("user_id");



CREATE INDEX "matches_group_id_idx" ON "public"."matches" USING "btree" ("group_id");



CREATE INDEX "matches_status_idx" ON "public"."matches" USING "btree" ("status");



CREATE INDEX "offline_players_claim_token_idx" ON "public"."offline_players" USING "btree" ("claim_token");



CREATE INDEX "predictions_match_id_idx" ON "public"."predictions" USING "btree" ("match_id");



CREATE INDEX "predictions_user_id_idx" ON "public"."predictions" USING "btree" ("user_id");



CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "tournament_predictions_goals_unique" ON "public"."tournament_predictions" USING "btree" ("user_id", "prediction_type") WHERE ("team_id" IS NULL);



CREATE OR REPLACE TRIGGER "knockout_picks_server_lock" BEFORE INSERT OR DELETE OR UPDATE ON "public"."knockout_picks" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_knockout_pick_write"();



CREATE OR REPLACE TRIGGER "ko_predictions_server_lock" BEFORE INSERT OR DELETE OR UPDATE ON "public"."ko_predictions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_score_prediction_write"();



CREATE OR REPLACE TRIGGER "matches_admin_write_lock" BEFORE INSERT OR DELETE OR UPDATE ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_admin_only_write"();



CREATE OR REPLACE TRIGGER "predictions_server_lock" BEFORE INSERT OR DELETE OR UPDATE ON "public"."predictions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_score_prediction_write"();



CREATE OR REPLACE TRIGGER "profiles_managed_fields_lock" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_profile_managed_fields"();



CREATE OR REPLACE TRIGGER "update_ko_leagues_updated_at" BEFORE UPDATE ON "public"."ko_leagues" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ko_predictions_updated_at" BEFORE UPDATE ON "public"."ko_predictions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_leagues_updated_at" BEFORE UPDATE ON "public"."leagues" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_matches_updated_at" BEFORE UPDATE ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."award_predictions"
    ADD CONSTRAINT "award_predictions_predicted_team_id_fkey" FOREIGN KEY ("predicted_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."award_predictions"
    ADD CONSTRAINT "award_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."award_results"
    ADD CONSTRAINT "award_results_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."daily_answers"
    ADD CONSTRAINT "daily_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."daily_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_answers"
    ADD CONSTRAINT "daily_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_questions"
    ADD CONSTRAINT "daily_questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."group_standings"
    ADD CONSTRAINT "group_standings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_standings"
    ADD CONSTRAINT "group_standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_teams"
    ADD CONSTRAINT "group_teams_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_teams"
    ADD CONSTRAINT "group_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."h2h_challenges"
    ADD CONSTRAINT "h2h_challenges_challenged_id_fkey" FOREIGN KEY ("challenged_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."h2h_challenges"
    ADD CONSTRAINT "h2h_challenges_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."h2h_challenges"
    ADD CONSTRAINT "h2h_challenges_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id");



ALTER TABLE ONLY "public"."h2h_challenges"
    ADD CONSTRAINT "h2h_challenges_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id");



ALTER TABLE ONLY "public"."h2h_challenges"
    ADD CONSTRAINT "h2h_challenges_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."knockout_picks"
    ADD CONSTRAINT "knockout_picks_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."knockout_picks"
    ADD CONSTRAINT "knockout_picks_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."knockout_picks"
    ADD CONSTRAINT "knockout_picks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."knockout_picks"
    ADD CONSTRAINT "knockout_picks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knockout_picks"
    ADD CONSTRAINT "knockout_picks_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."ko_leaderboard_snapshots"
    ADD CONSTRAINT "ko_leaderboard_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ko_league_members"
    ADD CONSTRAINT "ko_league_members_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."ko_leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ko_league_members"
    ADD CONSTRAINT "ko_league_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ko_leagues"
    ADD CONSTRAINT "ko_leagues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ko_predictions"
    ADD CONSTRAINT "ko_predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ko_predictions"
    ADD CONSTRAINT "ko_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ko_predictions"
    ADD CONSTRAINT "ko_predictions_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."leaderboard_snapshots"
    ADD CONSTRAINT "leaderboard_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."league_award_predictions"
    ADD CONSTRAINT "league_award_predictions_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_award_predictions"
    ADD CONSTRAINT "league_award_predictions_predicted_team_id_fkey" FOREIGN KEY ("predicted_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."league_award_predictions"
    ADD CONSTRAINT "league_award_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_knockout_picks"
    ADD CONSTRAINT "league_knockout_picks_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."league_knockout_picks"
    ADD CONSTRAINT "league_knockout_picks_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."league_knockout_picks"
    ADD CONSTRAINT "league_knockout_picks_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_knockout_picks"
    ADD CONSTRAINT "league_knockout_picks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."league_knockout_picks"
    ADD CONSTRAINT "league_knockout_picks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_knockout_picks"
    ADD CONSTRAINT "league_knockout_picks_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."league_members"
    ADD CONSTRAINT "league_members_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_members"
    ADD CONSTRAINT "league_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_predictions"
    ADD CONSTRAINT "league_predictions_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_predictions"
    ADD CONSTRAINT "league_predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_predictions"
    ADD CONSTRAINT "league_predictions_picked_team_id_fkey" FOREIGN KEY ("picked_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."league_predictions"
    ADD CONSTRAINT "league_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_tournament_predictions"
    ADD CONSTRAINT "league_tournament_predictions_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."league_tournament_predictions"
    ADD CONSTRAINT "league_tournament_predictions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."league_tournament_predictions"
    ADD CONSTRAINT "league_tournament_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_parent_league_id_fkey" FOREIGN KEY ("parent_league_id") REFERENCES "public"."leagues"("id");



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."match_reactions"
    ADD CONSTRAINT "match_reactions_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_reactions"
    ADD CONSTRAINT "match_reactions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_reactions"
    ADD CONSTRAINT "match_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."offline_players"
    ADD CONSTRAINT "offline_players_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."offline_players"
    ADD CONSTRAINT "offline_players_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_players"
    ADD CONSTRAINT "offline_players_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_predictions"
    ADD CONSTRAINT "offline_predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id");



ALTER TABLE ONLY "public"."offline_predictions"
    ADD CONSTRAINT "offline_predictions_offline_player_id_fkey" FOREIGN KEY ("offline_player_id") REFERENCES "public"."offline_players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_predictions"
    ADD CONSTRAINT "offline_predictions_picked_team_id_fkey" FOREIGN KEY ("picked_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."predicted_group_positions"
    ADD CONSTRAINT "predicted_group_positions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."predicted_group_positions"
    ADD CONSTRAINT "predicted_group_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_offline_league_id_fkey" FOREIGN KEY ("offline_league_id") REFERENCES "public"."leagues"("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qualifier_predictions"
    ADD CONSTRAINT "qualifier_predictions_first_place_team_id_fkey" FOREIGN KEY ("first_place_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."qualifier_predictions"
    ADD CONSTRAINT "qualifier_predictions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qualifier_predictions"
    ADD CONSTRAINT "qualifier_predictions_second_place_team_id_fkey" FOREIGN KEY ("second_place_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."qualifier_predictions"
    ADD CONSTRAINT "qualifier_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tournament_predictions"
    ADD CONSTRAINT "tournament_predictions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."tournament_predictions"
    ADD CONSTRAINT "tournament_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_code_fkey" FOREIGN KEY ("badge_code") REFERENCES "public"."badge_definitions"("code");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_spotlights"
    ADD CONSTRAINT "weekly_spotlights_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id");



ALTER TABLE ONLY "public"."weekly_spotlights"
    ADD CONSTRAINT "weekly_spotlights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can delete offline profiles" ON "public"."profiles" FOR DELETE USING ((("is_offline" = true) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."is_admin" = true) OR ("p"."admin_level" = 'league_admin'::"text")))))));



CREATE POLICY "Admin can insert offline profiles" ON "public"."profiles" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."is_admin" = true)))));



CREATE POLICY "Admin can manage offline players" ON "public"."offline_players" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = 'league_admin'::"text"))))));



CREATE POLICY "Admin can manage offline predictions" ON "public"."offline_predictions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = 'league_admin'::"text"))))));



CREATE POLICY "Admin can update offline profiles" ON "public"."profiles" FOR UPDATE USING ((("is_offline" = true) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."is_admin" = true) OR ("p"."admin_level" = 'league_admin'::"text")))))));



CREATE POLICY "Admins can delete league members" ON "public"."league_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = 'league_admin'::"text"))))));



CREATE POLICY "Admins can delete leagues" ON "public"."leagues" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = 'league_admin'::"text"))))));



CREATE POLICY "Admins can insert app settings" ON "public"."app_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can insert audit log" ON "public"."admin_audit_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = ANY (ARRAY['super_admin'::"text", 'league_admin'::"text"])))))));



CREATE POLICY "Admins can insert league members" ON "public"."league_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can insert leagues" ON "public"."leagues" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can insert matches" ON "public"."matches" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage all award predictions" ON "public"."award_predictions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage all ko predictions" ON "public"."ko_predictions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage knockout picks" ON "public"."knockout_picks" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage ko league members" ON "public"."ko_league_members" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage ko leagues" ON "public"."ko_leagues" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage league predictions" ON "public"."league_predictions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = 'league_admin'::"text"))))));



CREATE POLICY "Admins can manage predictions" ON "public"."predictions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage tournament predictions" ON "public"."tournament_predictions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can read all profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Admins can read audit log" ON "public"."admin_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = ANY (ARRAY['super_admin'::"text", 'league_admin'::"text"])))))));



CREATE POLICY "Admins can update all profiles" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."is_admin" = true))))));



CREATE POLICY "Admins can update app settings" ON "public"."app_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update league members" ON "public"."league_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = 'league_admin'::"text"))))));



CREATE POLICY "Admins can update leagues" ON "public"."leagues" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_admin" = true) OR ("profiles"."admin_level" = 'league_admin'::"text"))))));



CREATE POLICY "Admins can update matches" ON "public"."matches" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can write award results" ON "public"."award_results" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Anyone can read award results" ON "public"."award_results" FOR SELECT USING (true);



CREATE POLICY "Anyone can read ko league members" ON "public"."ko_league_members" FOR SELECT USING (true);



CREATE POLICY "Anyone can read ko leagues" ON "public"."ko_leagues" FOR SELECT USING (true);



CREATE POLICY "Anyone can read ko snapshots" ON "public"."ko_leaderboard_snapshots" FOR SELECT USING (true);



CREATE POLICY "Anyone can read offline players by token" ON "public"."offline_players" FOR SELECT USING (true);



CREATE POLICY "Anyone can read scorers" ON "public"."tournament_scorers" FOR SELECT USING (true);



CREATE POLICY "Anyone can read snapshots" ON "public"."leaderboard_snapshots" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create ko leagues" ON "public"."ko_leagues" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Authenticated users can create leagues" ON "public"."leagues" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Award predictions viewable by all" ON "public"."award_predictions" FOR SELECT USING (true);



CREATE POLICY "Badges are publicly viewable" ON "public"."user_badges" FOR SELECT USING (true);



CREATE POLICY "Banned users cannot read predictions" ON "public"."predictions" FOR SELECT USING ((NOT (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_banned" = true))))));



CREATE POLICY "Creators can delete their ko leagues" ON "public"."ko_leagues" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Creators can update their ko leagues" ON "public"."ko_leagues" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Group standings are publicly viewable" ON "public"."group_standings" FOR SELECT USING (true);



CREATE POLICY "Group teams are publicly viewable" ON "public"."group_teams" FOR SELECT USING (true);



CREATE POLICY "League creators can remove ko members" ON "public"."ko_league_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."ko_leagues"
  WHERE (("ko_leagues"."id" = "ko_league_members"."league_id") AND ("ko_leagues"."created_by" = "auth"."uid"())))));



CREATE POLICY "League creators can update their league" ON "public"."leagues" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "League members are viewable" ON "public"."league_members" FOR SELECT USING (true);



CREATE POLICY "League members can read frozen award predictions" ON "public"."league_award_predictions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."league_members" "lm"
  WHERE (("lm"."league_id" = "league_award_predictions"."league_id") AND ("lm"."user_id" = "auth"."uid"())))));



CREATE POLICY "League members can read frozen knockout picks" ON "public"."league_knockout_picks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."league_members" "lm"
  WHERE (("lm"."league_id" = "league_knockout_picks"."league_id") AND ("lm"."user_id" = "auth"."uid"())))));



CREATE POLICY "League members can read frozen tournament predictions" ON "public"."league_tournament_predictions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."league_members" "lm"
  WHERE (("lm"."league_id" = "league_tournament_predictions"."league_id") AND ("lm"."user_id" = "auth"."uid"())))));



CREATE POLICY "League members can view predictions" ON "public"."predictions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "predictions"."user_id") AND ("profiles"."show_future_predictions" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "predictions"."match_id") AND ("m"."kickoff_time" <= "now"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."matches" "m1"
     JOIN "public"."matches" "m2" ON ((("m2"."group_id" = "m1"."group_id") AND ("m2"."id" <> "m1"."id") AND ("m2"."kickoff_time" <= "now"()))))
  WHERE ("m1"."id" = "predictions"."match_id")))));



CREATE POLICY "Leagues are publicly viewable" ON "public"."leagues" FOR SELECT USING (true);



CREATE POLICY "Members can view league predictions" ON "public"."league_predictions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."league_members"
  WHERE (("league_members"."league_id" = "league_predictions"."league_id") AND ("league_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public read app settings" ON "public"."app_settings" FOR SELECT USING (true);



CREATE POLICY "Public read award results" ON "public"."award_results" FOR SELECT USING (true);



CREATE POLICY "Public read badges" ON "public"."badge_definitions" FOR SELECT USING (true);



CREATE POLICY "Public read group_teams" ON "public"."group_teams" FOR SELECT USING (true);



CREATE POLICY "Public read groups" ON "public"."groups" FOR SELECT USING (true);



CREATE POLICY "Public read knockout picks" ON "public"."knockout_picks" FOR SELECT USING (true);



CREATE POLICY "Public read match events" ON "public"."match_events" FOR SELECT USING (true);



CREATE POLICY "Public read matches" ON "public"."matches" FOR SELECT USING (true);



CREATE POLICY "Public read players" ON "public"."players" FOR SELECT USING (true);



CREATE POLICY "Public read positions" ON "public"."predicted_group_positions" FOR SELECT USING (true);



CREATE POLICY "Public read r32 allocations" ON "public"."r32_third_place_allocations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read standings" ON "public"."group_standings" FOR SELECT USING (true);



CREATE POLICY "Public read teams" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Public read tournament predictions" ON "public"."tournament_predictions" FOR SELECT USING (true);



CREATE POLICY "Public read venues" ON "public"."venues" FOR SELECT USING (true);



CREATE POLICY "Reactions viewable by league members" ON "public"."match_reactions" FOR SELECT USING (true);



CREATE POLICY "Service role can manage app settings" ON "public"."app_settings" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage scorers" ON "public"."tournament_scorers" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can read all subscriptions" ON "public"."push_subscriptions" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can join ko leagues" ON "public"."ko_league_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join leagues" ON "public"."league_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave ko leagues" ON "public"."ko_league_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave leagues" ON "public"."league_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own positions" ON "public"."predicted_group_positions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own reactions" ON "public"."match_reactions" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read offline predictions" ON "public"."offline_predictions" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users manage own tournament predictions" ON "public"."tournament_predictions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."award_predictions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "award_predictions_delete_own" ON "public"."award_predictions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "award_predictions_insert_before_kickoff" ON "public"."award_predictions" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("now"() < '2026-06-11 19:00:00+00'::timestamp with time zone)));



CREATE POLICY "award_predictions_select_own" ON "public"."award_predictions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "award_predictions_update_before_kickoff" ON "public"."award_predictions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND ("now"() < '2026-06-11 19:00:00+00'::timestamp with time zone)));



ALTER TABLE "public"."award_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badge_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_answers_insert" ON "public"."daily_answers" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "daily_answers_select" ON "public"."daily_answers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "daily_answers_update" ON "public"."daily_answers" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."daily_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_questions_admin_all" ON "public"."daily_questions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "daily_questions_users_select" ON "public"."daily_questions" FOR SELECT TO "authenticated" USING ((("status" = ANY (ARRAY['live'::"text", 'expired'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))));



ALTER TABLE "public"."group_standings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."h2h_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knockout_picks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "knockout_picks_delete_own" ON "public"."knockout_picks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "knockout_picks_insert_before_lock" ON "public"."knockout_picks" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ("now"() < '2026-06-18 06:00:00+00'::timestamp with time zone)));



CREATE POLICY "knockout_picks_select_own" ON "public"."knockout_picks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "knockout_picks_update_before_lock" ON "public"."knockout_picks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND ("now"() < '2026-06-18 06:00:00+00'::timestamp with time zone)));



ALTER TABLE "public"."ko_leaderboard_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ko_league_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ko_leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ko_predictions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ko_predictions_delete_own" ON "public"."ko_predictions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "ko_predictions_insert_before_kickoff" ON "public"."ko_predictions" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "ko_predictions"."match_id") AND ("m"."kickoff_time" > "now"()))))));



CREATE POLICY "ko_predictions_select_own" ON "public"."ko_predictions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "ko_predictions_update_before_kickoff" ON "public"."ko_predictions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "ko_predictions"."match_id") AND ("m"."kickoff_time" > "now"()))))));



ALTER TABLE "public"."leaderboard_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_award_predictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_knockout_picks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_predictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."league_tournament_predictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offline_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offline_predictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."predicted_group_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."predictions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "predictions_delete_own" ON "public"."predictions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "predictions_insert_group_lock" ON "public"."predictions" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."lock_bypass" = true)))) OR (NOT (EXISTS ( SELECT 1
   FROM ("public"."matches" "m2"
     JOIN "public"."matches" "m1" ON (("m1"."id" = "predictions"."match_id")))
  WHERE (("m2"."group_id" = "m1"."group_id") AND ("m2"."kickoff_time" <= "now"()) AND ("m2"."id" <> "m1"."id")))))));



CREATE POLICY "predictions_select_own" ON "public"."predictions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "predictions_update_group_lock" ON "public"."predictions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."lock_bypass" = true)))) OR (NOT (EXISTS ( SELECT 1
   FROM "public"."matches" "m1"
  WHERE (("m1"."id" = "predictions"."match_id") AND ("m1"."kickoff_time" <= "now"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."predictions" "existing"
  WHERE (("existing"."user_id" = "predictions"."user_id") AND ("existing"."match_id" = "predictions"."match_id") AND ("existing"."home_score" = "predictions"."home_score") AND ("existing"."away_score" = "predictions"."away_score"))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qualifier_predictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."r32_third_place_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reactions_delete" ON "public"."match_reactions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "reactions_insert" ON "public"."match_reactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "reactions_select" ON "public"."match_reactions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_predictions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournament_scorers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_spotlights" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."group_standings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."league_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."matches";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."predictions";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."admin_set_joker"("p_user_id" "uuid", "p_match_id" "uuid", "p_is_confident" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_joker"("p_user_id" "uuid", "p_match_id" "uuid", "p_is_confident" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_joker"("p_user_id" "uuid", "p_match_id" "uuid", "p_is_confident" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_jokers_remaining"("p_user_id" "uuid", "p_remaining" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_jokers_remaining"("p_user_id" "uuid", "p_remaining" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_jokers_remaining"("p_user_id" "uuid", "p_remaining" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_award_points"("p_award_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_award_points"("p_award_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_award_points"("p_award_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_goals_prediction_points"("p_stage" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_goals_prediction_points"("p_stage" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_goals_prediction_points"("p_stage" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_group_position_points"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_group_position_points"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_group_position_points"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_knockout_points"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_knockout_points"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_knockout_points"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_ko_prediction_points"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_ko_prediction_points"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_ko_prediction_points"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_prediction_points"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_prediction_points"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_prediction_points"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_final_four_bonus"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_final_four_bonus"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_final_four_bonus"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_group_bonuses"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_group_bonuses"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_group_bonuses"("p_match_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_offline_player"("p_claim_token" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_offline_player"("p_claim_token" "text", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_admin_only_write"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_admin_only_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_admin_only_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_admin_only_write"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_knockout_pick_write"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_knockout_pick_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_knockout_pick_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_knockout_pick_write"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_profile_managed_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_profile_managed_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_profile_managed_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_profile_managed_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_score_prediction_write"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_score_prediction_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_score_prediction_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_score_prediction_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_correct_answers"("p_question_id" "uuid", "p_correct_answer" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_correct_answers"("p_question_id" "uuid", "p_correct_answer" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_correct_answers"("p_question_id" "uuid", "p_correct_answer" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_r32_known_slots"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_r32_known_slots"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_r32_known_slots"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_all_league_points_safe"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_all_league_points_safe"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_all_league_points_safe"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_all_points_safe"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_all_points_safe"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_all_points_safe"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_league_points_safe"("p_league_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_league_points_safe"("p_league_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_league_points_safe"("p_league_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_match_user_points"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_match_user_points"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_match_user_points"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_prediction_rows_safe"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_prediction_rows_safe"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_prediction_rows_safe"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_user_ko_points"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_user_ko_points"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_user_ko_points"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_user_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_user_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_user_stats"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_user_total_points"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_user_total_points"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_user_total_points"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."request_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."snapshot_all_ranks"() TO "anon";
GRANT ALL ON FUNCTION "public"."snapshot_all_ranks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."snapshot_all_ranks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."snapshot_user_ranks"() TO "anon";
GRANT ALL ON FUNCTION "public"."snapshot_user_ranks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."snapshot_user_ranks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid", "p_correct" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid", "p_correct" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid", "p_correct" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak_and_accuracy"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak_and_accuracy"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak_and_accuracy"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."wc26_award_points"("p_award_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."wc26_award_points"("p_award_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wc26_award_points"("p_award_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."wc26_award_points_for_league"("p_award_type" "text", "p_scoring" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."wc26_award_points_for_league"("p_award_type" "text", "p_scoring" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wc26_award_points_for_league"("p_award_type" "text", "p_scoring" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."wc26_group_bonus_points"("p_user_id" "uuid", "p_group_id" "uuid", "p_league_id" "uuid", "p_use_snapshot" boolean, "p_scoring" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."wc26_group_bonus_points"("p_user_id" "uuid", "p_group_id" "uuid", "p_league_id" "uuid", "p_use_snapshot" boolean, "p_scoring" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wc26_group_bonus_points"("p_user_id" "uuid", "p_group_id" "uuid", "p_league_id" "uuid", "p_use_snapshot" boolean, "p_scoring" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."wc26_match_prediction_points"("p_pred_home" integer, "p_pred_away" integer, "p_actual_home" integer, "p_actual_away" integer, "p_joker" boolean, "p_correct_points" integer, "p_exact_points" integer, "p_joker_multiplier" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."wc26_match_prediction_points"("p_pred_home" integer, "p_pred_away" integer, "p_actual_home" integer, "p_actual_away" integer, "p_joker" boolean, "p_correct_points" integer, "p_exact_points" integer, "p_joker_multiplier" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wc26_match_prediction_points"("p_pred_home" integer, "p_pred_away" integer, "p_actual_home" integer, "p_actual_away" integer, "p_joker" boolean, "p_correct_points" integer, "p_exact_points" integer, "p_joker_multiplier" integer) TO "service_role";
























GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."award_predictions" TO "anon";
GRANT ALL ON TABLE "public"."award_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."award_predictions" TO "service_role";



GRANT ALL ON TABLE "public"."award_results" TO "anon";
GRANT ALL ON TABLE "public"."award_results" TO "authenticated";
GRANT ALL ON TABLE "public"."award_results" TO "service_role";



GRANT ALL ON TABLE "public"."badge_definitions" TO "anon";
GRANT ALL ON TABLE "public"."badge_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."badge_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."daily_answers" TO "anon";
GRANT ALL ON TABLE "public"."daily_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_answers" TO "service_role";



GRANT ALL ON TABLE "public"."daily_questions" TO "anon";
GRANT ALL ON TABLE "public"."daily_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_questions" TO "service_role";



GRANT ALL ON TABLE "public"."group_standings" TO "anon";
GRANT ALL ON TABLE "public"."group_standings" TO "authenticated";
GRANT ALL ON TABLE "public"."group_standings" TO "service_role";



GRANT ALL ON TABLE "public"."group_teams" TO "anon";
GRANT ALL ON TABLE "public"."group_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."group_teams" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."h2h_challenges" TO "anon";
GRANT ALL ON TABLE "public"."h2h_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."h2h_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."knockout_picks" TO "anon";
GRANT ALL ON TABLE "public"."knockout_picks" TO "authenticated";
GRANT ALL ON TABLE "public"."knockout_picks" TO "service_role";



GRANT ALL ON TABLE "public"."ko_leaderboard_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."ko_leaderboard_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."ko_leaderboard_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."ko_league_members" TO "anon";
GRANT ALL ON TABLE "public"."ko_league_members" TO "authenticated";
GRANT ALL ON TABLE "public"."ko_league_members" TO "service_role";



GRANT ALL ON TABLE "public"."ko_leagues" TO "anon";
GRANT ALL ON TABLE "public"."ko_leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."ko_leagues" TO "service_role";



GRANT ALL ON TABLE "public"."ko_predictions" TO "anon";
GRANT ALL ON TABLE "public"."ko_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."ko_predictions" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."league_award_predictions" TO "anon";
GRANT ALL ON TABLE "public"."league_award_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."league_award_predictions" TO "service_role";



GRANT ALL ON TABLE "public"."league_knockout_picks" TO "anon";
GRANT ALL ON TABLE "public"."league_knockout_picks" TO "authenticated";
GRANT ALL ON TABLE "public"."league_knockout_picks" TO "service_role";



GRANT ALL ON TABLE "public"."league_members" TO "anon";
GRANT ALL ON TABLE "public"."league_members" TO "authenticated";
GRANT ALL ON TABLE "public"."league_members" TO "service_role";



GRANT ALL ON TABLE "public"."league_predictions" TO "anon";
GRANT ALL ON TABLE "public"."league_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."league_predictions" TO "service_role";



GRANT ALL ON TABLE "public"."league_tournament_predictions" TO "anon";
GRANT ALL ON TABLE "public"."league_tournament_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."league_tournament_predictions" TO "service_role";



GRANT ALL ON TABLE "public"."leagues" TO "anon";
GRANT ALL ON TABLE "public"."leagues" TO "authenticated";
GRANT ALL ON TABLE "public"."leagues" TO "service_role";



GRANT ALL ON TABLE "public"."match_events" TO "anon";
GRANT ALL ON TABLE "public"."match_events" TO "authenticated";
GRANT ALL ON TABLE "public"."match_events" TO "service_role";



GRANT ALL ON TABLE "public"."match_reactions" TO "anon";
GRANT ALL ON TABLE "public"."match_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."match_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."offline_players" TO "anon";
GRANT ALL ON TABLE "public"."offline_players" TO "authenticated";
GRANT ALL ON TABLE "public"."offline_players" TO "service_role";



GRANT ALL ON TABLE "public"."offline_predictions" TO "anon";
GRANT ALL ON TABLE "public"."offline_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."offline_predictions" TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON TABLE "public"."predicted_group_positions" TO "anon";
GRANT ALL ON TABLE "public"."predicted_group_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."predicted_group_positions" TO "service_role";



GRANT ALL ON TABLE "public"."predictions" TO "anon";
GRANT ALL ON TABLE "public"."predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."predictions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."qualifier_predictions" TO "anon";
GRANT ALL ON TABLE "public"."qualifier_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."qualifier_predictions" TO "service_role";



GRANT ALL ON TABLE "public"."r32_third_place_allocations" TO "anon";
GRANT ALL ON TABLE "public"."r32_third_place_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."r32_third_place_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_predictions" TO "anon";
GRANT ALL ON TABLE "public"."tournament_predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_predictions" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_scorers" TO "anon";
GRANT ALL ON TABLE "public"."tournament_scorers" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_scorers" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."venues" TO "anon";
GRANT ALL ON TABLE "public"."venues" TO "authenticated";
GRANT ALL ON TABLE "public"."venues" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_spotlights" TO "anon";
GRANT ALL ON TABLE "public"."weekly_spotlights" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_spotlights" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































