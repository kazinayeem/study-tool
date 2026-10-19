import nodemailer, { Transporter } from 'nodemailer';
import { SMTP_CONFIG, APP_BASE_URL } from '../config.js';

let transporter: Transporter | null = null;

export function getTransporter(): Transporter | null {

  if (!SMTP_CONFIG.host) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure, // true for 465, false for 587 / other
      auth: SMTP_CONFIG.user && SMTP_CONFIG.password ? {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.password,
      } : undefined,
      tls: {
        rejectUnauthorized: false, // Allows local / self-signed SMTP testing if needed
      },
    });
  }
  return transporter;
}

/**
 * Validates SMTP configuration at server startup.
 * Logs safe diagnostic status without leaking passwords or secrets.
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  if (!SMTP_CONFIG.host) {
    const msg = 'SMTP Host not configured. Email notifications are currently dormant.';
    console.log(`ℹ️ [Mailer] ${msg}`);
    return { success: false, message: msg };
  }

  const transport = getTransporter();
  if (!transport) {
    return { success: false, message: 'SMTP Transporter could not be initialized.' };
  }

  try {
    await transport.verify();
    const msg = `SMTP connection verified successfully (${SMTP_CONFIG.host}:${SMTP_CONFIG.port}, Secure: ${SMTP_CONFIG.secure})`;
    console.log(`✅ [Mailer] ${msg}`);
    return { success: true, message: msg };
  } catch (err: any) {
    const safeError = err?.message || 'Unknown SMTP connection error';
    console.warn(`⚠️ [Mailer] SMTP verification failed for ${SMTP_CONFIG.host}:${SMTP_CONFIG.port} - ${safeError}`);
    return { success: false, message: safeError };
  }
}

/**
 * Format a Date object nicely in the user's timezone.
 */
export function formatDateTimeInTz(date: Date | string, timezone = 'Asia/Dhaka'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(d) + ` (${timezone})`;
  } catch {
    return new Date(date).toLocaleString() + ` (${timezone})`;
  }
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a generic formatted email via Nodemailer.
 * Verifies SMTP transport acceptance before returning.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ messageId?: string; accepted?: string[] }> {
  if (!SMTP_CONFIG.enabled) {
    throw new Error('Email notifications are globally disabled in server configuration.');
  }

  const transport = getTransporter();
  if (!transport) {
    throw new Error('SMTP credentials are not configured on this server. Please set SMTP_HOST and credentials in .env.');
  }

  const mailOptions = {
    from: `"${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.fromEmail}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };

  const info = await transport.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    accepted: Array.isArray(info.accepted) ? (info.accepted as string[]) : [payload.to],
  };
}

/**
 * Responsive HTML Email Layout Base with clean styling
 */
function wrapHtmlTemplate(title: string, badge: string, contentHtml: string, actionButton?: { text: string; url: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header .app-badge { display: inline-block; margin-top: 8px; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; }
    .body-content { padding: 32px 24px; }
    .card-badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #4f46e5; background: #eef2ff; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .meta-table td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #edf2f7; }
    .meta-table tr:last-child td { border-bottom: none; }
    .meta-label { color: #64748b; font-weight: 600; width: 35%; }
    .meta-value { color: #0f172a; font-weight: 500; }
    .button-container { text-align: center; margin: 32px 0 16px; }
    .action-button { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="app-badge">${badge}</div>
      <h1 style="margin-top: 10px;">${title}</h1>
    </div>
    <div class="body-content">
      ${contentHtml}
      ${actionButton ? `
      <div class="button-container">
        <a href="${actionButton.url}" class="action-button" target="_blank">${actionButton.text} &rarr;</a>
      </div>` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;">This academic notification was sent by <strong>${SMTP_CONFIG.fromName}</strong>.</p>
      <p style="margin: 0;">Configure your email schedules in <a href="${APP_BASE_URL}/settings">Notification Preferences</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

// 1. Assignment Reminder Template
export function getAssignmentEmail(data: {
  assignmentTitle: string;
  courseName: string;
  semesterName?: string;
  deadline: Date | string;
  status: string;
  assignmentId: string;
  timezone?: string;
}): EmailPayload {
  const tz = data.timezone || SMTP_CONFIG.defaultTimezone;
  const formattedDeadline = formatDateTimeInTz(data.deadline, tz);
  const appUrl = `${APP_BASE_URL}/assignments?id=${data.assignmentId}`;

  const subject = `Reminder: Assignment Due — ${data.assignmentTitle}`;
  const html = wrapHtmlTemplate(
    data.assignmentTitle,
    'Assignment Reminder',
    `
    <span class="card-badge">${data.courseName}</span>
    <p style="font-size: 15px; margin: 0 0 16px;">
      You have an assignment deadline coming up. Review the assignment details below and check your progress:
    </p>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Course</td>
        <td class="meta-value">${data.courseName}</td>
      </tr>
      ${data.semesterName ? `<tr><td class="meta-label">Semester</td><td class="meta-value">${data.semesterName}</td></tr>` : ''}
      <tr>
        <td class="meta-label">Deadline</td>
        <td class="meta-value" style="color: #dc2626; font-weight: 700;">${formattedDeadline}</td>
      </tr>
      <tr>
        <td class="meta-label">Status</td>
        <td class="meta-value"><strong>${data.status.replace('_', ' ')}</strong></td>
      </tr>
    </table>
    `,
    { text: 'View Assignment in Workspace', url: appUrl }
  );

  const text = `Assignment Reminder: ${data.assignmentTitle}\n\n` +
    `Course: ${data.courseName}\n` +
    (data.semesterName ? `Semester: ${data.semesterName}\n` : '') +
    `Deadline: ${formattedDeadline}\n` +
    `Current Status: ${data.status}\n\n` +
    `View Assignment: ${appUrl}\n\n` +
    `Sent by ${SMTP_CONFIG.fromName}`;

  return { to: '', subject, html, text };
}

// 2. Quiz Reminder Template
export function getQuizEmail(data: {
  quizTitle: string;
  courseName: string;
  courseId: string;
  examDate: Date | string;
  preparationNotes?: string | null;
  timezone?: string;
}): EmailPayload {
  const tz = data.timezone || SMTP_CONFIG.defaultTimezone;
  const formattedDate = formatDateTimeInTz(data.examDate, tz);
  const appUrl = `${APP_BASE_URL}/courses/${data.courseId}`;

  const subject = `Upcoming Quiz — ${data.courseName}`;
  const html = wrapHtmlTemplate(
    data.quizTitle || `Quiz — ${data.courseName}`,
    'Upcoming Quiz Alert',
    `
    <span class="card-badge">${data.courseName}</span>
    <p style="font-size: 15px; margin: 0 0 16px;">
      A quiz is scheduled soon. Review course materials and practice key concepts:
    </p>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Quiz Title</td>
        <td class="meta-value">${data.quizTitle}</td>
      </tr>
      <tr>
        <td class="meta-label">Course</td>
        <td class="meta-value">${data.courseName}</td>
      </tr>
      <tr>
        <td class="meta-label">Date & Time</td>
        <td class="meta-value" style="color: #4f46e5; font-weight: 700;">${formattedDate}</td>
      </tr>
      ${data.preparationNotes ? `<tr><td class="meta-label">Prep Notes</td><td class="meta-value">${data.preparationNotes}</td></tr>` : ''}
    </table>
    `,
    { text: 'Open Course Workspace', url: appUrl }
  );

  const text = `Upcoming Quiz: ${data.quizTitle}\n\n` +
    `Course: ${data.courseName}\n` +
    `Date & Time: ${formattedDate}\n` +
    (data.preparationNotes ? `Prep Notes: ${data.preparationNotes}\n` : '') +
    `\nOpen Course: ${appUrl}`;

  return { to: '', subject, html, text };
}

// 3. Midterm Reminder Template
export function getMidtermEmail(data: {
  examTitle: string;
  courseName: string;
  examId: string;
  examDate: Date | string;
  preparationStatus: string;
  syllabus?: string | null;
  timezone?: string;
}): EmailPayload {
  const tz = data.timezone || SMTP_CONFIG.defaultTimezone;
  const formattedDate = formatDateTimeInTz(data.examDate, tz);
  const appUrl = `${APP_BASE_URL}/exams?id=${data.examId}`;

  const subject = `Midterm Exam Reminder — ${data.courseName}`;
  const html = wrapHtmlTemplate(
    data.examTitle || `Midterm Exam — ${data.courseName}`,
    'Midterm Examination',
    `
    <span class="card-badge">${data.courseName}</span>
    <p style="font-size: 15px; margin: 0 0 16px;">
      Your Midterm exam is coming up. Make sure all revision tasks and question papers have been reviewed:
    </p>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Course</td>
        <td class="meta-value">${data.courseName}</td>
      </tr>
      <tr>
        <td class="meta-label">Exam Date & Time</td>
        <td class="meta-value" style="color: #e11d48; font-weight: 700;">${formattedDate}</td>
      </tr>
      <tr>
        <td class="meta-label">Preparation</td>
        <td class="meta-value"><strong>${data.preparationStatus.replace('_', ' ')}</strong></td>
      </tr>
      ${data.syllabus ? `<tr><td class="meta-label">Syllabus Scope</td><td class="meta-value">${data.syllabus}</td></tr>` : ''}
    </table>
    `,
    { text: 'View Exam Preparation Hub', url: appUrl }
  );

  const text = `Midterm Exam Reminder: ${data.courseName}\n\n` +
    `Exam Title: ${data.examTitle}\n` +
    `Exam Date: ${formattedDate}\n` +
    `Preparation: ${data.preparationStatus}\n` +
    (data.syllabus ? `Syllabus: ${data.syllabus}\n` : '') +
    `\nView Exam: ${appUrl}`;

  return { to: '', subject, html, text };
}

// 4. Final Exam Reminder Template
export function getFinalEmail(data: {
  examTitle: string;
  courseName: string;
  examId: string;
  examDate: Date | string;
  syllabus?: string | null;
  timezone?: string;
}): EmailPayload {
  const tz = data.timezone || SMTP_CONFIG.defaultTimezone;
  const formattedDate = formatDateTimeInTz(data.examDate, tz);
  const appUrl = `${APP_BASE_URL}/exams?id=${data.examId}`;

  const subject = `Final Exam Reminder — ${data.courseName}`;
  const html = wrapHtmlTemplate(
    data.examTitle || `Final Exam — ${data.courseName}`,
    'Final Semester Examination',
    `
    <span class="card-badge">${data.courseName}</span>
    <p style="font-size: 15px; margin: 0 0 16px;">
      Your final examination is approaching. Check your revision notes and previous year papers:
    </p>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Course</td>
        <td class="meta-value">${data.courseName}</td>
      </tr>
      <tr>
        <td class="meta-label">Exam Date & Time</td>
        <td class="meta-value" style="color: #b91c1c; font-weight: 700;">${formattedDate}</td>
      </tr>
      ${data.syllabus ? `<tr><td class="meta-label">Syllabus</td><td class="meta-value">${data.syllabus}</td></tr>` : ''}
    </table>
    `,
    { text: 'Open Exam Details & Revision', url: appUrl }
  );

  const text = `Final Exam Reminder: ${data.courseName}\n\n` +
    `Exam: ${data.examTitle}\n` +
    `Date & Time: ${formattedDate}\n` +
    (data.syllabus ? `Syllabus: ${data.syllabus}\n` : '') +
    `\nOpen Exam: ${appUrl}`;

  return { to: '', subject, html, text };
}

// 5. Project Deadline Reminder Template
export function getProjectEmail(data: {
  projectTitle: string;
  courseName: string;
  deadline: Date | string;
  status: string;
  assignmentId: string;
  timezone?: string;
}): EmailPayload {
  const tz = data.timezone || SMTP_CONFIG.defaultTimezone;
  const formattedDeadline = formatDateTimeInTz(data.deadline, tz);
  const appUrl = `${APP_BASE_URL}/assignments?id=${data.assignmentId}`;

  const subject = `Project Deadline Reminder — ${data.projectTitle}`;
  const html = wrapHtmlTemplate(
    data.projectTitle,
    'Academic Project Milestone',
    `
    <span class="card-badge">${data.courseName}</span>
    <p style="font-size: 15px; margin: 0 0 16px;">
      An academic project deadline is approaching. Ensure submission deliverables and documents are ready:
    </p>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Project</td>
        <td class="meta-value">${data.projectTitle}</td>
      </tr>
      <tr>
        <td class="meta-label">Course</td>
        <td class="meta-value">${data.courseName}</td>
      </tr>
      <tr>
        <td class="meta-label">Deadline</td>
        <td class="meta-value" style="color: #ea580c; font-weight: 700;">${formattedDeadline}</td>
      </tr>
      <tr>
        <td class="meta-label">Current Status</td>
        <td class="meta-value"><strong>${data.status.replace('_', ' ')}</strong></td>
      </tr>
    </table>
    `,
    { text: 'View Project Details', url: appUrl }
  );

  const text = `Project Deadline Reminder: ${data.projectTitle}\n\n` +
    `Course: ${data.courseName}\n` +
    `Deadline: ${formattedDeadline}\n` +
    `Status: ${data.status}\n\n` +
    `View Project: ${appUrl}`;

  return { to: '', subject, html, text };
}

// 6. Custom Calendar Event Template
export function getCustomEventEmail(data: {
  eventTitle: string;
  startDate: Date | string;
  description?: string | null;
  location?: string | null;
  eventId: string;
  timezone?: string;
}): EmailPayload {
  const tz = data.timezone || SMTP_CONFIG.defaultTimezone;
  const formattedDate = formatDateTimeInTz(data.startDate, tz);
  const appUrl = `${APP_BASE_URL}/calendar`;

  const subject = `Academic Event Reminder — ${data.eventTitle}`;
  const html = wrapHtmlTemplate(
    data.eventTitle,
    'Calendar Event Alert',
    `
    <p style="font-size: 15px; margin: 0 0 16px;">
      You have a scheduled calendar event coming up:
    </p>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Event</td>
        <td class="meta-value">${data.eventTitle}</td>
      </tr>
      <tr>
        <td class="meta-label">Scheduled For</td>
        <td class="meta-value" style="color: #4f46e5; font-weight: 700;">${formattedDate}</td>
      </tr>
      ${data.location ? `<tr><td class="meta-label">Location</td><td class="meta-value">${data.location}</td></tr>` : ''}
      ${data.description ? `<tr><td class="meta-label">Description</td><td class="meta-value">${data.description}</td></tr>` : ''}
    </table>
    `,
    { text: 'Open Calendar', url: appUrl }
  );

  const text = `Calendar Event Reminder: ${data.eventTitle}\n\n` +
    `Date & Time: ${formattedDate}\n` +
    (data.location ? `Location: ${data.location}\n` : '') +
    (data.description ? `Description: ${data.description}\n` : '') +
    `\nOpen Calendar: ${appUrl}`;

  return { to: '', subject, html, text };
}

// 7. Test Email Template
export function getTestEmailTemplate(recipient: string, timezone = 'Asia/Dhaka'): EmailPayload {
  const formattedNow = formatDateTimeInTz(new Date(), timezone);
  const subject = `Test Email from ${SMTP_CONFIG.fromName}`;

  const html = wrapHtmlTemplate(
    'SMTP Configuration Test',
    'System Diagnostic',
    `
    <p style="font-size: 15px; margin: 0 0 16px;">
      Congratulations! Your SMTP notification system is properly configured and successfully transmitting emails.
    </p>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Recipient</td>
        <td class="meta-value">${recipient}</td>
      </tr>
      <tr>
        <td class="meta-label">Configured Timezone</td>
        <td class="meta-value">${timezone}</td>
      </tr>
      <tr>
        <td class="meta-label">Verified Time</td>
        <td class="meta-value">${formattedNow}</td>
      </tr>
      <tr>
        <td class="meta-label">Status</td>
        <td class="meta-value" style="color: #16a34a; font-weight: 700;">Active & Ready</td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #64748b;">
      Upcoming deadline reminders and exam alerts will be dispatched according to your notification preferences.
    </p>
    `,
    { text: 'Open ScholarFlow Dashboard', url: APP_BASE_URL }
  );

  const text = `Test Email from ${SMTP_CONFIG.fromName}\n\n` +
    `Your SMTP configuration is active and working.\n` +
    `Recipient: ${recipient}\n` +
    `Timezone: ${timezone}\n` +
    `Sent at: ${formattedNow}\n\n` +
    `Dashboard: ${APP_BASE_URL}`;

  return { to: recipient, subject, html, text };
}
