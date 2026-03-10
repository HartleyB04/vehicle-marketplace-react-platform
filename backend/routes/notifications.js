const express = require("express");
const { db } = require("../firebase");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

// GET /api/notifications/counts
// Returns unread message count and separate counts for received/sent requests
router.get("/counts", verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // Count unread messages across all conversations
        const conversationsSnapshot = await db.collection("conversations")
            .where("participants", "array-contains", userId)
            .get();

        let unreadMessageCount = 0;

        for (const convoDoc of conversationsSnapshot.docs) {
            const messagesSnapshot = await convoDoc.ref
                .collection("messages")
                .where("read", "==", false)
                .where("senderId", "!=", userId)
                .get();

            unreadMessageCount += messagesSnapshot.size;
        }

        // Count unviewed RECEIVED requests (new requests)
        const receivedRequestsSnapshot = await db.collection("swapRequests")
            .where("receiverId", "==", userId)
            .where("receiverViewed", "==", false)
            .get();

        // Count unviewed SENT requests (status updates: accepted/rejected)
        const sentRequestsSnapshot = await db.collection("swapRequests")
            .where("senderId", "==", userId)
            .where("senderViewed", "==", false)
            .where("status", "in", ["accepted", "rejected"])
            .get();

        const unviewedReceivedRequests = receivedRequestsSnapshot.size;
        const unviewedSentRequests = sentRequestsSnapshot.size;

        res.json({
            unreadMessages: unreadMessageCount,
            unviewedReceivedRequests,
            unviewedSentRequests,
            totalUnviewedRequests: unviewedReceivedRequests + unviewedSentRequests,
        });
    } catch (err) {
        console.error("Error fetching notification counts:", err);
        res.status(500).json({ error: "Failed to fetch notification counts" });
    }
});

// POST /api/notifications/messages/:convoId/read
// Mark all messages in a conversation as read
router.post("/messages/:convoId/read", verifyToken, async (req, res) => {
    try {
        const { convoId } = req.params;
        const userId = req.user.uid;

        // Get all unread messages in this conversation that were sent by others
        const messagesSnapshot = await db.collection("conversations")
            .doc(convoId)
            .collection("messages")
            .where("read", "==", false)
            .where("senderId", "!=", userId)
            .get();

        // Batch update to mark all as read
        const batch = db.batch();
        messagesSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();

        res.json({ 
            message: "Messages marked as read", 
            count: messagesSnapshot.size 
        });
    } catch (err) {
        console.error("Error marking messages as read:", err);
        res.status(500).json({ error: "Failed to mark messages as read" });
    }
});

// POST /api/notifications/requests/:requestId/viewed
// Mark a specific swap request as viewed
router.post("/requests/:requestId/viewed", verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user.uid;

        const requestDoc = await db.collection("swapRequests").doc(requestId).get();

        if (!requestDoc.exists) {
            return res.status(404).json({ error: "Request not found" });
        }

        const request = requestDoc.data();

        // Update the appropriate viewed field based on user role
        const updateData = {};
        if (request.receiverId === userId) {
            updateData.receiverViewed = true;
        } else if (request.senderId === userId) {
            updateData.senderViewed = true;
        } else {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await db.collection("swapRequests").doc(requestId).update(updateData);

        res.json({ message: "Request marked as viewed" });
    } catch (err) {
        console.error("Error marking request as viewed:", err);
        res.status(500).json({ error: "Failed to mark request as viewed" });
    }
});

// POST /api/notifications/requests/received/view-all
// Mark all received requests as viewed for current user
router.post("/requests/received/view-all", verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // Get all unviewed received requests
        const receivedSnapshot = await db.collection("swapRequests")
            .where("receiverId", "==", userId)
            .where("receiverViewed", "==", false)
            .get();

        if (receivedSnapshot.empty) {
            return res.json({ message: "No requests to mark as viewed", count: 0 });
        }

        const batch = db.batch();

        receivedSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { receiverViewed: true });
        });

        await batch.commit();

        res.json({ 
            message: "All received requests marked as viewed",
            count: receivedSnapshot.size
        });
    } catch (err) {
        console.error("Error marking received requests as viewed:", err);
        res.status(500).json({ error: "Failed to mark received requests as viewed" });
    }
});

// POST /api/notifications/requests/sent/view-all
// Mark all sent requests (with status updates) as viewed for current user
router.post("/requests/sent/view-all", verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // Get all unviewed sent requests with status updates
        const sentSnapshot = await db.collection("swapRequests")
            .where("senderId", "==", userId)
            .where("senderViewed", "==", false)
            .where("status", "in", ["accepted", "rejected"])
            .get();

        if (sentSnapshot.empty) {
            return res.json({ message: "No requests to mark as viewed", count: 0 });
        }

        const batch = db.batch();

        sentSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { senderViewed: true });
        });

        await batch.commit();

        res.json({ 
            message: "All sent requests marked as viewed",
            count: sentSnapshot.size
        });
    } catch (err) {
        console.error("Error marking sent requests as viewed:", err);
        res.status(500).json({ error: "Failed to mark sent requests as viewed" });
    }
});

module.exports = router;