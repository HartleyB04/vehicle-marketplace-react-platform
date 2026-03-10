// MOCK DEPENDENCIES
// Mock firebase-admin
jest.mock("firebase-admin", () => {
    const authMock = {
        verifyIdToken: jest.fn((token) => {
            if (token === "valid-token") {
                return Promise.resolve({ uid: "123", email: "testuser@example.com" });
            }
            return Promise.reject(new Error("Invalid token"));
        }),
        getUser: jest.fn(async (uid) => ({ uid, email: "user@test.com", disabled: false })),
        updateUser: jest.fn(async (uid, props) => ({ uid, ...props })),
    };

    const firestoreMock = () => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn(() =>
                    Promise.resolve({ exists: true, data: () => ({ participants: ["123"] }) })
                ),
                set: jest.fn(() => Promise.resolve()),
                update: jest.fn(() => Promise.resolve()),
                collection: jest.fn(() => ({
                    add: jest.fn(() => Promise.resolve({ id: "mock-msg-id" })),
                    orderBy: jest.fn(() => ({
                        get: jest.fn(() =>
                            Promise.resolve({ docs: [{ id: "mock-msg-id", data: () => ({ text: "hello" }) }] })
                        ),
                    })),
                })),
            })),
        })),
    });

    return {
        initializeApp: jest.fn(),
        credential: { cert: jest.fn() },
        auth: () => authMock,
        firestore: firestoreMock,
        Timestamp: { now: jest.fn(() => new Date()) },
    };
});

// Setup express
const request = require("supertest");
const app = require("../../app.js");

// TEST CASES
describe("users API", () => {
    it("should return 401 if no token provided", async () => {
        const res = await request(app).get("/users/profile");
        expect(res.statusCode).toBe(401);
        expect(res.body.error).toBe("No token provided");
    });

    it("should return 403 if token is invalid", async () => {
        const res = await request(app)
            .get("/users/profile")
            .set("Authorization", "Bearer invalid-token");
        expect(res.statusCode).toBe(403);
        expect(res.body.error).toBe("Invalid token");
    });

    it("should return user data if token is valid", async () => {
        const res = await request(app)
            .get("/users/profile")
            .set("Authorization", "Bearer valid-token");
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual({
            uid: "123",
            email: "testuser@example.com",
        });
    });
});
