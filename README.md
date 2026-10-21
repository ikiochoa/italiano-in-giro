# Italiano in giro

Mobile friendly website to learn Italian and compete against each other: vocabulary and verbs for the
CILS levels (A1 to C2), your own topic lists, a teacher who can give lists to a group, and a weekly race.

- `web/` – the website (plain HTML/CSS/JS, hosted on Netlify)
  - `index.html` – the app
  - `config.js` – Supabase project URL + publishable key (public by design)
  - `core.js` – state, spaced repetition, streaks
  - `cloud.js` – Google sign-in and sync with Supabase (works offline, syncs later)
  - `screens.js` – the screens
- `supabase/migrations/` – database tables and row-level-security rules

## How it works

- **Sign-in:** Google. Anyone with a Google account can sign in, but they only see their own data until they join a group.
- **Groups:** whoever creates a group is its teacher and gets a 6-letter join code. Students join with the code.
  People in the same group see each other's name, level, streak and progress (for the weekly race).
  The teacher can also share word lists with the group and see every answer their students give.
- **Row level security:** everything above is enforced in the database, not just in the website.

## Setup (one time, all free tiers)

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free plan).
2. Run the migration. Either install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run
   `supabase link --project-ref <ref>` then `supabase db push`, or paste
   `supabase/migrations/20261021000000_init.sql` into the dashboard's **SQL Editor** and run it.
3. **Project Settings → API**: copy the project URL and the publishable (anon) key into `web/config.js`.

### 2. Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project (or reuse one).
2. **APIs & Services → OAuth consent screen**: External, app name "Italiano in giro", your email. Add yourself and the
   other users as test users while it's in testing, or publish it (only the basic profile scopes are used, so no review is needed).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**: type *Web application*.
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy the client ID and secret into Supabase: **Authentication → Sign In / Providers → Google** → enable, paste both, save.

### 3. Netlify

1. In Netlify: **Add new site → Import an existing project** → pick this GitHub repo. No build command; the publish
   directory comes from `netlify.toml` (`web`). Every push to `main` then deploys automatically.
   (Or from your computer: `netlify deploy --prod`.)
2. Back in Supabase, **Authentication → URL Configuration**:
   - Site URL: your Netlify address, e.g. `https://italiano-in-giro.netlify.app`
   - Redirect URLs: add the same address, plus `http://localhost:8000` if you want to try it locally.

### 4. Try it

Open the site, sign in with Google, then the teacher taps **Create a group** and sends the code to the students.

To run it locally: `cd web && python3 -m http.server 8000` and open http://localhost:8000.

## Updating

Change files in `web/` and push (Netlify deploys). Database changes go in a new file in `supabase/migrations/`.
