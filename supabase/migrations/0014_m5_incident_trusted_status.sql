-- =========================================================
-- M5 — Trusted Incident Status Change + Audit
-- Source of Truth v1.2
--
-- Dependencies:
--   0009 M1 role foundation
--   0010 shared audit foundation
--
-- IMPORTANT:
-- Prepare/commit is allowed now.
-- Do NOT apply or merge before 0009 and 0010 are merged.
-- =========================================================

-- =========================================================
-- Direct incident updates are no longer allowed from
-- application clients.
--
-- Incident status changes must go through the trusted RPC
-- below so every real status transition creates an audit row.
-- =========================================================

drop policy if exists "incidents admin update"
on public.incidents;

create or replace function public.update_incident_status(
  p_incident_id uuid,
  p_status text
)
returns public.incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_old_incident public.incidents%rowtype;
  v_new_incident public.incidents%rowtype;
begin

  -- 1) Authentication
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;


  -- 2) Authorization
  -- M1 v1.2 public.is_admin() covers:
  -- ADMIN + SUPER_ADMIN
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;


  -- 3) Input validation
  if p_incident_id is null
     or p_status is null
     or p_status not in (
       'OPEN',
       'IN_PROGRESS',
       'RESOLVED'
     ) then
    raise exception 'VALIDATION_ERROR';
  end if;


  -- 4) Read and lock current incident
  select *
  into v_old_incident
  from public.incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;


  -- 5) No-op protection
  if v_old_incident.status = p_status then
    return v_old_incident;
  end if;


  -- 6) Update status
  update public.incidents
  set
    status = p_status,
    updated_at = now()
  where id = p_incident_id
  returning *
  into v_new_incident;


  -- 7) Append-only audit event
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
    'INCIDENT_STATUS_CHANGED',
    'INCIDENT',
    p_incident_id,
    jsonb_build_object(
      'status',
      v_old_incident.status
    ),
    jsonb_build_object(
      'status',
      v_new_incident.status
    )
  );


  return v_new_incident;

end;
$$;


-- 8) RPC permissions
revoke all
on function public.update_incident_status(uuid, text)
from public;

revoke all
on function public.update_incident_status(uuid, text)
from anon;

grant execute
on function public.update_incident_status(uuid, text)
to authenticated;