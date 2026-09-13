-- ============================================================
-- 0010_shared_audit_logs.sql
-- Shared Audit Log Foundation
-- Owner: M2 / Integration
--
-- Depends on:
--   0009_m1_identity_role_model.sql
--   public.is_super_admin()
--
-- Contract:
--   - append-only audit history
--   - only active SUPER_ADMIN may read through normal client access
--   - application clients cannot insert/update/delete directly
--   - trusted SECURITY DEFINER RPCs / server-side service role may write
--   - actor_id / target_id intentionally have NO foreign keys
--     so audit history survives account/entity deletion
-- ============================================================


-- ============================================================
-- 1. Audit table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_id uuid,
  action text NOT NULL,

  target_type text NOT NULL,
  target_id uuid,

  old_data jsonb,
  new_data jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
  ON public.audit_logs (target_type, target_id);


-- ============================================================
-- 3. Row Level Security
-- ============================================================

ALTER TABLE public.audit_logs
  ENABLE ROW LEVEL SECURITY;


-- Remove any historical / conflicting read policy first.
DROP POLICY IF EXISTS "audit super admin read"
  ON public.audit_logs;

DROP POLICY IF EXISTS "audit_logs_super_admin_select"
  ON public.audit_logs;


-- Only active SUPER_ADMIN may read audit history.
-- public.is_super_admin() is supplied by canonical migration 0009.
CREATE POLICY "audit_logs_super_admin_select"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
  );


-- ============================================================
-- 4. Privileges
-- ============================================================

-- Audit rows are append-only from the perspective of application users.
-- No browser/client role may manually create, modify, or delete audit rows.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.audit_logs
  FROM PUBLIC, anon, authenticated;

-- Anonymous users cannot read audit history.
REVOKE SELECT
  ON public.audit_logs
  FROM PUBLIC, anon;

-- Authenticated users receive SELECT privilege, while RLS restricts
-- actual rows to SUPER_ADMIN only.
GRANT SELECT
  ON public.audit_logs
  TO authenticated;


-- ============================================================
-- 5. Security notes
-- ============================================================

COMMENT ON TABLE public.audit_logs IS
  'Append-only shared audit history. Client writes are forbidden; trusted server/RPC operations may write.';

COMMENT ON COLUMN public.audit_logs.actor_id IS
  'Actor UUID preserved without FK so history survives account deletion.';

COMMENT ON COLUMN public.audit_logs.target_id IS
  'Target UUID preserved without FK so history survives target deletion.';
