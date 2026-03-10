import axios from "axios";

const REPORT_API_URL = import.meta.env.VITE_REPORT_API_URL;

// Submit a report
export async function reportUser(token, reportData, evidenceFiles = []) {
    const formData = new FormData();
    formData.append("targetUid", reportData.targetUid);
    formData.append("reason", reportData.reason);
    formData.append("details", reportData.details || "");

    evidenceFiles.forEach(file => formData.append("evidence", file));

    try {
        const res = await axios.post(`${REPORT_API_URL}`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    } catch (err) {
        console.error("Error submitting report:", err);
        throw err;
    }
}
