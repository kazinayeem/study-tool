import type { Lang } from './translations';
import type { TranslationKey } from './translations';

export type LegalSlug =
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'acceptable-use'
  | 'data-rights'
  | 'accessibility'
  | 'disclaimer';

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface LegalDoc {
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_UPDATED = '2026-10-22';

export const LEGAL_PAGES: { slug: LegalSlug; path: string; titleKey: TranslationKey }[] = [
  { slug: 'privacy', path: '/privacy', titleKey: 'legal.privacy' },
  { slug: 'terms', path: '/terms', titleKey: 'legal.terms' },
  { slug: 'cookies', path: '/cookies', titleKey: 'legal.cookies' },
  { slug: 'acceptable-use', path: '/acceptable-use', titleKey: 'legal.acceptableUse' },
  { slug: 'data-rights', path: '/data-rights', titleKey: 'legal.dataRights' },
  { slug: 'accessibility', path: '/accessibility', titleKey: 'legal.accessibility' },
  { slug: 'disclaimer', path: '/disclaimer', titleKey: 'legal.disclaimer' },
];

const en: Record<LegalSlug, LegalDoc> = {
  privacy: {
    intro:
      'ScholarFlow is a personal academic workspace for students, operated by Bornosoft. This policy explains what information the service handles, why, and the choices you have.',
    sections: [
      {
        id: 'collect',
        heading: '1. Information we handle',
        paragraphs: ['We handle only the information needed to run your workspace:'],
        list: [
          'Account details — your name, email address, and (when you use Google sign-in) your Google profile identifier and avatar.',
          'Academic content you create — semesters, courses, assignments, exams, grades, study plans, notes, tuition and fee records, bookmarks, and annotations.',
          'Files you upload — PDFs, documents, images, and class photos, stored on the ScholarFlow server.',
          'Settings — your notification preferences, active semester, and study goals.',
          'Technical data — standard server logs such as request time and error details, used to keep the service working and secure.',
        ],
      },
      {
        id: 'use',
        heading: '2. How we use it',
        list: [
          'To provide, secure, and improve the workspace you asked for.',
          'To send reminders and notifications you have enabled, including email reminders when email delivery is configured.',
          'To keep your data separate from other users: every record is tied to your account and ownership is checked on the server.',
          'To investigate abuse, errors, and security incidents.',
        ],
        paragraphs: ['We do not sell your personal data and we do not use it for advertising.'],
      },
      {
        id: 'sharing',
        heading: '3. Sharing',
        paragraphs: [
          'Your data is not shared with other users unless you create a share link, in which case anyone with that link can view the shared item until you revoke it.',
          'If you choose Google sign-in, Google processes your sign-in under its own privacy policy. If email reminders are enabled, an email service provider delivers those messages.',
          'Workspace administrators can manage accounts (for example, disabling an account) and see account-level information. The product is designed so administrators cannot read your private note bodies, document contents, or study logs.',
          'We may disclose information if required by law.',
        ],
      },
      {
        id: 'storage',
        heading: '4. Storage, security, and retention',
        paragraphs: [
          'Data is stored on the ScholarFlow server. Access requires authentication, and the server enforces that you can only read and change your own records. No system is perfectly secure, so please use a strong password and keep your sign-in private.',
          'We keep your content until you delete it or your account is removed. See Data Rights & Retention for details on exports, backups, and deletion.',
        ],
      },
      {
        id: 'cookies',
        heading: '5. Cookies and browser storage',
        paragraphs: [
          'ScholarFlow uses strictly necessary browser storage to keep you signed in, and optional preference storage for your theme and language. We do not use advertising or analytics cookies. See the Cookie Policy for the full list.',
        ],
      },
      {
        id: 'children',
        heading: '6. Children',
        paragraphs: [
          'ScholarFlow is intended for students. If you are under the age at which you can consent to data processing in your country, use the service only with the involvement of a parent, guardian, or your school.',
        ],
      },
      {
        id: 'rights',
        heading: '7. Your rights',
        paragraphs: [
          'Depending on where you live, you may have the right to access, correct, export, or delete your personal data, to object to or restrict certain processing, and to withdraw consent. You can export and delete most of your data inside the app; see Data Rights & Retention for how to exercise the rest.',
        ],
      },
      {
        id: 'changes',
        heading: '8. Changes and contact',
        paragraphs: [
          'We may update this policy as the product changes. The date at the top shows the latest version, and material changes will be noted in the app. Questions can be sent to your workspace administrator or to Bornosoft through bornosoft.bd.',
        ],
      },
    ],
  },

  terms: {
    intro:
      'These terms govern your use of ScholarFlow. By creating an account or using the service you agree to them.',
    sections: [
      {
        id: 'service',
        heading: '1. The service',
        paragraphs: [
          'ScholarFlow lets students organise semesters, courses, assignments, exams, notes, documents, grades, fees, and degree progress. Features may change, and we may add or remove them over time.',
        ],
      },
      {
        id: 'accounts',
        heading: '2. Your account',
        list: [
          'You must give accurate information and keep your sign-in credentials secure.',
          'You are responsible for activity under your account.',
          'Demo accounts are sandboxed samples; changes in a demo session are not kept for real use.',
          'We may suspend or disable accounts that break these terms or the Acceptable Use Policy.',
        ],
      },
      {
        id: 'content',
        heading: '3. Your content',
        paragraphs: [
          'You keep ownership of everything you create or upload. You give ScholarFlow only the permission needed to store, process, and display it to you, and to others when you choose to share it. You confirm you have the right to upload what you upload.',
        ],
      },
      {
        id: 'acceptable',
        heading: '4. Acceptable use',
        paragraphs: ['You agree to follow the Acceptable Use Policy.'],
      },
      {
        id: 'fees',
        heading: '5. Fee and cost calculators',
        paragraphs: [
          'The semester fee and cost tools are personal planning aids based on numbers you enter. They are not an invoice, a receipt, or financial advice, and they do not replace your institution’s official statements.',
        ],
      },
      {
        id: 'availability',
        heading: '6. Availability and changes',
        paragraphs: [
          'We work to keep the service available but do not guarantee it will be uninterrupted or error-free. Keep your own backups of important material; a Backup & Restore tool is provided in the app.',
        ],
      },
      {
        id: 'liability',
        heading: '7. Disclaimer and limitation of liability',
        paragraphs: [
          'The service is provided “as is” and “as available”. To the fullest extent permitted by law, Bornosoft is not liable for indirect, incidental, or consequential losses, or for loss of data, grades, or academic outcomes arising from use of the service. Nothing in these terms limits liability that cannot be limited by law.',
        ],
      },
      {
        id: 'termination',
        heading: '8. Ending your use',
        paragraphs: [
          'You can stop using ScholarFlow at any time and ask for your data to be deleted. We may suspend or end access for misuse or where required by law.',
        ],
      },
      {
        id: 'law',
        heading: '9. Governing law and changes',
        paragraphs: [
          'These terms are governed by the laws that apply where Bornosoft operates, unless local consumer law gives you additional rights. We may update these terms; continuing to use the service after an update means you accept the new version.',
        ],
      },
    ],
  },

  cookies: {
    intro:
      'This policy explains what browser storage ScholarFlow uses. ScholarFlow does not use advertising, tracking, or third-party analytics cookies.',
    sections: [
      {
        id: 'what',
        heading: '1. What this covers',
        paragraphs: [
          'Cookies and similar technologies — such as the browser’s local storage — let a website remember small pieces of information on your device.',
        ],
      },
      {
        id: 'necessary',
        heading: '2. Strictly necessary storage (always on)',
        list: [
          'scholarflow_token — keeps you signed in. Without it you would have to sign in on every page.',
          'scholarflow_consent — remembers the choice you made in the cookie banner.',
          'Short-lived sign-in state used while signing in with Google, so the sign-in can be completed securely.',
        ],
      },
      {
        id: 'preferences',
        heading: '3. Preference storage (your choice)',
        list: [
          'scholarflow_theme — remembers light or dark mode.',
          'scholarflow_lang — remembers your language.',
          'Small interface choices such as whether the note details panel is open.',
        ],
        paragraphs: [
          'If you choose “Essential only”, these are not saved. The site still works, but it will use your device’s defaults each visit.',
        ],
      },
      {
        id: 'none',
        heading: '4. What we do not use',
        list: ['Advertising cookies.', 'Cross-site tracking.', 'Third-party analytics or profiling.'],
      },
      {
        id: 'third',
        heading: '5. Third parties',
        paragraphs: [
          'If you sign in with Google, Google may set its own cookies on its own pages under its own policy. Fonts are loaded from Google Fonts, which may receive your IP address when the page loads.',
        ],
      },
      {
        id: 'manage',
        heading: '6. Managing your choice',
        paragraphs: [
          'You can change your choice at any time using “Cookie settings” in the footer. You can also clear site data in your browser settings; this will sign you out.',
        ],
      },
    ],
  },

  'acceptable-use': {
    intro: 'These rules keep ScholarFlow safe and useful for everyone.',
    sections: [
      {
        id: 'dont',
        heading: '1. You agree not to',
        list: [
          'Break the law or infringe anyone’s rights, including copyright and privacy.',
          'Upload malware, or content that is unlawful, harassing, hateful, or sexually exploitative.',
          'Use the service to cheat, to impersonate others, or to misrepresent your academic record.',
          'Probe, scan, overload, or attempt to bypass security or access another user’s data.',
          'Scrape or automate the service in a way that harms its performance.',
          'Share your account or resell access to the service.',
        ],
      },
      {
        id: 'files',
        heading: '2. Uploaded files',
        paragraphs: [
          'Only upload files you have the right to store. Upload size and type limits apply and may change. We may remove content that breaks these rules.',
        ],
      },
      {
        id: 'sharing',
        heading: '3. Share links',
        paragraphs: [
          'Share links make an item visible to anyone who has the link. You are responsible for what you share and can revoke a link at any time.',
        ],
      },
      {
        id: 'enforce',
        heading: '4. Enforcement',
        paragraphs: [
          'We may warn, restrict, suspend, or remove accounts and content that violate this policy. To report abuse, contact your workspace administrator or Bornosoft through bornosoft.bd.',
        ],
      },
    ],
  },

  'data-rights': {
    intro:
      'You are in control of your data. This page explains how to access, export, correct, and delete it, and how long we keep it.',
    sections: [
      {
        id: 'access',
        heading: '1. Access and correction',
        paragraphs: [
          'Everything you have created is visible and editable in the app. You can edit your profile and settings at any time from Settings.',
        ],
      },
      {
        id: 'export',
        heading: '2. Export and portability',
        list: [
          'Notes can be exported as Word (.docx) files or printed to PDF.',
          'The Backup & Restore page lets you create and download a backup of your workspace data.',
          'Uploaded documents can be downloaded from the document library.',
        ],
      },
      {
        id: 'delete',
        heading: '3. Deletion',
        list: [
          'You can delete individual notes, documents, assignments, exams, fee items, and semesters in the app. Deleting a semester also removes the items that belong to it.',
          'To delete your whole account, ask your workspace administrator or contact Bornosoft through bornosoft.bd. Account deletion removes your account and its content from the live system.',
        ],
      },
      {
        id: 'retention',
        heading: '4. Retention',
        list: [
          'Content is kept until you delete it or your account is removed.',
          'Note revision history is kept so you can restore earlier versions, and is removed with the note.',
          'Backups you download are stored by you; delete them yourself when you no longer need them.',
          'Server logs are kept only as long as needed for security and troubleshooting.',
        ],
      },
      {
        id: 'withdraw',
        heading: '5. Consent and objections',
        paragraphs: [
          'You can change your cookie and preference choices at any time from “Cookie settings”. If you want to object to or restrict processing, contact the administrator or Bornosoft and we will respond as required by the law that applies to you.',
        ],
      },
    ],
  },

  accessibility: {
    intro:
      'We want ScholarFlow to be usable by as many students as possible, on phones, tablets, and desktops.',
    sections: [
      {
        id: 'what',
        heading: '1. What we do',
        list: [
          'Pages are responsive and work from small phone screens up to large desktops.',
          'Interactive controls can be reached and used with a keyboard, with visible focus outlines.',
          'A “Skip to content” link is provided on the landing page.',
          'Light and dark themes are available, and the interface respects reduced-motion settings.',
          'Controls on touch screens are sized for comfortable tapping.',
          'The interface is available in several languages, including right-to-left layout for Arabic.',
        ],
      },
      {
        id: 'limits',
        heading: '2. Known limitations',
        paragraphs: [
          'Some parts, such as the rich-text editor, PDF viewer, and charts, may not yet be fully accessible to every assistive technology. Translations outside English and Bengali currently cover the main navigation and key screens; other text appears in English.',
        ],
      },
      {
        id: 'feedback',
        heading: '3. Feedback',
        paragraphs: [
          'If you run into a barrier, please tell your workspace administrator or Bornosoft through bornosoft.bd with the page and the assistive technology you use, and we will work to fix it.',
        ],
      },
    ],
  },

  disclaimer: {
    intro: 'Please read this notice about the information and tools in ScholarFlow.',
    sections: [
      {
        id: 'academic',
        heading: '1. Academic information',
        paragraphs: [
          'Grades, GPA/CGPA, credits, degree progress, and schedules in ScholarFlow are calculated from the data you enter. They are estimates for your own planning and are not official records. Always rely on your institution for official results and requirements.',
        ],
      },
      {
        id: 'financial',
        heading: '2. Fees and costs',
        paragraphs: [
          'Fee and cost figures are calculated from the rates and amounts you enter. They are not invoices, receipts, or financial advice, and may differ from what your institution charges.',
        ],
      },
      {
        id: 'content',
        heading: '3. Example content',
        paragraphs: [
          'Screenshots, previews, and the demo account use illustrative sample data, not data from a real student.',
        ],
      },
      {
        id: 'legal',
        heading: '4. Not legal advice',
        paragraphs: [
          'The policy pages describe how ScholarFlow works today. They are not legal advice and should be reviewed by a qualified professional before being relied on as a binding agreement.',
        ],
      },
    ],
  },
};

const bn: Record<LegalSlug, LegalDoc> = {
  privacy: {
    intro:
      'ScholarFlow শিক্ষার্থীদের জন্য একটি ব্যক্তিগত একাডেমিক ওয়ার্কস্পেস, যা Bornosoft পরিচালনা করে। এই নীতিতে ব্যাখ্যা করা হয়েছে সেবাটি কোন তথ্য সংগ্রহ ও ব্যবহার করে, কেন করে এবং আপনার কী কী নিয়ন্ত্রণ আছে।',
    sections: [
      {
        id: 'collect',
        heading: '১. যে তথ্য আমরা নিয়ে কাজ করি',
        paragraphs: ['আপনার ওয়ার্কস্পেস চালাতে যতটুকু দরকার, শুধু ততটুকু তথ্যই আমরা ব্যবহার করি:'],
        list: [
          'অ্যাকাউন্টের তথ্য — আপনার নাম, ইমেইল ঠিকানা এবং (গুগল সাইন-ইন ব্যবহার করলে) গুগল প্রোফাইল শনাক্তকারী ও ছবি।',
          'আপনার তৈরি একাডেমিক বিষয়বস্তু — সেমিস্টার, কোর্স, অ্যাসাইনমেন্ট, পরীক্ষা, গ্রেড, পড়ার পরিকল্পনা, নোট, টিউশন ও ফির হিসাব, বুকমার্ক এবং মন্তব্য।',
          'আপনার আপলোড করা ফাইল — পিডিএফ, ডকুমেন্ট, ছবি ও ক্লাসের ছবি, যা ScholarFlow সার্ভারে রাখা হয়।',
          'সেটিংস — নোটিফিকেশনের পছন্দ, চলমান সেমিস্টার ও পড়ার লক্ষ্য।',
          'প্রযুক্তিগত তথ্য — অনুরোধের সময় ও ত্রুটির বিবরণের মতো সাধারণ সার্ভার লগ, যা সেবা সচল ও নিরাপদ রাখতে ব্যবহৃত হয়।',
        ],
      },
      {
        id: 'use',
        heading: '২. আমরা কীভাবে ব্যবহার করি',
        list: [
          'আপনার চাওয়া ওয়ার্কস্পেস সরবরাহ, সুরক্ষিত ও উন্নত করতে।',
          'আপনার চালু করা রিমাইন্ডার ও নোটিফিকেশন পাঠাতে; ইমেইল ডেলিভারি কনফিগার করা থাকলে ইমেইল রিমাইন্ডারসহ।',
          'অন্য ব্যবহারকারীদের তথ্য থেকে আপনার তথ্য আলাদা রাখতে: প্রতিটি রেকর্ড আপনার অ্যাকাউন্টের সঙ্গে যুক্ত এবং মালিকানা সার্ভারেই যাচাই হয়।',
          'অপব্যবহার, ত্রুটি ও নিরাপত্তা ঘটনার তদন্ত করতে।',
        ],
        paragraphs: ['আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না এবং বিজ্ঞাপনের জন্য ব্যবহার করি না।'],
      },
      {
        id: 'sharing',
        heading: '৩. শেয়ার করা',
        paragraphs: [
          'আপনি শেয়ার লিংক তৈরি না করলে আপনার তথ্য অন্য ব্যবহারকারীদের সঙ্গে শেয়ার হয় না; লিংক তৈরি করলে লিংকধারী যে কেউ আপনি বাতিল না করা পর্যন্ত সেই বিষয়টি দেখতে পারবেন।',
          'গুগল সাইন-ইন বেছে নিলে গুগল নিজস্ব গোপনীয়তা নীতি অনুযায়ী সাইন-ইন প্রক্রিয়া করে। ইমেইল রিমাইন্ডার চালু থাকলে একটি ইমেইল সেবা প্রদানকারী বার্তাগুলো পৌঁছে দেয়।',
          'ওয়ার্কস্পেস অ্যাডমিনিস্ট্রেটররা অ্যাকাউন্ট পরিচালনা (যেমন অ্যাকাউন্ট নিষ্ক্রিয় করা) করতে এবং অ্যাকাউন্ট-স্তরের তথ্য দেখতে পারেন। পণ্যটি এমনভাবে তৈরি যাতে অ্যাডমিনিস্ট্রেটররা আপনার ব্যক্তিগত নোটের বিষয়বস্তু, ডকুমেন্টের ভেতরের তথ্য বা পড়ার লগ পড়তে না পারেন।',
          'আইন অনুযায়ী বাধ্য হলে আমরা তথ্য প্রকাশ করতে পারি।',
        ],
      },
      {
        id: 'storage',
        heading: '৪. সংরক্ষণ, নিরাপত্তা ও ধারণকাল',
        paragraphs: [
          'তথ্য ScholarFlow সার্ভারে সংরক্ষিত থাকে। প্রবেশের জন্য প্রমাণীকরণ লাগে এবং সার্ভার নিশ্চিত করে যে আপনি কেবল নিজের রেকর্ড পড়তে ও বদলাতে পারবেন। কোনো ব্যবস্থাই সম্পূর্ণ নিরাপদ নয়, তাই শক্তিশালী পাসওয়ার্ড ব্যবহার করুন এবং সাইন-ইনের তথ্য গোপন রাখুন।',
          'আপনি মুছে ফেলার বা অ্যাকাউন্ট সরানোর আগ পর্যন্ত আমরা আপনার বিষয়বস্তু রাখি। এক্সপোর্ট, ব্যাকআপ ও মুছে ফেলার বিস্তারিত জানতে "তথ্যের অধিকার ও সংরক্ষণ" দেখুন।',
        ],
      },
      {
        id: 'cookies',
        heading: '৫. কুকি ও ব্রাউজার স্টোরেজ',
        paragraphs: [
          'ScholarFlow আপনাকে সাইন-ইন রাখতে একান্ত প্রয়োজনীয় ব্রাউজার স্টোরেজ এবং থিম ও ভাষার জন্য ঐচ্ছিক পছন্দ-স্টোরেজ ব্যবহার করে। আমরা বিজ্ঞাপন বা অ্যানালিটিক্স কুকি ব্যবহার করি না। পুরো তালিকার জন্য কুকি নীতি দেখুন।',
        ],
      },
      {
        id: 'children',
        heading: '৬. শিশুদের ক্ষেত্রে',
        paragraphs: [
          'ScholarFlow শিক্ষার্থীদের জন্য। আপনার দেশে তথ্য প্রক্রিয়াকরণে সম্মতি দেওয়ার বয়সের চেয়ে কম হলে অভিভাবক বা প্রতিষ্ঠানের সম্পৃক্ততায় সেবাটি ব্যবহার করুন।',
        ],
      },
      {
        id: 'rights',
        heading: '৭. আপনার অধিকার',
        paragraphs: [
          'আপনি যেখানে থাকেন তার ওপর নির্ভর করে আপনার ব্যক্তিগত তথ্য দেখা, সংশোধন, এক্সপোর্ট বা মুছে ফেলার, নির্দিষ্ট প্রক্রিয়াকরণে আপত্তি বা সীমাবদ্ধতা আরোপের এবং সম্মতি প্রত্যাহারের অধিকার থাকতে পারে। বেশিরভাগ তথ্য অ্যাপের ভেতরেই এক্সপোর্ট ও মুছে ফেলা যায়; বাকিগুলোর জন্য "তথ্যের অধিকার ও সংরক্ষণ" দেখুন।',
        ],
      },
      {
        id: 'changes',
        heading: '৮. পরিবর্তন ও যোগাযোগ',
        paragraphs: [
          'পণ্য বদলালে আমরা এই নীতি হালনাগাদ করতে পারি। উপরের তারিখে সর্বশেষ সংস্করণ বোঝায় এবং বড় পরিবর্তন অ্যাপে জানানো হবে। প্রশ্ন থাকলে ওয়ার্কস্পেস অ্যাডমিনিস্ট্রেটর বা bornosoft.bd-এর মাধ্যমে Bornosoft-কে জানান।',
        ],
      },
    ],
  },

  terms: {
    intro: 'এই শর্তাবলি ScholarFlow-এর ব্যবহার নিয়ন্ত্রণ করে। অ্যাকাউন্ট খুললে বা সেবা ব্যবহার করলে আপনি এগুলো মেনে নিচ্ছেন।',
    sections: [
      {
        id: 'service',
        heading: '১. সেবা',
        paragraphs: [
          'ScholarFlow শিক্ষার্থীদের সেমিস্টার, কোর্স, অ্যাসাইনমেন্ট, পরীক্ষা, নোট, ডকুমেন্ট, গ্রেড, ফি ও ডিগ্রি অগ্রগতি গুছিয়ে রাখতে সাহায্য করে। ফিচার বদলাতে পারে এবং সময়ের সঙ্গে আমরা ফিচার যোগ বা বাদ দিতে পারি।',
        ],
      },
      {
        id: 'accounts',
        heading: '২. আপনার অ্যাকাউন্ট',
        list: [
          'সঠিক তথ্য দিতে হবে এবং সাইন-ইনের তথ্য নিরাপদ রাখতে হবে।',
          'আপনার অ্যাকাউন্টের অধীনে ঘটা সব কার্যক্রমের দায় আপনার।',
          'ডেমো অ্যাকাউন্ট কেবল নমুনা স্যান্ডবক্স; ডেমো সেশনের পরিবর্তন বাস্তব ব্যবহারের জন্য সংরক্ষিত থাকে না।',
          'এই শর্ত বা গ্রহণযোগ্য ব্যবহার নীতি ভাঙলে আমরা অ্যাকাউন্ট স্থগিত বা নিষ্ক্রিয় করতে পারি।',
        ],
      },
      {
        id: 'content',
        heading: '৩. আপনার বিষয়বস্তু',
        paragraphs: [
          'আপনি যা তৈরি বা আপলোড করেন তার মালিকানা আপনারই থাকে। সংরক্ষণ, প্রক্রিয়াকরণ ও আপনাকে (এবং আপনি শেয়ার করলে অন্যদের) দেখানোর জন্য যতটুকু অনুমতি দরকার, শুধু ততটুকুই ScholarFlow-কে দেন। আপনি নিশ্চিত করছেন যে যা আপলোড করছেন তার অধিকার আপনার আছে।',
        ],
      },
      {
        id: 'acceptable',
        heading: '৪. গ্রহণযোগ্য ব্যবহার',
        paragraphs: ['আপনি গ্রহণযোগ্য ব্যবহার নীতি মেনে চলতে সম্মত।'],
      },
      {
        id: 'fees',
        heading: '৫. ফি ও খরচের ক্যালকুলেটর',
        paragraphs: [
          'সেমিস্টার ফি ও খরচের টুলগুলো আপনার দেওয়া সংখ্যার ওপর ভিত্তি করে ব্যক্তিগত পরিকল্পনার সহায়ক। এগুলো ইনভয়েস, রসিদ বা আর্থিক পরামর্শ নয়, এবং আপনার প্রতিষ্ঠানের অফিসিয়াল বিবৃতির বিকল্প নয়।',
        ],
      },
      {
        id: 'availability',
        heading: '৬. সহজলভ্যতা ও পরিবর্তন',
        paragraphs: [
          'আমরা সেবা চালু রাখার চেষ্টা করি, কিন্তু নিরবচ্ছিন্ন বা ত্রুটিমুক্ত থাকার নিশ্চয়তা দিই না। গুরুত্বপূর্ণ উপকরণের নিজস্ব ব্যাকআপ রাখুন; অ্যাপে ব্যাকআপ ও রিস্টোর টুল আছে।',
        ],
      },
      {
        id: 'liability',
        heading: '৭. দাবিত্যাগ ও দায়ের সীমা',
        paragraphs: [
          'সেবাটি "যেমন আছে" ও "যেমন পাওয়া যায়" ভিত্তিতে দেওয়া হয়। আইন যতদূর অনুমতি দেয়, সেবা ব্যবহারের ফলে পরোক্ষ, আনুষঙ্গিক বা ফলস্বরূপ ক্ষতি, কিংবা তথ্য, গ্রেড বা একাডেমিক ফলাফলের ক্ষতির জন্য Bornosoft দায়ী নয়। আইনে যে দায় সীমিত করা যায় না, এই শর্ত তা সীমিত করে না।',
        ],
      },
      {
        id: 'termination',
        heading: '৮. ব্যবহার বন্ধ করা',
        paragraphs: [
          'আপনি যেকোনো সময় ScholarFlow ব্যবহার বন্ধ করতে এবং আপনার তথ্য মুছে ফেলার অনুরোধ করতে পারেন। অপব্যবহার বা আইনি বাধ্যবাধকতায় আমরা প্রবেশাধিকার স্থগিত বা শেষ করতে পারি।',
        ],
      },
      {
        id: 'law',
        heading: '৯. প্রযোজ্য আইন ও পরিবর্তন',
        paragraphs: [
          'স্থানীয় ভোক্তা আইন আপনাকে বাড়তি অধিকার না দিলে, Bornosoft যেখানে কার্যক্রম চালায় সেখানকার আইন এই শর্তাবলির ওপর প্রযোজ্য হবে। আমরা শর্ত হালনাগাদ করতে পারি; হালনাগাদের পর সেবা ব্যবহার চালিয়ে গেলে নতুন সংস্করণ মেনে নেওয়া হয়।',
        ],
      },
    ],
  },

  cookies: {
    intro:
      'এই নীতিতে বলা হয়েছে ScholarFlow কোন ব্রাউজার স্টোরেজ ব্যবহার করে। ScholarFlow বিজ্ঞাপন, ট্র্যাকিং বা তৃতীয় পক্ষের অ্যানালিটিক্স কুকি ব্যবহার করে না।',
    sections: [
      {
        id: 'what',
        heading: '১. এটি কী নিয়ে',
        paragraphs: [
          'কুকি এবং অনুরূপ প্রযুক্তি — যেমন ব্রাউজারের লোকাল স্টোরেজ — ওয়েবসাইটকে আপনার ডিভাইসে ছোট ছোট তথ্য মনে রাখতে দেয়।',
        ],
      },
      {
        id: 'necessary',
        heading: '২. একান্ত প্রয়োজনীয় স্টোরেজ (সবসময় চালু)',
        list: [
          'scholarflow_token — আপনাকে সাইন-ইন রাখে। এটি না থাকলে প্রতিটি পৃষ্ঠায় সাইন ইন করতে হতো।',
          'scholarflow_consent — কুকি ব্যানারে আপনার করা পছন্দ মনে রাখে।',
          'গুগল দিয়ে সাইন ইনের সময় ব্যবহৃত স্বল্পস্থায়ী সাইন-ইন অবস্থা, যাতে সাইন-ইন নিরাপদে সম্পন্ন হয়।',
        ],
      },
      {
        id: 'preferences',
        heading: '৩. পছন্দ-স্টোরেজ (আপনার সিদ্ধান্ত)',
        list: [
          'scholarflow_theme — লাইট বা ডার্ক মোড মনে রাখে।',
          'scholarflow_lang — আপনার ভাষা মনে রাখে।',
          'ছোট ইন্টারফেস পছন্দ, যেমন নোটের বিবরণ প্যানেল খোলা থাকবে কি না।',
        ],
        paragraphs: [
          '"শুধু প্রয়োজনীয়" বেছে নিলে এগুলো সংরক্ষিত হয় না। সাইট তবু কাজ করে, কিন্তু প্রতিবার আপনার ডিভাইসের ডিফল্ট ব্যবহার করবে।',
        ],
      },
      {
        id: 'none',
        heading: '৪. যা আমরা ব্যবহার করি না',
        list: ['বিজ্ঞাপনের কুকি।', 'সাইট-পেরোনো ট্র্যাকিং।', 'তৃতীয় পক্ষের অ্যানালিটিক্স বা প্রোফাইলিং।'],
      },
      {
        id: 'third',
        heading: '৫. তৃতীয় পক্ষ',
        paragraphs: [
          'গুগল দিয়ে সাইন ইন করলে গুগল তার নিজের পৃষ্ঠায় নিজস্ব নীতি অনুযায়ী কুকি বসাতে পারে। ফন্ট গুগল ফন্টস থেকে লোড হয়, ফলে পৃষ্ঠা লোডের সময় গুগল আপনার আইপি ঠিকানা পেতে পারে।',
        ],
      },
      {
        id: 'manage',
        heading: '৬. আপনার পছন্দ পরিচালনা',
        paragraphs: [
          'ফুটারের "কুকি সেটিংস" থেকে যেকোনো সময় পছন্দ বদলাতে পারেন। ব্রাউজার সেটিংসে সাইটের ডেটা মুছতেও পারেন; এতে আপনি সাইন-আউট হয়ে যাবেন।',
        ],
      },
    ],
  },

  'acceptable-use': {
    intro: 'এই নিয়মগুলো ScholarFlow-কে সবার জন্য নিরাপদ ও উপযোগী রাখে।',
    sections: [
      {
        id: 'dont',
        heading: '১. আপনি সম্মত হচ্ছেন যে আপনি করবেন না',
        list: [
          'আইন ভাঙা বা কারও অধিকার লঙ্ঘন, কপিরাইট ও গোপনীয়তাসহ।',
          'ম্যালওয়্যার বা বেআইনি, হয়রানিমূলক, বিদ্বেষপূর্ণ কিংবা যৌন শোষণমূলক বিষয়বস্তু আপলোড।',
          'প্রতারণা, অন্যের ছদ্মবেশ বা নিজের একাডেমিক রেকর্ড ভুলভাবে উপস্থাপনের জন্য সেবা ব্যবহার।',
          'নিরাপত্তা যাচাই, স্ক্যান, ওভারলোড বা এড়িয়ে যাওয়া, কিংবা অন্য ব্যবহারকারীর তথ্যে প্রবেশের চেষ্টা।',
          'সেবার কার্যক্ষমতার ক্ষতি হয় এমনভাবে স্ক্র্যাপ বা স্বয়ংক্রিয় ব্যবহার।',
          'অ্যাকাউন্ট শেয়ার বা সেবার প্রবেশাধিকার পুনর্বিক্রি।',
        ],
      },
      {
        id: 'files',
        heading: '২. আপলোড করা ফাইল',
        paragraphs: [
          'শুধু সেই ফাইলই আপলোড করুন যা রাখার অধিকার আপনার আছে। আকার ও ধরনের সীমা প্রযোজ্য এবং বদলাতে পারে। এই নিয়ম ভাঙলে আমরা বিষয়বস্তু সরিয়ে দিতে পারি।',
        ],
      },
      {
        id: 'sharing',
        heading: '৩. শেয়ার লিংক',
        paragraphs: [
          'শেয়ার লিংক যার কাছে আছে সে-ই বিষয়টি দেখতে পারে। আপনি যা শেয়ার করেন তার দায় আপনার এবং যেকোনো সময় লিংক বাতিল করতে পারেন।',
        ],
      },
      {
        id: 'enforce',
        heading: '৪. প্রয়োগ',
        paragraphs: [
          'এই নীতি লঙ্ঘন করলে আমরা সতর্ক, সীমিত, স্থগিত বা অ্যাকাউন্ট ও বিষয়বস্তু সরিয়ে দিতে পারি। অপব্যবহার জানাতে ওয়ার্কস্পেস অ্যাডমিনিস্ট্রেটর বা bornosoft.bd-এর মাধ্যমে Bornosoft-কে জানান।',
        ],
      },
    ],
  },

  'data-rights': {
    intro: 'আপনার তথ্যের নিয়ন্ত্রণ আপনার হাতেই। এই পৃষ্ঠায় বলা হয়েছে তথ্য কীভাবে দেখা, এক্সপোর্ট, সংশোধন ও মুছে ফেলা যায় এবং আমরা তা কতদিন রাখি।',
    sections: [
      {
        id: 'access',
        heading: '১. দেখা ও সংশোধন',
        paragraphs: ['আপনার তৈরি সবকিছু অ্যাপে দেখা ও সম্পাদনা করা যায়। সেটিংস থেকে যেকোনো সময় প্রোফাইল ও সেটিংস বদলাতে পারেন।'],
      },
      {
        id: 'export',
        heading: '২. এক্সপোর্ট ও বহনযোগ্যতা',
        list: [
          'নোট ওয়ার্ড (.docx) ফাইল হিসেবে এক্সপোর্ট বা পিডিএফে প্রিন্ট করা যায়।',
          'ব্যাকআপ ও রিস্টোর পৃষ্ঠা থেকে আপনার ওয়ার্কস্পেসের ব্যাকআপ তৈরি ও ডাউনলোড করা যায়।',
          'আপলোড করা ডকুমেন্ট ডকুমেন্ট লাইব্রেরি থেকে ডাউনলোড করা যায়।',
        ],
      },
      {
        id: 'delete',
        heading: '৩. মুছে ফেলা',
        list: [
          'অ্যাপে আলাদা আলাদা নোট, ডকুমেন্ট, অ্যাসাইনমেন্ট, পরীক্ষা, ফি আইটেম ও সেমিস্টার মুছতে পারেন। সেমিস্টার মুছলে তার অধীনের আইটেমও মুছে যায়।',
          'পুরো অ্যাকাউন্ট মুছতে ওয়ার্কস্পেস অ্যাডমিনিস্ট্রেটর বা bornosoft.bd-এর মাধ্যমে Bornosoft-কে অনুরোধ করুন। অ্যাকাউন্ট মুছলে চালু সিস্টেম থেকে আপনার অ্যাকাউন্ট ও বিষয়বস্তু সরে যায়।',
        ],
      },
      {
        id: 'retention',
        heading: '৪. সংরক্ষণকাল',
        list: [
          'আপনি মুছে ফেলার বা অ্যাকাউন্ট সরানোর আগ পর্যন্ত বিষয়বস্তু থাকে।',
          'আগের সংস্করণ ফিরিয়ে আনতে নোটের রিভিশন ইতিহাস রাখা হয় এবং নোটের সঙ্গে তা মুছে যায়।',
          'আপনার ডাউনলোড করা ব্যাকআপ আপনার কাছেই থাকে; দরকার ফুরোলে নিজে মুছে ফেলুন।',
          'সার্ভার লগ কেবল নিরাপত্তা ও সমস্যা সমাধানের জন্য যতদিন দরকার ততদিন রাখা হয়।',
        ],
      },
      {
        id: 'withdraw',
        heading: '৫. সম্মতি ও আপত্তি',
        paragraphs: [
          '"কুকি সেটিংস" থেকে যেকোনো সময় কুকি ও পছন্দের সিদ্ধান্ত বদলাতে পারেন। প্রক্রিয়াকরণে আপত্তি বা সীমাবদ্ধতা চাইলে অ্যাডমিনিস্ট্রেটর বা Bornosoft-এর সঙ্গে যোগাযোগ করুন; আপনার ক্ষেত্রে প্রযোজ্য আইন অনুযায়ী আমরা সাড়া দেব।',
        ],
      },
    ],
  },

  accessibility: {
    intro: 'আমরা চাই যত বেশি সম্ভব শিক্ষার্থী ফোন, ট্যাবলেট ও ডেস্কটপে ScholarFlow ব্যবহার করতে পারুক।',
    sections: [
      {
        id: 'what',
        heading: '১. আমরা যা করি',
        list: [
          'পৃষ্ঠাগুলো রেসপনসিভ এবং ছোট ফোনের স্ক্রিন থেকে বড় ডেস্কটপ পর্যন্ত কাজ করে।',
          'ইন্টারঅ্যাক্টিভ নিয়ন্ত্রণগুলো কিবোর্ড দিয়ে পৌঁছানো ও ব্যবহার করা যায়, ফোকাসের রেখা দৃশ্যমান।',
          'ল্যান্ডিং পৃষ্ঠায় "মূল বিষয়বস্তুতে যান" লিংক আছে।',
          'লাইট ও ডার্ক থিম আছে এবং ইন্টারফেস কমানো-মোশন সেটিং মানে।',
          'টাচ স্ক্রিনে নিয়ন্ত্রণগুলো আরামে ট্যাপ করার মাপের।',
          'ইন্টারফেস একাধিক ভাষায় পাওয়া যায়, আরবির জন্য ডান-থেকে-বাম বিন্যাসসহ।',
        ],
      },
      {
        id: 'limits',
        heading: '২. জানা সীমাবদ্ধতা',
        paragraphs: [
          'রিচ-টেক্সট এডিটর, পিডিএফ ভিউয়ার ও চার্টের মতো কিছু অংশ এখনো সব সহায়ক প্রযুক্তির জন্য পুরোপুরি সুগম নাও হতে পারে। ইংরেজি ও বাংলার বাইরের অনুবাদ এখন মূল নেভিগেশন ও প্রধান স্ক্রিন কভার করে; বাকি লেখা ইংরেজিতে দেখা যায়।',
        ],
      },
      {
        id: 'feedback',
        heading: '৩. মতামত',
        paragraphs: [
          'কোনো বাধার মুখে পড়লে পৃষ্ঠা ও আপনার ব্যবহৃত সহায়ক প্রযুক্তির নামসহ ওয়ার্কস্পেস অ্যাডমিনিস্ট্রেটর বা bornosoft.bd-এর মাধ্যমে Bornosoft-কে জানান; আমরা তা ঠিক করার চেষ্টা করব।',
        ],
      },
    ],
  },

  disclaimer: {
    intro: 'ScholarFlow-এর তথ্য ও টুল সম্পর্কে এই বিজ্ঞপ্তিটি অনুগ্রহ করে পড়ুন।',
    sections: [
      {
        id: 'academic',
        heading: '১. একাডেমিক তথ্য',
        paragraphs: [
          'ScholarFlow-এ দেখানো গ্রেড, জিপিএ/সিজিপিএ, ক্রেডিট, ডিগ্রি অগ্রগতি ও সূচি আপনার দেওয়া তথ্য থেকে হিসাব করা। এগুলো আপনার নিজের পরিকল্পনার জন্য অনুমান, অফিসিয়াল রেকর্ড নয়। অফিসিয়াল ফলাফল ও শর্তের জন্য সবসময় আপনার প্রতিষ্ঠানের ওপর নির্ভর করুন।',
        ],
      },
      {
        id: 'financial',
        heading: '২. ফি ও খরচ',
        paragraphs: [
          'ফি ও খরচের অঙ্ক আপনার দেওয়া হার ও পরিমাণ থেকে হিসাব করা। এগুলো ইনভয়েস, রসিদ বা আর্থিক পরামর্শ নয় এবং আপনার প্রতিষ্ঠানের আদায় করা অঙ্কের সঙ্গে আলাদা হতে পারে।',
        ],
      },
      {
        id: 'content',
        heading: '৩. উদাহরণ বিষয়বস্তু',
        paragraphs: ['স্ক্রিনশট, প্রিভিউ ও ডেমো অ্যাকাউন্টে উদাহরণ হিসেবে নমুনা তথ্য ব্যবহৃত হয়, কোনো প্রকৃত শিক্ষার্থীর তথ্য নয়।'],
      },
      {
        id: 'legal',
        heading: '৪. আইনি পরামর্শ নয়',
        paragraphs: [
          'নীতি পৃষ্ঠাগুলোতে ScholarFlow বর্তমানে যেভাবে কাজ করে তা বর্ণিত। এগুলো আইনি পরামর্শ নয়; বাধ্যতামূলক চুক্তি হিসেবে ভরসার আগে একজন যোগ্য পেশাজীবীকে দিয়ে পর্যালোচনা করিয়ে নিন।',
        ],
      },
    ],
  },
};

/** Policies are written in full for English and Bengali; other languages show the English text. */
export function getLegalDoc(slug: LegalSlug, lang: Lang): { doc: LegalDoc; translated: boolean } {
  if (lang === 'bn') return { doc: bn[slug], translated: true };
  return { doc: en[slug], translated: lang === 'en' };
}
