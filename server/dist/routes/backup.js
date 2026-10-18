import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma.js';
import { UPLOAD_DIR } from '../config.js';
const router = Router();
// Export entire database as JSON archive
router.get('/export', async (_req, res, next) => {
    try {
        const [settings, semesters, courses, tags, documents, bookmarks, annotations, notes, assignments, exams, checklistItems, calendarEvents, studySessions,] = await Promise.all([
            prisma.appSetting.findMany(),
            prisma.semester.findMany(),
            prisma.course.findMany(),
            prisma.tag.findMany(),
            prisma.document.findMany(),
            prisma.documentBookmark.findMany(),
            prisma.documentAnnotation.findMany(),
            prisma.note.findMany(),
            prisma.assignment.findMany({ include: { documents: true } }),
            prisma.exam.findMany({ include: { questionPapers: true } }),
            prisma.taskChecklistItem.findMany(),
            prisma.calendarEvent.findMany(),
            prisma.studySession.findMany(),
        ]);
        const backupPayload = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            database: {
                settings,
                semesters,
                courses,
                tags,
                documents,
                bookmarks,
                annotations,
                notes,
                assignments,
                exams,
                checklistItems,
                calendarEvents,
                studySessions,
            },
        };
        const dateStr = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="study-tool-backup-${dateStr}.json"`);
        res.send(JSON.stringify(backupPayload, null, 2));
    }
    catch (error) {
        next(error);
    }
});
// Check database and filesystem consistency
router.get('/integrity', async (_req, res, next) => {
    try {
        const documents = await prisma.document.findMany({
            select: { id: true, title: true, storedFilename: true, fileSize: true },
        });
        const physicalFiles = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : [];
        const diskFileSet = new Set(physicalFiles);
        const missingOnDisk = [];
        for (const doc of documents) {
            if (!diskFileSet.has(doc.storedFilename)) {
                missingOnDisk.push(doc);
            }
        }
        const dbFileSet = new Set(documents.map((d) => d.storedFilename));
        const orphanedFiles = [];
        for (const file of physicalFiles) {
            if (!dbFileSet.has(file)) {
                orphanedFiles.push(file);
            }
        }
        res.json({
            success: true,
            data: {
                totalDbDocuments: documents.length,
                totalDiskFiles: physicalFiles.length,
                missingOnDiskCount: missingOnDisk.length,
                orphanedFilesCount: orphanedFiles.length,
                missingOnDisk,
                orphanedFiles,
                status: missingOnDisk.length === 0 ? 'HEALTHY' : 'WARNING',
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Clean orphaned files
router.post('/clean-orphans', async (_req, res, next) => {
    try {
        const documents = await prisma.document.findMany({ select: { storedFilename: true } });
        const dbFileSet = new Set(documents.map((d) => d.storedFilename));
        const physicalFiles = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : [];
        let cleanedCount = 0;
        for (const file of physicalFiles) {
            if (!dbFileSet.has(file)) {
                try {
                    fs.unlinkSync(path.join(UPLOAD_DIR, file));
                    cleanedCount++;
                }
                catch (err) {
                    console.error('Failed to unlink orphaned file:', file, err);
                }
            }
        }
        res.json({
            success: true,
            message: `Cleaned ${cleanedCount} orphaned files safely.`,
            cleanedCount,
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
