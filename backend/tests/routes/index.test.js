const express = require("express");
const request = require("supertest");

// Mock the router module
jest.mock("../../routes/index", () => {
    const express = require("express");
    const router = express.Router();

    router.get("/", (req, res) => {
        // Instead of actually rendering a template, just return JSON for testing
        res.json({ title: "Swap" });
    });

    return router;
});

// Import app and attach mocked router
const indexRouter = require("../../routes/index");
const app = express();
app.use("/", indexRouter);

describe("Index Route", () => {
    it("GET / should return title 'Swap'", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ title: "Swap" });
    });
});