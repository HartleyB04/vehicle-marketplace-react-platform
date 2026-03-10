const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { db } = require("../firebase");
const router = express.Router();

// POST create a swap request
router.post("/", verifyToken, async (req, res) => {
  try {
    const { targetListingId, offeredListingId, requestType, message } = req.body;
    const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

    // Validate request type
    if (!["swap", "buy"].includes(requestType)) {
      return res.status(400).json({ error: "Invalid request type. Must be 'swap' or 'buy'" });
    }

    // For 'swap' requests, offeredListingId is required
    if (requestType === "swap" && !offeredListingId) {
      return res.status(400).json({ error: "For swap requests, an offered listing ID is required" });
    }

    if (!targetListingId) {
      return res.status(400).json({ error: "Target listing ID is required" });
    }

    // Get target listing to check if it exists and to get owner ID
    const targetListingDoc = await db.collection("listings").doc(targetListingId).get();
    if (!targetListingDoc.exists) {
      return res.status(404).json({ error: "Target listing not found" });
    }

    const targetListing = targetListingDoc.data();
    const targetOwnerId = targetListing.userId;

    // User cannot request their own listing
    if (targetOwnerId === userId) {
      return res.status(400).json({ error: "Cannot create a request for your own listing" });
    }

    // If it's a swap, validate the offered listing
    let offeredListing = null;
    if (requestType === "swap" && offeredListingId) {
      const offeredListingDoc = await db.collection("listings").doc(offeredListingId).get();

      if (!offeredListingDoc.exists) {
        return res.status(404).json({ error: "Offered listing not found" });
      }

      offeredListing = offeredListingDoc.data();

      // Validate that the user owns the offered listing
      if (offeredListing.userId !== userId) {
        return res.status(403).json({ error: "You can only offer listings you own" });
      }
    }

    // Check if a similar request already exists
    const existingRequestsSnapshot = await db.collection("swapRequests")
      .where("senderId", "==", userId)
      .where("targetListingId", "==", targetListingId)
      .where("status", "==", "pending")
      .get();

    if (!existingRequestsSnapshot.empty) {
      return res.status(400).json({ error: "You already have a pending request for this listing" });
    }

    // Create the swap request
    const swapRequest = {
      senderId: userId,
      receiverId: targetOwnerId,
      targetListingId,
      offeredListingId: requestType === "swap" ? offeredListingId : null,
      requestType,
      message: message || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      // notification tracking fields
      receiverViewed: false,
      senderViewed: true,
    };

    const docRef = await db.collection("swapRequests").add(swapRequest);

    return res.status(201).json({ id: docRef.id, ...swapRequest });

  } catch (err) {
    console.error("Error creating swap request:", err);
    return res.status(500).json({ error: "Failed to create swap request", details: err.message });
  }
});

// GET all received swap requests
router.get("/received", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

    // Get all requests where this user is the receiver
    const snapshot = await db.collection("swapRequests")
      .where("receiverId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const requests = [];

    // Process each request and populate listings data
    for (const doc of snapshot.docs) {
      const request = { id: doc.id, ...doc.data() };

      // Get target listing details
      const targetListingDoc = await db.collection("listings").doc(request.targetListingId).get();
      if (targetListingDoc.exists) {
        request.targetListing = { id: targetListingDoc.id, ...targetListingDoc.data() };
      }

      // If swap, get offered listing details
      if (request.requestType === "swap" && request.offeredListingId) {
        const offeredListingDoc = await db.collection("listings").doc(request.offeredListingId).get();
        if (offeredListingDoc.exists) {
          request.offeredListing = { id: offeredListingDoc.id, ...offeredListingDoc.data() };
        }
      }

      requests.push(request);
    }

    return res.json(requests);
  } catch (err) {
    console.error("Error fetching received requests:", err);
    return res.status(500).json({ error: "Failed to fetch received requests", details: err.message });
  }
});

// GET all sent swap requests
router.get("/sent", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

    // Get all requests where this user is the sender
    const snapshot = await db.collection("swapRequests")
      .where("senderId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const requests = [];

    // Process each request and populate listings data
    for (const doc of snapshot.docs) {
      const request = { id: doc.id, ...doc.data() };

      // Get target listing details
      const targetListingDoc = await db.collection("listings").doc(request.targetListingId).get();
      if (targetListingDoc.exists) {
        request.targetListing = { id: targetListingDoc.id, ...targetListingDoc.data() };
      }

      // If swap, get offered listing details
      if (request.requestType === "swap" && request.offeredListingId) {
        const offeredListingDoc = await db.collection("listings").doc(request.offeredListingId).get();
        if (offeredListingDoc.exists) {
          request.offeredListing = { id: offeredListingDoc.id, ...offeredListingDoc.data() };
        }
      }

      requests.push(request);
    }

    return res.json(requests);
  } catch (err) {
    console.error("Error fetching sent requests:", err);
    return res.status(500).json({ error: "Failed to fetch sent requests", details: err.message });
  }
});

// POST accept a swap request
router.post("/:id/accept", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { contactInfo } = req.body;
    const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

    if (!contactInfo || !contactInfo.email) {
      return res.status(400).json({ error: "Contact information with at least an email is required" });
    }

    // Get the swap request
    const requestDoc = await db.collection("swapRequests").doc(id).get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Swap request not found" });
    }

    const request = requestDoc.data();

    // Validate that the current user is the request receiver
    if (request.receiverId !== userId) {
      return res.status(403).json({ error: "Unauthorized. You can only accept requests sent to you" });
    }

    // Check if the request is already accepted or rejected
    if (request.status !== "pending") {
      return res.status(400).json({ error: `This request has already been ${request.status}` });
    }

    // Update the swap request status
    await db.collection("swapRequests").doc(id).update({
      status: "accepted",
      contactInfo,
      acceptedAt: new Date().toISOString(),
      senderViewed: false,
    });

    // ADDITION: Update the listing status to "reserved"
    await db.collection("listings").doc(request.targetListingId).update({
      status: "reserved",
      updatedAt: new Date().toISOString()
    });

    // If it's a swap request, also update the offered listing
    if (request.requestType === "swap" && request.offeredListingId) {
      await db.collection("listings").doc(request.offeredListingId).update({
        status: "reserved",
        updatedAt: new Date().toISOString()
      });
    }

    // Fetch the updated swap request to return in response
    const updatedDoc = await db.collection("swapRequests").doc(id).get();
    return res.json({ id, ...updatedDoc.data() });
  } catch (err) {
    console.error("Error accepting swap request:", err);
    return res.status(500).json({ error: "Failed to accept swap request", details: err.message });
  }
});

// POST reject a swap request
router.post("/:id/reject", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

    // Get the swap request
    const requestDoc = await db.collection("swapRequests").doc(id).get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Swap request not found" });
    }

    const request = requestDoc.data();

    // Validate that the current user is the request receiver
    if (request.receiverId !== userId) {
      return res.status(403).json({ error: "Unauthorized. You can only reject requests sent to you" });
    }

    // Check if the request is already accepted or rejected
    if (request.status !== "pending") {
      return res.status(400).json({ error: `This request has already been ${request.status}` });
    }

    // Update the request status to rejected
    await db.collection("swapRequests").doc(id).update({
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      senderViewed: false,
    });

    // Fetch the updated request
    const updatedDoc = await db.collection("swapRequests").doc(id).get();

    return res.json({ id, ...updatedDoc.data() });
  } catch (err) {
    console.error("Error rejecting swap request:", err);
    return res.status(500).json({ error: "Failed to reject swap request", details: err.message });
  }
});

// DELETE a swap request (cancel)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid || req.user.claims?.user_id || req.user.user_id;

    // Get the swap request
    const requestDoc = await db.collection("swapRequests").doc(id).get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Swap request not found" });
    }

    const request = requestDoc.data();

    // Validate that the current user is the request sender
    if (request.senderId !== userId) {
      return res.status(403).json({ error: "Unauthorized. You can only cancel requests you sent" });
    }

    // Check if the request is already accepted
    if (request.status === "accepted") {
      return res.status(400).json({ error: "Cannot cancel an already accepted request" });
    }

    // Delete the swap request
    await db.collection("swapRequests").doc(id).delete();

    return res.json({ message: "Swap request cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling swap request:", err);
    return res.status(500).json({ error: "Failed to cancel swap request", details: err.message });
  }
});

module.exports = router;