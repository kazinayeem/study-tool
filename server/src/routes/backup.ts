import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import multer from 'multer';
import { prisma } from '../prisma.js';
import { UPLOAD_DIR } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const execFileAsync = promisify(execFile);
const router = Router();

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Multer storage for uploaded backup restore archives
const upload = multer({
  dest: path.join(BACKUP_DIR, 'staging-uploads'),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
});

function computeFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// 1. GET /api/backup/records - List backup records
router.get('/records', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const records = await prisma.backupRecord.findMany({
      where: { ...ownedBy(req) },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/backup/create - Create verified backup snapshot (DB + uploads + SHA-256 manifest)
router.post('/create', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tempDir = path.join(BACKUP_DIR, `temp-${timestamp}`);
  const archiveFilename = `bornoflow-backup-${timestamp}.tar.gz`;
  const archivePath = path.join(BACKUP_DIR, archiveFilename);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const tempUploadsDir = path.join(tempDir, 'uploads');
    fs.mkdirSync(tempUploadsDir, { recursive: true });

    // Step 1: Checkpoint WAL safely before copying SQLite file
    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch {
      // WAL checkpoint non-fatal
    }

    // Step 2: Copy dev.db safely
    const sourceDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
    const targetDbPath = path.join(tempDir, 'database.db');
    if (fs.existsSync(sourceDbPath)) {
      fs.copyFileSync(sourceDbPath, targetDbPath);
    } else {
      throw new AppError('Active database file dev.db not found', 500);
    }

    // Step 3: Copy physical uploads
    let fileCount = 0;
    const manifestFiles: Array<{ path: string; sha256: string; sizeBytes: number }> = [];

    // Manifest entry for database
    manifestFiles.push({
      path: 'database.db',
      sha256: computeFileSha256(targetDbPath),
      sizeBytes: fs.statSync(targetDbPath).size,
    });
    fileCount++;

    if (fs.existsSync(UPLOAD_DIR)) {
      const uploadFiles = fs.readdirSync(UPLOAD_DIR);
      for (const file of uploadFiles) {
        const srcPath = path.join(UPLOAD_DIR, file);
        if (fs.statSync(srcPath).isFile()) {
          const destPath = path.join(tempUploadsDir, file);
          fs.copyFileSync(srcPath, destPath);
          manifestFiles.push({
            path: path.join('uploads', file),
            sha256: computeFileSha256(destPath),
            sizeBytes: fs.statSync(destPath).size,
          });
          fileCount++;
        }
      }
    }

    // Step 4: Write manifest.json
    const manifest = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      appVersion: 'BornoFlow v1.0',
      fileCount,
      files: manifestFiles,
    };
    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // Step 5: Archive with native tar
    await execFileAsync('tar', ['-czf', archivePath, '-C', tempDir, '.']);

    // Step 6: Verify and save backup record
    const archiveSize = fs.statSync(archivePath).size;
    const archiveChecksum = computeFileSha256(archivePath);

    const record = await prisma.backupRecord.create({
      data: {
        userId: ownerId(req),
        filename: archiveFilename,
        filePath: archivePath,
        sizeBytes: archiveSize,
        checksum: archiveChecksum,
        itemCount: fileCount,
        manifestJson: JSON.stringify(manifest),
        status: 'SUCCESS',
      },
    });

    // Cleanup temp staging directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    res.status(201).json({
      success: true,
      message: 'Backup created successfully with verified SHA-256 manifest',
      data: record,
    });
  } catch (error: any) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    next(error);
  }
});

// 3. GET /api/backup/download/:id - Download backup archive
router.get('/download/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const record = await prisma.backupRecord.findFirst({ where: { id, ...ownedBy(req) } });
    if (!record || !fs.existsSync(record.filePath)) {
      return res.status(404).json({ success: false, error: 'Backup archive file not found' });
    }

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${record.filename}"`);
    fs.createReadStream(record.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

// Safe extraction and verification helper
async function performSafeRestore(archivePath: string): Promise<{ success: boolean; verifiedFilesCount: number }> {
  const restoreTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const stagingDir = path.join(BACKUP_DIR, `staging-restore-${restoreTimestamp}`);

  try {
    fs.mkdirSync(stagingDir, { recursive: true });

    // Step 1: Extract archive to staging
    await execFileAsync('tar', ['-xzf', archivePath, '-C', stagingDir]);

    // Step 2: Validate manifest existence
    const manifestPath = path.join(stagingDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Restore rejected: Backup archive is missing manifest.json');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (!manifest.files || !Array.isArray(manifest.files)) {
      throw new Error('Restore rejected: Malformed manifest.json format');
    }

    // Step 3: Verify SHA-256 checksums of all files against manifest
    for (const fileEntry of manifest.files) {
      // Prevent path traversal
      if (fileEntry.path.includes('..') || path.isAbsolute(fileEntry.path)) {
        throw new Error(`Restore rejected: Unsafe path detected: ${fileEntry.path}`);
      }

      const filePath = path.join(stagingDir, fileEntry.path);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Restore rejected: Missing file listed in manifest: ${fileEntry.path}`);
      }

      const actualChecksum = computeFileSha256(filePath);
      if (actualChecksum !== fileEntry.sha256) {
        throw new Error(`Restore rejected: Checksum mismatch for ${fileEntry.path} (Corrupted archive)`);
      }
    }

    // Step 4: Create safety snapshot of current active DB before applying
    const activeDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
    if (fs.existsSync(activeDbPath)) {
      const safetyCopyPath = path.join(BACKUP_DIR, `safety-pre-restore-${restoreTimestamp}.db`);
      fs.copyFileSync(activeDbPath, safetyCopyPath);
    }

    // Step 5: Replace database file
    const stagedDbPath = path.join(stagingDir, 'database.db');
    fs.copyFileSync(stagedDbPath, activeDbPath);

    // Step 6: Sync uploads directory
    const stagedUploadsDir = path.join(stagingDir, 'uploads');
    if (fs.existsSync(stagedUploadsDir)) {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const files = fs.readdirSync(stagedUploadsDir);
      for (const file of files) {
        fs.copyFileSync(path.join(stagedUploadsDir, file), path.join(UPLOAD_DIR, file));
      }
    }

    // Cleanup staging
    fs.rmSync(stagingDir, { recursive: true, force: true });

    return { success: true, verifiedFilesCount: manifest.files.length };
  } catch (err) {
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    throw err;
  }
}

// 4. POST /api/backup/restore/:id - Restore from existing backup record
router.post('/restore/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const record = await prisma.backupRecord.findFirst({ where: { id, ...ownedBy(req) } });
    if (!record || !fs.existsSync(record.filePath)) {
      return res.status(404).json({ success: false, error: 'Backup file not found on disk' });
    }

    const result = await performSafeRestore(record.filePath);

    res.json({
      success: true,
      message: `Database and uploaded files successfully restored! (${result.verifiedFilesCount} files verified)`,
    });
  } catch (error: any) {
    next(new AppError(error.message || 'Failed to restore backup', 400));
  }
});

// 5. POST /api/backup/restore-upload - Upload external backup archive and restore safely
router.post('/restore-upload', upload.single('backupFile'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No backup file provided' });
  }

  const uploadedPath = req.file.path;
  try {
    const result = await performSafeRestore(uploadedPath);
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);

    res.json({
      success: true,
      message: `External backup restored successfully! (${result.verifiedFilesCount} files verified)`,
    });
  } catch (error: any) {
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    next(new AppError(error.message || 'Failed to restore uploaded backup', 400));
  }
});

// 6. GET /api/backup/export - Export complete database JSON
router.get('/export', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [
      settings,
      semesters,
      courses,
      tags,
      documents,
      bookmarks,
      annotations,
      notes,
      noteFolders,
      assignments,
      exams,
      checklistItems,
      calendarEvents,
      studyPlans,
      studySessions,
      assessments,
      gradeScales,
    ] = await Promise.all([
      prisma.appSetting.findMany(),
      prisma.semester.findMany(),
      prisma.course.findMany(),
      prisma.tag.findMany(),
      prisma.document.findMany(),
      prisma.documentBookmark.findMany(),
      prisma.documentAnnotation.findMany(),
      prisma.note.findMany(),
      prisma.noteFolder.findMany(),
      prisma.assignment.findMany({ include: { documents: true } }),
      prisma.exam.findMany({ include: { questionPapers: true } }),
      prisma.taskChecklistItem.findMany(),
      prisma.calendarEvent.findMany(),
      prisma.studyPlan.findMany(),
      prisma.studySession.findMany(),
      prisma.assessment.findMany(),
      prisma.gradeScale.findMany(),
    ]);

    const backupPayload = {
      version: '2.0',
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
        noteFolders,
        assignments,
        exams,
        checklistItems,
        calendarEvents,
        studyPlans,
        studySessions,
        assessments,
        gradeScales,
      },
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bornoflow-db-export-${dateStr}.json"`);
    res.send(JSON.stringify(backupPayload, null, 2));
  } catch (error) {
    next(error);
  }
});

// 7. Check database and filesystem consistency
router.get('/integrity', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const documents = await prisma.document.findMany({
      select: { id: true, title: true, storedFilename: true, fileSize: true },
    });

    const physicalFiles = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : [];
    const diskFileSet = new Set(physicalFiles);

    const missingOnDisk: any[] = [];
    for (const doc of documents) {
      if (!diskFileSet.has(doc.storedFilename)) {
        missingOnDisk.push(doc);
      }
    }

    const dbFileSet = new Set(documents.map((d) => d.storedFilename));
    const orphanedFiles: string[] = [];
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
  } catch (error) {
    next(error);
  }
});

// 8. Clean orphaned files
router.post('/clean-orphans', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        } catch (err) {
          console.error('Failed to unlink orphaned file:', file, err);
        }
      }
    }

    res.json({
      success: true,
      message: `Cleaned ${cleanedCount} orphaned files safely.`,
      cleanedCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
