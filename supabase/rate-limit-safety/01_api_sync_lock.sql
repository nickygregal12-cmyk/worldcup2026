BEGIN;

CREATE TABLE IF NOT EXISTS public.api_sync_control (
  name text PRIMARY KEY,
  locked_until timestamptz,
  last_provider_call_at timestamptz,
  blocked_until timestamptz,
  last_status text,
  requests_available integer,
  counter_reset_seconds integer,
  last_provider_calls integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_sync_control ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.api_sync_control FROM anon, authenticated;
GRANT ALL ON public.api_sync_control TO service_role;

CREATE OR REPLACE FUNCTION public.acquire_api_sync_lock(
  p_name text,
  p_min_gap_seconds integer DEFAULT 75,
  p_lock_seconds integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.api_sync_control%ROWTYPE;
  v_now timestamptz := now();
  v_retry integer := 0;
BEGIN
  INSERT INTO public.api_sync_control(name)
  VALUES (p_name)
  ON CONFLICT (name) DO NOTHING;

  UPDATE public.api_sync_control
  SET
    locked_until = v_now + make_interval(secs => GREATEST(p_lock_seconds, 30)),
    last_provider_call_at = v_now,
    last_status = 'running',
    updated_at = v_now
  WHERE name = p_name
    AND (locked_until IS NULL OR locked_until <= v_now)
    AND (blocked_until IS NULL OR blocked_until <= v_now)
    AND (
      last_provider_call_at IS NULL
      OR last_provider_call_at <= v_now - make_interval(secs => GREATEST(p_min_gap_seconds, 1))
    )
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN jsonb_build_object('acquired', true);
  END IF;

  SELECT * INTO v_row
  FROM public.api_sync_control
  WHERE name = p_name;

  v_retry := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM GREATEST(
      COALESCE(v_row.locked_until, v_now),
      COALESCE(v_row.blocked_until, v_now),
      COALESCE(v_row.last_provider_call_at, v_now)
        + make_interval(secs => GREATEST(p_min_gap_seconds, 1))
    ) - v_now))::integer
  );

  RETURN jsonb_build_object(
    'acquired', false,
    'reason', CASE
      WHEN v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN 'Provider temporarily blocked'
      WHEN v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now THEN 'Another sync is already running'
      ELSE 'Provider cooldown is active'
    END,
    'retry_after_seconds', v_retry
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_api_sync_lock(
  p_name text,
  p_status text,
  p_requests_available integer DEFAULT NULL,
  p_counter_reset_seconds integer DEFAULT NULL,
  p_block_seconds integer DEFAULT 0,
  p_provider_calls integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_sync_control
  SET
    locked_until = NULL,
    blocked_until = CASE
      WHEN GREATEST(COALESCE(p_block_seconds, 0), 0) > 0
        THEN now() + make_interval(secs => GREATEST(p_block_seconds, 0))
      ELSE NULL
    END,
    last_status = p_status,
    requests_available = p_requests_available,
    counter_reset_seconds = p_counter_reset_seconds,
    last_provider_calls = GREATEST(COALESCE(p_provider_calls, 0), 0),
    updated_at = now()
  WHERE name = p_name;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_api_sync_lock(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_api_sync_lock(text, text, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_api_sync_lock(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_api_sync_lock(text, text, integer, integer, integer, integer) TO service_role;

COMMIT;

SELECT * FROM public.api_sync_control ORDER BY name;
