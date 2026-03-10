import axios from "axios";
import { getIdToken } from "firebase/auth";

const SWAP_REQUEST_API_BASE = import.meta.env.VITE_SWAP_REQUEST_API_BASE;

// Create swap request
export async function createSwapRequest(requestData, token) {
    try {
        const response = await axios.post(SWAP_REQUEST_API_BASE, requestData, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (err) {
        console.error("Error creating swap request:", err.response?.data || err.message);
        throw new Error(err.response?.data?.error || "Failed to send request");
    }
}

// Fetch received requests
export async function getReceivedRequests(currentUser) {
    if (!currentUser) throw new Error("No user logged in");

    try {
        const token = await getIdToken(currentUser);
        const res = await axios.get(`${SWAP_REQUEST_API_BASE}/received`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (err) {
        console.error("Error fetching received requests:", err);
        throw new Error(err.response?.data?.error || "Failed to fetch received requests");
    }
}

// Fetch sent requests
export async function getSentRequests(currentUser) {
    if (!currentUser) throw new Error("No user logged in");

    try {
        const token = await getIdToken(currentUser);
        const res = await axios.get(`${SWAP_REQUEST_API_BASE}/sent`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (err) {
        console.error("Error fetching sent requests:", err);
        throw new Error(err.response?.data?.error || "Failed to fetch sent requests");
    }
}

// Accept request
export async function acceptRequest(currentUser, requestId, contactInfo) {
    try {
        const token = await getIdToken(currentUser);
        const res = await axios.post(
            `${SWAP_REQUEST_API_BASE}/${requestId}/accept`,
            { contactInfo },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return res.data;
    } catch (err) {
        console.error("Error accepting request:", err);
        throw new Error(err.response?.data?.error || "Failed to accept request");
    }
}

// Reject request
export async function rejectRequest(currentUser, requestId) {
    try {
        const token = await getIdToken(currentUser);
        const res = await axios.post(
            `${SWAP_REQUEST_API_BASE}/${requestId}/reject`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (err) {
        console.error("Error rejecting request:", err);
        throw new Error(err.response?.data?.error || "Failed to reject request");
    }
}

// Cancel sent request
export async function cancelRequest(currentUser, requestId) {
    if (!currentUser) throw new Error("No user logged in");

    try {
        const token = await getIdToken(currentUser);
        await axios.delete(`${SWAP_REQUEST_API_BASE}/${requestId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (err) {
        console.error("Error cancelling request:", err);
        throw new Error(err.response?.data?.error || "Failed to cancel request");
    }
}