-- ============================================================
-- 0009_m1_identity_role_model.sql
-- M1 - Identity / Role Model Foundation (SoT v1.2)
--
-- Scope:
-- - VISITOR -> MEMBER
-- - visitor_type -> member_type
-- - Add SUPER_ADMIN
-- - Add account_status: ACTIVE / DEACTIVATED
-- - New signup -> MEMBER
-- - Update visitor metadata -> member metadata
-- - is_admin() supports ADMIN + SUPER_ADMIN
-- - Add is_super_admin()
-- - Prevent client-side changes to role / account_status
--
-- IMPORTANT:
-- - Do NOT create audit_logs here.
-- - Shared audit foundation is migration 0010.
-- ============================================================


-- ============================================================
-- 1. visitor_type -> member_type
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'visitor_type'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'member_type'
  )
  THEN
    ALTER TABLE public.profiles
      RENAME COLUMN visitor_type TO member_type;
  END IF;
END
$$;


-- ============================================================
-- 2. Normalize member_type
-- STUDENT | STAFF | EXTERNAL
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_visitor_type_check;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_member_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_member_type_check
  CHECK (
    member_type IS NULL
    OR member_type IN (
      'STUDENT',
      'STAFF',
      'EXTERNAL'
    )
  );


-- ============================================================
-- 3. Role model
-- VISITOR -> MEMBER
-- MEMBER | GUIDE | ADMIN | SUPER_ADMIN
-- ============================================================

-- Temporarily remove privilege protection
-- so historical VISITOR rows can be migrated.
DROP TRIGGER IF EXISTS trg_protect_profile_privileges
ON public.profiles;


-- IMPORTANT:
-- Drop the OLD role constraint BEFORE VISITOR -> MEMBER.
-- Baseline constraint may not allow MEMBER yet.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;


UPDATE public.profiles
SET role = 'MEMBER'
WHERE role = 'VISITOR';


ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'MEMBER';


ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (
    role IN (
      'MEMBER',
      'GUIDE',
      'ADMIN',
      'SUPER_ADMIN'
    )
  );


-- ============================================================
-- 4. Account Status
-- ACTIVE | DEACTIVATED
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text;


-- Compatibility:
-- If an older local M1 implementation has is_active,
-- migrate its state into account_status.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_active'
  )
  THEN
    EXECUTE '
      UPDATE public.profiles
      SET account_status =
        CASE
          WHEN is_active = false
            THEN ''DEACTIVATED''
          ELSE ''ACTIVE''
        END
      WHERE account_status IS NULL
    ';
  END IF;
END
$$;


UPDATE public.profiles
SET account_status = 'ACTIVE'
WHERE account_status IS NULL;


ALTER TABLE public.profiles
  ALTER COLUMN account_status SET DEFAULT 'ACTIVE';


ALTER TABLE public.profiles
  ALTER COLUMN account_status SET NOT NULL;


ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;


ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (
    account_status IN (
      'ACTIVE',
      'DEACTIVATED'
    )
  );


-- Lifecycle tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;


-- ============================================================
-- 5. Role / Account Status helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.account_status = 'ACTIVE'
  LIMIT 1;
$$;


CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_status = 'ACTIVE'
      AND p.role IN (
        'ADMIN',
        'SUPER_ADMIN'
      )
  );
$$;


CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_status = 'ACTIVE'
      AND p.role = 'SUPER_ADMIN'
  );
$$;


CREATE OR REPLACE FUNCTION public.is_guide()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_status = 'ACTIVE'
      AND p.role = 'GUIDE'
  );
$$;


CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_status = 'ACTIVE'
  );
$$;


-- ============================================================
-- 6. Protect role and account_status
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role text;
BEGIN

  -- Trusted server-side operation.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;


  SELECT role
  INTO actor_role
  FROM public.profiles
  WHERE id = auth.uid()
    AND account_status = 'ACTIVE';


  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
  THEN

    -- ========================================================
    -- SUPER_ADMIN
    -- ========================================================

    IF actor_role = 'SUPER_ADMIN' THEN

      -- Prevent removal/demotion of last active SUPER_ADMIN.
      IF OLD.role = 'SUPER_ADMIN'
         AND OLD.account_status = 'ACTIVE'
         AND (
           NEW.role <> 'SUPER_ADMIN'
           OR NEW.account_status <> 'ACTIVE'
         )
      THEN

        IF (
          SELECT count(*)
          FROM public.profiles
          WHERE role = 'SUPER_ADMIN'
            AND account_status = 'ACTIVE'
        ) <= 1
        THEN
          RAISE EXCEPTION
            'LAST_SUPER_ADMIN_REQUIRED';
        END IF;

      END IF;

      RETURN NEW;
    END IF;


    -- ========================================================
    -- ADMIN
    -- ========================================================

    IF actor_role = 'ADMIN' THEN

      -- ADMIN cannot directly change account status.
      IF NEW.account_status
         IS DISTINCT FROM OLD.account_status
      THEN
        RAISE EXCEPTION
          'ACCOUNT_STATUS_CHANGE_FORBIDDEN';
      END IF;


      -- ADMIN may only change MEMBER <-> GUIDE.
      IF OLD.role IN (
        'MEMBER',
        'GUIDE'
      )
      AND NEW.role IN (
        'MEMBER',
        'GUIDE'
      )
      THEN
        RETURN NEW;
      END IF;


      RAISE EXCEPTION
        'ROLE_CHANGE_FORBIDDEN';
    END IF;


    -- ========================================================
    -- MEMBER / GUIDE
    -- ========================================================

    RAISE EXCEPTION
      'PROFILE_PRIVILEGE_CHANGE_FORBIDDEN';

  END IF;


  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_protect_profile_privileges
ON public.profiles;


CREATE TRIGGER trg_protect_profile_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privileges();


-- ============================================================
-- 7. Authenticated UPDATE column permissions
-- ============================================================

REVOKE UPDATE
ON public.profiles
FROM authenticated;


GRANT UPDATE (
  full_name,
  phone,
  organization,
  avatar_url,
  member_type
)
ON public.profiles
TO authenticated;


-- ============================================================
-- 8. Signup Trigger
-- New users are always MEMBER + ACTIVE
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_member_type text;
  safe_email text;
  safe_full_name text;
  safe_organization text;
BEGIN

  -- Support both new and historical metadata names.
  new_member_type :=
    COALESCE(
      NULLIF(
        NEW.raw_user_meta_data ->> 'member_type',
        ''
      ),
      NULLIF(
        NEW.raw_user_meta_data ->> 'visitor_type',
        ''
      )
    );


  -- Validate member type.
  IF new_member_type IS NOT NULL
     AND new_member_type NOT IN (
       'STUDENT',
       'STAFF',
       'EXTERNAL'
     )
  THEN
    new_member_type := NULL;
  END IF;


  -- Safe email fallback.
  safe_email :=
    COALESCE(
      NULLIF(
        NEW.email,
        ''
      ),
      NULLIF(
        NEW.raw_user_meta_data ->> 'email',
        ''
      ),
      NEW.id::text || '@unknown.local'
    );


  -- Safe full_name fallback.
  safe_full_name :=
    COALESCE(
      NULLIF(
        NEW.raw_user_meta_data ->> 'full_name',
        ''
      ),
      NULLIF(
        NEW.raw_user_meta_data ->> 'name',
        ''
      ),
      NULLIF(
        split_part(
          safe_email,
          '@',
          1
        ),
        ''
      ),
      'Member'
    );


  -- Preserve organization from signup metadata.
  safe_organization :=
    NULLIF(
      NEW.raw_user_meta_data ->> 'organization',
      ''
    );


  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    organization,
    member_type,
    role,
    account_status
  )
  VALUES (
    NEW.id,
    safe_email,
    safe_full_name,
    safe_organization,
    new_member_type,
    'MEMBER',
    'ACTIVE'
  )
  ON CONFLICT (id) DO NOTHING;


  RETURN NEW;
END;
$$;


-- ============================================================
-- 9. Profile RLS Alignment
-- ============================================================

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- Drop baseline / historical policies
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "profiles self read"
ON public.profiles;

DROP POLICY IF EXISTS "profiles self update"
ON public.profiles;

DROP POLICY IF EXISTS "Users can view own profile"
ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile"
ON public.profiles;

DROP POLICY IF EXISTS "Admin can view all profiles"
ON public.profiles;


-- ------------------------------------------------------------
-- Drop current policies too, so 0009 can safely be rerun
-- during review/testing.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own active profile"
ON public.profiles;

DROP POLICY IF EXISTS "Admins can view all profiles"
ON public.profiles;

DROP POLICY IF EXISTS "Users can update own active profile"
ON public.profiles;


-- ------------------------------------------------------------
-- Active-only self read
-- ------------------------------------------------------------

CREATE POLICY "Users can view own active profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  AND account_status = 'ACTIVE'
);


-- ------------------------------------------------------------
-- ADMIN + SUPER_ADMIN read
-- Uses public.is_admin()
-- ------------------------------------------------------------

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


-- ------------------------------------------------------------
-- Active-only self update
-- Column-level UPDATE grant prevents protected-field changes.
-- ------------------------------------------------------------

CREATE POLICY "Users can update own active profile"
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
-- 10. Helper Function Permissions
-- ============================================================

GRANT EXECUTE
ON FUNCTION public.current_user_role()
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.is_admin()
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.is_super_admin()
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.is_guide()
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.is_active_user()
TO authenticated;


-- ============================================================
-- END 0009
--
-- Audit foundation intentionally NOT included.
-- Migration 0010 is shared / owned by Team Lead.
-- ============================================================