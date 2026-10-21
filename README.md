# Italiano in giro

Mobile friendly website to learn Italian and compete against each other: vocabulary and verbs for the
CILS levels (A1 to C2), your own topic lists, a teacher who can give lists to a group, and a weekly race.

- `web/` – the website (plain HTML/CSS/JS, hosted on Netlify)
  - `index.html` – the app
  - `config.js` – Supabase project URL + publishable key (public by design)
  - `core.js` – state, spaced repetition, streaks
  - `cloud.js` – Google sign-in and sync with Supabase (works offline, syncs later)
  - `screens.js` – home, sign-in, groups and settings
  - `learn.js` – word lists by topic, verb tables, placement quiz, level-ups
  - `play.js` – practice sessions (words) and the conjugation drill
  - `lists.js` – your own word lists; teachers can give a list to their group
  - `content.js` + `levels/A1.js` … `levels/C2.js` – the built-in CILS word lists
  - `verbs.js` – 149 common verbs with conjugations (generated, see below)
  - `topics.js` – ready-made topic packs (flat renovation, doctor, bank…) suggested when you add words
- `netlify/functions/topic-words.mjs` – asks Claude for words on any other topic (optional, see setup)
- `tools/build_verbs.py` – builds `web/verbs.js`
- `supabase/migrations/` – database tables and row-level-security rules

## How it works

- **Sign-in:** Google. Anyone with a Google account can sign in, but they only see their own data until they join a group.
- **Groups:** whoever creates a group is its teacher and gets a 6-letter join code. Students join with the code.
  People in the same group see each other's name, level, streak and progress (for the weekly race).
  The teacher can also share word lists with the group and see every answer their students give.
- **Row level security:** everything above is enforced in the database, not just in the website.

## Levels and content

- **Levels are earned.** Everyone starts at A1. A level is done at 80%, where 70% of the score is its words
  (a word counts once you've answered it right on a few separate days) and 30% its verb forms. Then you move up.
  The optional placement quiz (8 words per level, 6 right to pass) can start you higher, and only ever moves you up.
- **Word lists.** CILS doesn't publish word lists: its syllabus (Università per Stranieri di Siena) refers to
  De Mauro's *Vocabolario di base* and lists topics and grammar per level. The lists in `levels/` follow those topics
  and are written by hand, with English and Spanish translations. To change them, edit the files: one word per line,
  `italiano | English | español`, `## Topic` to start a topic, `(m)`/`(f)` after words whose article doesn't show the gender.
- **Verbs and tenses.** Each tense is introduced at the level the CILS syllabus puts it: presente, passato prossimo and
  imperativo at A1, imperfetto at A2, condizionale at B1, futuro, congiuntivo, passato remoto and the other compound
  tenses at B2, congiuntivo passato/trapassato at C1. To add a verb, add it in `tools/build_verbs.py` and run
  `pip install verbecc && python3 tools/build_verbs.py`. Wrong forms from the conjugator go in its `OVERRIDES`.

## Practice

- **Today's plan:** words due for review first, then up to 6 new ones, alternating between your own lists and your
  level's list. Each word goes through boxes 0–5 (new → 1, 2, 4, 8, 16 days); new words get an intro card,
  then multiple choice, listening, reverse choice and finally typing, with an Italian voice.
- **Verbs:** a separate drill, 10 forms at a time. A new tense shows its table first, then you pick the right form,
  later you type it. Essere verbs accept the feminine/plural ending (sono andata).
- **Your own lists:** type a topic and the app suggests the closest of about 40 ready-made packs (and matching CILS topics).
  For anything else, Claude writes a list for that topic at your level. You check the words, remove the ones you
  don't want, and save. **✨ More words** on a list asks Claude for more on the same topic. Or paste your own words.
- **Points:** 10 per answer right first time plus 20 for finishing, saved with each session for the weekly race.

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

### 4. Claude for any topic (optional)

Without this, "Add words" still suggests the ready-made packs; only the ✨ buttons say Claude isn't switched on.

1. Create an API key at [platform.claude.com](https://platform.claude.com) (Settings → API keys) and add some credit.
   A list costs a few cents. Setting a monthly spend limit there is a good idea.
2. In Netlify: **Site configuration → Environment variables → Add a variable**: key `ANTHROPIC_API_KEY`, value the key,
   scope *Functions*. Mark it as a secret.
3. Redeploy (**Deploys → Trigger deploy**). Only signed-in people who are in a group can use it.

### 5. Try it

Open the site, sign in with Google, then the teacher taps **Create a group** and sends the code to the students.

To run it locally: `cd web && python3 -m http.server 8000` and open http://localhost:8000.

## Updating

Change files in `web/` and push (Netlify deploys). Database changes go in a new file in `supabase/migrations/`.
