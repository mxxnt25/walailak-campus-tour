-- =========================================================
-- M1 — Trusted Role Change + Audit Log
-- Source of Truth v1.2
-- =========================================================


-- =========================================================
-- 1. Audit Log
-- Generic table shared by trusted operations.
--
-- actor_id / target_id intentionally have no FK so audit
-- history remains even when an account is hard-deleted.
-- =========================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_id uuid,
  action text not null,

  target_type text not null,
  target_id uuid,

  old_data jsonb,
  new_data jsonb,

  created_at timestamptz not null default now()
);


create index if not exists idx_audit_logs_created_at
on public.audit_logs(created_at desc);

create index if not exists idx_audit_logs_actor
on public.audit_logs(actor_id);

create index if not exists idx_audit_logs_target
on public.audit_logs(target_type, target_id);


-- =========================================================
-- 2. Audit security
-- Audit is append-only from application roles.
-- Only SUPER_ADMIN may read.
-- =========================================================

alter table public.audit_logs
enable row level security;


drop policy if exists "audit super admin read"
on public.audit_logs;


create policy "audit super admin read"
on public.audit_logs
for select
using (
  public.is_super_admin()
);


-- Application clients cannot manually write/edit/delete audit rows.

revoke insert, update, delete
on public.audit_logs
from anon, authenticated;

revoke select
on public.audit_logs
from anon, authenticated;

grant select
on public.audit_logs
to authenticated;


-- =========================================================
-- 3. Trusted Role Change RPC
--
-- ADMIN:
--   MEMBER <-> GUIDE only
--
-- SUPER_ADMIN:
--   may manage admin-level roles
--   subject to last SUPER_ADMIN safeguard
--
-- MEMBER / GUIDE:
--   cannot change roles
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
  v_super_admin_count integer;
  v_action text;
begin

  -- -------------------------------------------------------
  -- Authentication
  -- -------------------------------------------------------

  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;


  -- -------------------------------------------------------
  -- Validate requested role
  -- -------------------------------------------------------

  if p_new_role not in (
    'MEMBER',
    'GUIDE',
    'ADMIN',
    'SUPER_ADMIN'
  ) then
    raise exception 'INVALID_ROLE';
  end if;


  -- -------------------------------------------------------
  -- Read caller role
  -- -------------------------------------------------------

  select role
  into v_actor_role
  from public.profiles
  where id = v_actor_id;


  if v_actor_role is null then
    raise exception 'ACTOR_PROFILE_NOT_FOUND';
  end if;


  -- -------------------------------------------------------
  -- Lock/read target account
  -- -------------------------------------------------------

  select role
  into v_old_role
  from public.profiles
  where id = p_user_id
  for update;


  if not found then
    raise exception 'TARGET_PROFILE_NOT_FOUND';
  end if;


  -- No change required.
  if v_old_role = p_new_role then
    return jsonb_build_object(
      'user_id', p_user_id,
      'old_role', v_old_role,
      'new_role', p_new_role,
      'changed', false
    );
  end if;


  -- =======================================================
  -- ADMIN
  -- MEMBER <-> GUIDE only.
  -- Cannot manage ADMIN / SUPER_ADMIN.
  -- =======================================================

  if v_actor_role = 'ADMIN' then

    if v_old_role not in ('MEMBER', 'GUIDE')
       or p_new_role not in ('MEMBER', 'GUIDE') then

      raise exception 'ROLE_CHANGE_FORBIDDEN';

    end if;


  -- =======================================================
  -- SUPER_ADMIN
  -- May manage admin-level accounts.
  -- =======================================================

  elsif v_actor_role = 'SUPER_ADMIN' then

    -- Last SUPER_ADMIN may not be demoted.
    if v_old_role = 'SUPER_ADMIN'
       and p_new_role <> 'SUPER_ADMIN' then

      -- Serialize SUPER_ADMIN demotion checks to avoid races.
      perform pg_advisory_xact_lock(
        hashtext('walailak_last_super_admin_guard')
      );

      select count(*)
      into v_super_admin_count
      from public.profiles
      where role = 'SUPER_ADMIN';


      if v_super_admin_count <= 1 then
        raise exception 'LAST_SUPER_ADMIN_REQUIRED';
      end if;

    end if;


  -- =======================================================
  -- MEMBER / GUIDE / other callers
  -- =======================================================

  else

    raise exception 'ROLE_CHANGE_FORBIDDEN';

  end if;


  -- -------------------------------------------------------
  -- Change role
  -- -------------------------------------------------------

  update public.profiles
  set
    role = p_new_role,
    updated_at = now()
  where id = p_user_id;


  -- -------------------------------------------------------
  -- Audit action name
  -- -------------------------------------------------------

  if v_old_role in ('MEMBER', 'GUIDE')
     and p_new_role = 'ADMIN' then

    v_action := 'ADMIN_GRANTED';

  elsif v_old_role = 'ADMIN'
        and p_new_role in ('MEMBER', 'GUIDE') then

    v_action := 'ADMIN_REVOKED';

  else

    v_action := 'USER_ROLE_CHANGED';

  end if;


  -- -------------------------------------------------------
  -- Append-only audit record
  -- -------------------------------------------------------

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


  -- -------------------------------------------------------
  -- Result
  -- -------------------------------------------------------

  return jsonb_build_object(
    'user_id', p_user_id,
    'old_role', v_old_role,
    'new_role', p_new_role,
    'changed', true
  );

end;
$$;


-- =========================================================
-- 4. Function permissions
-- =========================================================

revoke all
on function public.change_user_role(uuid, text)
from public;

grant execute
on function public.change_user_role(uuid, text)
to authenticated;