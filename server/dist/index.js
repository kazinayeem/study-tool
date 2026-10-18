import express from 'express';
import cors from 'cors';
import { PORT, CLIENT_URL } from './config.js';
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
const app = express();
// Middlewares
app.use(cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));
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
// Mount Routes
app.use('/api/semesters', semestersRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/documents/:documentId/bookmarks', bookmarksRouter);
app.use('/api/documents/:documentId/annotations', annotationsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/search', searchRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/backup', backupRouter);
// Centralized error handling
app.use(errorHandler);
// Start server if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Academic Backend API server running on http://localhost:${PORT}`);
    });
}
export default app;
