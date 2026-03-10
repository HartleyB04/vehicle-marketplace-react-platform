const express = require("express");
const { db, admin } = require("../firebase");
const { Timestamp } = require("firebase-admin/firestore");
const { verifyToken } = require("../middleware/authMiddleware");
const { sendSuspensionEmail } = require("../utils/email");
const { upload, uploadFiles } = require("../utils/cloudinaryUploader"); // <- import
const router = express.Router();

// POST /api/report
router.post("/", verifyToken, upload.array("evidence", 10), async (req, res) => {
    const { targetUid, reason, details } = req.body;
    const reporterUid = req.user.uid;

    if (!targetUid || !reason) return res.status(400).json({ error: "Missing required fields" });

    try {
        // Upload evidence file
        const evidenceUrls = req.files?.length ? await uploadFiles(req.files, "report-evidence") : [];

        // Firestore report object
        const report = {
            reporterUid,
            targetUid,
            reason,
            details: details || "",
            evidence: evidenceUrls,
            status: "locked",
            createdAt: Timestamp.now(),
        };

        // Save report to firestore
        await db.collection("reports").add(report);

        try {
            const reportedUser = await admin.auth().getUser(targetUid); // may throw 'user-not-found'
            await admin.auth().updateUser(targetUid, { disabled: true });
            // Respond immediately to frontend
            res.status(200).json({ message: "Report submitted and account locked", evidence: evidenceUrls });

            // Send email asynchronously (don't await)
            sendSuspensionEmail(reportedUser.email, reason)
                .catch(err => console.error("Failed to send suspension email:", err));
        } catch (err) {
            if (err.code === "auth/user-not-found") {
                console.error("Cannot disable user: UID not found", targetUid);
                return res.status(400).json({ error: `No user found with UID: ${targetUid}` });
            } else {
                console.error("Error disabling user:", err);
                return res.status(500).json({ error: "Failed to disable user" });
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit report" });
    }
});

module.exports = router;