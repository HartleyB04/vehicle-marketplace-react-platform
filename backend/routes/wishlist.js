const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { admin, db } = require("../firebase");

const router = express.Router();

// Add listing to wishlist
// POST /api/wishlist
router.post("/", verifyToken, async (req, res) => {
    try {
        const { listingId } = req.body;
        const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

        if (!listingId) {
            return res.status(400).json({ error: "Listing ID is required" });
        }

        // Check if listing exists
        const listingDoc = await db.collection("listings").doc(listingId).get();
        if (!listingDoc.exists) {
            return res.status(404).json({ error: "Listing not found" });
        }

        // Check if already in wishlist
        const existingWishlist = await db.collection("wishlist")
            .where("userId", "==", userId)
            .where("listingId", "==", listingId)
            .get();

        if (!existingWishlist.empty) {
            return res.status(400).json({ error: "Listing already in wishlist" });
        }

        // Add to wishlist
        const wishlistItem = {
            userId,
            listingId,
            addedAt: new Date().toISOString()
        };

        const docRef = await db.collection("wishlist").add(wishlistItem);

        return res.status(201).json({ 
            id: docRef.id, 
            ...wishlistItem 
        });
    } catch (err) {
        console.error("Error adding to wishlist:", err);
        return res.status(500).json({ 
            error: "Failed to add to wishlist", 
            details: err.message 
        });
    }
});

// Get user's wishlist
// GET /api/wishlist
router.get("/", verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

        const snapshot = await db.collection("wishlist")
            .where("userId", "==", userId)
            .orderBy("addedAt", "desc")
            .get();

        const wishlist = await Promise.all(snapshot.docs.map(async (doc) => {
            const wishlistData = { id: doc.id, ...doc.data() };
            
            // Fetch listing details
            const listing = await db.collection("listings").doc(wishlistData.listingId).get();
            wishlistData.listing = listing.exists ? { id: listing.id, ...listing.data() } : null;

            return wishlistData;
        }));

        res.json(wishlist);
    } catch (err) {
        console.error("Error fetching wishlist:", err);
        res.status(500).json({ error: "Failed to fetch wishlist" });
    }
});

// Remove listing from wishlist
// DELETE /api/wishlist/:id
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

        const wishlistDoc = await db.collection("wishlist").doc(id).get();
        if (!wishlistDoc.exists) {
            return res.status(404).json({ error: "Wishlist item not found" });
        }

        const wishlistData = wishlistDoc.data();

        // Only owner can remove
        if (wishlistData.userId !== userId) {
            return res.status(403).json({ error: "Unauthorized to remove this item" });
        }

        await db.collection("wishlist").doc(id).delete();

        res.json({ message: "Removed from wishlist successfully" });
    } catch (err) {
        console.error("Error removing from wishlist:", err);
        res.status(500).json({ 
            error: "Failed to remove from wishlist", 
            details: err.message 
        });
    }
});

// Remove listing from wishlist by listing ID
// DELETE /api/wishlist/listing/:listingId
router.delete("/listing/:listingId", verifyToken, async (req, res) => {
    try {
        const { listingId } = req.params;
        const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

        const snapshot = await db.collection("wishlist")
            .where("userId", "==", userId)
            .where("listingId", "==", listingId)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "Listing not in wishlist" });
        }

        // Delete all matching documents (should be only one)
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        res.json({ message: "Removed from wishlist successfully" });
    } catch (err) {
        console.error("Error removing from wishlist:", err);
        res.status(500).json({ 
            error: "Failed to remove from wishlist", 
            details: err.message 
        });
    }
});

// Check if listing is in wishlist
// GET /api/wishlist/check/:listingId
router.get("/check/:listingId", verifyToken, async (req, res) => {
    try {
        const { listingId } = req.params;
        const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

        const snapshot = await db.collection("wishlist")
            .where("userId", "==", userId)
            .where("listingId", "==", listingId)
            .get();

        res.json({ inWishlist: !snapshot.empty });
    } catch (err) {
        console.error("Error checking wishlist:", err);
        res.status(500).json({ error: "Failed to check wishlist" });
    }
});

module.exports = router;