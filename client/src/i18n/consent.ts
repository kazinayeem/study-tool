/**
 * Cookie / local-storage consent. ScholarFlow only uses strictly necessary storage (sign-in
 * token) and optional preference storage (theme, language). No analytics or advertising.
 */
export interface ConsentState {
  /** Remember theme and language between visits. */
  preferences: boolean;
  /** ISO timestamp of the decision. */
  decidedAt: string;
}

const KEY = 'scholarflow_consent';
export const CONSENT_EVENT = 'scholarflow:consent';

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.preferences === 'boolean') return parsed as ConsentState;
  } catch {
    /* storage unavailable or corrupt */
  }
  return null;
}

export function writeConsent(preferences: boolean): ConsentState {
  const state: ConsentState = { preferences, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  return state;
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

/** Preference storage is allowed unless the visitor explicitly declined it. */
export function canStorePreferences(): boolean {
  const c = readConsent();
  return c ? c.preferences : true;
}

/** Write a preference key only when allowed; remove it when the visitor declined. */
export function setPreference(key: string, value: string): void {
  try {
    if (canStorePreferences()) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
