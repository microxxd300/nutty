# NNN Tracker

A mobile-first No Nut November tracker starring **Nutty the peanut**. Check in daily, compete on friend leaderboards, and share a trophy card.

- **Next.js** (App Router, static export), **Tailwind**, **TypeScript**
- **Supabase** for auth (Google sign-in only) and the database. The browser talks to it directly, and there is no backend.
- **html-to-image** turns the card into a 1080×1350 PNG

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (the free tier is fine).
2. Open **SQL Editor** → **New query**, paste the whole of [`supabase/setup.sql`](supabase/setup.sql), and click **Run**.
   This creates the tables, constraints, Row Level Security policies and the `check_in`, `create_group` and `join_group` functions. You can run it again safely.

## 2. Add your env vars

Copy `.env.example` to `.env.local` and fill it in from **Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # the "anon" / publishable key
```

> **Warning:** Only use the **anon / publishable** key. Never use the `service_role` / secret key, which bypasses all security. The app refuses to start if you paste one by mistake. `.env*` files are git-ignored.

## 3. Set the auth redirect URLs

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** your production URL, e.g. `https://nnn-tracker.vercel.app`
- **Redirect URLs:** add both
  - `http://localhost:3000/**`
  - `https://nnn-tracker.vercel.app/**`

Google sign-in sends people back to `/home`. If a URL isn't on this list, sign-in will not return to the app.

## 3b. Turn on "Continue with Google" (required)

Google is the only way to sign in. Until you finish these steps, the button shows a "provider is not enabled" error.

1. **Get Supabase's callback URL.** In Supabase → **Authentication → Sign In / Providers → Google**, copy the **Callback URL**. It looks like `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Set up the consent screen.** In the [Google Cloud Console](https://console.cloud.google.com/), create or select a project. Go to **APIs & Services → OAuth consent screen** (called **Google Auth Platform** in newer consoles). Choose **External** and fill in the app name and support email. The default scopes (`openid`, `email`, `profile`) are all you need.
3. **Create the client.** Go to **Credentials → Create credentials → OAuth client ID → Web application** and fill in:
   - **Authorized JavaScript origins:** `http://localhost:3000` and `https://nnn-tracker.vercel.app`
   - **Authorized redirect URIs:** the Supabase callback URL from step 1

   Copy the **Client ID** and **Client secret**.
4. **Enable Google in Supabase.** Back on the Supabase Google provider page, turn it **on**, paste the Client ID and Client secret, and click **Save**.
5. **Let your friends in.** While the consent screen is in *Testing* mode, only the test users you list can sign in. Click **Publish app** when you're ready for everyone.
6. **Turn off email sign-in.** In Supabase → **Authentication → Sign In / Providers → Email**, switch it **off** and save. The app has no email field, but this also stops anyone from creating email accounts by calling the API directly.

> The Google **client secret** belongs in the Supabase dashboard only. Never put it in `.env.local` or anywhere in this repo.

After Google sign-in, users land on `/home` (already covered by the redirect URLs in step 3). The profile form pre-fills their name from their Google account.

## 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## 5. Deploy to Vercel (free)

1. Push this repo to GitHub.
2. In [vercel.com](https://vercel.com) → **Add New → Project** → import the repo. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Click **Deploy**, then add the production URL to Supabase's redirect URLs (step 3).

The app is a pure static export (`output: 'export'`), so the output in `out/` can also be hosted anywhere else.

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Landing page + Google sign-in |
| `/home` | Today's check-in, streak, and 30-day calendar |
| `/groups` | Your groups, plus create a group or join by code |
| `/groups/view?id=…` | A group's leaderboard |
| `/trophy` | Trophy or progress card with Save / Share |

> The leaderboard uses `?id=` instead of `/groups/[id]`. A static export can only build dynamic routes for IDs that are known at build time, and group IDs are created at runtime.

## How the security works

There is no server, so Supabase enforces every rule:

- **RLS on every table.** You can read only your own data plus the data of people who share a group with you (`is_group_member()` / `shares_group_with()`). There is no way to list or browse all groups.
- **Writes go through functions.** Clients can insert or update only their own profile. Check-ins, group creation and joining go through `SECURITY DEFINER` functions. Nothing can be deleted.
- **Server-controlled dates.** `check_in(status)` works out "today" from your saved timezone. `check_in_yesterday()` provides one grace day and can only confirm that you were still standing yesterday. Arbitrary backdating is not allowed.
- **Limits:** 5 groups created per user and 50 members per group. Both are race-safe thanks to row locks.
- **Validation:** names are checked in the UI and by `CHECK` constraints in the database. Avatars must come from a fixed emoji list. All user text is rendered as plain React text.

Ranking: active players first, then longest streak, then whoever joined the group first. A **streak** is consecutive "still standing" check-ins. A missed day doesn't knock you out. You can confirm it on the following day; after that grace period, it resets your streak.

## Nutty the mascot

The mascot poses are in `public/nutty/` (`idle`, `wave`, `flex`, `celebrate`, `trophy`, `on-fire`, `meditate`, `nervous`, `fallen`). The app's colors are sampled from them and defined in `app/globals.css`.

- **Avatars:** players pick one of seven Nutty poses. The list lives in `lib/avatars.ts` and must match the `CHECK` constraint on `profiles.avatar`.
- **Home screen:** Nutty reacts to how you're doing: nervous before you check in, flexing after, on fire for a streak of 7+, knocked out if you fell, and holding the trophy as Champion.
- **Trophy card:** shows the trophy pose for Champions, the fallen pose if you're out, and the on-fire pose mid-challenge.

To change a pose, replace the PNG with the same filename (transparent background, roughly square).

> Ran an earlier version of `setup.sql` with emoji avatars? Just run the new one. It renames `avatar_emoji` to `avatar` and resets everyone to the `idle` pose.

Stay strong. Drink water. Touch grass.
