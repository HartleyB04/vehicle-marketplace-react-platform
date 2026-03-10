import axios from "axios";

const NOTIFICATION_API_URL = import.meta.env.VITE_NOTIFICATION_API_URL;

// Fetch unread notification counts for the current user
export async function getNotificationCounts(token) {
    try {
        const response = await axios.get(`${NOTIFICATION_API_URL}/counts`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (err) {
        console.error("Error fetching notification counts:", err.response?.data || err.message);
        throw err;
    }
}

// Mark messages in a conversation as read
export async function markMessagesAsRead(convoId, token) {
    try {
        const response = await axios.post(
            `${NOTIFICATION_API_URL}/messages/${convoId}/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (err) {
        console.error("Error marking messages as read:", err.response?.data || err.message);
        throw err;
    }
}

// Mark a swap request notification as viewed
export async function markRequestAsViewed(requestId, token) {
    try {
        const response = await axios.post(
            `${NOTIFICATION_API_URL}/requests/${requestId}/viewed`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (err) {
        console.error("Error marking request as viewed:", err.response?.data || err.message);
        throw err;
    }
}

// Mark all received requests as viewed
export async function markReceivedRequestsAsViewed(token) {
    try {
        const response = await axios.post(
            `${NOTIFICATION_API_URL}/requests/received/view-all`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (err) {
        console.error("Error marking received requests as viewed:", err.response?.data || err.message);
        throw err;
    }
}

// Mark all sent requests as viewed
export async function markSentRequestsAsViewed(token) {
    try {
        const response = await axios.post(
            `${NOTIFICATION_API_URL}/requests/sent/view-all`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (err) {
        console.error("Error marking sent requests as viewed:", err.response?.data || err.message);
        throw err;
    }
}
