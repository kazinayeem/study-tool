"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = __importDefault(require("../index.js"));
const prisma_js_1 = require("../prisma.js");
(0, vitest_1.describe)('Personal Student Management System API Tests', () => {
    (0, vitest_1.beforeAll)(async () => {
        // Ensure database connection
        await prisma_js_1.prisma.$connect();
    });
    (0, vitest_1.it)('GET /api/health should return ok status', async () => {
        const res = await (0, supertest_1.default)(index_js_1.default).get('/api/health');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe('ok');
        (0, vitest_1.expect)(res.body.service).toBe('Personal Student Management System API');
    });
    (0, vitest_1.it)('GET /api/semesters should return list of semesters with courses', async () => {
        const res = await (0, supertest_1.default)(index_js_1.default).get('/api/semesters');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
        (0, vitest_1.expect)(res.body.data.length).toBeGreaterThanOrEqual(1);
        const fall2026 = res.body.data.find((s) => s.name === 'Fall 2026');
        (0, vitest_1.expect)(fall2026).toBeDefined();
        (0, vitest_1.expect)(fall2026.status).toBe('ACTIVE');
    });
    (0, vitest_1.it)('POST /api/semesters should validate required fields', async () => {
        const res = await (0, supertest_1.default)(index_js_1.default).post('/api/semesters').send({
            name: '',
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.success).toBe(false);
    });
    (0, vitest_1.it)('POST /api/semesters/:id/duplicate should duplicate structure without files', async () => {
        const semesters = await prisma_js_1.prisma.semester.findMany();
        const original = semesters[0];
        const res = await (0, supertest_1.default)(index_js_1.default)
            .post(`/api/semesters/${original.id}/duplicate`)
            .send({
            newName: 'Fall 2026 Structured Clone',
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.name).toBe('Fall 2026 Structured Clone');
        (0, vitest_1.expect)(res.body.data.courses.length).toBeGreaterThanOrEqual(1);
        // Clean up duplicated test semester
        await prisma_js_1.prisma.semester.delete({ where: { id: res.body.data.id } });
    });
    (0, vitest_1.it)('GET /api/documents should return documents with metadata', async () => {
        const res = await (0, supertest_1.default)(index_js_1.default).get('/api/documents');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
        (0, vitest_1.expect)(res.body.data.length).toBeGreaterThanOrEqual(1);
        const doc = res.body.data[0];
        (0, vitest_1.expect)(doc.storedFilename).toBeDefined();
        (0, vitest_1.expect)(doc.isPdf).toBe(true);
    });
    (0, vitest_1.it)('GET /api/notes and autosave conflict prevention', async () => {
        // 1. Create a note
        const createRes = await (0, supertest_1.default)(index_js_1.default).post('/api/notes').send({
            title: 'Operating Systems Virtual Memory',
            content: '<p>Paging and TLB caches.</p>',
        });
        (0, vitest_1.expect)(createRes.status).toBe(201);
        const noteId = createRes.body.data.id;
        const initialVersion = createRes.body.data.version;
        // 2. Successful update with expected version
        const updateRes = await (0, supertest_1.default)(index_js_1.default).put(`/api/notes/${noteId}`).send({
            title: 'Operating Systems Virtual Memory (Updated)',
            content: '<p>Updated with Multi-level page tables.</p>',
            expectedVersion: initialVersion,
        });
        (0, vitest_1.expect)(updateRes.status).toBe(200);
        (0, vitest_1.expect)(updateRes.body.data.version).toBe(initialVersion + 1);
        // 3. Stale update attempt should trigger 409 Conflict
        const staleRes = await (0, supertest_1.default)(index_js_1.default).put(`/api/notes/${noteId}`).send({
            title: 'Stale Overwrite Attempt',
            expectedVersion: initialVersion, // Old version
        });
        (0, vitest_1.expect)(staleRes.status).toBe(409);
        (0, vitest_1.expect)(staleRes.body.success).toBe(false);
        // Cleanup
        await prisma_js_1.prisma.note.delete({ where: { id: noteId } });
    });
    (0, vitest_1.it)('GET /api/dashboard should compute real database statistics', async () => {
        const res = await (0, supertest_1.default)(index_js_1.default).get('/api/dashboard');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.stats.totalSemesters).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(res.body.data.stats.totalCourses).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(res.body.data.upcomingExams).toBeDefined();
        (0, vitest_1.expect)(res.body.data.upcomingAssignments).toBeDefined();
    });
    (0, vitest_1.it)('GET /api/search should return cross-entity matches', async () => {
        const res = await (0, supertest_1.default)(index_js_1.default).get('/api/search?q=Security');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.courses.length).toBeGreaterThanOrEqual(1);
    });
});
