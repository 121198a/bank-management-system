# Bank Management System

A full-stack, production-ready bank management application built with React, Node.js,
Express, and MongoDB — with JWT authentication, role-based access control (Admin,
Employee, Customer), audit logging, KYC workflows, and PDF statement generation.

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, react-hot-toast, lucide-react
**Backend:** Node.js 20, Express 4, MongoDB/Mongoose 8, JWT (access + refresh tokens), bcryptjs, pdfkit, nodemailer
**Auth:** JWT access tokens (15 min) + HTTP-only refresh token cookies (7 days, rotated on every use)
**RBAC:** Admin / Employee / Customer roles enforced at middleware level on every protected route

## How User Accounts Work

This project does **not** ship with bulk demo data. The seed script creates **only one
administrator account**. Every other account (employees and customers) must be created
by the administrator from inside the app, via **Admin → User Management → Create User**.

```
npm run seed
     │
     ▼
Single admin account in MongoDB
     │
     ▼
Admin logs in at /login
     │
     ▼
Admin → User Management → "Create User"
     │
     ├─→ Creates Employee accounts
     └─→ Creates Customer accounts
```

Customers can also self-register via the public **Register** page — that flow always
creates a `customer` role account and cannot create employees or admins (enforced
server-side, not just hidden in the UI).

## Initial Administrator Account

Defined in `backend/src/utils/seed.js`:

## Demo Administrator Account

| Field | Value |
|---------|---------|
| Name | Admin User |
| Email | admin@example.com |
| Password | Generated during seed process |
| Role | admin |

This is the **only** account that exists immediately after running `npm run seed`. To
use different credentials, edit the `ADMIN_ACCOUNT` object at the top of
`backend/src/utils/seed.js` before running it.

## Project Structure

```
bank-management-system/
├── backend/          Node.js + Express REST API
│   ├── src/
│   │   ├── config/       DB + env config
│   │   ├── controllers/  Request handlers (8 controllers)
│   │   ├── middleware/   auth, rbac, validate, errorHandler, auditLogger
│   │   ├── models/       Mongoose models (6 models)
│   │   ├── routes/       Express routers (8 route files)
│   │   ├── services/     email, PDF statement, token service
│   │   ├── utils/        ApiError, ApiResponse, asyncHandler, seed
│   │   └── validators/   express-validator chains (5 files)
│   ├── .env.example
│   └── package.json
└── frontend/         React + Vite SPA
    ├── public/           favicon
    └── src/
        ├── api/          Axios instance + all API modules
        ├── components/   UI, layout, charts, skeletons
        ├── context/      AuthContext (single source of truth for auth), ThemeContext
        ├── pages/        auth/, customer/, admin/, employee/
        ├── routes/       ProtectedRoute with role guard
        └── utils/        formatters
```

---

## Complete Setup Guide (VS Code, step by step)

### Step 1 — Install prerequisites

1. **Node.js 20 or later** — https://nodejs.org (LTS version). Verify:
   ```bash
   node -v        # should print v20.x.x or higher
   npm -v
   ```
2. **MongoDB** — either:
   - **Local install:** https://www.mongodb.com/try/download/community, then start the service (Step 4), or
   - **MongoDB Atlas (cloud, free tier, easiest):** https://www.mongodb.com/cloud/atlas/register — create a free cluster, get a connection string like `mongodb+srv://user:pass@cluster.mongodb.net/bank_management_system`.
3. **VS Code** — https://code.visualstudio.com

### Step 2 — Open the project in VS Code

```bash
# Extract the zip you downloaded, then:
cd bank-management-system
code .
```

### Step 3 — Install recommended VS Code extensions

Open the Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`) and install:
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier - Code formatter** (esbenp.prettier-vscode)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **MongoDB for VS Code** (mongodb.mongodb-vscode) — browse your DB visually
- **Thunder Client** (rangav.vscode-thunder-client) — test API endpoints in VS Code
- **DotENV** (mikestead.dotenv) — syntax highlighting for `.env` files

### Step 4 — Start MongoDB

**Local MongoDB:**

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongod
sudo systemctl enable mongod

# Windows
# Install via the MSI installer from mongodb.com — runs as a Windows service automatically.
```

Verify:
```bash
mongosh   # should connect without error; type exit to leave
```

**MongoDB Atlas:** no local start needed — just copy your connection string for Step 5,
and in Atlas's Network Access settings, allow your IP (or `0.0.0.0/0` for local dev).

### Step 5 — Configure backend environment variables

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` in VS Code and edit it:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Local MongoDB:
MONGO_URI=mongodb://127.0.0.1:27017/bank_management_system

# OR Atlas connection string:
# MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/bank_management_system

JWT_ACCESS_SECRET=replace_with_a_long_random_string_1
JWT_REFRESH_SECRET=replace_with_a_different_long_random_string_2
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
JWT_REFRESH_EXPIRES_MS=604800000

# SMTP is optional for local dev — emails print to the terminal instead of
# sending if these are left blank.
SMTP_HOST=
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Bank Management System <no-reply@digitalbank.com>"

RESET_PASSWORD_EXPIRES_MS=3600000
```

Generate two **different** random secrets by running this twice:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be real values or the server refuses to start.

### Step 6 — Install backend dependencies and create the admin account

```bash
# inside bank-management-system/backend
npm install
npm run seed
```

Expected output:

```
MongoDB Connected: 127.0.0.1/bank_management_system
Admin account created successfully.

--- Administrator Account Created Successfully ---
Credentials configured locally in seed.js
-------------------------------------------------
Password verified against database: OK

Log in with these credentials, then use User Management to create
employee and customer accounts from the admin dashboard.
```

Seeing **"Password verified against database: OK"** confirms the bcrypt hashing/comparison
chain works end-to-end before you even open the browser. Safe to re-run any time — it
resets the existing admin's password rather than erroring on a duplicate.

### Step 7 — Start the backend server

```bash
npm run dev
```

```
MongoDB Connected: 127.0.0.1/bank_management_system
Server running in development mode on port 5000
```

Leave this running. Open a **second terminal** (`` Ctrl+Shift+` ``) for the frontend.

### Step 8 — Install and start the frontend

```bash
cd frontend
npm install
npm run dev
```

```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### Step 9 — Log in

Open http://localhost:5173. Enter:

```
Email:    admin@digitalbank.com
Password: ************
```

You'll land on `/admin` — the admin dashboard.

### Step 10 — Create employee and customer accounts

Sidebar → **User Management** → **Create User**. Fill in:
- Account Type: Employee or Customer
- Full Name, Email
- Temporary password (auto-generated, editable, click **Copy**)
- Phone / Address (optional)

Share the generated credentials with that person. They can change their password from
their **Profile** page after logging in.

---

## What Was Fixed (auth/token reliability)

A previous version of this project had two separate, conflicting implementations of
login/logout/token-refresh — one inside `AuthContext`, and a second one called directly
from the Login page via `authAPI`. They each tracked the access token independently
(one in React state, one in `sessionStorage`), and only one of them was actually wired
into the axios request interceptor that attaches the `Authorization` header. The result
was intermittent **"no token" / "access denied"** errors: a fresh login looked fine
because the page-level code happened to set the right value, but the very next silent
background refresh (or a full page reload) would update only the *other* copy of the
token, leaving axios sending requests with a stale or missing `Authorization` header.

This has been fixed by consolidating everything into a single source of truth:

- **`frontend/src/api/axiosInstance.js`** now owns `getAuthToken()` / `setAuthToken()`
  (backed by `sessionStorage`) and is the *only* place that reads or writes the token.
- **`frontend/src/context/AuthContext.jsx`** is the *only* place that calls
  `setAuthToken()` — every login, logout, and silent refresh goes through it, so the
  token used by axios and the `user` object used by the UI can never drift apart.
- **`frontend/src/api/authAPI.js`** no longer exposes `login`/`logout`/`refresh` at all —
  only the genuinely stateless calls (`register`, `forgotPassword`, `resetPassword`)
  remain, so it's no longer possible to accidentally bypass `AuthContext`.
- The 401-retry interceptor now queues concurrent requests during a refresh (instead of
  firing parallel refresh calls, which could trip the backend's refresh-token reuse
  detection and force-invalidate a perfectly valid session), and only force-redirects
  to `/login` when the user isn't already on a public auth page.
- The backend's login controller logs a specific reason (`No user found` vs `Password
  mismatch`) to the server console in development mode, so any future login issue is
  immediately diagnosable instead of a generic 401.

If you still see an "access denied" message after these fixes, it almost always means
the role genuinely doesn't have permission for that action (e.g. a customer trying to
open the Audit Logs page) — that's correct, intentional RBAC behavior, not a bug. Pages
route customers/employees away from admin-only sections automatically.

---

## Troubleshooting

### "Invalid email or password" when logging in as admin

1. Confirm the backend terminal shows `MongoDB Connected` — if not, MongoDB isn't running
   or `MONGO_URI` is wrong.
2. Confirm `npm run seed` printed `Password verified against database: OK`.
3. Check the email is exactly `admin@digitalbank.com` (case-insensitive, but watch for
   typos/extra spaces).
4. Watch the backend terminal while logging in — development mode logs
   `[login] No user found for email: "..."` or `[login] Password mismatch for email: "..."`.

### Logged in successfully but then get "access denied" on the next page or after a few minutes

This was the core bug described above and is fixed in this version. If you still see it
after pulling this code, check the browser console for any errors and confirm you didn't
re-introduce a direct call to `authAPI.login`/`logout`/`refresh` from a page component —
all auth state changes must go through `useAuth()` from `AuthContext`.

### "MongooseServerSelectionError" or "ECONNREFUSED 127.0.0.1:27017"

MongoDB isn't running — see Step 4. If using Atlas, check your IP is allow-listed.

### "Missing required environment variable: JWT_ACCESS_SECRET"

You left `.env` values as placeholder text or didn't copy `.env.example` to `.env` —
redo Step 5.

### Frontend shows a blank page or network errors in the browser console

Make sure the backend (port 5000) is running **before** loading the frontend, and that
`CLIENT_URL` in `backend/.env` matches the frontend's actual URL.

### Port already in use

```bash
# macOS/Linux:
lsof -i :5000
kill -9 <PID>
# Windows (PowerShell):
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## Environment Variables Reference (backend/.env)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGO_URI=mongodb://127.0.0.1:27017/bank_management_system

JWT_ACCESS_SECRET=your_long_random_access_secret
JWT_REFRESH_SECRET=your_different_long_random_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
JWT_REFRESH_EXPIRES_MS=604800000

SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_FROM="Bank Management System <no-reply@digitalbank.com>"

RESET_PASSWORD_EXPIRES_MS=3600000
```

## API Endpoints

| Method | Endpoint                              | Auth     | Role              |
|--------|----------------------------------------|----------|-------------------|
| POST   | /api/auth/register                    | No       | — (always creates `customer`) |
| POST   | /api/auth/login                       | No       | —                 |
| POST   | /api/auth/refresh                     | Cookie   | —                 |
| POST   | /api/auth/logout                      | No       | —                 |
| POST   | /api/auth/forgot-password             | No       | —                 |
| POST   | /api/auth/reset-password/:token       | No       | —                 |
| GET    | /api/users/me                         | JWT      | All               |
| PUT    | /api/users/me                         | JWT      | All               |
| GET    | /api/users                            | JWT      | Admin, Employee   |
| POST   | /api/users                            | JWT      | Admin (create employee/customer) |
| PUT    | /api/users/:id                        | JWT      | Admin (edit details) |
| PUT    | /api/users/:id/role                   | JWT      | Admin             |
| PUT    | /api/users/:id/status                 | JWT      | Admin             |
| POST   | /api/accounts                         | JWT      | Customer          |
| GET    | /api/accounts/my                      | JWT      | Customer          |
| GET    | /api/accounts                         | JWT      | Admin, Employee   |
| PUT    | /api/accounts/:id/approve             | JWT      | Admin, Employee   |
| PUT    | /api/accounts/:id/status              | JWT      | Admin             |
| POST   | /api/transactions/deposit             | JWT      | Customer+         |
| POST   | /api/transactions/withdraw            | JWT      | Customer+         |
| POST   | /api/transactions/transfer            | JWT      | Customer+         |
| GET    | /api/transactions/account/:accountId  | JWT      | Owner/Admin/Emp   |
| GET    | /api/transactions                     | JWT      | Admin, Employee   |
| GET    | /api/transactions/statement/:id/pdf   | JWT      | Owner/Admin/Emp   |
| POST   | /api/kyc/submit                       | JWT      | Customer          |
| GET    | /api/kyc/my                           | JWT      | Customer          |
| GET    | /api/kyc                              | JWT      | Admin, Employee   |
| PUT    | /api/kyc/:id/review                   | JWT      | Admin, Employee   |
| GET    | /api/notifications                    | JWT      | All               |
| PUT    | /api/notifications/read-all           | JWT      | All               |
| PUT    | /api/notifications/:id/read           | JWT      | All               |
| DELETE | /api/notifications/:id                | JWT      | All               |
| GET    | /api/audit                            | JWT      | Admin             |
| GET    | /api/dashboard/stats                  | JWT      | All (role-aware)  |
| GET    | /api/health                           | No       | —                 |

## Security Notes

- JWT access tokens (15 min) + HTTP-only refresh cookies (7 days), rotated on every refresh
- Refresh token reuse detection — a replayed/stolen refresh token invalidates the session
- Bcrypt password hashing (cost factor 12)
- Helmet HTTP headers, CORS restricted to `CLIENT_URL`
- All mutating endpoints validated with express-validator
- Every admin/employee action is recorded in Audit Logs

## Build for Production

```bash
# Frontend
cd frontend && npm run build   # outputs dist/

# Backend
cd backend && NODE_ENV=production node src/server.js
```

## License

MIT
