"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdfGenerator_js_1 = require("../src/utils/pdfGenerator.js");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Ensure upload directory exists
    const uploadDir = path_1.default.resolve(process.cwd(), 'uploads');
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    // Clear existing records in proper cascade order
    await prisma.appSetting.deleteMany();
    await prisma.studySession.deleteMany();
    await prisma.calendarEvent.deleteMany();
    await prisma.taskChecklistItem.deleteMany();
    await prisma.examDocument.deleteMany();
    await prisma.assignmentDocument.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.documentAnnotation.deleteMany();
    await prisma.documentBookmark.deleteMany();
    await prisma.documentTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.note.deleteMany();
    await prisma.document.deleteMany();
    await prisma.course.deleteMany();
    await prisma.semester.deleteMany();
    // 1. App Settings
    await prisma.appSetting.create({
        data: {
            id: 'default',
            theme: 'light',
            studentName: 'Mohammad Ali Nayeem',
            universityName: 'Department of Computer Science & Engineering',
            degree: 'B.S. in Computer Science & Engineering',
            enableBrowserNotifications: false,
            autoSaveDelayMs: 1500,
        },
    });
    // 2. Semesters
    const fall2026 = await prisma.semester.create({
        data: {
            name: 'Fall 2026',
            code: 'FA26',
            startDate: new Date('2026-09-01T00:00:00.000Z'),
            endDate: new Date('2026-12-24T23:59:59.000Z'),
            status: 'ACTIVE',
            description: 'Senior Year - Term 1. Specializing in Systems Security and Cloud Architectures.',
            academicGoals: 'Maintain GPA >= 3.85, publish capstone research milestone, and master cryptographic engineering.',
            color: '#4f46e5',
            isArchived: false,
        },
    });
    const spring2027 = await prisma.semester.create({
        data: {
            name: 'Spring 2027',
            code: 'SP27',
            startDate: new Date('2027-01-15T00:00:00.000Z'),
            endDate: new Date('2027-05-20T23:59:59.000Z'),
            status: 'UPCOMING',
            description: 'Senior Year - Term 2 (Graduating Semester).',
            academicGoals: 'Complete Capstone defense, clear thesis submissions, and prepare career portfolio.',
            color: '#059669',
            isArchived: false,
        },
    });
    // Update AppSetting currentSemesterId
    await prisma.appSetting.update({
        where: { id: 'default' },
        data: { currentSemesterId: fall2026.id },
    });
    // 3. Courses in Fall 2026
    const cse443 = await prisma.course.create({
        data: {
            semesterId: fall2026.id,
            code: 'CSE443',
            title: 'Information System Security',
            credits: 3.0,
            section: '01',
            teacherName: 'Dr. Alan Vance',
            teacherEmail: 'avance@university.edu',
            roomNumber: 'Lab 4B (Network Security Lab)',
            description: 'In-depth study of cryptography, access control, network vulnerabilities, web application exploits, and defensive security engineering.',
            syllabus: 'Topics: Threat modeling, AES/RSA primitives, Public Key Infrastructure, TLS 1.3 handshakes, OWASP Top 10, Zero-Trust Architecture, and Penetration Testing methodologies.',
            color: '#6366f1',
            icon: 'shield',
            classSchedule: 'Mon, Wed 10:00 AM - 11:30 AM',
            examSchedule: 'Midterm: Oct 28, 2026 10:00 AM | Final: Dec 16, 2026 09:00 AM',
            midtermPrepNotes: 'Focus on Diffie-Hellman Key Exchange calculations, AES Galois/Counter Mode (GCM), and buffer overflow exploitation mechanics.',
            finalPrepNotes: 'Review OAuth 2.0 PKCE, zero-knowledge proofs, and network intrusion detection signatures.',
            progress: 65,
        },
    });
    const cse499 = await prisma.course.create({
        data: {
            semesterId: fall2026.id,
            code: 'CSE499',
            title: 'Software Engineering Design Capstone Project',
            credits: 4.0,
            section: '02',
            teacherName: 'Prof. Elena Rostova',
            teacherEmail: 'erostova@university.edu',
            roomNumber: 'Room 302',
            description: 'Two-semester team-based engineering project following rigorous agile workflows, CI/CD pipelines, architectural reviews, and user validation.',
            syllabus: 'Deliverables: Project Charter, SRS Specification, Architectural Diagram, Sprint 1-4 Demos, Beta Testing Report, and Final Defense.',
            color: '#0ea5e9',
            icon: 'code',
            classSchedule: 'Tue, Thu 02:00 PM - 04:00 PM',
            examSchedule: 'Sprint 2 Review: Nov 05, 2026 | Final Project Defense: Dec 18, 2026',
            midtermPrepNotes: 'Prepare software architecture diagrams (C4 model level 3), database ERD, and API contract specifications.',
            finalPrepNotes: 'Conduct load testing with k6, ensure 85%+ test coverage, and complete user acceptance testing (UAT).',
            progress: 50,
        },
    });
    const cse471 = await prisma.course.create({
        data: {
            semesterId: fall2026.id,
            code: 'CSE471',
            title: 'Distributed Cloud Architecture',
            credits: 3.0,
            section: '01',
            teacherName: 'Dr. Marcus Chen',
            teacherEmail: 'mchen@university.edu',
            roomNumber: 'Auditorium 1',
            description: 'Distributed consensus algorithms, microservices coordination, event-driven architectures, Kafka, Kubernetes, and high-availability patterns.',
            syllabus: 'CAP theorem, Raft consensus, Eventual Consistency, gRPC, Distributed tracing with OpenTelemetry, Saga pattern for distributed transactions.',
            color: '#10b981',
            icon: 'server',
            classSchedule: 'Sun, Tue 11:45 AM - 01:15 PM',
            examSchedule: 'Midterm: Nov 02, 2026 | Final: Dec 20, 2026',
            midtermPrepNotes: 'Practice Raft leader election state transitions and partition tolerance failure modes.',
            finalPrepNotes: 'Review CQRS patterns, Kafka partition rebalancing, and distributed locks via etcd.',
            progress: 40,
        },
    });
    // 4. Tags
    const tagExam = await prisma.tag.create({ data: { name: 'Exam Material', color: '#ef4444' } });
    const tagCrypto = await prisma.tag.create({ data: { name: 'Cryptography', color: '#8b5cf6' } });
    const tagHighYield = await prisma.tag.create({ data: { name: 'High Yield', color: '#f59e0b' } });
    const tagArch = await prisma.tag.create({ data: { name: 'Architecture', color: '#10b981' } });
    // 5. Sample Documents (with actual valid multi-page PDF files created in uploads)
    const doc1Filename = 'sample_cse443_midterm_2025.pdf';
    const doc1Path = path_1.default.join(uploadDir, doc1Filename);
    const doc1Buffer = (0, pdfGenerator_js_1.createSamplePdf)('CSE443 Information System Security - Midterm 2025', [
        {
            heading: 'Part A: Cryptographic Primitives & Key Exchange',
            lines: [
                'Question 1: Explain the mathematical basis of Diffie-Hellman Key Exchange.',
                'Consider prime p = 23 and primitive root g = 5.',
                'Alice selects private key a = 6. Calculate her public key A.',
                'Bob selects private key b = 15. Calculate his public key B.',
                'Compute the shared secret key s computed by both parties.',
                'Explain how Man-in-the-Middle (MitM) attacks threaten unauthenticated DH.',
            ],
        },
        {
            heading: 'Part B: Block Ciphers & Modes of Operation',
            lines: [
                'Question 2: Compare ECB mode versus CBC and GCM modes in AES-256.',
                'Why does Electronic Codebook (ECB) fail semantic security for structured images?',
                'Describe the initialization vector (IV) requirements in Cipher Block Chaining.',
                'Explain how Galois/Counter Mode (GCM) provides both confidentiality and authentication.',
                'Demonstrate how bit-flipping attacks in CBC mode can alter plaintext.',
            ],
        },
        {
            heading: 'Part C: Web Security & Access Control',
            lines: [
                'Question 3: Distinguish between Cross-Site Scripting (XSS) and CSRF.',
                'Provide a realistic scenario where an attacker leverages Reflected XSS to steal cookies.',
                'What defensive properties does the SameSite=Strict cookie attribute confer?',
                'How does Content Security Policy (CSP) mitigate malicious script execution?',
                'Describe Role-Based Access Control (RBAC) vs Attribute-Based Access Control (ABAC).',
            ],
        },
    ]);
    fs_1.default.writeFileSync(doc1Path, doc1Buffer);
    const doc1 = await prisma.document.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse443.id,
            title: 'CSE443 Midterm Exam Question Paper 2025',
            originalFilename: 'CSE443-Midterm-2025-Questions.pdf',
            storedFilename: doc1Filename,
            filePath: doc1Path,
            mimeType: 'application/pdf',
            fileSize: doc1Buffer.length,
            category: 'Previous Year Questions',
            description: 'Official previous year midterm exam questions covering Diffie-Hellman, AES modes, and Web Security.',
            comments: 'Essential practice! Question 2 on GCM mode appeared again in the quiz.',
            isPdf: true,
            pageCount: 3,
            lastOpenedPage: 2,
            lastOpenedAt: new Date(),
            isScanned: false,
        },
    });
    // Link tags to doc1
    await prisma.documentTag.createMany({
        data: [
            { documentId: doc1.id, tagId: tagExam.id },
            { documentId: doc1.id, tagId: tagCrypto.id },
            { documentId: doc1.id, tagId: tagHighYield.id },
        ],
    });
    // Add Bookmarks to doc1
    await prisma.documentBookmark.create({
        data: {
            documentId: doc1.id,
            pageNumber: 1,
            title: 'Diffie-Hellman Key Exchange Calculation',
            color: '#ef4444',
        },
    });
    await prisma.documentBookmark.create({
        data: {
            documentId: doc1.id,
            pageNumber: 2,
            title: 'AES GCM vs CBC Modes',
            color: '#f59e0b',
        },
    });
    // Add Annotations to doc1
    await prisma.documentAnnotation.create({
        data: {
            documentId: doc1.id,
            pageNumber: 1,
            type: 'highlight',
            color: '#fde047',
            selectedText: 'Consider prime p = 23 and primitive root g = 5.',
            comment: 'Remember to verify that g is a true primitive root mod p during calculations.',
            rectJson: JSON.stringify({ x: 50, y: 640, width: 380, height: 18 }),
        },
    });
    await prisma.documentAnnotation.create({
        data: {
            documentId: doc1.id,
            pageNumber: 2,
            type: 'highlight',
            color: '#86efac',
            selectedText: 'Galois/Counter Mode (GCM) provides both confidentiality and authentication.',
            comment: 'High probability exam topic! Mention GMAC authentication tag verification.',
            rectJson: JSON.stringify({ x: 50, y: 600, width: 440, height: 18 }),
        },
    });
    // Document 2: Capstone Project Specification
    const doc2Filename = 'sample_cse499_srs_spec.pdf';
    const doc2Path = path_1.default.join(uploadDir, doc2Filename);
    const doc2Buffer = (0, pdfGenerator_js_1.createSamplePdf)('CSE499 Senior Capstone - Requirements Specification Guidelines', [
        {
            heading: 'Capstone Milestone 1: Architectural Blueprint',
            lines: [
                '1. Executive Summary and Problem Statement.',
                '2. Functional and Non-Functional Requirements breakdown (IEEE 830 compliant).',
                '3. Microservice decomposition: Auth Service, Document Engine, Event Bus.',
                '4. System Sequence Diagrams for primary business workflows.',
            ],
        },
        {
            heading: 'Capstone Milestone 2: Verification and Security Guidelines',
            lines: [
                '1. Authentication: OAuth2 Bearer Tokens with JWT signature validation.',
                '2. Data Protection: AES-256 for documents at rest, TLS 1.3 in transit.',
                '3. Test Strategy: Minimum 80% branch coverage on core domain logic.',
                '4. Automated CI/CD execution with GitHub Actions and Docker containerization.',
            ],
        },
    ]);
    fs_1.default.writeFileSync(doc2Path, doc2Buffer);
    const doc2 = await prisma.document.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse499.id,
            title: 'CSE499 Capstone Requirements & Architectural Blueprint',
            originalFilename: 'CSE499-Capstone-Guidelines-2026.pdf',
            storedFilename: doc2Filename,
            filePath: doc2Path,
            mimeType: 'application/pdf',
            fileSize: doc2Buffer.length,
            category: 'Syllabus',
            description: 'Official template and submission standards for Capstone Milestone 1 & 2.',
            comments: 'Ensure our team conforms to IEEE 830 specification headings.',
            isPdf: true,
            pageCount: 2,
            lastOpenedPage: 1,
            lastOpenedAt: new Date(),
            isScanned: false,
        },
    });
    await prisma.documentTag.createMany({
        data: [
            { documentId: doc2.id, tagId: tagArch.id },
            { documentId: doc2.id, tagId: tagHighYield.id },
        ],
    });
    // Document 3: Distributed Cloud Lecture Slides
    const doc3Filename = 'sample_cse471_raft_consensus.pdf';
    const doc3Path = path_1.default.join(uploadDir, doc3Filename);
    const doc3Buffer = (0, pdfGenerator_js_1.createSamplePdf)('CSE471 Lecture 06 - Raft Consensus Algorithm', [
        {
            heading: 'Raft: Understandable Distributed Consensus',
            lines: [
                'Node States: Follower, Candidate, Leader.',
                'Heartbeat intervals: Leaders send AppendEntries RPCs every 50ms.',
                'Election timeout: Randomized between 150ms and 300ms to avoid split votes.',
                'Majority quorum: A cluster of 2F+1 nodes tolerates F Byzantine/crash failures.',
            ],
        },
        {
            heading: 'Log Replication & Safety Invariants',
            lines: [
                'Leader Append-Only property: Leaders never overwrite or truncate their own logs.',
                'Log Matching property: Matching term and index implies identical preceding log entries.',
                'Commit rule: An entry is committed once replicated across majority nodes by current leader.',
            ],
        },
    ]);
    fs_1.default.writeFileSync(doc3Path, doc3Buffer);
    const doc3 = await prisma.document.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse471.id,
            title: 'CSE471 Lecture 06 - Raft Consensus Algorithm',
            originalFilename: 'CSE471-Lecture-06-Raft.pdf',
            storedFilename: doc3Filename,
            filePath: doc3Path,
            mimeType: 'application/pdf',
            fileSize: doc3Buffer.length,
            category: 'Lecture Slides',
            description: 'Core lecture slides on Raft leader election, heartbeats, and log consistency rules.',
            comments: 'Review election timeout randomization proof before midterm.',
            isPdf: true,
            pageCount: 2,
            lastOpenedPage: 1,
            lastOpenedAt: new Date(),
            isScanned: false,
        },
    });
    // 6. Notes (Notion-inspired rich notes)
    const note1 = await prisma.note.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse443.id,
            documentId: doc1.id,
            title: 'Cryptographic Primitives & AES Modes Summary',
            content: `<h1>Cryptographic Primitives & AES Modes</h1>
<p>Comprehensive review for the upcoming Information System Security midterm exam.</p>
<h2>1. Symmetric Encryption Overview</h2>
<ul>
<li><strong>Block Ciphers:</strong> Encrypt fixed-size blocks (e.g., 128-bit blocks in AES).</li>
<li><strong>Stream Ciphers:</strong> Generate a pseudorandom keystream combined with plaintext via XOR (e.g., ChaCha20).</li>
</ul>
<h2>2. AES Modes Comparison</h2>
<table>
<thead><tr><th>Mode</th><th>Confidentiality</th><th>Authenticity</th><th>Parallelizable</th></tr></thead>
<tbody>
<tr><td>ECB</td><td>Weak (leaks patterns)</td><td>No</td><td>Yes</td></tr>
<tr><td>CBC</td><td>High (with random IV)</td><td>No (Vulnerable to padding oracle)</td><td>Decryption only</td></tr>
<tr><td>GCM</td><td>High (authenticated)</td><td>Yes (GMAC tag)</td><td>Full hardware acceleration</td></tr>
</tbody>
</table>
<h2>3. Key Action Items</h2>
<ul class="checklist">
<li>[x] Memorize AES S-box substitution steps</li>
<li>[x] Practice Diffie-Hellman discrete log modular arithmetic</li>
<li>[ ] Review RSA OAEP padding vs textbook RSA vulnerabilities</li>
</ul>
<blockquote>Tip: Never reuse an IV with the same key in GCM mode, as it completely destroys authenticity!</blockquote>`,
            isPinned: true,
            tags: JSON.stringify(['Cryptography', 'Midterm', 'AES', 'High Yield']),
            version: 1,
        },
    });
    const note2 = await prisma.note.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse499.id,
            documentId: doc2.id,
            title: 'Capstone Architecture Review & Sprint Plan',
            content: `<h1>Senior Capstone Architecture Notes</h1>
<p>Discussion points from weekly supervisor check-in with Prof. Elena Rostova.</p>
<h2>Decisions Made:</h2>
<ol>
<li><strong>Database:</strong> SQLite with WAL mode for local zero-latency access; Prisma schema fully typed.</li>
<li><strong>API Layer:</strong> Express with strict Zod validation schemas on all inputs.</li>
<li><strong>PDF Engine:</strong> Native client-side PDF.js rendering with vector canvas overlays for annotations.</li>
</ol>
<h2>Sprint 2 Checklist:</h2>
<ul class="checklist">
<li>[x] Finalize database ERD and relationship cascades</li>
<li>[x] Implement secure file upload handler with Multer and MIME verification</li>
<li>[ ] Complete FullCalendar drag-and-drop schedule synchronization</li>
<li>[ ] Add export/backup JSON bundle generator</li>
</ul>`,
            isPinned: true,
            tags: JSON.stringify(['Capstone', 'Architecture', 'Agile']),
            version: 1,
        },
    });
    // 7. Assignments
    const assign1 = await prisma.assignment.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse443.id,
            title: 'Security Vulnerability Audit & Exploit Analysis',
            description: 'Audit a provided vulnerable microservice codebase. Identify OWASP Top 10 vulnerabilities, construct proof-of-concept exploits, and author defensive mitigation patches.',
            deadline: new Date('2026-10-25T23:59:59.000Z'),
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            personalNotes: 'Already identified SQL injection in user profile route and insecure deserialization in session cookies.',
        },
    });
    // Checklist for assign1
    await prisma.taskChecklistItem.createMany({
        data: [
            { assignmentId: assign1.id, text: 'Static code scanning with Semgrep', isCompleted: true, sortOrder: 1 },
            { assignmentId: assign1.id, text: 'Reproduce SQL injection and extract test payload', isCompleted: true, sortOrder: 2 },
            { assignmentId: assign1.id, text: 'Analyze JWT signature bypass vulnerability', isCompleted: false, sortOrder: 3 },
            { assignmentId: assign1.id, text: 'Write remediation patches and verify regression test suite', isCompleted: false, sortOrder: 4 },
            { assignmentId: assign1.id, text: 'Compile executive PDF report with CVSS 3.1 severity scores', isCompleted: false, sortOrder: 5 },
        ],
    });
    // Link doc1 to assign1
    await prisma.assignmentDocument.create({
        data: {
            assignmentId: assign1.id,
            documentId: doc1.id,
            purpose: 'SUPPORTING_MATERIAL',
        },
    });
    const assign2 = await prisma.assignment.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse499.id,
            title: 'Sprint 2 Milestone Deliverable & Demo Video',
            description: 'Deploy working prototype to staging server, record 5-minute walkthrough, and submit updated SRS document.',
            deadline: new Date('2026-11-05T18:00:00.000Z'),
            priority: 'URGENT',
            status: 'IN_PROGRESS',
            personalNotes: 'Coordinate with frontend team lead by Wednesday afternoon.',
        },
    });
    await prisma.taskChecklistItem.createMany({
        data: [
            { assignmentId: assign2.id, text: 'Complete API integration tests for document management', isCompleted: true, sortOrder: 1 },
            { assignmentId: assign2.id, text: 'Verify responsive layout on tablet and mobile viewports', isCompleted: false, sortOrder: 2 },
            { assignmentId: assign2.id, text: 'Record demo screen recording with voiceover', isCompleted: false, sortOrder: 3 },
        ],
    });
    await prisma.assignmentDocument.create({
        data: {
            assignmentId: assign2.id,
            documentId: doc2.id,
            purpose: 'INSTRUCTION',
        },
    });
    const assign3 = await prisma.assignment.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse471.id,
            title: 'Distributed Hash Table (Chord Protocol) Lab',
            description: 'Implement consistent hashing and Chord protocol node join/stabilize algorithms in TypeScript or Go.',
            deadline: new Date('2026-11-12T23:59:59.000Z'),
            priority: 'MEDIUM',
            status: 'NOT_STARTED',
            personalNotes: 'Read Section 4 of Stoica et al. Chord paper before starting implementation.',
        },
    });
    // 8. Exams
    const exam1 = await prisma.exam.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse443.id,
            title: 'Midterm Examination - Information System Security',
            examType: 'Midterm',
            examDate: new Date('2026-10-28T10:00:00.000Z'),
            room: 'Exam Hall B, Seat 42',
            syllabus: 'Chapters 1-7: Classical ciphers, DES/AES, Modular arithmetic, Public Key Cryptography (RSA, ECC, Diffie-Hellman), Message Authentication Codes, TLS 1.3 architecture.',
            personalNotes: 'Calculator permitted. Bring student ID and blue pens.',
            preparationStatus: 'IN_PROGRESS',
            prepPercentage: 70,
        },
    });
    await prisma.taskChecklistItem.createMany({
        data: [
            { examId: exam1.id, text: 'Solve 2024 and 2025 past midterm papers', isCompleted: true, sortOrder: 1 },
            { examId: exam1.id, text: 'Review Diffie-Hellman primitive root calculations', isCompleted: true, sortOrder: 2 },
            { examId: exam1.id, text: 'Memorize TLS 1.3 1-RTT handshake message flow', isCompleted: false, sortOrder: 3 },
            { examId: exam1.id, text: 'Practice buffer overflow shellcode offset calculation', isCompleted: false, sortOrder: 4 },
        ],
    });
    // Link past question paper doc1 to exam1
    await prisma.examDocument.create({
        data: {
            examId: exam1.id,
            documentId: doc1.id,
            purpose: 'QUESTION_PAPER',
        },
    });
    const exam2 = await prisma.exam.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse471.id,
            title: 'Midterm Exam - Distributed Cloud Systems',
            examType: 'Midterm',
            examDate: new Date('2026-11-02T14:00:00.000Z'),
            room: 'Auditorium 1',
            syllabus: 'CAP theorem, Lamport Logical Clocks, Vector Clocks, Raft Consensus, Distributed Deadlock Detection.',
            personalNotes: 'Focus on drawing vector clock state diagrams and message race condition scenarios.',
            preparationStatus: 'NOT_STARTED',
            prepPercentage: 25,
        },
    });
    await prisma.examDocument.create({
        data: {
            examId: exam2.id,
            documentId: doc3.id,
            purpose: 'LECTURE_MATERIAL',
        },
    });
    // 9. Calendar Events
    const events = [
        {
            semesterId: fall2026.id,
            courseId: cse443.id,
            title: 'CSE443: Cryptography & Security Class',
            description: 'Public Key Infrastructure and Certificate Revocation Lists (CRL/OCSP).',
            startDate: new Date('2026-10-19T10:00:00.000Z'),
            endDate: new Date('2026-10-19T11:30:00.000Z'),
            isAllDay: false,
            category: 'CLASS',
            priority: 'MEDIUM',
            location: 'Lab 4B',
            reminderMinutesBefore: 30,
        },
        {
            semesterId: fall2026.id,
            courseId: cse499.id,
            title: 'CSE499: Capstone Sprint Review',
            description: 'Weekly team meeting with supervisor Prof. Elena Rostova.',
            startDate: new Date('2026-10-20T14:00:00.000Z'),
            endDate: new Date('2026-10-20T16:00:00.000Z'),
            isAllDay: false,
            category: 'PROJECT',
            priority: 'HIGH',
            location: 'Room 302',
            reminderMinutesBefore: 60,
        },
        {
            semesterId: fall2026.id,
            courseId: cse443.id,
            title: 'DEADLINE: Security Vulnerability Audit Report',
            description: 'Submit report and exploit POC files on university portal.',
            startDate: new Date('2026-10-25T23:59:59.000Z'),
            endDate: new Date('2026-10-25T23:59:59.000Z'),
            isAllDay: false,
            category: 'ASSIGNMENT',
            priority: 'HIGH',
            reminderMinutesBefore: 1440,
        },
        {
            semesterId: fall2026.id,
            courseId: cse443.id,
            title: 'EXAM: InfoSec Midterm Exam',
            description: 'Covers Chapters 1-7. Room Exam Hall B.',
            startDate: new Date('2026-10-28T10:00:00.000Z'),
            endDate: new Date('2026-10-28T12:00:00.000Z'),
            isAllDay: false,
            category: 'MIDTERM',
            priority: 'URGENT',
            location: 'Exam Hall B',
            reminderMinutesBefore: 120,
        },
        {
            semesterId: fall2026.id,
            courseId: cse471.id,
            title: 'EXAM: Distributed Cloud Midterm Exam',
            description: 'Raft consensus, Vector clocks, CAP theorem.',
            startDate: new Date('2026-11-02T14:00:00.000Z'),
            endDate: new Date('2026-11-02T16:00:00.000Z'),
            isAllDay: false,
            category: 'MIDTERM',
            priority: 'HIGH',
            location: 'Auditorium 1',
            reminderMinutesBefore: 120,
        },
        {
            semesterId: fall2026.id,
            courseId: cse443.id,
            title: 'Study Session: Diffie-Hellman & GCM Problem Solving',
            description: 'Complete all questions in 2025 midterm paper.',
            startDate: new Date('2026-10-22T19:00:00.000Z'),
            endDate: new Date('2026-10-22T21:30:00.000Z'),
            isAllDay: false,
            category: 'STUDY_SESSION',
            priority: 'MEDIUM',
            location: 'Home Study Desk',
            reminderMinutesBefore: 15,
        },
    ];
    for (const event of events) {
        await prisma.calendarEvent.create({ data: event });
    }
    // 10. Study Sessions
    await prisma.studySession.create({
        data: {
            semesterId: fall2026.id,
            courseId: cse443.id,
            title: 'Diffie-Hellman & GCM Problem Solving',
            scheduledDate: new Date('2026-10-22T19:00:00.000Z'),
            durationMinutes: 150,
            topics: 'AES GCM authentication tag, Galois Field GF(2^128) arithmetic, discrete logarithms.',
            isCompleted: false,
            notes: 'Make cheat sheet for primitive roots and modulo powers.',
        },
    });
    console.log('✅ Database seeded successfully with realistic university records!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
