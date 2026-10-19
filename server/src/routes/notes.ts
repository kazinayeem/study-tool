import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { optionalAuthenticateOwner } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ownedBy, ownerId } from '../middleware/ownership.js';
import { logActivity } from '../services/activityLogger.js';
import { upload } from '../middleware/upload.js';
import { UPLOAD_DIR } from '../config.js';
import { validateSemesterCourseConsistency } from '../utils/academicValidation.js';
import { sanitizeNoteHtml, validateNoteContentJson } from '../utils/noteContent.js';
import { Packer } from 'docx';
import { buildNoteDocxDocument } from '../utils/docxExport.js';
import mammoth from 'mammoth';

const router = Router();

// Pre-defined knowledge base templates
const NOTE_TEMPLATES = [
  {
    id: 'lecture-notes',
    title: 'Lecture Note Template',
    description: 'Structured layout for university lecture notes with key concepts and action items.',
    content: `<h1>Lecture: [Topic Name]</h1>
<p><strong>Course:</strong> [Course Code] | <strong>Date:</strong> [Date] | <strong>Instructor:</strong> [Professor Name]</p>
<hr />
<h2>Key Concepts & Definitions</h2>
<ul>
  <li><strong>Concept 1:</strong> Description and theoretical significance.</li>
  <li><strong>Concept 2:</strong> Mathematical formula or core principle.</li>
</ul>
<h2>Detailed Notes & Derivations</h2>
<p>Write detailed explanations, bullet points, and code snippets here...</p>
<pre><code>// Example algorithm or pseudocode</code></pre>
<h2>Summary & High-Yield Takeaways</h2>
<p>Consolidate the entire lecture into 2-3 main takeaways.</p>
<h2>Action Items & Follow-up</h2>
<ul class="checklist">
  <li>Review textbook chapter [X]</li>
  <li>Complete practice problems [Y, Z]</li>
</ul>`,
  },
  {
    id: 'reading-summary',
    title: 'Research Paper / Reading Summary',
    description: 'Critical analysis framework for academic papers and textbook chapters.',
    content: `<h1>Reading Summary: [Paper / Chapter Title]</h1>
<p><strong>Authors / Source:</strong> [Citation] | <strong>Status:</strong> Completed Reading</p>
<hr />
<h2>Core Research Question / Thesis</h2>
<p>What fundamental problem does this paper address?</p>
<h2>Key Methodology & Approach</h2>
<ul>
  <li>Dataset / Benchmark utilized:</li>
  <li>Model architecture / Theoretical framework:</li>
</ul>
<h2>Main Results & Discoveries</h2>
<p>Key empirical results, performance metrics, or analytical findings.</p>
<h2>Critical Evaluation & Weaknesses</h2>
<p>What are the potential limitations, omitted edge cases, or future research directions?</p>`,
  },
  {
    id: 'lab-report',
    title: 'Lab & Practical Experiment',
    description: 'Documentation template for experimental procedures, observations, and conclusions.',
    content: `<h1>Lab Report: [Experiment Title]</h1>
<p><strong>Course:</strong> [Course Code] | <strong>Lab Session:</strong> #[X]</p>
<hr />
<h2>Objective</h2>
<p>State the specific aim of the practical session.</p>
<h2>Apparatus & Environment Setup</h2>
<ul>
  <li>Hardware / OS:</li>
  <li>Software tools / Libraries:</li>
</ul>
<h2>Experimental Procedure & Code</h2>
<p>Step-by-step methodology followed during the session.</p>
<h2>Observations & Test Results</h2>
<p>Tabulated data, test suite pass rates, or measurement observations.</p>
<h2>Conclusions & Discussion</h2>
<p>What was verified or learned from the experiment?</p>`,
  },
  {
    id: 'exam-prep',
    title: 'Exam Revision & Cram Sheet',
    description: 'High-density revision guide organizing formulas, pitfalls, and question patterns.',
    content: `<h1>Exam Revision: [Course Code] [Midterm / Final]</h1>
<hr />
<h2>High-Yield Topics Checklist</h2>
<ul class="checklist">
  <li>Topic 1: Core Theorems</li>
  <li>Topic 2: Standard Algorithm Walkthroughs</li>
  <li>Topic 3: Past Question Paper 2024 Patterns</li>
</ul>
<h2>Key Formulas & Cheat Sheet</h2>
<p>Write critical equations and memory aids here...</p>
<h2>Common Pitfalls & Mistakes to Avoid</h2>
<ul>
  <li>Do not forget base cases in recursion.</li>
  <li>Verify boundary constraints on array indices.</li>
</ul>`,
  },
];

// Helper: Synchronize internal note links and backlinks
async function syncNoteLinks(sourceNoteId: string, content: string, req: AuthenticatedRequest) {
  try {
    // 1. Remove existing outgoing links
    await prisma.noteLink.deleteMany({
      where: { sourceNoteId },
    });

    // 2. Parse wiki links: [[Title]] or [[Title|Anchor]]
    const wikiRegex = /\[\[(.*?)\]\]/g;
    const matches: string[] = [];
    let match;
    while ((match = wikiRegex.exec(content)) !== null) {
      if (match[1]) matches.push(match[1].trim());
    }

    for (const rawMatch of matches) {
      const parts = rawMatch.split('|');
      const targetTitle = parts[0].trim();
      const anchorText = parts[1]?.trim() || targetTitle;

      // Find target note (case-insensitive or exact, latest update)
      const targetNote = await prisma.note.findFirst({
        where: {
          ...ownedBy(req),
          title: targetTitle,
          id: { not: sourceNoteId },
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });

      if (targetNote) {
        await prisma.noteLink.create({
          data: {
            sourceNoteId,
            targetNoteId: targetNote.id,
            linkType: 'NOTE',
            anchorText,
          },
        });
      }
    }
  } catch (err) {
    console.error('Error syncing note links:', err);
  }
}

// ==================== FOLDERS ====================

// GET /api/notes/folders - List all note folders
router.get('/folders', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const folders = await prisma.noteFolder.findMany({
      where: { ...ownedBy(req) },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { notes: true } },
      },
    });
    res.json({ success: true, data: folders });
  } catch (error) {
    next(error);
  }
});

// POST /api/notes/folders - Create a note folder
router.post('/folders', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, color = '#6366f1', icon = 'folder', parentId } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Folder name is required' });

    const folder = await prisma.noteFolder.create({
      data: {
        name,
        color,
        icon,
        parentId: parentId || null,
        userId: ownerId(req),
      },
    });
    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notes/folders/:id - Delete a note folder
router.delete('/folders/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const folder = await prisma.noteFolder.findFirst({ where: { id, ...ownedBy(req) } });
    if (!folder) throw new AppError('Folder not found', 404);
    await prisma.noteFolder.delete({ where: { id } });
    res.json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    next(error);
  }
});

// GET /api/notes/templates - List pre-built templates
router.get('/templates', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: NOTE_TEMPLATES });
});

// GET /api/notes/orphan-notes - Notes with no incoming or outgoing links
router.get('/orphan-notes', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notes = await prisma.note.findMany({
      where: {
        ...ownedBy(req),
        outgoingLinks: { none: {} },
        incomingLinks: { none: {} },
      },
      select: { id: true, title: true, updatedAt: true },
      take: 20,
    });
    res.json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
});

// ==================== NOTES CRUD ====================

const createNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().default(''),
    contentJson: z.string().nullable().optional(),
    semesterId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    documentId: z.string().nullable().optional(),
    assignmentId: z.string().nullable().optional(),
    examId: z.string().nullable().optional(),
    folderId: z.string().nullable().optional(),
    isPinned: z.boolean().default(false),
    isArchived: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    reminderDate: z.string().nullable().optional(),
  }),
});

const updateNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    content: z.string().optional(),
    contentJson: z.string().nullable().optional(),
    semesterId: z.string().nullable().optional(),
    courseId: z.string().nullable().optional(),
    documentId: z.string().nullable().optional(),
    assignmentId: z.string().nullable().optional(),
    examId: z.string().nullable().optional(),
    folderId: z.string().nullable().optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    reminderDate: z.string().nullable().optional(),
    expectedVersion: z.number().int().optional(),
  }),
});

// List notes with filters & search
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { semesterId, courseId, documentId, examId, folderId, search, tag, isPinned, isArchived } = req.query;

    const where: any = { AND: [ownedBy(req)] };
    if (semesterId) where.semesterId = String(semesterId);
    if (courseId) where.courseId = String(courseId);
    if (documentId) where.documentId = String(documentId);
    if (examId) where.examId = String(examId);
    if (folderId) where.folderId = String(folderId);
    if (isPinned !== undefined) where.isPinned = isPinned === 'true';
    if (isArchived !== undefined) {
      where.isArchived = isArchived === 'true';
    } else {
      where.isArchived = false;
    }


    if (search) {
      const q = String(search).trim();
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
      ];
    }

    if (tag) {
      where.tags = { contains: String(tag) };
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        semester: { select: { id: true, name: true, color: true } },
        course: { select: { id: true, code: true, title: true, color: true } },
        document: { select: { id: true, title: true, originalFilename: true } },
        exam: { select: { id: true, title: true, examType: true } },
        assignment: { select: { id: true, title: true } },
        folder: { select: { id: true, name: true, color: true } },
        _count: {
          select: { incomingLinks: true, revisions: true },
        },
      },
    });

    res.json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
});

// Get single note with backlinks & links
router.get('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findFirst({
      where: { id, ...ownedBy(req) },
      include: {
        semester: true,
        course: true,
        document: true,
        exam: true,
        assignment: true,
        folder: true,
        outgoingLinks: {
          include: {
            targetNote: { select: { id: true, title: true } },
            targetDocument: { select: { id: true, title: true } },
          },
        },
        incomingLinks: {
          include: {
            sourceNote: { select: { id: true, title: true, updatedAt: true } },
          },
        },
      },
    });

    if (!note) {
      throw new AppError('Note not found', 404);
    }

    // STRICT PRIVACY: Admins and other students CANNOT access another student's private notes!
    if (note.userId && (!req.user || req.user.id !== note.userId)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You do not have permission to view another user's private note.",
      });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
});

// Create note
router.post('/', optionalAuthenticateOwner, validate(createNoteSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      content,
      contentJson,
      semesterId,
      courseId,
      documentId,
      assignmentId,
      examId,
      folderId,
      isPinned,
      isArchived,
      tags,
      reminderDate,
    } = req.body;

    // Validate the canonical Lexical editor state and sanitize derived HTML.
    const contentCheck = validateNoteContentJson(contentJson);
    if (!contentCheck.ok) {
      throw new AppError(contentCheck.error || 'Invalid note content', 400);
    }
    const safeContent = sanitizeNoteHtml(content || '');

    // Strict Academic Integrity Validation: Semester -> Course
    const validated = await validateSemesterCourseConsistency(courseId, semesterId);

    const note = await prisma.note.create({
      data: {
        title,
        content: safeContent,
        contentJson: contentCheck.value ?? null,
        semesterId: validated.semesterId,
        courseId: validated.courseId,
        documentId: documentId || null,
        assignmentId: assignmentId || null,
        examId: examId || null,
        folderId: folderId || null,
        userId: ownerId(req),
        isPinned: !!isPinned,
        isArchived: !!isArchived,
        tags: tags ? JSON.stringify(tags) : null,
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        version: 1,
      },
      include: {
        semester: true,
        course: true,
        document: true,
        folder: true,
      },
    });

    // Create initial revision
    await prisma.noteRevision.create({
      data: {
        noteId: note.id,
        version: 1,
        title: note.title,
        content: note.content,
        contentJson: note.contentJson,
        createdReason: 'INITIAL_VERSION',
      },
    });

    // Sync links
    if (note.content) {
      await syncNoteLinks(note.id, note.content, req);
    }

    // Log privacy-safe activity (never log note title or body!)
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        eventType: 'NOTE_CREATE',
        resourceType: 'NOTE',
        resourceId: note.id,
        isDemo: req.user.role === 'DEMO',
      });
    }

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
});

// Update or Autosave note with optimistic locking and revision history
router.put('/:id', optionalAuthenticateOwner, validate(updateNoteSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      contentJson,
      semesterId,
      courseId,
      documentId,
      assignmentId,
      examId,
      folderId,
      isPinned,
      isArchived,
      tags,
      reminderDate,
      expectedVersion,
    } = req.body;

    const existingNote = await prisma.note.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existingNote) {
      throw new AppError('Note not found', 404);
    }

    if (existingNote.userId && (!req.user || req.user.id !== existingNote.userId)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You cannot edit another user's note.",
      });
    }

    // Version conflict check if expectedVersion provided
    if (expectedVersion !== undefined && existingNote.version > expectedVersion) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: The note was modified elsewhere. Reload to view the latest version.',
        currentVersion: existingNote.version,
        serverNote: existingNote,
      });
    }

    const nextVersion = existingNote.version + 1;
    const updateData: any = {
      version: nextVersion,
    };

    // Strict Academic Integrity Validation: Semester -> Course
    if (courseId !== undefined || semesterId !== undefined) {
      const targetCourseId = courseId !== undefined ? courseId : existingNote.courseId;
      const targetSemesterId = semesterId !== undefined ? semesterId : existingNote.semesterId;
      const validated = await validateSemesterCourseConsistency(targetCourseId, targetSemesterId);
      updateData.courseId = validated.courseId;
      updateData.semesterId = validated.semesterId;
    }

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = sanitizeNoteHtml(content);
    if (contentJson !== undefined) {
      const contentCheck = validateNoteContentJson(contentJson);
      if (!contentCheck.ok) {
        throw new AppError(contentCheck.error || 'Invalid note content', 400);
      }
      updateData.contentJson = contentCheck.value ?? null;
    }
    if (documentId !== undefined) updateData.documentId = documentId;
    if (assignmentId !== undefined) updateData.assignmentId = assignmentId;
    if (examId !== undefined) updateData.examId = examId;
    if (folderId !== undefined) updateData.folderId = folderId;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (reminderDate !== undefined) updateData.reminderDate = reminderDate ? new Date(reminderDate) : null;


    const updated = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        semester: true,
        course: true,
        document: true,
        folder: true,
      },
    });

    // Save revision periodically (every 5 versions or if title changed)
    if (nextVersion % 5 === 0 || (title && title !== existingNote.title)) {
      await prisma.noteRevision.create({
        data: {
          noteId: id,
          version: nextVersion,
          title: updated.title,
          content: updated.content,
          contentJson: updated.contentJson,
          createdReason: 'AUTOSAVE',
        },
      });
    }

    // Sync links if content changed
    if (content !== undefined && updateData.content !== existingNote.content) {
      await syncNoteLinks(id, updateData.content, req);
    }

    res.json({
      success: true,
      message: 'Note saved successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// Toggle pin status
router.patch('/:id/pin', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.note.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Note not found', 404);

    const updated = await prisma.note.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// GET /api/notes/:id/revisions - List revision history
router.get('/:id/revisions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findFirst({ where: { id, ...ownedBy(req) } });
    if (!note) throw new AppError('Note not found', 404);

    const revisions = await prisma.noteRevision.findMany({
      where: { noteId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: revisions });
  } catch (error) {
    next(error);
  }
});

// POST /api/notes/:id/revisions/:revId/restore - Restore an earlier revision
router.post('/:id/revisions/:revId/restore', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id, revId } = req.params;
    const currentNote = await prisma.note.findFirst({ where: { id, ...ownedBy(req) } });
    if (!currentNote) throw new AppError('Note not found', 404);

    const revision = await prisma.noteRevision.findUnique({ where: { id: revId } });
    if (!revision || revision.noteId !== id) {
      return res.status(404).json({ success: false, error: 'Revision not found' });
    }

    const newVersion = currentNote.version + 1;
    const updated = await prisma.note.update({
      where: { id },
      data: {
        title: revision.title,
        content: revision.content,
        contentJson: revision.contentJson,
        version: newVersion,
      },
    });

    // Record the restore as a new revision
    await prisma.noteRevision.create({
      data: {
        noteId: id,
        version: newVersion,
        title: revision.title,
        content: revision.content,
        contentJson: revision.contentJson,
        createdReason: `RESTORED_FROM_V${revision.version}`,
      },
    });

    await syncNoteLinks(id, revision.content, req);

    res.json({ success: true, message: `Restored to version ${revision.version}`, data: updated });
  } catch (error) {
    next(error);
  }
});

// GET /api/notes/:id/export/md - Export note as Markdown
router.get('/:id/export/md', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findFirst({
      where: { id, ...ownedBy(req) },
      include: {
        course: { select: { code: true, title: true } },
        semester: { select: { name: true } },
      },
    });

    if (!note) throw new AppError('Note not found', 404);

    // Convert HTML tags to plain markdown line breaks where simple
    let md = note.content
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul>|<\/ul>|<ol>|<\/ol>/gi, '')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');

    const frontmatter = [
      '---',
      `title: "${note.title.replace(/"/g, '\\"')}"`,
      note.course ? `course: "${note.course.code} - ${note.course.title}"` : null,
      note.semester ? `semester: "${note.semester.name}"` : null,
      `updatedAt: "${note.updatedAt.toISOString()}"`,
      '---',
      '',
      '',
    ].filter(Boolean).join('\n');

    const fileContent = frontmatter + md;
    const safeTitle = note.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.md"`);
    res.send(fileContent);
  } catch (error) {
    next(error);
  }
});

// Delete note
router.delete('/:id', optionalAuthenticateOwner, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findFirst({ where: { id, ...ownedBy(req) } });

    if (!note) {
      throw new AppError('Note not found', 404);
    }

    if (note.userId && (!req.user || req.user.id !== note.userId)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You cannot delete another user's note.",
      });
    }

    await prisma.note.delete({ where: { id } });

    if (req.user) {
      await logActivity({
        userId: req.user.id,
        eventType: 'NOTE_DELETE',
        resourceType: 'NOTE',
        resourceId: id,
        isDemo: req.user.role === 'DEMO',
      });
    }

    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==================== IMAGE ATTACHMENTS ====================

// POST /api/notes/upload-image - Upload an image embedded in note
router.post('/upload-image', upload.single('image'), (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }
    const imageUrl = `/api/notes/image/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notes/image/:filename - Serve uploaded note image safely
router.get('/image/:filename', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// ==================== WORD / DOCX IMPORT & EXPORT ====================

// POST /api/notes/import/docx - Import Word DOCX document into rich-text HTML
router.post('/import/docx', upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No DOCX file provided for import' });
    }

    const result = await mammoth.convertToHtml({ path: req.file.path });
    const html = result.value;
    const warnings = result.messages.map((m) => m.message);

    // Clean up temporary upload file
    try {
      fs.unlinkSync(req.file.path);
    } catch {}

    const title = req.file.originalname.replace(/\.docx$/i, '').trim() || 'Imported Document';

    res.json({
      success: true,
      data: {
        title,
        html,
        warnings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notes/:id/export/docx - Export note as professional Word (.docx) document
router.get('/:id/export/docx', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findFirst({
      where: { id, ...ownedBy(req) },
      include: {
        course: { select: { code: true, title: true } },
        semester: { select: { name: true } },
      },
    });

    if (!note) throw new AppError('Note not found', 404);

    const doc = buildNoteDocxDocument({
      title: note.title,
      courseName: note.course ? `${note.course.code} - ${note.course.title}` : null,
      semesterName: note.semester ? note.semester.name : null,
      updatedAt: note.updatedAt,
      content: note.content || '',
    });

    const buffer = await Packer.toBuffer(doc);
    const safeTitle = note.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'document';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notes/:id/archive - Toggle archive status
router.patch('/:id/archive', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.note.findFirst({ where: { id, ...ownedBy(req) } });
    if (!existing) throw new AppError('Note not found', 404);

    const updated = await prisma.note.update({
      where: { id },
      data: { isArchived: !existing.isArchived },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;


