const request = require("supertest");
const express = require("express");

// MOCK DEPENDENCIES
const mockAdd = jest.fn(async (data) => ({ id: "mock-listing-id", data }));
const mockGet = jest.fn(async () => ({ exists: true, id: "mock-listing-id", data: () => mockListing }));
const mockUpdate = jest.fn(async () => true);
const mockDelete = jest.fn(async () => true);
const mockUploadArray = jest.fn((field, maxCount) => (req, res, next) => {
    req.files = []; // default empty
    next();
});

// Mock listing
let mockListing = {
    listingName: "Old Phone",
    price: 200,
    condition: "Used",
    location: "Sydney",
    description: "Still works well",
    category: { name: "Electronics" },
    images: ["http://mock.url/image1.jpg"],
    status: "active",
    userId: "user123",
    createdAt: new Date().toISOString(),
};

// Mock firebase
jest.mock("../../firebase", () => ({
    db: {
        collection: jest.fn(() => ({
            add: mockAdd,
            doc: jest.fn(() => ({
                get: mockGet,
                update: mockUpdate,
                delete: mockDelete,
            })),
            orderBy: jest.fn(() => ({
                get: jest.fn(async () => ({
                    docs: [
                        { id: "mock-listing-id", data: () => mockListing }
                    ],
                })),
            })),
            where: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                    get: jest.fn(async () => ({
                        docs: [
                            { id: "mock-listing-id", data: () => mockListing }
                        ],
                    })),
                })),
            })),
        })),
    },
    admin: {
        auth: () => ({
            getUser: jest.fn(async (uid) => ({
                uid,
                email: "seller@test.com",
                disabled: false,
            })),
        }),
    },
}));

// Mock fs
jest.mock("fs", () => ({
    unlinkSync: jest.fn(),
}));

// Mock middleware
jest.mock("../../middleware/authMiddleware", () => ({
    verifyToken: jest.fn((req, res, next) => {
        req.user = { uid: "user123" };
        next();
    }),
}));

// Mock claudinary
jest.mock('../../utils/cloudinaryUploader', () => ({
    uploadFiles: jest.fn(async (files) => files.map((f, i) => `http://mock.url/file${i}.jpg`)),
    upload: { array: mockUploadArray },
}));

// Setup express 
const app = express();
const listingsRouter = require("../../routes/listings");
app.use(express.json());
app.use("/api/listings", listingsRouter);

// TEST CASES
describe("Listings API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST api/listings", () => {
        it("should create a new listing successfully", async () => {
            mockUploadArray.mockImplementationOnce((field, maxCount) => (req, res, next) => {
                req.files = [{ filename: 'mockFile.jpg', path: '/mock/path/mockFile.jpg' }];
                next();
            });

            const res = await request(app)
                .post("/api/listings")
                .send({
                    listingName: "Test Item",
                    price: 100,
                    condition: "New",
                    location: "Melbourne",
                    description: "Brand new item",
                    category: JSON.stringify({ name: "Electronics" }),
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.listingName).toBe("Test Item");
            expect(res.body.images.length).toBeGreaterThan(0);
        });

        it("should return 400 if missing required fields", async () => {
            const res = await request(app)
                .post("/api/listings")
                .send({
                    price: 100,
                    condition: "New",
                    location: "Sydney",
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/Missing required fields/);
        });

        it("should return 400 if no images provided", async () => {
            const res = await request(app)
                .post("/api/listings")
                .send({
                    listingName: "Test Item",
                    price: 100,
                    condition: "New",
                    location: "Sydney",
                    description: "Brand new item",
                    category: JSON.stringify({ name: "Electronics" }),
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/At least one image is required/);
        });
    });

    describe("GET api/listings", () => {
        it("should fetch all listings", async () => {
            const res = await request(app).get("/api/listings");
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].listingName).toBeDefined();
        });
    });

    describe("GET api/listings/user/my-listings", () => {
        it("should fetch listings for the current user", async () => {
            const res = await request(app).get("/api/listings/user/my-listings");
            expect(res.statusCode).toBe(200);
            expect(res.body[0].userId).toBe("user123");
        });
    });

    describe("GET api/listings/listing-id", () => {
        it("should fetch single listing by ID", async () => {
            const res = await request(app).get("/api/listings/mock-listing-id");
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe("mock-listing-id");
            expect(res.body.suspended).toBe(false);
        });

        it("should return 404 if listing not found", async () => {
            mockGet.mockImplementationOnce(async () => ({ exists: false }));
            const res = await request(app).get("/api/listings/unknown-id");
            expect(res.statusCode).toBe(404);
            expect(res.body.error).toMatch(/Listing not found/);
        });
    });

    describe("PATCH api/listings/listing-id", () => {
        it("should update listing if user is owner", async () => {
            const res = await request(app)
                .patch("/api/listings/mock-listing-id")
                .send({ price: 250 });

            expect(res.statusCode).toBe(200);
            expect(mockUpdate).toHaveBeenCalled();
        });

        it("should return 403 if user not owner when updating", async () => {
            mockGet.mockImplementationOnce(async () => ({
                exists: true,
                data: () => ({ userId: "otherUser" }),
            }));

            const res = await request(app)
                .patch("/api/listings/mock-listing-id")
                .send({ price: 999 });

            expect(res.statusCode).toBe(403);
            expect(res.body.error).toMatch(/Unauthorized/);
        });
    });

    describe("DELETE api/listings/listing-id", () => {
        it("should delete listing if user is owner", async () => {
            const res = await request(app).delete("/api/listings/mock-listing-id");
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/deleted successfully/);
        });

        it("should return 403 if user not owner when deleting", async () => {
            mockGet.mockImplementationOnce(async () => ({
                exists: true,
                data: () => ({ userId: "someoneElse" }),
            }));

            const res = await request(app).delete("/api/listings/mock-listing-id");
            expect(res.statusCode).toBe(403);
            expect(res.body.error).toMatch(/Unauthorized/);
        });

        it("should return 404 if deleting non-existent listing", async () => {
            mockGet.mockImplementationOnce(async () => ({ exists: false }));
            const res = await request(app).delete("/api/listings/nonexistent-id");
            expect(res.statusCode).toBe(404);
            expect(res.body.error).toMatch(/Listing not found/);
        });
    });
});
