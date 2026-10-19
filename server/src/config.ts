import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const PORT = parseInt(process.env.PORT || '5001', 10);
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
export const APP_BASE_URL = process.env.APP_BASE_URL || CLIENT_URL;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
export const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);
export const JWT_SECRET = process.env.JWT_SECRET || 'scholarflow-super-secret-key-2026';
export const SESSION_SECRET = process.env.SESSION_SECRET || JWT_SECRET;
export const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;

// Google OAuth Configuration
export const GOOGLE_OAUTH = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackUrl: process.env.GOOGLE_CALLBACK_URL || `${API_BASE_URL}/auth/google/callback`,
};

// SMTP Configuration
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  fromName: process.env.SMTP_FROM_NAME || 'My Study Planner',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'notifications@scholarflow.local',
  enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false',
  defaultTimezone: process.env.NOTIFICATION_TIMEZONE || 'Asia/Dhaka',
};
