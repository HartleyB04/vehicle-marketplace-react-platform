const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Public route
router.get("/", (req, res) => {
  res.json({ message: "Users endpoint active" })
});

// Protected route
router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "User profile data",
    user: req.user,
  })
});

module.exports = router;