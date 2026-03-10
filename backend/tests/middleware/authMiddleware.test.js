// Mock dependencies
const mockVerifyIdToken = jest.fn();

jest.mock("firebase-admin", () => ({
    auth: () => ({
        verifyIdToken: mockVerifyIdToken,
    }),
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
}));

// Import middleware 
const { verifyToken } = require("../../middleware/authMiddleware");

// Test cases
describe("verifyToken middleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = { headers: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();

        // Reset mock calls
        mockVerifyIdToken.mockReset();
    });

    it("should call next() if token is valid", async () => {
        req.headers.authorization = "Bearer valid-token";

        // Mock token verification success
        mockVerifyIdToken.mockResolvedValue({ uid: "user123" });

        await verifyToken(req, res, next);

        expect(req.user).toEqual({ uid: "user123" });
        expect(next).toHaveBeenCalled();
    });

    it("should return 403 if token is invalid", async () => {
        req.headers.authorization = "Bearer invalid-token";

        // Mock token verification failure
        mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    });

    it("should return 401 if no token is provided", async () => {
        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    });
});
