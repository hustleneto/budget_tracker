# MyFinance

A shared-and-personal expense tracker for a household of one or two people.

Track where the money goes across two lenses — **Family** (shared expenses only, at full value) and **Personal** (everything, with shared costs split 50/50) — with monthly budgets, year-over-year pacing, an automatic settle-up balance between two people, and optional side-business bookkeeping.

Runs entirely on free tiers: a static React front end on Vercel talking directly to a Supabase Postgres database. There is no backend server to maintain.

> The interface is in **Portuguese (pt-PT)**. All labels live in `src/App.tsx` if you want to translate them.

---

## Features

- **Works solo or as a couple** — switch in Settings. Solo mode hides all the shared-expense machinery entirely.
- **Fully editable categories** — add, rename, delete, drag to reorder, pick an emoji. 3–9 per group.
- **Settle-up** — records who paid for each shared expense and tells you who owes whom.
- **Monthly budgets** per spending group, with colour-coded progress bars.
- **Year-to-date pacing** vs. the same period last year, a full-year projection, and the single biggest driver of the change.
- **Optional side businesses** (up to 6) with income, expenses and a simple P&L. Toggle the whole feature off if you don't need it.
- Import from CSV, export to Excel and PDF, full-text search, installable as a phone app (PWA).

---

## Setup

You need three free accounts: **GitHub** (code), **Supabase** (database), **Vercel** (hosting).

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates every table, security rule and default category in one go.
3. **Add yourself to the allowlist.** Near the top of `schema.sql` there is a commented-out block — uncomment it, put your email address (and your partner's) in, and run just those lines:

   ```sql
   insert into allowed_users (email) values
     ('you@example.com'),
     ('partner@example.com')
   on conflict (email) do nothing;
   ```

   Read [Who can see your data](#who-can-see-your-data) below before skipping this step.
4. From **Project Settings → API**, copy the **Project URL** and the **anon / public key**.

### 2. Vercel

1. Import your GitHub repository into Vercel. Framework preset: **Vite**.
2. Under **Project Settings → Environment Variables**, add all four:

   | Name | Value | Used by |
   |---|---|---|
   | `VITE_SUPABASE_URL` | your Project URL | the web app |
   | `VITE_SUPABASE_ANON_KEY` | your anon key | the web app |
   | `SUPABASE_URL` | same Project URL | the daily keep-alive cron |
   | `SUPABASE_ANON_KEY` | same anon key | the daily keep-alive cron |

   Both pairs are required. Browser code can only read variables prefixed with `VITE_`, and serverless functions cannot read `VITE_` variables at all.
3. Deploy.

### 3. First run

1. Open your deployed URL and click **"Não tem conta? Registe-se"** to create your account, using the same email you allowlisted. Confirm the email Supabase sends you.
2. Tap the **gear icon** (top right) → **Preferências** and set up your household: solo or two people, their names, and whether you want the business features.
3. Everything else — categories, emoji, budgets, business names — is editable from that same Settings screen.

---

## Who can see your data

**This matters. Please read it.**

The sign-up form is open to anyone who finds your URL — that is normal and unavoidable for a public web app. What protects your data is the **allowlist**, not the sign-up form.

Every table is protected by a Postgres Row Level Security rule that says: *you may read this row only if your email address is in the `allowed_users` table.* A stranger who signs up gets a working login and a completely empty app. They cannot see, add, or delete anything of yours.

So:

- **Adding someone** = insert their email into `allowed_users`, then have them sign up.
- **Removing someone** = `delete from allowed_users where email = '...'`. They keep their login but lose all access immediately.
- The `allowed_users` table itself has no access policies at all, so nobody can read or edit the guest list from the browser — only you, from the Supabase SQL Editor.

Two further notes:

- The **anon key is not a secret.** It is designed to be visible in the browser bundle. Row Level Security is what actually guards your data, which is why the allowlist above is the important part.
- This project assumes **one household per deployment**. Everyone on the allowlist shares the same categories, budgets and transactions. If you want several independent households on one database, every table would need a household ID column and matching policies.

---

## Local development

Only needed if you want to change the code. Day-to-day use requires nothing but the deployed site.

```bash
npm install
cp .env.example .env    # then fill in your Supabase URL and anon key
npm run dev
```

| Command | Does |
|---|---|
| `npm run dev` | start the dev server |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build locally |
| `npm run lint` | type-check the project (`tsc --noEmit`) |

---

## Project structure

```
src/
  App.tsx           all views, state and business logic
  Auth.tsx          sign-in / sign-up screen
  main.tsx          React entry point
  index.css         Tailwind entry point
  lib/supabase.ts   Supabase client
api/
  keep-alive.js     daily cron that pings the database so Supabase
                    doesn't pause the free-tier project for inactivity
public/
  manifest.json     PWA manifest
  icon-192.png      app icons (see note below)
  icon-512.png
supabase/
  schema.sql        complete database schema — run once
```

### App icons

`public/icon-192.png` and `public/icon-512.png` are plain placeholder marks. Replace them with any square PNGs at those two sizes to change the home-screen icon — no code change needed.

---

## Customising

Most things are configurable from the in-app Settings screen without touching code:

| What | Where |
|---|---|
| Solo vs. two-person mode | Settings → Preferências |
| The two people's names | Settings → Preferências |
| Show/hide business features | Settings → Preferências |
| Category names, emoji, order | Settings → category groups |
| Business names | Settings → Os Meus Negócios |
| Monthly budgets | Settings → Orçamentos Mensais |
| Interface language, currency symbol | `src/App.tsx` |

---

## Licence

MIT — do what you like with it.
