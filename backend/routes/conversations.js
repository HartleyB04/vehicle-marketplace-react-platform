const express = require("express");
const { admin, db } = require("../firebase");
const { Timestamp } = require("firebase-admin/firestore");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

// POST api/conversations
router.post("/", verifyToken, async (req, res) => {
    const userId = req.user.uid;
    const { participants, listingId, initialMessage } = req.body;

    try {
        if (!participants || participants.length < 2) {
            return res.status(400).json({ error: "At least 2 participants required" });
        }

        // Get sender email
        const userRecord = await admin.auth().getUser(userId);
        const senderEmail = userRecord.email;

        // Create auto message if empty
        const messageText = initialMessage?.trim() ||
            `Hi! I'm interested in your listing "${listingId?.listingName || "this item"}".`;

        // Sort participants to ensure consistent ID (avoid duplicates)
        const sortedParticipants = [...participants].sort();
        const convoId = sortedParticipants.join("_");

        // Reference to sorted convo
        const convoRef = db.collection("conversations").doc(convoId);
        const convoDoc = await convoRef.get();

        if (convoDoc.exists) {
            // Add message to existing conversation
            const messageRef = await convoRef.collection("messages").add({
                senderId: userId,
                senderEmail,
                text: messageText,
                timestamp: Timestamp.now(),
                read: false,
            });

            await convoRef.update({ lastUpdated: Timestamp.now() });

            return res.status(200).json({
                id: convoId,
                existing: true,
                newMessage: { id: messageRef.id, text: messageText },
            });
        }

        // If no existing convo, then create new
        await convoRef.set({
            participants: sortedParticipants,
            listingId: listingId || null,
            lastUpdated: Timestamp.now(),
        });

        const messageRef = await convoRef.collection("messages").add({
            senderId: userId,
            senderEmail,
            text: messageText,
            timestamp: Timestamp.now(),
            read: false,
        });

        res.status(201).json({
            id: convoId,
            participants: sortedParticipants,
            listingId,
            messages: [
                { id: messageRef.id, senderId: userId, text: messageText, senderEmail },
            ],
        });

    } catch (err) {
        console.error("Failed to create conversation:", err);
        res.status(500).json({ error: "Failed to create conversation" });
    }
});

// POST api/conversations/:convoId/messages
router.post("/:convoId/messages", verifyToken, async (req, res) => {
    const senderId = req.user.uid;
    const convoId = req.params.convoId;
    const { text } = req.body;

    if (!text || text.trim() === "") {
        return res.status(400).json({ error: "Message text is required" });
    }

    try {
        // Get sender email
        const userRecord = await admin.auth().getUser(senderId);
        const senderEmail = userRecord.email;

        // Add the new message
        const messageRef = await db
            .collection("conversations")
            .doc(convoId)
            .collection("messages")
            .add({
                senderId,
                senderEmail,
                text: text.trim(),
                timestamp: Timestamp.now(),
                read: false
            });

        // Update lastUpdated in conversation
        const convoRef = db.collection("conversations").doc(convoId);
        await convoRef.update({ lastUpdated: Timestamp.now() });

        // Fetch all messages after adding
        const messagesSnapshot = await db
            .collection("conversations")
            .doc(convoId)
            .collection("messages")
            .orderBy("timestamp")
            .get();

        const messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(201).json({ id: messageRef.id, messages });

    } catch (err) {
        console.error("Failed to send message:", err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

// GET api/conversations/:convoId/messages
router.get("/:convoId/messages", verifyToken, async (req, res) => {
    const convoId = req.params.convoId;
    const after = req.query.after ? Number(req.query.after) : null;

    try {
        let query = db
            .collection("conversations")
            .doc(convoId)
            .collection("messages")
            .orderBy("timestamp");

        if (after) {
            const afterTimestamp = admin.firestore.Timestamp.fromMillis(after);
            query = query.where("timestamp", ">", afterTimestamp);
        }

        const snapshot = await query.get();
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Get conversation participants
        const convoDoc = await db.collection("conversations").doc(convoId).get();
        if (!convoDoc.exists) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        const data = convoDoc.data();
        const otherParticipantUid = data.participants.find(uid => uid !== req.user.uid);

        // Check if the other user is suspended
        let suspended = false;
        try {
            const userRecord = await admin.auth().getUser(otherParticipantUid);
            suspended = userRecord.disabled;
        } catch (err) {
            console.warn("Failed to get user status", err);
        }

        // Return messages AND suspended flag
        res.json({ messages, suspended });
    } catch (err) {
        console.error("Failed to fetch messages:", err);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// GET api/conversations?userId=abc
router.get("/", verifyToken, async (req, res) => {
    const userId = req.user.uid;
    const after = req.query.after ? Number(req.query.after) : null;

    try {
        let query = db
            .collection("conversations")
            .where("participants", "array-contains", userId)
            .orderBy("lastUpdated", "desc");

        if (after) {
            const afterTimestamp = admin.firestore.Timestamp.fromMillis(after);
            query = query.where("lastUpdated", ">", afterTimestamp);
        }

        const snapshot = await query.get();

        const conversations = await Promise.all(
            snapshot.docs.map(async doc => {
                const data = doc.data();
                const otherParticipantUid = data.participants.find(uid => uid !== userId);

                let displayEmail = otherParticipantUid;
                let suspended = false;

                try {
                    const userRecord = await admin.auth().getUser(otherParticipantUid);
                    displayEmail = userRecord.email;
                    suspended = userRecord.disabled || false;
                } catch (err) {
                    console.warn(`Failed to fetch email for UID ${otherParticipantUid}:`, err);
                }

                return {
                    id: doc.id,
                    listingId: data.listingId,
                    participants: data.participants,
                    uid: otherParticipantUid,
                    displayEmail,
                    lastUpdated: data.lastUpdated,
                    suspended,
                };
            })
        );

        res.json(conversations);
    } catch (err) {
        console.error("Failed to fetch conversations:", err);
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
});

module.exports = router;