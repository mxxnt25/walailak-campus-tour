Walailak Campus Tour Management System

Web application for managing Walailak University campus tours, including routes, bookings, guide scheduling, incidents, reviews, authentication, and administration.

Tech Stack

React + Vite

Tailwind CSS

Supabase

Supabase Auth

Supabase Storage

Supabase Edge Functions

Setup

Clone this repository.

Copy .env.example to .env.

Fill in your Supabase configuration:

VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

Do not place the Supabase service_role key in the frontend .env.

Install dependencies:

npm install

Run the development server:

npm run dev

Build for production:

npm run build

Database Migrations

Apply the migrations in Supabase SQL Editor in numerical order:

supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_rls_baseline.sql
supabase/migrations/0003_capacity_rpc.sql
supabase/migrations/0004_m6_reviews.sql
supabase/migrations/0005_m1_v12_roles.sql
supabase/migrations/0006_m1_role_rpc_audit.sql
supabase/migrations/0007_m1_account_deactivation.sql
supabase/migrations/0008_m1_inactive_rls.sql

User Roles

The current role model follows Team SoT v1.2:

MEMBER — normal authenticated user

GUIDE — campus tour guide

ADMIN — operational administrator

SUPER_ADMIN — highest-level administrator

GUEST means a user who is not logged in and is not stored as a role in the database.

Member Types

Registered users may have one of the following member types:

STUDENT

STAFF

EXTERNAL

Public registration always creates a user with:

role = MEMBER

Public registration must never allow users to choose GUIDE, ADMIN, or SUPER_ADMIN.

Role Permissions

MEMBER

Manage their own profile

Change password

Use normal authenticated features

Cannot change their own role

GUIDE

Has normal authenticated access

Can access guide-related features according to module permissions

ADMIN

ADMIN may manage ordinary users only.

Allowed role changes:

MEMBER <-> GUIDE

ADMIN cannot:

Promote users to ADMIN

Promote users to SUPER_ADMIN

Modify ADMIN accounts

Modify SUPER_ADMIN accounts

SUPER_ADMIN

SUPER_ADMIN can manage administrative roles and access privileged administration features such as:

/admin/audit-logs

The system must always retain at least one active SUPER_ADMIN.

Bootstrap First SUPER_ADMIN

Public registration cannot create an administrator.

To create the first SUPER_ADMIN:

Register a normal account through /register.

The account will initially have:

role = MEMBER

In Supabase SQL Editor, perform the one-time bootstrap operation:

alter table public.profiles
disable trigger trg_protect_profile_privileges;

update public.profiles
set role = 'SUPER_ADMIN'
where email = 'your-email@example.com';

alter table public.profiles
enable trigger trg_protect_profile_privileges;

Verify the account:

select
  id,
  email,
  role,
  is_active
from public.profiles
where email = 'your-email@example.com';

Expected result:

role = SUPER_ADMIN
is_active = true

This direct SQL procedure is only for bootstrapping the first SUPER_ADMIN.
Normal role changes must use the trusted change_user_role RPC.

Role Management RPC

Role changes are performed through:

public.change_user_role(user_id, new_role)

This operation enforces server-side authorization.

Examples of protected cases:

MEMBER cannot change their own role

ADMIN cannot promote MEMBER to ADMIN

ADMIN cannot promote users to SUPER_ADMIN

ADMIN cannot modify ADMIN or SUPER_ADMIN

The final active SUPER_ADMIN cannot be demoted

Role changes are recorded in the audit log.

Delete vs Deactivate

User removal follows account lifecycle rules.

Hard Delete

If a user has no operational history, the account may be permanently deleted.

Examples of operational history include:

Booking

Review

Guide Assignment

Incident

Deactivate

If the user has operational history, the account is not permanently removed.

Instead:

is_active = false

and:

deactivated_at = timestamp

The authentication account is also disabled so the user can no longer log in.

Historical records remain available for system integrity.

Audit Logs

Administrative security events are stored in:

public.audit_logs

Examples include:

USER_ROLE_CHANGED

ADMIN_GRANTED

ADMIN_REVOKED

USER_DELETED

USER_DEACTIVATED

Audit logs are append-only from application roles.

Normal authenticated users cannot:

INSERT audit logs directly

UPDATE audit logs

DELETE audit logs

Only SUPER_ADMIN may access:

/admin/audit-logs

Authentication Features

M1 authentication includes:

Register

Login

Logout

Profile management

Avatar upload

Change password

Forgot password

Reset password

Routes:

/login
/register
/profile
/forgot-password
/reset-password
/admin/users
/admin/audit-logs

Service Contract

M1 services use a consistent response structure:

{
  success: true,
  data: result,
  error: null,
}

For failures:

{
  success: false,
  data: null,
  error: {
    code: 'ERROR_CODE',
    message: 'Error message',
  },
}

Security Verification

The following security cases have been verified:

MEMBER cannot promote themselves

ADMIN cannot promote MEMBER to ADMIN

ADMIN can only perform MEMBER ↔ GUIDE changes

Audit log INSERT is blocked for normal authenticated users

Audit log UPDATE is blocked

Audit log DELETE is blocked

The final active SUPER_ADMIN cannot be demoted

Accounts with operational history are deactivated instead of hard deleted

Deactivated users cannot log in

Branches

main — release/demo branch

develop — integration branch

feature/* — module/member development branches

Example:

feature/auth-admin

Development Notes

Before merging into develop:

Run:

npm run build

Verify authentication and authorization flows.

Check that shared routes and teammate modules are not unintentionally removed.

Commit and push the feature branch.

Create a Pull Request into develop.