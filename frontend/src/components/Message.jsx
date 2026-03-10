import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/useAuth";
import { useNotifications } from "../contexts/NotificationContext";
import { getMessages, sendMessage } from "../services/messageService";
import { markMessagesAsRead } from "../services/notificationService";
import "./Message.css";

export default function Messages({ convoId }) {
    const { currentUser } = useAuth();
    const { refreshNotifications } = useNotifications();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [suspendedWarning, setSuspendedWarning] = useState("");
    const messagesEndRef = useRef();

    const fetchMessages = async () => {
        if (!convoId || !currentUser) return;
        try {
            const token = await currentUser.getIdToken();
            const data = await getMessages(convoId, token);

            const { messages: fetchedMessages, suspended } = data;

            // Sort messages by timestamp
            const sorted = fetchedMessages.sort(
                (a, b) => (a.timestamp._seconds || 0) - (b.timestamp._seconds || 0)
            );

            setMessages(sorted);

            // Check if the other user is suspended
            if (suspended) {
                setSuspendedWarning("This user has been reported and suspended. You cannot send messages to them.");
            } else {
                setSuspendedWarning("");
            }

            // Mark messages as read when opening conversation
            await markMessagesAsRead(convoId, token);
            
            // Refresh notification counts
            refreshNotifications();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages(); // initial fetch
    }, [convoId, currentUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim() || suspendedWarning) return;
        const newMsgText = text.trim();
        setText("");

        // Optimistic update
        const tempMsg = {
            id: `temp-${Date.now()}`,
            senderId: currentUser.uid,
            senderEmail: currentUser.email,
            text: newMsgText,
            timestamp: { _seconds: Math.floor(Date.now() / 1000) },
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            await sendMessage(convoId, newMsgText, currentUser.accessToken);
            fetchMessages();
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    if (loading) return <p className="loading">Loading messages...</p>;
    if (!messages.length) return <p className="no-messages">No messages yet. Say hi!</p>;

    return (
        <div className="chat-container">
            {suspendedWarning && (
                <div className="chat-overlay">
                    <span className="overlay-text">{suspendedWarning}</span>
                </div>
            )}

            <div className="messages-list">
                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`message-item ${msg.senderId === currentUser.uid ? "sent" : "received"}`}
                    >
                        <div className="message-bubble">
                            <span className="sender">{msg.senderId === currentUser.uid ? "You" : msg.senderEmail}</span>
                            <p className="message-text">{msg.text}</p>
                            <small className="timestamp">
                                {new Date((msg.timestamp._seconds || 0) * 1000).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </small>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
                <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    disabled={!!suspendedWarning}
                />
                <button onClick={handleSend} disabled={!!suspendedWarning}>Send</button>
            </div>
        </div>
    );
}