-- ============================================================
-- 0018_m1_institutional_id.sql
-- M1 - Registration institutional ID support
--
-- Rules:
-- - STUDENT / STAFF: institutional_id must be exactly 8 digits
-- - EXTERNAL: institutional_id must be NULL
-- - Full name must not be blank for new registrations
-- - Existing rows remain valid
-- ============================================================


-- ============================================================
-- 1. Add institutional_id
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS institutional_id text;


-- ============================================================
-- 2. Normalize old empty values
-- ============================================================

UPDATE public.profiles
SET institutional_id = NULL
WHERE TRIM(COALESCE(institutional_id, '')) = '';


-- ============================================================
-- 3. Validate institutional_id format
--
-- NULL is intentionally allowed because existing accounts
-- were created before this field existed.
-- New STUDENT / STAFF registrations are enforced by the
-- signup trigger below.
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_institutional_id_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_institutional_id_check
  CHECK (
    institutional_id IS NULL
    OR institutional_id ~ '^[0-9]{8}$'
  );


-- ============================================================
-- 4. Update signup trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_full_name text;
  new_member_type text;
  new_institutional_id text;
BEGIN

  -- ----------------------------------------------------------
  -- Full name
  -- ----------------------------------------------------------

  new_full_name :=
    NULLIF(
      TRIM(
        COALESCE(
          NEW.raw_user_meta_data ->> 'full_name',
          ''
        )
      ),
      ''
    );

  IF new_full_name IS NULL THEN
    RAISE EXCEPTION 'INVALID_FULL_NAME';
  END IF;


  -- ----------------------------------------------------------
  -- Member type
  -- ----------------------------------------------------------

  new_member_type :=
    COALESCE(
      NEW.raw_user_meta_data ->> 'member_type',
      NEW.raw_user_meta_data ->> 'visitor_type'
    );

  IF new_member_type IS NULL
     OR new_member_type NOT IN (
       'STUDENT',
       'STAFF',
       'EXTERNAL'
     )
  THEN
    RAISE EXCEPTION 'INVALID_MEMBER_TYPE';
  END IF;


  -- ----------------------------------------------------------
  -- Institutional ID
  -- ----------------------------------------------------------

  new_institutional_id :=
    NULLIF(
      TRIM(
        COALESCE(
          NEW.raw_user_meta_data ->> 'institutional_id',
          ''
        )
      ),
      ''
    );


  -- EXTERNAL must not store an institutional ID.
  IF new_member_type = 'EXTERNAL' THEN
    new_institutional_id := NULL;
  END IF;


  -- STUDENT / STAFF require exactly 8 numeric digits.
  IF new_member_type IN ('STUDENT', 'STAFF')
     AND (
       new_institutional_id IS NULL
       OR new_institutional_id !~ '^[0-9]{8}$'
     )
  THEN
    RAISE EXCEPTION 'INVALID_INSTITUTIONAL_ID';
  END IF;


  -- ----------------------------------------------------------
  -- Create profile
  -- ----------------------------------------------------------

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    member_type,
    institutional_id,
    role,
    account_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    new_full_name,
    new_member_type,
    new_institutional_id,
    'MEMBER',
    'ACTIVE'
  )
  ON CONFLICT (id) DO NOTHING;


  RETURN NEW;
END;
$$;


-- ============================================================
-- 5. Documentation
-- ============================================================

COMMENT ON COLUMN public.profiles.institutional_id IS
  '8-digit institutional ID for STUDENT/STAFF accounts. NULL for EXTERNAL and legacy accounts.';