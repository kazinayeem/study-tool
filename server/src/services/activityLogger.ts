import { prisma } from '../prisma.js';

export const ALLOWED_EVENT_TYPES = [
  'SIGN_IN',
  'SIGN_OUT',
  'COURSE_CREATE',
  'COURSE_UPDATE',
  'COURSE_DELETE',
  'ASSIGNMENT_CREATE',
  'ASSIGNMENT_UPDATE',
  'EXAM_CREATE',
  'EXAM_UPDATE',
  'STUDY_SESSION_CREATE',
  'STUDY_SESSION_UPDATE',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_DELETE',
  'NOTE_CREATE',
  'NOTE_UPDATE',
  'NOTE_DELETE',
  'PDF_WORKSPACE_USE',
  'BACKUP_GENERATE',
  'SHARE_LINK_CREATE',
  'SHARE_LINK_REVOKE',
  'PREFERENCES_UPDATE',
  'ACCOUNT_STATUS_CHANGE',
] as const;

export type ActivityEventType = (typeof ALLOWED_EVENT_TYPES)[number];

export interface LogActivityParams {
  userId: string;
  eventType: ActivityEventType | string;
  resourceType?: string;
  resourceId?: string;
  isDemo?: boolean;
  metadata?: Record<string, any>;
}

// Strict allowlist for metadata keys to prevent accidental leaks of sensitive or private content
const ALLOWED_METADATA_KEYS = new Set([
  'category',
  'mimeType',
  'fileSize',
  'pageCount',
  'courseCode',
  'semesterName',
  'status',
  'ip',
  'isDemo',
  'action',
  'targetUserId',
  'newStatus',
]);

/**
 * Privacy-safe activity logger.
 * Guarantees that private contents (notes, documents, tokens, passwords) are NEVER stored in activity logs.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { userId, eventType, resourceType, resourceId, isDemo = false, metadata = {} } = params;

    // Filter metadata to strictly allowlisted keys
    const sanitizedMetadata: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (ALLOWED_METADATA_KEYS.has(key)) {
        // Ensure values are primitives or safe strings, never objects with sensitive nested fields
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          sanitizedMetadata[key] = value;
        }
      }
    }

    await prisma.activityEvent.create({
      data: {
        userId,
        eventType,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        isDemo,
        metadataJson: Object.keys(sanitizedMetadata).length > 0 ? JSON.stringify(sanitizedMetadata) : null,
      },
    });
  } catch (error) {
    // Fail-safe: activity logging should never crash the main application flow
    console.error('⚠️ [ActivityLogger] Failed to record activity event:', error);
  }
}

/**
 * Human-friendly, privacy-safe event descriptions for the admin timeline.
 * Note: Never includes note content, private titles, document contents, or file paths.
 */
export function formatActivityDescription(event: {
  eventType: string;
  resourceType?: string | null;
  metadataJson?: string | null;
  isDemo?: boolean;
}): string {
  let meta: Record<string, any> = {};
  if (event.metadataJson) {
    try {
      meta = JSON.parse(event.metadataJson);
    } catch {
      // ignore
    }
  }

  const prefix = event.isDemo ? '[Demo Account] ' : '';

  switch (event.eventType) {
    case 'SIGN_IN':
      return `${prefix}Signed in to workspace`;
    case 'SIGN_OUT':
      return `${prefix}Signed out of workspace`;
    case 'DOCUMENT_UPLOAD':
      return `${prefix}Uploaded a document${meta.category ? ` (${meta.category})` : ''}`;
    case 'DOCUMENT_DELETE':
      return `${prefix}Deleted a document`;
    case 'NOTE_CREATE':
      return `${prefix}Created a private study note`;
    case 'NOTE_UPDATE':
      return `${prefix}Edited a private study note`;
    case 'NOTE_DELETE':
      return `${prefix}Deleted a note`;
    case 'PDF_WORKSPACE_USE':
      return `${prefix}Interacted with PDF study workspace`;
    case 'COURSE_CREATE':
      return `${prefix}Created a course${meta.courseCode ? ` [${meta.courseCode}]` : ''}`;
    case 'COURSE_UPDATE':
      return `${prefix}Updated course details`;
    case 'COURSE_DELETE':
      return `${prefix}Deleted a course`;
    case 'ASSIGNMENT_CREATE':
      return `${prefix}Created a coursework assignment`;
    case 'ASSIGNMENT_UPDATE':
      return `${prefix}Updated an assignment`;
    case 'EXAM_CREATE':
      return `${prefix}Added an academic exam to schedule`;
    case 'EXAM_UPDATE':
      return `${prefix}Updated exam details`;
    case 'STUDY_SESSION_CREATE':
      return `${prefix}Scheduled a focused study session`;
    case 'STUDY_SESSION_UPDATE':
      return `${prefix}Updated study session`;
    case 'BACKUP_GENERATE':
      return `${prefix}Generated a database & file backup`;
    case 'SHARE_LINK_CREATE':
      return `${prefix}Created a resource share link`;
    case 'SHARE_LINK_REVOKE':
      return `${prefix}Revoked a resource share link`;
    case 'PREFERENCES_UPDATE':
      return `${prefix}Updated notification preferences`;
    case 'ACCOUNT_STATUS_CHANGE':
      return `${prefix}Admin changed account status to ${meta.newStatus || 'updated'}`;
    default:
      return `${prefix}Activity: ${event.eventType}`;
  }
}
