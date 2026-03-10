const request = require("supertest");
const express = require("express");

// Mock middleware
jest.mock("../../middleware/authMiddleware", () => ({
    verifyToken: jest.fn((req, res, next) => {
        req.user = { uid: "user123" };
        next();
    }),
}));

// Setup express
const app = express();
const swapRouter = require("../../routes/swapRequests");
app.use(express.json());
app.use("/api/swapRequests", swapRouter);

// TEST CASES
describe("Swap Requests API", () => {
    let targetListingId = "listing-target";
    let offeredListingId = "listing-offered";
    let swapRequestId;

    beforeAll(async () => {
        const { db } = require("../../firebase");

        // Create target listing (owned by someone else)
        await db.collection("listings").doc(targetListingId).set({
            userId: "owner456",
            title: "Target Listing",
        });

        // Create offered listing (owned by user123)
        await db.collection("listings").doc(offeredListingId).set({
            userId: "user123",
            title: "Offered Listing",
        });
    });

    describe("POST api/swapRequests", () => {
        it("should create a swap request", async () => {
            const res = await request(app)
                .post("/api/swapRequests")
                .send({
                    targetListingId,
                    offeredListingId,
                    requestType: "swap",
                    message: "I want to swap",
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.senderId).toBe("user123");
            expect(res.body.receiverId).toBe("owner456");
            swapRequestId = res.body.id;
        });
    });

    describe("GET api/swapRequests/sent", () => {
        it("should fetch sent requests", async () => {
            const res = await request(app).get("/api/swapRequests/sent");
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0].senderId).toBe("user123");
            expect(res.body[0].targetListing.title).toBe("Target Listing");
        });
    });

    describe("GET api/swapRequests/received", () => {
        it("should fetch received requests for target owner", async () => {
            // Mock token as owner456
            const { verifyToken } = require("../../middleware/authMiddleware");
            verifyToken.mockImplementationOnce((req, res, next) => {
                req.user = { uid: "owner456" };
                next();
            });

            const res = await request(app).get("/api/swapRequests/received");
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0].receiverId).toBe("owner456");
            expect(res.body[0].targetListing.title).toBe("Target Listing");
        });
    });

    describe("POST api/swapRequests/sent/swapRequestId/accept", () => {
        it("should accept a swap request", async () => {
            const { verifyToken } = require("../../middleware/authMiddleware");
            verifyToken.mockImplementationOnce((req, res, next) => {
                req.user = { uid: "owner456" };
                next();
            });

            const res = await request(app)
                .post(`/api/swapRequests/${swapRequestId}/accept`)
                .send({ contactInfo: { email: "owner456@example.com" } });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe("accepted");
        });
    });

    describe("POST api/swapRequests/sent/swapRequestId/reject", () => {
        it("should reject a swap request", async () => {
            // Create new swap request to test reject
            const { db } = require("../../firebase");
            const newReq = await db.collection("swapRequests").add({
                senderId: "user123",
                receiverId: "owner456",
                targetListingId,
                requestType: "swap",
                offeredListingId,
                message: "Please reject me",
                status: "pending",
                createdAt: new Date().toISOString(),
            });

            const { verifyToken } = require("../../middleware/authMiddleware");
            verifyToken.mockImplementationOnce((req, res, next) => {
                req.user = { uid: "owner456" };
                next();
            });

            const res = await request(app)
                .post(`/api/swapRequests/${newReq.id}/reject`)
                .send();

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe("rejected");
        });
    });

    describe("DELETE api/swapRequests/swapRequestId", () => {
        it("should cancel a swap request", async () => {
            // Create new swap request to test cancel
            const { db } = require("../../firebase");
            const newReq = await db.collection("swapRequests").add({
                senderId: "user123",
                receiverId: "owner456",
                targetListingId,
                requestType: "swap",
                offeredListingId,
                message: "Cancel me",
                status: "pending",
                createdAt: new Date().toISOString(),
            });

            const res = await request(app)
                .delete(`/api/swapRequests/${newReq.id}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/cancelled/i);
        });
    });
});
