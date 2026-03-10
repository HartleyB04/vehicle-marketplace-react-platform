import { useState, useEffect } from "react";
import { reportUser } from "../services/reportService.js";
import { useAuth } from "../contexts/useAuth";
import "./ReportModal.css";

export default function ReportModal({ targetUser, onClose }) {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [evidenceFiles, setEvidenceFiles] = useState([]);
    const [previews, setPreviews] = useState([]); // For thumbnails
    const [submitting, setSubmitting] = useState(false);

    const { currentUser } = useAuth();

    // Generate previews whenever files change
    useEffect(() => {
        const urls = evidenceFiles.map(file => URL.createObjectURL(file));
        setPreviews(urls);

        // Cleanup URLs on unmount or file change
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [evidenceFiles]);

    /// Handle file input change
    const handleFileChange = (e) => {
        setEvidenceFiles([...e.target.files]);
    };

    // Submit the report
    const handleSubmit = async () => {
        if (!reason) return alert("Please select a reason");
        setSubmitting(true);
        try {
            // Prepare evidence (here just sending file names; backend upload required)
            const token = await currentUser.getIdToken();
            await reportUser(token, { targetUid: targetUser.uid, reason, details }, evidenceFiles);

            alert("User reported successfully. The account has been locked.");
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to report user");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Report {targetUser.displayEmail}</h3>

                {/* Reason selection */}
                <label>
                    Reason:
                    <select value={reason} onChange={e => setReason(e.target.value)}>
                        <option value="">Select a reason</option>
                        <option value="Fraudulent listing">Fraudulent listing</option>
                        <option value="Misleading information">Misleading information</option>
                        <option value="Offensive behavior in chat">Offensive behavior in chat</option>
                        <option value="Other">Other</option>
                    </select>
                </label>

                {/* Optional details */}
                <label>
                    Details (optional):
                    <textarea
                        value={details}
                        onChange={e => setDetails(e.target.value)}
                        placeholder="Additional info..."
                    />
                </label>

                {/* Evidence file upload */}
                <label>
                    Evidence (optional):
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                    />
                    {evidenceFiles.length > 0 && (
                        <div className="evidence-previews">
                            {previews.map((url, idx) => (
                                <div key={idx} className="thumbnail">
                                    {evidenceFiles[idx].type.startsWith("image/") ? (
                                        <img src={url} alt={`preview-${idx}`} />
                                    ) : (
                                        <video src={url} width="80" height="60" controls />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </label>

                {/* Modal actions */}
                <div className="modal-actions">
                    <button onClick={onClose} disabled={submitting}>Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Reporting..." : "Report"}
                    </button>
                </div>
            </div>
        </div>
    );
}
