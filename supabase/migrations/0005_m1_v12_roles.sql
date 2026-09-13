-- =========================================================
-- M1 — Auth/User Role Model Upgrade for SoT v1.2
-- Roles: MEMBER | GUIDE | ADMIN | SUPER_ADMIN
-- member_type: STUDENT | STAFF | EXTERNAL
-- =========================================================


-- =========================================================
-- 1. Rename visitor_type -> member_type
-- =========================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'visitor_type'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'member_type'
  ) then
    alter table public.profiles
      rename column visitor_type to member_type;
  end if;
end
$$;


-- =========================================================
-- 2. Replace member_type constraint
-- =========================================================

alter table public.profiles
  drop constraint if exists profiles_visitor_type_check;

alter table public.profiles
  drop constraint if exists profiles_member_type_check;

alter table public.profiles
  add constraint profiles_member_type_check
  check (
    member_type is null
    or member_type in (
      'STUDENT',
      'STAFF',
      'EXTERNAL'
    )
  );


-- =========================================================
-- 3. Upgrade VISITOR -> MEMBER
-- =========================================================

-- Temporarily remove the old privilege trigger.
-- The old v1.0 trigger would block the migration's
-- VISITOR -> MEMBER data conversion.

drop trigger if exists trg_protect_profile_privileges
on public.profiles;


alter table public.profiles
  drop constraint if exists profiles_role_check;


update public.profiles
set role = 'MEMBER'
where role = 'VISITOR';


alter table public.profiles
  alter column role set default 'MEMBER';


alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'MEMBER',
      'GUIDE',
      'ADMIN',
      'SUPER_ADMIN'
    )
  );


-- =========================================================
-- 4. Role helper functions
-- =========================================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;


create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'SUPER_ADMIN'
  );
$$;


-- SUPER_ADMIN inherits normal Admin operational access.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;


-- =========================================================
-- 5. Profile update policy
-- Normal users may update ONLY their own profile row.
-- Role changes will use trusted change_user_role() RPC.
-- =========================================================

drop policy if exists "profiles self update"
on public.profiles;

create policy "profiles self update"
on public.profiles
for update
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);


-- Prevent frontend clients from updating sensitive profile columns
-- such as role directly.

revoke update on public.profiles
from authenticated;

grant update (
  full_name,
  phone,
  organization,
  avatar_url
)
on public.profiles
to authenticated;


-- =========================================================
-- 6. Protect role changes
-- =========================================================

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  super_admin_count integer;
begin

  -- No role change -> allow normal profile update.
  if new.role is not distinct from old.role then
    return new;
  end if;


  select p.role
  into actor_role
  from public.profiles p
  where p.id = auth.uid();


  -- =======================================================
  -- ADMIN
  -- May change MEMBER <-> GUIDE only.
  -- Cannot manage ADMIN or SUPER_ADMIN.
  -- =======================================================

  if actor_role = 'ADMIN' then

    if old.role not in ('MEMBER', 'GUIDE')
       or new.role not in ('MEMBER', 'GUIDE') then

      raise exception 'ROLE_CHANGE_FORBIDDEN';

    end if;

    return new;

  end if;


  -- =======================================================
  -- SUPER_ADMIN
  -- May manage admin-level roles,
  -- but system must retain at least one SUPER_ADMIN.
  -- =======================================================

  if actor_role = 'SUPER_ADMIN' then

    if old.role = 'SUPER_ADMIN'
       and new.role <> 'SUPER_ADMIN' then

      select count(*)
      into super_admin_count
      from public.profiles
      where role = 'SUPER_ADMIN';

      if super_admin_count <= 1 then
        raise exception 'LAST_SUPER_ADMIN_REQUIRED';
      end if;

    end if;

    return new;

  end if;


  -- MEMBER / GUIDE / unauthenticated caller
  -- cannot modify role.
  raise exception 'ROLE_CHANGE_FORBIDDEN';

end;
$$;


drop trigger if exists trg_protect_profile_privileges
on public.profiles;

create trigger trg_protect_profile_privileges
before update on public.profiles
for each row
execute function public.protect_profile_privileges();


-- =========================================================
-- 7. Update automatic signup profile creation
-- Normal registration ALWAYS creates MEMBER.
-- Client metadata is never trusted for authorization role.
-- =========================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_type text;
begin

  v_member_type := case

    when new.raw_user_meta_data ->> 'member_type'
      in ('STUDENT', 'STAFF', 'EXTERNAL')

    then new.raw_user_meta_data ->> 'member_type'

    else 'EXTERNAL'

  end;


  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    member_type,
    organization
  )
  values (
    new.id,

    coalesce(
      nullif(
        new.raw_user_meta_data ->> 'full_name',
        ''
      ),
      new.email,
      'Member'
    ),

    coalesce(new.email, ''),

    'MEMBER',

    v_member_type,

    nullif(
      new.raw_user_meta_data ->> 'organization',
      ''
    )
  )
  on conflict (id) do nothing;


  return new;

end;
$$;