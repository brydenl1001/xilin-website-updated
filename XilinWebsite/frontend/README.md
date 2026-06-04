# Academia — School Management Frontend

## Stack
- React 18 + Vite
- Tailwind CSS 3 (Navy/Gold design system)
- React Router v6
- Supabase JS client
- Lucide React icons

## Quick Start

```bash
npm install
cp .env.example .env        # fill in your Supabase credentials
npm run dev                  # http://localhost:5173
```

## Demo Login
Visit `/login` and click any role card to preview:
- **Admin** — full school management
- **Teacher** — classes, grades, attendance
- **Student** — personal academic records
- **Parent** — child's progress

## Connect Supabase
1. Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`
2. In `src/context/AuthContext.jsx`, uncomment the real Supabase auth block
3. Replace mock data calls in each page with `supabase.from(...)` queries

## Pages
| Route | Page | Roles |
|-------|------|-------|
| `/dashboard` | Role-aware overview | All |
| `/announcements` | Notice board | All (create: Admin/Teacher) |
| `/enrollments` | Application pipeline | All (manage: Admin) |
| `/payments` | Fee management + sandbox pay | All |
| `/grades` | Gradebook | All |
| `/attendance` | Daily tracking | All |
| `/timetable` | Weekly schedule | All |
| `/settings` | Profile & notifications | All |

## Structure
```
src/
├── components/
│   ├── layout/   DashboardLayout, Sidebar, Topbar
│   └── ui/       Button, Card, Badge, Modal, Input, StatCard…
├── context/      AuthContext (mock + Supabase-ready)
├── lib/          supabase.js, mockData.js
├── pages/        One file per route
└── router/       index.jsx, ProtectedRoute.jsx
```
