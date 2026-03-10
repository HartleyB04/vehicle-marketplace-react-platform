import axios from "axios";

const MESSAGE_API_URL = import.meta.env.VITE_MESSAGE_API_URL;

// Get all conversations for the current user
export async function getConversations(token, params = {}) {
    try {
        const res = await axios.get(`${MESSAGE_API_URL}`, {
            headers: { Authorization: `Bearer ${token}` },
            params,
        });
        return res.data;
    } catch (err) {
        console.error("Error fetching conversations:", err);
        throw err;
    }
}

// Get messages for a specific conversation
export async function getMessages(convoId, token, params = {}) {
    try {
        const res = await axios.get(`${MESSAGE_API_URL}/${convoId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
            params,
        });
        return res.data;
    } catch (err) {
        console.error("Error fetching messages:", err);
        throw err;
    }
}

// Send a message in a conversation
export async function sendMessage(convoId, text, token) {
    try {
        const res = await axios.post(
            `${MESSAGE_API_URL}/${convoId}/messages`,
            { text },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (err) {
        console.error("Error sending message:", err);
        throw err;
    }
}

// Create a new conversation
export async function createConversation(listingId, participants, token, initialMessage) {
    try {
        const res = await axios.post(
            `${MESSAGE_API_URL}`,
            { listingId, participants, initialMessage },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data; 
    } catch (err) {
        console.error("Error creating conversation:", err);
        throw err;
    }
}
