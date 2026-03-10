import { useEffect, useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { getConversations } from "../services/messageService";
import "./ConversationList.css";

export default function ConversationsList({ onSelectConversation }) {
    const { currentUser } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = async () => {
        if (!currentUser) return;
        try {
            const token = await currentUser.getIdToken(true);

            // Use the most recent lastUpdated timestamp to fetch only new conversations
            const lastUpdated = conversations.length && conversations[0].lastUpdated && conversations[0].lastUpdated._seconds
                ? conversations[0].lastUpdated._seconds * 1000
                : undefined;

            const paramsObj = lastUpdated ? { after: lastUpdated } : {};
            const data = await getConversations(token, paramsObj);

            if (!Array.isArray(data) || data.length === 0) return;

            // Merge new conversations without duplicates
            setConversations(prev => {
                const existingIds = new Set(prev.map(c => c.id));
                const newConvos = data.filter(c => !existingIds.has(c.id));
                return [...newConvos, ...prev].sort((a, b) => {
                    const aTime = a.lastUpdated?._seconds ? a.lastUpdated._seconds : 0;
                    const bTime = b.lastUpdated?._seconds ? b.lastUpdated._seconds : 0;
                    return bTime - aTime;
                });
            });
        } catch (err) {
            console.error("Error fetching conversations:", err);
        }
    };

    // Fetch conversations once on mount or when user changes
    useEffect(() => {
        setLoading(true);
        fetchConversations().finally(() => setLoading(false));
    }, [currentUser]);

    if (loading) return <p>Loading conversations...</p>;
    if (conversations.length === 0) return <p>No conversations yet</p>;

    return (
        <ul className="conversations-list">
            {conversations.map(convo => (
                <li
                    key={convo.id}
                    className="conversation-item"
                    onClick={() => onSelectConversation(convo)}
                >
                    <span className="conversation-email">{convo.displayEmail}</span>
                    <span className="conversation-updated">
                        Last updated: {new Date(convo.lastUpdated._seconds * 1000).toLocaleString()}
                    </span>
                </li>
            ))}
        </ul>
    );
}