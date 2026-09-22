-- M5 Final Fix: enforce Incident state machine
--
-- Reason:
-- Prevent clients from skipping or reversing the approved incident lifecycle.
--
-- Allowed lifecycle:
-- OPEN -> IN_PROGRESS -> RESOLVED
--
-- Same-state requests remain no-op and do not create duplicate audit logs.
--
-- Authorization:
-- authenticated ACTIVE ADMIN / SUPER_ADMIN via public.is_admin()
--
-- Expected success:
-- OPEN -> IN_PROGRESS
-- IN_PROGRESS -> RESOLVED
-- same status -> same status (no-op)
--
-- Expected denial:
-- OPEN -> RESOLVED
-- IN_PROGRESS -> OPEN
-- RESOLVED -> OPEN
-- RESOLVED -> IN_PROGRESS

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
  -- Authentication
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- ADMIN + SUPER_ADMIN, active account required by shared helper
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  -- Input validation
  if p_incident_id is null
     or p_status is null
     or p_status not in (
       'OPEN',
       'IN_PROGRESS',
       'RESOLVED'
     ) then
    raise exception 'VALIDATION_ERROR';
  end if;

  -- Lock the current row so concurrent updates cannot bypass the state machine
  select *
  into v_old_incident
  from public.incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- Preserve existing no-op behavior.
  -- No update and no duplicate audit event.
  if v_old_incident.status = p_status then
    return v_old_incident;
  end if;

  -- Approved Incident state machine:
  -- OPEN -> IN_PROGRESS -> RESOLVED
  if not (
    (v_old_incident.status = 'OPEN' and p_status = 'IN_PROGRESS')
    or
    (v_old_incident.status = 'IN_PROGRESS' and p_status = 'RESOLVED')
  ) then
    raise exception 'INVALID_TRANSITION';
  end if;

  update public.incidents
  set
    status = p_status,
    updated_at = now()
  where id = p_incident_id
  returning *
  into v_new_incident;

  -- Append-only audit entry for a real state transition
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

-- RPC permission hardening
revoke all
on function public.update_incident_status(uuid, text)
from public;

revoke all
on function public.update_incident_status(uuid, text)
from anon;

grant execute
on function public.update_incident_status(uuid, text)
to authenticated;

-- ============================================================
-- Verification plan (run only in an approved DB test context)
-- ============================================================
--
-- Expected PASS:
-- OPEN -> IN_PROGRESS
-- IN_PROGRESS -> RESOLVED
--
-- Expected INVALID_TRANSITION:
-- OPEN -> RESOLVED
-- IN_PROGRESS -> OPEN
-- RESOLVED -> OPEN
-- RESOLVED -> IN_PROGRESS
--
-- Expected no-op:
-- requesting the existing status returns the existing row
-- and does not append INCIDENT_STATUS_CHANGED.
--
-- Recovery:
-- Restore the previous public.update_incident_status(uuid, text)
-- definition from migration 0014 in a NEW corrective migration.
-- Never edit historical migration 0014.
