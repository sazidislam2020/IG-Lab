# Ignite Lab

A 3D virtual robotics & programming lab — the commercial platform of DRILL.

## Status

- Commercial platform live on **Vercel** (`ig-lab-phi.vercel.app`) with Supabase backend
- 23 SQL migrations (`supabase/migrations/0001`–`0023`)
- Learning Engine embedded at `/learn` (reader + SQL/Excel/Python/Power BI labs)
- Payments currently run through a **demo activation RPC** — a real gateway
  (SSLCommerz / bKash) is the remaining launch blocker

## Quick Start

### 1. Install dependencies
```bash
cd ignite-lab-app-day3
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your
Supabase project settings (the anon key is safe to expose in the client).

### 3. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and open your project
2. Go to **Authentication → Providers** and make sure **Email** is enabled
3. **Important**: For development, disable email confirmation:
   - Go to **Authentication → Providers → Email**
   - Toggle OFF "Confirm email"
   - This lets you sign up and log in immediately without checking email
4. Go to **SQL Editor** and run every migration in `supabase/migrations/`
   in filename order (`0001_init_schema.sql` … `0023_design_templates_and_posters.sql`),
   or use `supabase db push` with the CLI linked
5. After signing up, run `supabase/migrations/0003_bootstrap_super_admin.sql`
   - Replace `YOUR_EMAIL_HERE` with your actual email
   - This makes you the super admin

### 4. Embed the Learning Engine (first run)
```bash
npm run build:engine
```
Builds `../learning-engine` with a relative asset base and copies it into
`public/learning-engine/`. Re-run it whenever the learning-engine source
changes — the resulting bundle IS committed (18 MB, incl. the pyodide
runtime) so a fresh clone already has everything. The `/learn` page renders
it in a same-origin iframe with hash routing, so everything (books, labs,
storage, offline PDF viewer) stays inside the frame.

### 5. Run the app
```bash
npm run dev
```

Open http://localhost:5173 — you should see the landing page.

### 6. Test the flow
1. Click "Start free" → sign up with your email
2. Go to Supabase SQL Editor → run the bootstrap query with your email
3. Come back → log in → you should see the super admin dashboard

## Project Structure

```
src/
├── lib/
│   └── supabase.js          # Supabase client
├── contexts/
│   └── AuthContext.jsx       # Auth state (user, profile, sign in/out)
├── components/
│   └── ProtectedRoute.jsx   # Route guard (auth + role check)
├── pages/
│   ├── Landing.jsx           # Public landing page
│   ├── Login.jsx             # Email/password login
│   ├── SignUp.jsx            # Registration form
│   └── Dashboard.jsx         # Role-based dashboard
├── App.jsx                   # Router + AuthProvider
├── main.jsx                  # Entry point
└── index.css                 # Global styles + fonts
```

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend/DB/Auth:** Supabase (Postgres + Auth)
- **Code execution:** in-browser runtimes (Pyodide, sql.js) inside the
  Learning Engine; Judge0/Piston optional for server-side execution
- **Code editor:** Monaco Editor / CodeMirror
- **3D simulation:** Three.js
- **Hosting:** Vercel

## Role System

| Role | Can Do |
|------|--------|
| `student` | Complete levels, submit code, view own progress |
| `teacher` | Assign tasks, grade submissions, view students |
| `admin` | Manage courses, levels, teachers in their scope |
| `super_admin` | Approve users, manage admins, full platform control |
