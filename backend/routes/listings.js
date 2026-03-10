const express = require("express");
const { admin, db } = require("../firebase");
const { verifyToken } = require("../middleware/authMiddleware");
const { upload, uploadFiles } = require("../utils/cloudinaryUploader");
const fs = require("fs");
const router = express.Router();

// POST /api/listings
router.post("/", verifyToken, (req, res, next) => upload.array("images", 10)(req, res, next), async (req, res) => {
  // req.user populated by verifyToken middleware (decoded token)
  try {
    const { listingName, price, condition, location, description } = req.body;
    const category = req.body.category ? JSON.parse(req.body.category) : null;

    // Check required fields
    if (!listingName || !price || !condition || !location) {
      req.files?.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ error: "Missing required fields (listingName, price, condition, location)" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    // Upload files to Cloudinary in parallel
    const imageUrls = await uploadFiles(req.files, "swap-listings");

    // Build listing object
    const listing = {
      listingName,
      price: Number(price),
      condition,
      location,
      description: description || "",
      category: category || {},
      images: imageUrls,
      status: "active",
      userId: req.user.uid || req.user.claims?.user_id || req.user.user_id, // whichever decoded token exposes
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore (collection: listings)
    const docRef = await db.collection("listings").add(listing);

    return res.status(201).json({ id: docRef.id, ...listing });
  } catch (err) {
    // cleanup temp files on error if exist
    if (req.files) {
      req.files.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (e) { }
      });
    }
    console.error("Error in /api/listings:", err);
    return res.status(500).json({ error: "Failed to create listing", details: err.message });
  }
});

// GET all listings
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("listings").orderBy("createdAt", "desc").get();
    const listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(listings);
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// GET current user's listings (must be before /:id to avoid route conflicts)
router.get("/user/my-listings", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

    const snapshot = await db.collection("listings")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(listings);
  } catch (err) {
    console.error("Error fetching user listings:", err);
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
});

// GET single listing by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("listings").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const listingData = doc.data();

    // Fetch user record to check if account is disabled
    let suspended = false;
    try {
      const userRecord = await admin.auth().getUser(listingData.userId);
      suspended = userRecord.disabled || false;
    } catch (err) {
      console.warn(`Failed to fetch user record for ${listingData.userId}:`, err);
    }

    res.json({ id: doc.id, ...listingData, suspended });
  } catch (err) {
    console.error("Error fetching listing:", err);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// UPDATE listing
router.patch("/:id", verifyToken, upload.array("images", 10), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const listingDoc = await db.collection("listings").doc(id).get();
    if (!listingDoc.exists) return res.status(404).json({ error: "Listing not found" });
    const listingData = listingDoc.data();
    if (listingData.userId !== userId) return res.status(403).json({ error: "Unauthorized" });

    const updates = { ...req.body };
    if (updates.category) updates.category = JSON.parse(updates.category);

    // Handle new images
    if (req.files && req.files.length > 0) {
      const imageUrls = await uploadFiles(req.files, "swap-listings");
      updates.images = imageUrls; // replace or merge as you wish
    }

    await db.collection("listings").doc(id).update({ ...updates, updatedAt: new Date().toISOString() });
    const updatedDoc = await db.collection("listings").doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    console.error("Error updating listing:", err);
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// DELETE listing
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

    // Get the listing to check ownership
    const listingDoc = await db.collection("listings").doc(id).get();
    if (!listingDoc.exists) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const listingData = listingDoc.data();
    if (listingData.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized to delete this listing" });
    }

    // Delete the listing
    await db.collection("listings").doc(id).delete();

    res.json({ message: "Listing deleted successfully" });
  } catch (err) {
    console.error("Error deleting listing:", err);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

module.exports = router;