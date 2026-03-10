// MOCK DEPENDENCIES
const mockGetUser = jest.fn(async (uid) => ({ uid, email: 'user@test.com', disabled: false }));
const mockUpdateUser = jest.fn(async (uid, props) => ({ uid, ...props }));

// Mock firebase
jest.mock('../../firebase', () => ({
    db: {
        collection: jest.fn(() => ({
            add: jest.fn(async () => ({ id: 'mock-report-id' })),
        })),
    },
    admin: {
        auth: () => ({
            getUser: mockGetUser,
            updateUser: mockUpdateUser,
        }),
    },
    Timestamp: {
        now: jest.fn(() => new Date()),
    },
}));

// Mock authMiddleware
jest.mock('../../middleware/authMiddleware', () => ({
    verifyToken: jest.fn((req, res, next) => {
        req.user = { uid: 'reporter123' };
        next();
    }),
}));

// Mock Cloudinary 
jest.mock('../../utils/cloudinaryUploader', () => ({
    uploadFiles: jest.fn(async (files) => files.map((f, i) => `http://mock.url/file${i}.jpg`)),
    upload: {
        array: jest.fn(() => (req, res, next) => {
            req.files = req.body.evidence?.length ? [{ filename: 'mockFile.jpg', path: '/mock/path/mockFile.jpg' }] : [];
            next();
        }),
    },
}));

// Mock email
jest.mock('../../utils/email', () => ({
    sendSuspensionEmail: jest.fn(async () => true),
}));

// Setup express
const request = require("supertest");
const express = require("express");
const reportRouter = require("../../routes/reports");

const app = express();
app.use(express.json());
app.use("/api/report", reportRouter);

// TEST CASES
describe("Report User", () => {
    beforeAll(() => {
        jest.spyOn(console, "error").mockImplementation(() => { }); // suppress error logs
    });

    afterAll(() => {
        console.error.mockRestore(); // restore normal behavior after tests
    });
    
    it("should submit report successfully with evidence", async () => {
        const res = await request(app)
            .post("/api/report")
            .send({
                targetUid: "user123",
                reason: "Fraudulent listing",
                details: "User posted fraudulent car listing",
                evidence: ["file1.jpg"],
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Report submitted and account locked");
        expect(res.body.evidence.length).toBeGreaterThan(0);
    });

    it("should submit report successfully without evidence", async () => {
        const res = await request(app)
            .post("/api/report")
            .send({ targetUid: "user123", reason: "Harassment" });

        expect(res.statusCode).toBe(200);
        expect(res.body.evidence).toEqual([]);
    });

    it("should return 400 if missing required fields", async () => {
        const res = await request(app)
            .post("/api/report")
            .send({ reason: "Spam" }); // targetUid missing

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/Missing required fields/);
    });

    it("should return 400 if target UID does not exist", async () => {
        mockGetUser.mockImplementationOnce(async () => {
            const err = new Error("User not found");
            err.code = "auth/user-not-found";
            throw err;
        });

        const res = await request(app)
            .post("/api/report")
            .send({ targetUid: "nonexistent", reason: "Spam" });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/No user found with UID/);
    });

    it("should return 500 if disabling user fails", async () => {
        mockUpdateUser.mockImplementationOnce(async () => {
            throw new Error("update failed");
        });

        const res = await request(app)
            .post("/api/report")
            .send({ targetUid: "user123", reason: "Spam" });

        expect(res.statusCode).toBe(500);
        expect(res.body.error).toBe("Failed to disable user");
    });
});
