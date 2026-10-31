# digital-saathi

## Supabase setup

The existing single-file frontend now supports Supabase Auth and optional cloud
sync while retaining its current `localStorage` fallback. No database schema is
created by this project; configure the existing tables `profiles`, `tutorials`,
`quiz_questions`, `user_progress`, `quiz_attempts`, `learning_sessions`, and
`reminders` in your Supabase project.

1. Open `supabase-client.js`.
2. Replace `YOUR_PROJECT` and `YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY` with the
   Supabase project URL and public publishable/anon key.
3. Never place a `service_role` or other secret key in this file.
4. Enable Email authentication in Supabase Auth and configure the site URL and
   redirect URLs for the deployed app.
5. Ensure Row Level Security policies on the existing user-owned tables allow
   authenticated users to access only rows whose `user_id` matches
   `auth.uid()` (the `profiles` row uses the authenticated user id).

The frontend expects the existing tables to expose the following conventional
columns for synchronization: `user_id`, `tutorial_id`, `current_step`,
`completed`, `score`, `total_questions`, `duration_minutes`, `started_at`,
`ended_at`, `reminder_time`, and `enabled`. Existing lesson and quiz content
remains in `index.html`; `tutorials` and `quiz_questions` are read without
replacing that content.
