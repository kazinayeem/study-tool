# BornoFlow — Personal Student Management System

A personal academic workspace combining the structured organization of **Notion**, the file management of **Google Drive**, a dedicated **PDF reader & annotation workspace**, an **academic calendar**, and advanced **GPA analytics & study planning**.

Built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, **SQLite**, and **Prisma ORM**.

---

## 🏛 Architecture Overview

```
study-tool/
├── client/                     # Vite + React + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/         # Layout (Sidebar, Topbar, CommandPalette, QuickAdd, NotificationDrawer, ShareModal)
│   │   ├── context/            # ThemeContext (Light & Dark modes)
│   │   ├── lib/                # API client (Fetch wrapper) & Utilities (Formatting, Category tokens)
│   │   ├── pages/              # Workspaces:
│   │   │   ├── dashboard/      # Customizable academic widgets, Today/Week/Upcoming views
│   │   │   ├── semesters/      # Term CRUD, duplicate structure, card & list layouts
│   │   │   ├── courses/        # Syllabus, schedules, prep notes, course materials
│   │   │   ├── grades/         # Credit-weighted GPA/CGPA engine, assessment tracker, What-If simulator, CSV export
│   │   │   ├── planner/        # Smart study planner, Pomodoro focus timer, streak analytics, conflict alerts
│   │   │   ├── documents/      # Google Drive-style file workspace & 3-panel PDF study workspace
│   │   │   ├── notes/          # Personal Knowledge Base: folders, wiki links [[Link]], backlinks, revisions, templates
│   │   │   ├── calendar/       # Month, Week, Day, and Agenda views with deadline tracking
│   │   │   ├── assignments/    # Kanban status board, sub-task checklists, priority badges
│   │   │   ├── exams/          # Exam countdowns, preparation bars, linked past question papers
│   │   │   ├── notifications/  # Notification Center: in-app alerts, SMTP delivery audit logs, channel preferences
│   │   │   ├── backup/         # Backup & Restore: full verified snapshots, SHA-256 manifests, staged restore
│   │   │   ├── share/          # Public & unlisted resource viewer with password & expiration verification
│   │   │   └── settings/       # Profile, appearance, grading policy, storage integrity checks
│   │   └── types/              # Full TypeScript interfaces
│   ├── vite.config.ts          # Tailwind v4 plugin & API reverse proxy configuration
│   └── package.json
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── prisma/
│   │   ├── schema.prisma       # Relational Prisma schema with foreign keys, cascades & indexes
│   │   └── seed.ts             # Realistic university semester seed data & sample PDF generation
│   ├── src/
│   │   ├── middleware/         # Centralized error handler, Zod validator, Multer file upload, JWT auth
│   │   ├── routes/             # REST endpoints (dashboard, grades, planner, notes, documents, notifications, backup, share)
│   │   ├── services/           # Nodemailer SMTP transporter, cron reminder scheduler & queue
│   │   ├── utils/              # PDF generator utility
│   │   ├── __tests__/          # Integration tests with Vitest & Supertest (21 tests across 3 suites)
│   │   ├── config.ts           # Environment variables
│   │   ├── prisma.ts           # Singleton Prisma client instance
│   │   └── index.ts            # Express server entry point
│   ├── uploads/                # Dedicated local disk storage for files (outside public root)
│   ├── backups/                # Full .tar.gz backup snapshots with manifest.json & SHA-256 checksums
│   └── dev.db                  # SQLite database file
│
├── .env.example                # Root environment variable documentation
└── package.json                # Monorepo orchestration scripts
```

---

## ⚡ 7 Master Advanced Production Features

### FEATURE 1: Smart Academic Calendar
- **Unified Academic Calendar**: Month, week, day, and agenda views with previous/next navigation and Today shortcut.
- **RFC 5545 `.ics` & CSV Export**: Export standard iCalendar file (`/api/calendar/export?format=ics`) compatible with Apple Calendar, Google Calendar, and Outlook, or CSV spreadsheet (`/api/calendar/export?format=csv`).
- **Conflict & Cluster Detection Engine**: Automatically identifies overlapping events (`/api/calendar/conflicts`) and alerts when multiple exams or deadlines are scheduled within 24 hours of each other.
- **Exam & Deadline Countdowns**: Dashboard and calendar header countdown cards for upcoming exams and high-priority deliverables.
- **11 Event Categories Supported**: Quizzes, Midterms, Finals, Assignment Deadlines, Project Deadlines, Presentations, Lab Submissions, Classes, Study Sessions, Personal Academic Events, and University Events.
- **Timezone Awareness**: Consistent storage and comparison defaulting to `Asia/Dhaka`.

### FEATURE 2: Assignment & Project Workspace
- **7 Supported Task Statuses**: `BACKLOG`, `TODO`, `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `IN_REVIEW`, `COMPLETED`, `CANCELLED`.
- **List & Kanban Views**: Seamless switcher between multi-column Kanban board and detailed tabular list.
- **AI-Style Prioritization Engine**: Suggests which tasks to work on first (`/api/assignments/recommendations`) based on deadline proximity, priority weighting, and effort estimation.
- **Task Duplication**: Rapidly clone tasks as templates (`POST /api/assignments/:id/duplicate`).
- **Effort & Delivery Tracking**: Estimated hours, progress percentages, checklist subtasks, submission timestamps, and links.
- **Project Workspace**: Dedicated project workspace with objectives, target deadlines, deliverable links, and milestones with progress bars.

### FEATURE 3: Study Time Analytics
- **Reliable Pomodoro Focus Timer**: Focus (25m), short break (5m), and long break (15m) modes with audio cues and desktop alerts.
- **Server-State Recovery on Refresh**: Recovers active timer sessions (`/api/planner/sessions/active`) calculating elapsed time strictly from stored database timestamps rather than trusting transient browser counters.
- **Active Timer Collision Prevention**: Enforces a strict single active session concurrency guard returning HTTP 409 if an active timer is already running.
- **Analytics Dashboard**: Daily study time, weekly/monthly totals, average session duration, completed sessions count, and planned vs. actual comparison.
- **Weekly Study Target Goal**: Interactive weekly study budget progress bar with inline target goal updater (`/api/planner/goal`).
- **Data Export**: Direct CSV export endpoint (`/api/planner/export.csv`) for student session logs.
- **Student Privacy**: All session notes and detailed study logs remain private to the student and are never exposed in admin telemetry.

### FEATURE 4: Academic Performance Analytics & What-If Calculator
- **Configurable Grading Policy**: Edit university grading rules, letter grade cutoffs, grade points, and minimum passing threshold in Settings (`GradeScale`).
- **Assessment Weighting & Records**: Track marks across Quizzes, Midterm, Final, Presentations, Labs, and Projects with strict boundary validation (`obtainedMarks <= maxMarks`).
- **Credit-Weighted Engine**: Real-time Semester GPA and cumulative CGPA calculation.
- **What-If Scenario Simulator**: Explore hypothetical future courses (title, credits, simulated grade) with live projected CGPA preview.
- **Persistent Scenarios (`GradeScenario`)**: Save What-If scenarios without ever modifying or overwriting actual course grades.
- **Reporting & Export**: Instant export to CSV spreadsheet and print-ready semester performance reports.

### FEATURE 5: Document Version History
- **Automatic Archival on Replace**: Replacing a document preserves the prior version in `DocumentVersion` without overwriting the only copy.
- **Filesystem Storage & Cryptographic Checksums**: Physical files stored securely on disk with server-generated filenames; metadata and SHA-256 checksums recorded in SQLite. Large files are never stored as SQLite blobs.
- **Non-Destructive Restoration**: Restoring an archived version archives the current version and sets the chosen version as current, preserving the complete history timeline.
- **Version Download & Strict Access Control**: Authenticated and authorized endpoints (`/api/documents/:id/versions/:versionId/download`) enforcing owner access. Administrators cannot download private document versions.

### FEATURE 6: Notification Inbox
- **In-App Notification Center**: Persistent notification inbox with unread counts, mark-as-read, mark-all-as-read, and delete actions.
- **Scheduler Integration**: Single unified scheduler processing upcoming exams, deadlines, and study session reminders without duplicating emails.
- **Deduplication & Reliability**: Idempotency keys prevent duplicate reminders across server restarts with bounded exponential backoff retries.
- **Privacy-Safe Previews**: Generic preview titles prevent leaking sensitive document or note content in previews.
- **Demo Mode Suppression**: Prevents demo student accounts from sending real external emails.

### FEATURE 7: Admin Audit & Usage Analytics
- **Privacy-Safe Usage Metrics**: Dedicated allowlisted DTOs for system feature adoption counts (`/api/admin/analytics/features`) across all seven modules.
- **User Engagement Telemetry**: Total registered accounts, active users (7d / 30d), total sign-ins, and daily sign-in trends (`/api/admin/analytics/engagement`).
- **Immutable Admin Action Audit**: Records administrative events (account disabled/reactivated, role changes, settings updates) with server-verified admin actor IDs (`/api/admin/audit`).
- **Zero-Private-Content Policy**: Admin activity stream strictly excludes private document contents, PDF text, note bodies, and session notes.
- **Data Export**: Export courses, assignments, exams, and notes in structured JSON or CSV.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm

### 1. Clone & Install Dependencies
```bash
git clone <repo-url> study-tool
cd study-tool

# Install root, client, and server dependencies
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

Edit `server/.env` to configure:
- `PORT=5001`
- `JWT_SECRET=your-secure-random-jwt-secret`
- `SMTP_HOST=`, `SMTP_PORT=587`, `SMTP_USER=`, `SMTP_PASSWORD=`
- `EMAIL_NOTIFICATIONS_ENABLED=true`
- `NOTIFICATION_TIMEZONE=Asia/Dhaka`

### 3. Initialize Database & Seed
```bash
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
```

*Pre-configured Accounts:*
- **Default Administrator:** `owner@scholarflow.local` / `Password123!` (Role: `ADMIN`)
- **Seeded Demo Student:** `demo.student@example.com` (Role: `DEMO`, One-click access via "Explore Demo Student Account")

### 4. Google OAuth 2.0 Configuration in Google Cloud Console
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Configure the **OAuth Consent Screen** with scopes: `openid`, `email`, `profile`.
3. Create an **OAuth 2.0 Client ID** of type **Web application**.
4. Configure **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `http://localhost:5001`
5. Configure **Authorized redirect URIs**:
   - `http://localhost:5001/auth/google/callback`
   - `http://localhost:5001/api/auth/google/callback`
6. Add your credentials into `server/.env`:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5001/auth/google/callback
   ```

### 5. Run Development Servers
```bash
npm run dev
```
- Frontend will be available at: **http://localhost:5173**
- Backend API will run at: **http://localhost:5001**

---

## 🛡 Security, RBAC & Strict Privacy-Preserving Telemetry

### Role-Based Access Control (RBAC)
- **`ADMIN`**: Manages user accounts (enable/disable), revokes sessions, monitors high-level operational activity streams. Protected by safety logic preventing the last active administrator from losing administrative access.
- **`STUDENT`**: Authenticates via Google OAuth 2.0 or Email. Full access to their own academic courses, notes, and private documents. Strict boundary checks prevent students from viewing other users' private files.
- **`DEMO`**: One-click sandboxed student experience with pre-seeded semesters, courses, assignments, exams, and study notes. Sandboxed from modifying production records or accessing real users' files.

### Strict Privacy by Design
- **Zero Content Access**: Administrators have access **ONLY** to high-level operational metadata (e.g., `A user uploaded a document`, `A user created a private note`).
- Administrators **CANNOT** view, download, preview, or read private documents, PDF highlights, note bodies, assignment descriptions, or private URLs.
- Server-side ownership guards are enforced even against administrator tokens.
- Activity logging strictly allowlists telemetry fields and guarantees document bodies, passwords, tokens, or note contents are never serialized or stored.

---

## 🧪 Testing

Execute the comprehensive automated test suite covering authentication, RBAC, strict privacy barriers, calculation models, reminder jobs, and backup verification:

```bash
# Run server test suite (34 tests across 4 suites)
cd server
npm test

# Build client production bundle
cd ../client
npm run build
```

---

## 📄 License
MIT License. Built for personal student management.
