# Ignite Lab

A 3D virtual robotics & programming lab — the commercial platform of DRILL.

## Status: Build Week 1, Day 3 complete

- [x] Day 1 — Project scaffold (Vite + React)
- [x] Day 2 — Database schema (`supabase/migrations/0001_init_schema.sql`)
- [x] Day 3 — Supabase connected, auth UI, RLS policies
- [ ] Day 4 — Super admin approval panel

## Quick Start

### 1. Install dependencies
```bash
cd ignite-lab-app-day3
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and open your project
2. Go to **Authentication → Providers** and make sure **Email** is enabled
3. **Important**: For development, disable email confirmation:
   - Go to **Authentication → Providers → Email**
   - Toggle OFF "Confirm email"
   - This lets you sign up and log in immediately without checking email
4. Go to **SQL Editor** and run these migrations in order:
   - `supabase/migrations/0001_init_schema.sql` (if not already run)
   - `supabase/migrations/0002_rls_policies.sql` ← **NEW**
5. After signing up, run `supabase/migrations/0003_bootstrap_super_admin.sql`
   - Replace `YOUR_EMAIL_HERE` with your actual email
   - This makes you the super admin

### 3. Run the app
```bash
npm run dev
```

Open http://localhost:5173 — you should see the landing page.

### 4. Test the flow
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
- **Code execution:** Judge0 (Build Week 4)
- **Code editor:** Monaco Editor (Build Week 4)
- **3D simulation:** Three.js (Build Week 7+)
- **Hosting:** Cloudflare Pages (Build Week 6)

## Role System

| Role | Can Do |
|------|--------|
| `student` | Complete levels, submit code, view own progress |
| `teacher` | Assign tasks, grade submissions, view students |
| `admin` | Manage courses, levels, teachers in their scope |
| `super_admin` | Approve users, manage admins, full platform control |
