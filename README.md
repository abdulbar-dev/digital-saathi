# Digital Saathi

Digital Saathi is a browser-based learning companion for people building
confidence with everyday digital tasks. It is designed especially for
beginners and older adults who benefit from clear, paced instructions, safety
guidance, accessible text, and optional Urdu support.

## Implemented features

- Welcome screen with step-by-step learning guidance.
- Six built-in beginner lessons covering video calls, scam messages,
  passwords, smartphone navigation, savings, and healthy walking.
- Lesson filtering by category, including technology basics, everyday apps,
  digital safety, financial literacy, smart health, and creative arts.
- Guided lesson steps with explanations, progress state, quizzes, results,
  retry, and resume support.
- English and Urdu interface options, adjustable text size, high-contrast
  styling, voice guidance, read-aloud controls, and supported-browser voice
  commands.
- Practice activities for a video call, an online form, and timed learning
  sessions. The practice activities are simulations and do not access real
  accounts, cameras, microphones, or external services.
- Safety Center with a fictional scam-message example and warning-sign
  practice.
- Local progress, quiz scores, notes, questions, settings, and reminder-time
  preferences stored in `localStorage`.
- Optional Supabase email sign-up/sign-in and synchronization for the existing
  user data tables. Local storage remains available when Supabase is not
  configured or unavailable.
- Reset controls and a progress dashboard.

## Technology and architecture

This is a static, single-page frontend. There is no build step or package
manager configuration in the repository.

- HTML, CSS, and JavaScript in `index.html`.
- React 18, ReactDOM, HTM, Tailwind CSS, Google Fonts, and Supabase JS loaded
  from CDNs in `index.html`.
- `supabase-client.js` creates the browser Supabase client.
- `supabase-data.js` reads and writes the existing Supabase tables.
- React state and `localStorage` provide the local-first fallback.

Because dependencies are loaded from CDNs, an internet connection is needed
when opening the app unless the CDN assets are replaced with locally hosted
copies.

## Local Supabase configuration

Create `supabase-config.local.js` in the repository root. Do not edit
credentials into `supabase-client.js`.

```js
window.DIGITAL_SAATHI_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabasePublishableKey: 'sb_publishable_YOUR_PUBLIC_KEY',
  upliftTtsUrl: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/urdu-tts'
};
```

Use the project URL from Supabase without `/rest/v1/`, and use only the public
key beginning with `sb_publishable_`. Never use a `service_role` key or any
other secret key in this browser app.

`upliftTtsUrl` is optional. When configured, Urdu read-aloud uses the UpliftAI
MP3 service and falls back to browser speech if the service is unavailable.

`supabase-config.local.js` is listed in `.gitignore`, must remain local, and
must never be committed, pasted into issues or pull requests, or included in
screenshots. The page loads the Supabase CDN script first, then the local
configuration, then `supabase-client.js`.

## Run locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/> in a browser. Use a local HTTP server rather
than opening `index.html` directly so the scripts and browser APIs behave
consistently.

To stop the server, press `Ctrl+C`.

## Existing Supabase schema

Digital Saathi does not create or alter tables. Configure the existing schema
with these columns:

| Table | Columns used by the app |
| --- | --- |
| `profiles` | `id`, `full_name`, `preferred_language`, `text_size`, `voice_enabled` |
| `tutorials` | `id`, `title`, `description`, `category`, `language`, `difficulty`, `duration_minutes`, `steps`, `image_url`, `is_published` |
| `quiz_questions` | `id`, `tutorial_id`, `question`, `options`, `correct_answer`, `explanation` |
| `user_progress` | `user_id`, `tutorial_id`, `completed`, `progress_percentage`, `last_step` |
| `quiz_attempts` | `user_id`, `tutorial_id`, `score`, `total_questions`, `attempted_at` |
| `learning_sessions` | `user_id`, `duration_minutes`, `started_at`, `completed_at` |
| `reminders` | `user_id`, `reminder_time`, `is_enabled` |

The current frontend keeps its built-in lesson and quiz content in
`index.html`; remote `tutorials` and `quiz_questions` rows are read for sync
compatibility but do not replace that built-in content.

## Required Supabase Auth and RLS policies

Enable Email authentication in Supabase Auth and configure the local or
deployed site URL and redirect URLs.

Row Level Security must be enabled on every user-owned table. Policies must
enforce that authenticated users can access only their own rows:

- `profiles`: `id = auth.uid()`.
- `user_progress`, `quiz_attempts`, `learning_sessions`, and `reminders`:
  `user_id = auth.uid()` for `SELECT`, `INSERT`, and `UPDATE` as applicable.
- Public lesson content in `tutorials` and `quiz_questions`: allow only the
  read access appropriate for the app, such as published tutorial content and
  its quiz questions. Do not allow unauthenticated writes.

Apply policies in the Supabase dashboard or SQL editor according to your
existing schema and deployment needs. Do not disable RLS to make the app work.

## Known limitations

- The app has no automated test suite or production build pipeline; browser
  testing is still needed across supported devices.
- Supabase synchronization depends on the project URL, publishable key,
  authentication settings, matching columns, and correct RLS policies.
- The app falls back to local storage, but cloud/local conflict resolution is
  intentionally minimal.
- The Support page saves questions and notes on the device only. Mentor
  replies, real messaging, and the listed community events are not connected.
- The daily reminder is a saved preference; background notifications are not
  implemented.
- Practice video-call and form activities are fictional simulations. They do
  not connect to real accounts or submit real forms.
- Speech synthesis and voice commands depend on browser and device support.
  Urdu voice availability varies, and some voice behavior may require an
  internet connection.
- To enable UpliftAI Urdu audio, deploy `supabase/functions/urdu-tts/index.ts`
  as a Supabase Edge Function and set the `UPLIFT_API_KEY` function secret:

  ```bash
  supabase functions deploy urdu-tts --no-verify-jwt
  supabase secrets set UPLIFT_API_KEY='YOUR_UPLIFT_API_KEY'
  ```

  Keep the API key only in Supabase secrets. Never put it in
  `supabase-config.local.js`, `index.html`, Git, or browser code.
- Financial and health lessons are educational content, not financial or
  medical advice.
