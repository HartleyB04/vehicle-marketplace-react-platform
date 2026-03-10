const request = require("supertest");
const express = require("express");

// MOCK DEPENDENCIES
// Mock middleware
jest.mock("../../middleware/authMiddleware", () => ({
    verifyToken: jest.fn((req, res, next) => {
        req.user = { uid: "user123" };
        next();
    }),
}));

// Setup express
const app = express();
const wishlistRouter = require("../../routes/wishlist");
app.use(express.json());
app.use("/api/wishlist", wishlistRouter);

// TEST CASES
describe("wishlist API", () => {
    let wishlistId;
    let listingId = "listing-1";

    beforeAll(async () => {
        // Pre-populate a listing in mock DB
        const { db } = require("../../firebase");
        await db.collection("listings").doc(listingId).set({ title: "Test Listing", userId: "owner1" });
    });

    describe("POST api/wishlist", () => {
        it("should add a listing to wishlist", async () => {
            const res = await request(app)
                .post("/api/wishlist")
                .send({ listingId });

            expect(res.statusCode).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.userId).toBe("user123");
            wishlistId = res.body.id;
        });

        it("should not add the same listing twice", async () => {
            const res = await request(app)
                .post("/api/wishlist")
                .send({ listingId });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/already in wishlist/i);
        });
    });

    describe("GET api/wishlist", () => {
        it("should fetch user's wishlist", async () => {
            const res = await request(app).get("/api/wishlist");
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].listing.title).toBe("Test Listing");
        });
    });

    describe("GET api/wishlist/check/listingId", () => {
        it("should check if listing is in wishlist", async () => {
            const res = await request(app).get(`/api/wishlist/check/${listingId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.inWishlist).toBe(true);
        });
    });

    describe("DELETE api/wishlist", () => {
        it("should remove listing from wishlist by wishlist ID", async () => {
            const res = await request(app).delete(`/api/wishlist/${wishlistId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/successfully/i);
        });
    });

    describe("GET api/wishlist/check/listingId", () => {
        it("should return not in wishlist after removal", async () => {
            const res = await request(app).get(`/api/wishlist/check/${listingId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.inWishlist).toBe(false);
        });
    });
});
