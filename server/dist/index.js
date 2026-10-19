import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PORT, CLIENT_URL, SESSION_SECRET } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import semestersRouter from './routes/semesters.js';
import coursesRouter from './routes/courses.js';
import documentsRouter from './routes/documents.js';
import bookmarksRouter from './routes/bookmarks.js';
import annotationsRouter from './routes/annotations.js';
import notesRouter from './routes/notes.js';
import assignmentsRouter from './routes/assignments.js';
import examsRouter from './routes/exams.js';
import calendarRouter from './routes/calendar.js';
import dashboardRouter from './routes/dashboard.js';
import searchRouter from './routes/search.js';
import settingsRouter from './routes/settings.js';
import backupRouter from './routes/backup.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import notificationsRouter from './routes/notifications.js';
import shareRouter from './routes/share.js';
import gradesRouter from './routes/grades.js';
import plannerRouter from './routes/planner.js';
import projectsRouter from './routes/projects.js';
import { classSessionsRouter, classPhotosRouter } from './routes/classSessions.js';
import degreeRouter from './routes/degree.js';
import { verifySmtpConnection } from './services/mailer.js';
import { initScheduler } from './services/scheduler.js';
import { getOrCreateDefaultOwner, authenticateUser } from './middleware/auth.js';
const app = express();
// Middlewares
app.use(cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));
app.use(cookieParser(SESSION_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Personal Student Management System API',
    });
});
// Mount Routes (both /auth and /api/auth for Google redirect and API calls)
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', authenticateUser, notificationsRouter);
app.use('/api/share', shareRouter);
app.use('/api/grades', authenticateUser, gradesRouter);
app.use('/api/analytics/academic', authenticateUser, (req, res, next) => {
    req.url = '/summary' + (req.url === '/' ? '' : req.url);
    gradesRouter(req, res, next);
});
app.use('/api/grade-scenarios', authenticateUser, (req, res, next) => {
    req.url = '/scenarios' + (req.url === '/' ? '' : req.url);
    gradesRouter(req, res, next);
});
app.use('/api/planner', authenticateUser, plannerRouter);
app.use('/api/study-sessions', authenticateUser, (req, res, next) => {
    req.url = '/sessions' + (req.url === '/' ? '' : req.url);
    plannerRouter(req, res, next);
});
app.use('/api/analytics/study', authenticateUser, (req, res, next) => {
    req.url = req.url === '/export.csv' ? '/export.csv' : ('/analytics' + (req.url === '/' ? '' : req.url));
    plannerRouter(req, res, next);
});
// All academic-workspace routers below require an authenticated identity.
// Ownership scoping of individual records is enforced inside each router.
app.use('/api/semesters', authenticateUser, semestersRouter);
app.use('/api/courses', authenticateUser, coursesRouter);
app.use('/api/documents', authenticateUser, documentsRouter);
app.use('/api/documents/:documentId/bookmarks', authenticateUser, bookmarksRouter);
app.use('/api/documents/:documentId/annotations', authenticateUser, annotationsRouter);
app.use('/api/notes', authenticateUser, notesRouter);
app.use('/api/assignments', authenticateUser, assignmentsRouter);
app.use('/api/tasks', authenticateUser, assignmentsRouter); // Alias for task management API
app.use('/api/projects', authenticateUser, projectsRouter);
app.use('/api/exams', authenticateUser, examsRouter);
app.use('/api/calendar', authenticateUser, calendarRouter);
app.use('/api/dashboard', authenticateUser, dashboardRouter);
app.use('/api/search', authenticateUser, searchRouter);
app.use('/api/settings', authenticateUser, settingsRouter);
app.use('/api/backup', authenticateUser, backupRouter);
app.use('/api/class-sessions', authenticateUser, classSessionsRouter);
app.use('/api/class-photos', authenticateUser, classPhotosRouter);
app.use('/api/degree', authenticateUser, degreeRouter);
// 404 handler for unmatched API requests
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
    });
});
// Centralized error handling
app.use(errorHandler);
// Start server if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, async () => {
        console.log(`🚀 Academic Backend API server running on http://localhost:${PORT}`);
        // Initialize default owner if first time
        await getOrCreateDefaultOwner().catch(console.error);
        // Validate SMTP on startup
        await verifySmtpConnection().catch(console.error);
        // Start persistent reminder scheduler
        initScheduler();
    });
}
export default app;
