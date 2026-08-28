# Walailak Campus Tour Management System

Web app for managing WU campus tours — routes, booking, guide scheduling, incidents, reviews.

## Tech Stack
React + Vite, Tailwind CSS, Supabase

## Setup

1. Clone this repo
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key
3. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
4. Run dev server:
   \`\`\`
   npm run dev
   \`\`\`
5. Apply database migrations in Supabase SQL Editor (in order):
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_baseline.sql`

## Bootstrap first Admin

1. Register a normal account through `/register` (will get role = VISITOR)
2. In Supabase SQL Editor, run:
   \`\`\`sql
   alter table public.profiles disable trigger trg_protect_profile_privileges;
   update public.profiles set role = 'ADMIN' where email = 'your-email@example.com';
   alter table public.profiles enable trigger trg_protect_profile_privileges;
   \`\`\`
3. Refresh the app and log in — you now have admin access at `/admin/users`

## Branches
- `main` — release/demo only
- `develop` — integration branch
- `feature/*` — per-member work branches