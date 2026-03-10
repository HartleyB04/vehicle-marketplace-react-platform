import { createContext, useState, useEffect, useContext } from "react";
import { useAuth } from "./useAuth";
import { getNotificationCounts } from "../services/notificationService";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const { currentUser } = useAuth();
    const [notificationCounts, setNotificationCounts] = useState({
        unreadMessages: 0,
        unviewedReceivedRequests: 0,
        unviewedSentRequests: 0,
        totalUnviewedRequests: 0,
    });
    const [loading, setLoading] = useState(true);

    // Fetch notification counts
    const fetchNotificationCounts = async () => {
        if (!currentUser) {
            // Reset counts if no user is logged in
            setNotificationCounts({ 
                unreadMessages: 0, 
                unviewedReceivedRequests: 0,
                unviewedSentRequests: 0,
                totalUnviewedRequests: 0 
            });
            setLoading(false);
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            const counts = await getNotificationCounts(token);
            setNotificationCounts(counts);
        } catch (err) {
            console.error("Error fetching notification counts:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount and when user changes
    useEffect(() => {
        fetchNotificationCounts();
    }, [currentUser]);

    // Poll for updates every 10 mins
    useEffect(() => {
        if (!currentUser) return;

        const interval = setInterval(() => {
            fetchNotificationCounts();
        }, 600000); // 10 mins 

        return () => clearInterval(interval);
    }, [currentUser]);

    // Context value passed to consumers
    const value = {
        notificationCounts,
        refreshNotifications: fetchNotificationCounts, // Manual refresh
        loading,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

// Custom hook for consuming the NotificationContext
export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within NotificationProvider");
    }
    return context;
}