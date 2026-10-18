# ScholarFlow — Personal Student Management System

A personal academic workspace combining the structured organization of **Notion**, the file management of **Google Drive**, a dedicated **PDF reader & annotation workspace**, and an **academic calendar**.

Built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, **SQLite**, and **Prisma ORM**.

---

## 🏛 Architecture Overview

```
study-tool/
├── client/                     # Vite + React + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/         # Layout (Sidebar, Topbar, CommandPalette, QuickAdd, NotificationDrawer)
│   │   ├── context/            # ThemeContext (Light & Dark modes)
│   │   ├── lib/                # API client (Fetch wrapper) & Utilities (Formatting, Category tokens)
│   │   ├── pages/              # Workspaces:
│   │   │   ├── dashboard/      # Real-time academic metrics, upcoming exams & assignments
│   │   │   ├── semesters/      # Term CRUD, duplicate structure, card & list layouts
│   │   │   ├── courses/        # Syllabus, schedules, prep notes, course materials
│   │   │   ├── documents/      # Google Drive-style file workspace & dedicated PDF viewer
│   │   │   ├── notes/          # Notion-style rich-text note editor with autosave & conflict resolution
│   │   │   ├── calendar/       # Month, Week, Day, and Agenda views with deadline tracking
│   │   │   ├── assignments/    # Kanban status board, sub-task checklists, priority badges
│   │   │   ├── exams/          # Exam countdowns, preparation bars, linked past question papers
│   │   │   └── settings/       # Profile, appearance, storage integrity checks & JSON backups
│   │   └── types/              # Full TypeScript interfaces
│   ├── vite.config.ts          # Tailwind v4 plugin & API reverse proxy configuration
│   └── package.json
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── prisma/
│   │   ├── schema.prisma       # Relational Prisma schema with foreign keys, cascades & indexes
│   │   └── seed.ts             # Realistic university semester seed data & sample PDF generation
│   ├── src/
│   │   ├── middleware/         # Centralized error handler, Zod validator, Multer file upload
│   │   ├── routes/             # REST endpoints for all entities
│   │   ├── utils/              # PDF generator utility
│   │   ├── __tests__/          # Integration tests with Vitest & Supertest
│   │   ├── config.ts           # Environment variables
│   │   ├── prisma.ts           # Singleton Prisma client instance
│   │   └── index.ts            # Express server entry point
│   ├── uploads/                # Dedicated local disk storage for files (outside public root)
│   └── dev.db                  # SQLite database file
│
├── .env.example                # Root environment variable documentation
└── package.json                # Monorepo orchestration scripts
```

---

## ⚡ Key Features

### 1. Semester & Course Workspaces
- **Term Lifecycle**: Create, edit, archive, and delete terms (e.g. *Fall 2026*, *Spring 2027*).
- **Structure Duplication**: Duplicate an entire semester's course catalog for a new term without accidentally copying uploaded documents.
- **Course Profiles**: Track course code, instructor email, credits, classroom, syllabus, and schedules.
- **Syllabus Mastery Slider**: Track syllabus completion percentage dynamically.

### 2. Academic Document Workspace & PDF Viewer
- **Google Drive Categorization**: Organize files into *Lecture Slides*, *Class Notes*, *Midterm Questions*, *Final Questions*, *Previous Year Questions*, *Assignments*, *Lab Reports*, *Research Papers*, *Syllabus*, and *Other Documents*.
- **Dedicated PDF Viewer**:
  - HTML5 canvas rendering using `pdfjs-dist`.
  - Zoom controls (fit width, zoom in/out, 60%–300%).
  - Real-time in-PDF text search.
  - Page jumps and previous/next page navigation.
  - Scanned vs. searchable vector PDF detection.
- **Persistent Annotations & Bookmarks**:
  - Highlights with custom colors (Yellow, Green, Blue, Pink, Orange) and comments stored in SQLite.
  - Page-specific bookmarks with direct page jump links.
  - Sibling course document switcher directly in the reader sidebar.
- **Safe Storage**: Uploaded files receive collision-resistant cryptographic filenames and are served with strict path traversal protections. Deleting a document removes both its database record and physical disk file.

### 3. Notion-Inspired Note-Taking
- **Rich Text Formatting**: Headings (H1, H2), bold, italic, bullet lists, numbered lists, checklists, quotes, and code blocks.
- **Resilient Autosave**: Debounced autosave after inactivity with live visual indicators (`Editing...` → `Saving...` → `Saved`).
- **Conflict Prevention**: Optimistic version locking prevents stale client updates from overwriting newer server revisions.
- **Offline Fallback**: Unsaved changes are cached in `localStorage` if network connectivity is interrupted.
- **Direct Linking**: Link notes to specific courses, exams, assignments, or documents.

### 4. Calendar & Deadline Management
- **Multiple Views**: Month grid, Week view, Day view, and Agenda list.
- **Event Categorization**: Color-coded badges for *Midterm*, *Final*, *Assignment*, *Project*, *Lab*, *Class*, and *Study Session*.
- **Quick Creation**: Click any calendar day to immediately schedule a task or study session.
- **In-App Reminder Drawer**: Slides out to highlight events occurring within the next 48 hours.

### 5. Assignments & Exam Tracker
- **Kanban Board**: Drag tasks between *Not Started*, *In Progress*, *Submitted*, and *Completed*.
- **Dynamic Deadline Calculations**: Visual overdue badges and remaining day countdowns.
- **Sub-task Checklists**: Interactive checklists within each assignment card.
- **Question Paper Linking**: Link previous-year question papers directly to an exam with 1-click preview.
- **Revision Metrics**: Dynamic preparation progress bar based on completed syllabus revision checklist items.

### 6. Command Palette (`Cmd+K` / `Ctrl+K`)
- Global command palette accessible from anywhere.
- Instant search across semesters, courses, documents, notes, assignments, exams, and calendar events.
- Quick action shortcuts to upload PDFs, create notes, and add deadlines.

### 7. Data Safety & Backup
- **JSON Database Backup**: 1-click export of your complete academic database.
- **Storage Integrity Audit**: Audits SQLite records against physical disk files, identifying any missing files or orphaned disk assets with an automated cleanup option.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v24+ recommended)
- **npm**: v9.0.0 or higher

### 1. Installation
Clone or navigate to the project directory:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Database Setup & Seeding
Initialize the SQLite database and seed it with sample university data:
```bash
cd server

# Generate Prisma Client & push schema to dev.db
npx prisma generate
npx prisma db push

# Seed realistic university semester data (Fall 2026 courses, sample PDFs, notes, exams)
npm run db:seed

cd ..
```

### 3. Running the Development Servers
You can start both frontend and backend concurrently from the root directory:
```bash
npm run dev
```

Alternatively, run them in separate terminals:
```bash
# Terminal 1: Backend Server (runs on http://localhost:5001)
npm run dev:server

# Terminal 2: Frontend Client (runs on http://localhost:5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

Run the automated API test suite:
```bash
# Run server test suite
npm run test
```

Or from the `server` folder:
```bash
cd server
npm test
```

This verifies:
- API health and routing
- Semester creation and non-destructive structure duplication
- Document upload, pagination, and metadata integrity
- Note optimistic concurrency locking and conflict rejection
- Real dynamic dashboard statistic calculation
- Global cross-entity search

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/dashboard` | Aggregated dashboard metrics & upcoming items |
| `GET` | `/api/semesters` | List all semesters |
| `POST` | `/api/semesters` | Create a semester |
| `POST` | `/api/semesters/:id/duplicate` | Duplicate semester structure without files |
| `GET` | `/api/courses` | List courses (filter by `semesterId`) |
| `POST` | `/api/courses` | Create a course |
| `GET` | `/api/documents` | List documents (supports `category`, `courseId`, `search`) |
| `POST` | `/api/documents/upload` | Upload a document file (Multer) |
| `GET` | `/api/documents/:id/file` | Stream document inline for PDF.js preview |
| `GET` | `/api/documents/:id/download` | Download document attachment |
| `POST` | `/api/documents/:id/replace` | Replace file safely while keeping metadata |
| `DELETE` | `/api/documents/:id` | Delete document and delete physical file on disk |
| `GET` | `/api/documents/:id/bookmarks` | List bookmarks for document |
| `POST` | `/api/documents/:id/bookmarks` | Add page bookmark |
| `GET` | `/api/documents/:id/annotations` | List highlights and annotations |
| `POST` | `/api/documents/:id/annotations` | Save highlight and comment |
| `GET` | `/api/notes` | List notes (filter by `courseId`, `search`) |
| `POST` | `/api/notes` | Create a note |
| `PUT` | `/api/notes/:id` | Autosave note with optimistic locking |
| `GET` | `/api/assignments` | List assignments with days remaining |
| `POST` | `/api/assignments` | Create assignment & auto-schedule calendar event |
| `PATCH` | `/api/assignments/:id/checklist/:itemId/toggle` | Toggle sub-task checklist item |
| `GET` | `/api/exams` | List exams with revision checklist & prep % |
| `POST` | `/api/exams` | Create exam & link past question papers |
| `GET` | `/api/calendar` | List calendar events by date range |
| `GET` | `/api/calendar/reminders` | Active reminders in the next 48 hours |
| `GET` | `/api/search?q=:query` | Global search across all entities |
| `GET` | `/api/backup/export` | Download full database as JSON file |
| `GET` | `/api/backup/integrity` | Verify disk files against database records |
| `POST` | `/api/backup/clean-orphans` | Clean unindexed disk files |

---

## 🔒 Security & Data Safety Assurances

1. **Path Traversal Protection**: All file requests use `path.basename` sanitization and check against `UPLOAD_DIR` to prevent directory traversal attacks (`../../`).
2. **Safe Filename Generation**: Files are stored with cryptographically secure timestamped hex hashes (`<timestamp>-<random-hex>.<ext>`) to prevent collision or filename injection.
3. **MIME & Extension Whitelisting**: Strict checks verify permitted academic formats (PDF, DOCX, PPTX, TXT, MD, CSV, images).
4. **No SQLite Blobs**: SQLite stores metadata and file pointers; physical files remain in the dedicated `server/uploads/` directory to ensure high database performance.
5. **No Stack Traces**: Production error responses suppress internal paths and stack traces.

---

## 📋 Database Reset

To reset the database and re-seed sample data from scratch:
```bash
cd server
rm -f dev.db dev.db-journal
npx prisma db push
npm run db:seed
```
