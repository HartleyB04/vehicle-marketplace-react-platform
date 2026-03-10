import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ children }) {
    const { currentUser } = useAuth();
    const [showAlert, setShowAlert] = useState(false);

    // Trigger alert when user is not logged in
    useEffect(() => {
        if (currentUser === null) {
            setShowAlert(true);
        }
    }, [currentUser]);

    // If user is not logged in, show alert and redirect to login page
    if (currentUser === null) {
        if (showAlert) {
            alert("Please login first to access this page!");
            setShowAlert(false);
        }
        return <Navigate to="/login" replace />;
    }

    return children;
}