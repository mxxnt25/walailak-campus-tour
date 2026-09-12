-- =========================================================
-- M1 — Account Deactivation Support
-- SoT v1.2
-- =========================================================


-- =========================================================
-- 1. Account status fields
-- =========================================================

alter table public.profiles
  add column if not exists is_active boolean
  not null default true;

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

create index if not exists idx_profiles_is_active
on public.profiles(is_active);


-- =========================================================
-- 2. Role helpers must ignore inactive accounts
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
    and p.is_active = true
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
      and p.is_active = true
  );
$$;


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
      and p.is_active = true
  );
$$;


create or replace function public.is_guide()
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
      and p.role = 'GUIDE'
      and p.is_active = true
  );
$$;


-- =========================================================
-- 3. Inactive users may not update their profile
-- =========================================================

drop policy if exists "profiles self update"
on public.profiles;

create policy "profiles self update"
on public.profiles
for update
using (
  id = auth.uid()
  and is_active = true
)
with check (
  id = auth.uid()
  and is_active = true
);


-- =========================================================
-- 4. Update role-change protection
-- Last ACTIVE SUPER_ADMIN must remain.
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

  if new.role is not distinct from old.role then
    return new;
  end if;


  select p.role
  into actor_role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true;


  -- ADMIN: MEMBER <-> GUIDE only
  if actor_role = 'ADMIN' then

    if old.role not in ('MEMBER', 'GUIDE')
       or new.role not in ('MEMBER', 'GUIDE') then

      raise exception 'ROLE_CHANGE_FORBIDDEN';

    end if;

    return new;

  end if;


  -- SUPER_ADMIN
  if actor_role = 'SUPER_ADMIN' then

    if old.role = 'SUPER_ADMIN'
       and old.is_active = true
       and new.role <> 'SUPER_ADMIN' then

      select count(*)
      into super_admin_count
      from public.profiles
      where role = 'SUPER_ADMIN'
        and is_active = true;


      if super_admin_count <= 1 then
        raise exception 'LAST_SUPER_ADMIN_REQUIRED';
      end if;

    end if;

    return new;

  end if;


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
-- 5. Update trusted role-change RPC
-- Inactive callers/targets cannot change roles.
-- =========================================================

create or replace function public.change_user_role(
  p_user_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_old_role text;
  v_target_active boolean;
  v_super_admin_count integer;
  v_action text;
begin

  v_actor_id := auth.uid();


  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;


  if p_new_role not in (
    'MEMBER',
    'GUIDE',
    'ADMIN',
    'SUPER_ADMIN'
  ) then
    raise exception 'INVALID_ROLE';
  end if;


  select role
  into v_actor_role
  from public.profiles
  where id = v_actor_id
    and is_active = true;


  if v_actor_role is null then
    raise exception 'FORBIDDEN';
  end if;


  select
    role,
    is_active
  into
    v_old_role,
    v_target_active
  from public.profiles
  where id = p_user_id
  for update;


  if not found then
    raise exception 'TARGET_PROFILE_NOT_FOUND';
  end if;


  if v_target_active = false then
    raise exception 'TARGET_INACTIVE';
  end if;


  if v_old_role = p_new_role then
    return jsonb_build_object(
      'user_id', p_user_id,
      'old_role', v_old_role,
      'new_role', p_new_role,
      'changed', false
    );
  end if;


  -- ADMIN: MEMBER <-> GUIDE only
  if v_actor_role = 'ADMIN' then

    if v_old_role not in ('MEMBER', 'GUIDE')
       or p_new_role not in ('MEMBER', 'GUIDE') then

      raise exception 'ROLE_CHANGE_FORBIDDEN';

    end if;


  elsif v_actor_role = 'SUPER_ADMIN' then

    -- Protect last active SUPER_ADMIN
    if v_old_role = 'SUPER_ADMIN'
       and p_new_role <> 'SUPER_ADMIN' then

      perform pg_advisory_xact_lock(
        hashtext('walailak_last_super_admin_guard')
      );


      select count(*)
      into v_super_admin_count
      from public.profiles
      where role = 'SUPER_ADMIN'
        and is_active = true;


      if v_super_admin_count <= 1 then
        raise exception 'LAST_SUPER_ADMIN_REQUIRED';
      end if;

    end if;


  else

    raise exception 'ROLE_CHANGE_FORBIDDEN';

  end if;


  update public.profiles
  set
    role = p_new_role,
    updated_at = now()
  where id = p_user_id;


  if v_old_role in ('MEMBER', 'GUIDE')
     and p_new_role = 'ADMIN' then

    v_action := 'ADMIN_GRANTED';

  elsif v_old_role = 'ADMIN'
        and p_new_role in ('MEMBER', 'GUIDE') then

    v_action := 'ADMIN_REVOKED';

  else

    v_action := 'USER_ROLE_CHANGED';

  end if;


  insert into public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    old_data,
    new_data
  )
  values (
    v_actor_id,
    v_action,
    'PROFILE',
    p_user_id,
    jsonb_build_object(
      'role',
      v_old_role
    ),
    jsonb_build_object(
      'role',
      p_new_role
    )
  );


  return jsonb_build_object(
    'user_id', p_user_id,
    'old_role', v_old_role,
    'new_role', p_new_role,
    'changed', true
  );

end;
$$;


revoke all
on function public.change_user_role(uuid, text)
from public;

grant execute
on function public.change_user_role(uuid, text)
to authenticated;