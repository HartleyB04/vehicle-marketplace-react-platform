const request = require("supertest");
const express = require("express");

// MOCK DEPENDENCIES
// Mock Firebase
jest.mock("../../firebase", () => {
    const conversations = {
        mockConvoId: {
            participants: ["user123", "user456"],
            listingId: { listingName: "Test Listing" },
            lastUpdated: new Date(),
        }
    };

    const messages = {
        mockConvoId: [
            {
                id: "msg1",
                senderId: "user123",
                senderEmail: "user@test.com",
                text: "Hello!",
                timestamp: new Date(),
                senderDisabled: false,
            }
        ]
    };

    const authMock = {
        verifyIdToken: jest.fn(async (token) => {
            if (token === "valid-token") return { uid: "user123", email: "user@test.com" };
            throw new Error("Invalid token");
        }),
        getUser: jest.fn(async (uid) => ({
            uid,
            email: uid === "suspendedUser" ? "suspended@test.com" : "user@test.com",
            disabled: uid === "suspendedUser",
        })),
    };

    const collectionMock = (colName) => ({
        doc: (id) => ({
            get: jest.fn(() => Promise.resolve({
                exists: !!conversations[id],
                id,
                data: () => conversations[id] || {},
            })),
            set: jest.fn((data) => {
                conversations[id] = data;
                messages[id] = [];
                return Promise.resolve();
            }),
            update: jest.fn((data) => {
                conversations[id] = { ...conversations[id], ...data };
                return Promise.resolve();
            }),
            collection: (subCol) => ({
                add: jest.fn((msg) => {
                    const msgId = `msg-${Math.random().toString(36).substring(2, 8)}`;
                    if (!messages[id]) messages[id] = [];
                    const message = { id: msgId, ...msg, timestamp: msg.timestamp || new Date() };
                    messages[id].push(message);
                    return Promise.resolve({ id: msgId });
                }),
                orderBy: () => ({
                    where: (field, op, value) => ({
                        get: jest.fn(() => {
                            const filtered = messages[id]?.filter(m => m[field] > value) || [];
                            return Promise.resolve({
                                docs: filtered.map(msg => ({ id: msg.id, data: () => msg })),
                            });
                        }),
                    }),
                    get: jest.fn(() => Promise.resolve({
                        docs: messages[id]?.map(msg => ({ id: msg.id, data: () => msg })) || [],
                    })),
                }),
            }),
        }),
        where: (field, op, value) => ({
            orderBy: () => ({
                get: jest.fn(() => {
                    const convoList = Object.entries(conversations)
                        .filter(([_, c]) => c.participants?.includes(value))
                        .map(([id, c]) => ({ id, data: () => c }));
                    return Promise.resolve({ docs: convoList });
                }),
            }),
        }),
    });

    const firestoreMock = () => ({ collection: collectionMock });

    return {
        admin: { auth: () => authMock, firestore: firestoreMock },
        db: firestoreMock(),
        Timestamp: { now: jest.fn(() => new Date()), fromMillis: jest.fn(ms => new Date(ms)) },
    };
});

// Mock verifyToken middleware
jest.mock("../../middleware/authMiddleware", () => ({
    verifyToken: jest.fn((req, res, next) => {
        req.user = { uid: "user123" };
        next();
    }),
}));

// Setup express
const app = express();
const conversationsRouter = require("../../routes/conversations");
app.use(express.json());
app.use("/api/conversations", conversationsRouter);

// TEST CASES
describe("conversations API", () => {
    describe("POST /api/conversations", () => {
        it("should create a new conversation", async () => {
            const res = await request(app)
                .post("/api/conversations")
                .send({ participants: ["user123", "user456"], listingId: { listingName: "Test" } });

            expect(res.statusCode).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.messages.length).toBe(1);
        });

        it("should return 400 if less than 2 participants", async () => {
            const res = await request(app)
                .post("/api/conversations")
                .send({ participants: ["user123"] });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/At least 2 participants required/);
        });

        it("should add a message to existing conversation", async () => {
            const res = await request(app)
                .post("/api/conversations")
                .send({ participants: ["user123", "user456"], initialMessage: "Hi!" });

            expect(res.statusCode).toBe(200);
            expect(res.body.existing).toBe(true);
            expect(res.body.newMessage.text).toBe("Hi!");
        });
    });

    describe("GET /api/conversations/ConvoId/messages", () => {
        it("should return 400 if message is empty", async () => {
            const res = await request(app)
                .post("/api/conversations/mockConvoId/messages")
                .send({ text: "" });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/Message text is required/);
        });

        it("should add a new message", async () => {
            const text = "Hello there!";
            const res = await request(app)
                .post("/api/conversations/mockConvoId/messages")
                .send({ text });

            expect(res.statusCode).toBe(201);
            expect(res.body.messages).toBeDefined();
            expect(res.body.messages[res.body.messages.length - 1].text).toBe(text);
        });
    });

    describe("GET /api/conversations/ConvoId/messages", () => {
        it("should fetch messages with suspended flag", async () => {
            const res = await request(app).get("/api/conversations/mockConvoId/messages");

            expect(res.statusCode).toBe(200);
            expect(res.body.messages).toBeDefined();
            expect(res.body.suspended).toBe(false);
        });
    });

    describe("GET /api/conversations", () => {
        it("should return list of conversations", async () => {
            const res = await request(app).get("/api/conversations");

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].id).toBeDefined();
            expect(res.body[0].displayEmail).toBe("user@test.com");
        });
    });
});