BEGIN;

-- ============================================================
-- 0016_final_rls_integration.sql
-- Final v1.2 RLS / privilege integration
--
-- Purpose:
--   - remove legacy/over-broad policies
--   - enforce final permission matrix
--   - keep module-owned trusted RPCs as mutation boundaries
--
-- Reviews policies remain owned by 0015.
-- ============================================================


-- ============================================================
-- 1) ENSURE RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2) REMOVE LEGACY POLICIES
-- Reviews are intentionally excluded: 0015 owns final review RLS.
-- ============================================================

DO $$
DECLARE
  v_table text;
  v_policy record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'profiles',
    'routes',
    'route_stops',
    'tour_schedules',
    'bookings',
    'guide_assignments',
    'incidents',
    'audit_logs'
  ]
  LOOP
    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
    LOOP
      EXECUTE format(
        'DROP POLICY %I ON public.%I',
        v_policy.policyname,
        v_table
      );
    END LOOP;
  END LOOP;
END;
$$;


-- ============================================================
-- 3) PROFILES
-- ============================================================
-- Client registration does not INSERT profiles directly.
-- auth.users -> handle_new_auth_user() creates MEMBER + ACTIVE.
--
-- Self-edit is limited further by column privileges below.

CREATE POLICY "profiles own active read"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  AND account_status = 'ACTIVE'
);

CREATE POLICY "profiles admin read"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

CREATE POLICY "profiles own active update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  AND account_status = 'ACTIVE'
)
WITH CHECK (
  id = auth.uid()
  AND account_status = 'ACTIVE'
);


-- ============================================================
-- 4) ROUTES
-- ============================================================

CREATE POLICY "routes public active read"
ON public.routes
FOR SELECT
TO anon, authenticated
USING (
  status = 'ACTIVE'
  OR public.is_admin()
);

CREATE POLICY "routes admin manage"
ON public.routes
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 5) ROUTE STOPS
-- ============================================================

CREATE POLICY "stops public active route read"
ON public.route_stops
FOR SELECT
TO anon, authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.routes r
    WHERE r.id = route_stops.route_id
      AND r.status = 'ACTIVE'
  )
);

CREATE POLICY "stops admin manage"
ON public.route_stops
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 6) TOUR SCHEDULES
-- ============================================================
-- Guest/public:
--   OPEN / FULL only.
--
-- Member:
--   may also read schedules connected to own booking history.
--
-- Guide:
--   may also read schedules assigned to that guide.
--
-- Admin/Super Admin:
--   full schedule management.

CREATE POLICY "schedules public available read"
ON public.tour_schedules
FOR SELECT
TO anon, authenticated
USING (
  status IN ('OPEN', 'FULL')
);

CREATE POLICY "schedules member own booking read"
ON public.tour_schedules
FOR SELECT
TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.schedule_id = tour_schedules.id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "schedules guide assigned read"
ON public.tour_schedules
FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'GUIDE'
  AND public.is_active_user()
  AND EXISTS (
    SELECT 1
    FROM public.guide_assignments ga
    WHERE ga.schedule_id = tour_schedules.id
      AND ga.guide_id = auth.uid()
  )
);

CREATE POLICY "schedules admin manage"
ON public.tour_schedules
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 7) BOOKINGS
-- ============================================================
-- Creation/cancellation/completion are trusted RPC operations.
-- Direct client mutation is intentionally unavailable.

CREATE POLICY "bookings own admin read"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  (
    user_id = auth.uid()
    AND public.is_active_user()
  )
  OR public.is_admin()
);


-- ============================================================
-- 8) GUIDE ASSIGNMENTS
-- ============================================================
-- Assignment writes go through assign_guide().
-- Guide Accept/Decline goes through update_my_assignment_status().

CREATE POLICY "assignments own admin read"
ON public.guide_assignments
FOR SELECT
TO authenticated
USING (
  (
    guide_id = auth.uid()
    AND public.is_active_user()
  )
  OR public.is_admin()
);


-- ============================================================
-- 9) INCIDENTS
-- ============================================================
-- Guide:
--   read ACCEPTED / COMPLETED assigned tours.
--   create only for ACCEPTED assigned tours.
--
-- Admin/Super Admin:
--   read/create through normal table access.
--
-- Status mutation:
--   update_incident_status() only.

CREATE POLICY "incidents assigned guide admin read"
ON public.incidents
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.current_user_role() = 'GUIDE'
    AND public.is_active_user()
    AND EXISTS (
      SELECT 1
      FROM public.guide_assignments ga
      WHERE ga.schedule_id = incidents.schedule_id
        AND ga.guide_id = auth.uid()
        AND ga.status IN ('ACCEPTED', 'COMPLETED')
    )
  )
);

CREATE POLICY "incidents accepted guide admin insert"
ON public.incidents
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR (
    reported_by = auth.uid()
    AND public.current_user_role() = 'GUIDE'
    AND public.is_active_user()
    AND EXISTS (
      SELECT 1
      FROM public.guide_assignments ga
      WHERE ga.schedule_id = incidents.schedule_id
        AND ga.guide_id = auth.uid()
        AND ga.status = 'ACCEPTED'
    )
  )
);


-- ============================================================
-- 10) AUDIT LOGS
-- ============================================================
-- Append-only.
-- Trusted SECURITY DEFINER operations write audit records.
-- Only SUPER_ADMIN may read them directly.

CREATE POLICY "audit super admin read"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
);


-- ============================================================
-- 11) TABLE PRIVILEGES
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.profiles
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.profiles
TO authenticated;

GRANT UPDATE (
  full_name,
  phone,
  member_type,
  organization,
  avatar_url
)
ON public.profiles
TO authenticated;


-- ------------------------------------------------------------
-- routes
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.routes
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.routes
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON TABLE public.routes
TO authenticated;


-- ------------------------------------------------------------
-- route_stops
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.route_stops
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.route_stops
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON TABLE public.route_stops
TO authenticated;


-- ------------------------------------------------------------
-- tour_schedules
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.tour_schedules
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.tour_schedules
TO anon, authenticated;

GRANT INSERT, UPDATE
ON TABLE public.tour_schedules
TO authenticated;


-- ------------------------------------------------------------
-- bookings
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.bookings
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.bookings
TO authenticated;


-- ------------------------------------------------------------
-- guide_assignments
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.guide_assignments
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.guide_assignments
TO authenticated;


-- ------------------------------------------------------------
-- incidents
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.incidents
FROM anon, authenticated;

GRANT SELECT, INSERT
ON TABLE public.incidents
TO authenticated;


-- ------------------------------------------------------------
-- reviews
-- Policies are owned by 0015.
-- Normalize only table privileges here.
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.reviews
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.reviews
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON TABLE public.reviews
TO authenticated;


-- ------------------------------------------------------------
-- audit_logs
-- ------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE public.audit_logs
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.audit_logs
TO authenticated;


-- ============================================================
-- 12) FINAL FUNCTION EXECUTE BOUNDARIES
-- ============================================================

-- Trigger-only functions must not be callable directly by clients.

REVOKE ALL
ON FUNCTION public.handle_new_auth_user()
FROM PUBLIC, anon, authenticated;

REVOKE ALL
ON FUNCTION public.protect_profile_privileges()
FROM PUBLIC, anon, authenticated;


-- Role management

REVOKE ALL
ON FUNCTION public.change_user_role(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.change_user_role(uuid, text)
TO authenticated;


-- Booking workflow

REVOKE ALL
ON FUNCTION public.book_tour_safe(uuid, integer, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.book_tour_safe(uuid, integer, text)
TO authenticated;

REVOKE ALL
ON FUNCTION public.cancel_booking_safe(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.cancel_booking_safe(uuid)
TO authenticated;

REVOKE ALL
ON FUNCTION public.get_schedule_capacity(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_schedule_capacity(uuid)
TO anon, authenticated;


-- Guide / Schedule workflow

REVOKE ALL
ON FUNCTION public.assign_guide(uuid, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.assign_guide(uuid, uuid)
TO authenticated;

REVOKE ALL
ON FUNCTION public.update_my_assignment_status(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.update_my_assignment_status(uuid, text)
TO authenticated;

REVOKE ALL
ON FUNCTION public.get_my_tour_manifest(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_my_tour_manifest(uuid)
TO authenticated;

REVOKE ALL
ON FUNCTION public.update_tour_attendance(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.update_tour_attendance(uuid, text)
TO authenticated;

REVOKE ALL
ON FUNCTION public.complete_tour(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.complete_tour(uuid)
TO authenticated;


-- Incident workflow

REVOKE ALL
ON FUNCTION public.update_incident_status(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.update_incident_status(uuid, text)
TO authenticated;


-- Review workflow

REVOKE ALL
ON FUNCTION public.is_review_moderator()
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.is_review_moderator()
TO authenticated;

REVOKE ALL
ON FUNCTION public.get_guide_name_for_schedule(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_guide_name_for_schedule(uuid)
TO authenticated;


COMMIT;