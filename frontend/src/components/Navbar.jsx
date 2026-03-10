import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/useAuth";
import { useNotifications } from "../contexts/NotificationContext";
import { auth } from "../firebase";
import NotificationBadge from "./NotificationBadge";
import "./Navbar.css";

export default function Navbar() {
    const { currentUser } = useAuth();
    const { notificationCounts } = useNotifications();
    const navigate = useNavigate();

    // Logout function
    const handleLogout = async () => {
        try {
            await signOut(auth); // signout user from firebase
            navigate("/login"); // redirect to login page
        } catch (error) {
            console.error("Error logging out:", error);
            alert("Failed to log out. Please try again.");
        }
    };

    return (
        <nav className="navbar">
            <div className="nav-container">
                {/* Logo/Brand */}
                <Link to="/" className="nav-brand">
                    <img src="/assets/logo.png" alt="Swap logo" className="nav-logo" />
                </Link>

                {/* Navigation Links */}
                <div className="nav-links">
                    <Link to="/">Home</Link>
                    <Link to="/browse">Browse</Link>
                    <Link to="/about">About Us</Link>

                    {/* Show different links based on auth state */}
                    {currentUser ? (
                        <>
                            <Link to="/profile" className="nav-link-with-badge">
                                Profile
                                <NotificationBadge count={notificationCounts.totalUnviewedRequests} />
                            </Link>
                            <Link to="/chat" className="nav-link-with-badge">
                                Chat
                                <NotificationBadge count={notificationCounts.unreadMessages} />
                            </Link>
                            <Link to="/create-listing">Create Listing</Link>
                            <span className="user-email">({currentUser.email})</span>
                            <button onClick={handleLogout} className="logout-btn">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/register">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}