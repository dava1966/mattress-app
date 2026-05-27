# Mattress 💰 — Family Finance Tracker

A shared household finance tracker with Firebase authentication and real-time sync.

---

## One-time Setup

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or newer) — download and install if you don't have it
- A free [Vercel](https://vercel.com) account
- A free [GitHub](https://github.com) account (easiest way to deploy to Vercel)

---

## Step 1 — Install dependencies

Open a terminal in this folder and run:

```bash
npm install
```

---

## Step 2 — Test it locally (optional but recommended)

```bash
npm run dev
```

Open http://localhost:5173 in your browser. You should see the login screen. Sign in with Google or email/password.

---

## Step 3 — Deploy to Vercel

### Option A: Via GitHub (recommended)

1. Create a new repository on [github.com](https://github.com)
2. Upload this entire folder to it (or use `git push`)
3. Go to [vercel.com](https://vercel.com) → "Add New Project"
4. Import your GitHub repository
5. Vercel auto-detects Vite — just click **Deploy**
6. Your app will be live at a `*.vercel.app` URL in ~60 seconds

### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts — it will give you a live URL.

---

## Step 4 — Point mattress.dava.one at your app

1. In Vercel dashboard → your project → **Settings** → **Domains**
2. Add `mattress.dava.one`
3. Vercel will show you a CNAME record to add:
   - **Type:** CNAME
   - **Name:** mattress
   - **Value:** cname.vercel-dns.com
4. Add that record in your DNS provider (wherever dava.one is managed)
5. Wait a few minutes — Vercel auto-provisions the SSL cert

---

## Step 5 — Update Firebase authorized domains

Since you're using a custom domain, tell Firebase it's allowed:

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain** → enter `mattress.dava.one`

That's it! Both you and Svetlana can now visit `mattress.dava.one`, sign in with Google, and share the same live data.

---

## How it works

- **Auth:** Firebase Authentication (Google + Email/Password)
- **Database:** Firestore — single shared document, real-time sync
- **Hosting:** Vercel (free tier)
- **Domain:** mattress.dava.one via CNAME

## Notes

- Data is shared between all logged-in users in real-time
- Changes sync instantly across devices
- The Spark (free) Firebase plan supports up to 50,000 reads and 20,000 writes per day — more than enough for household use
