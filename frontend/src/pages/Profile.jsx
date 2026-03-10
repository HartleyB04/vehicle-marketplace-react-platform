import { useEffect, useState } from "react";
import { getIdToken } from "firebase/auth";
import { useAuth } from "../contexts/useAuth";
import { useNotifications } from "../contexts/NotificationContext";
import { markReceivedRequestsAsViewed, markSentRequestsAsViewed, markRequestAsViewed } from "../services/notificationService";
import { fetchUserListings, deleteListing } from "../services/listingService";
import { getReceivedRequests, getSentRequests, acceptRequest, rejectRequest, cancelRequest } from "../services/swapRequestService";
import { getWishlist, removeFromWishlist } from "../services/wishlistService";
import { fetchUserProfile } from "../services/profileService";
import { useNavigate } from "react-router-dom";
import NotificationBadge from "../components/NotificationBadge";
import "./Profile.css";

export default function Profile() {
    const { currentUser } = useAuth();
    const { notificationCounts, refreshNotifications } = useNotifications();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("listings");

    const [myListings, setMyListings] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [wishlist, setWishlist] = useState([]);

    const [loading, setLoading] = useState(false);
    const [listingsLoading, setListingsLoading] = useState(false);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    const [showContactModal, setShowContactModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [contactInfo, setContactInfo] = useState({ email: "", phone: "" });

    // Navigate to listing details
    const navigateToListing = (listingId) => {
        navigate(`/listing/${listingId}`);
    };

    // Mark requests as viewed when switching to requests tabs
    useEffect(() => {
        const markAsViewed = async () => {
            if (!currentUser) return;

            try {
                const token = await currentUser.getIdToken();

                if (activeTab === "received-requests") {
                    // Mark all received requests as viewed
                    await markReceivedRequestsAsViewed(token);
                    await refreshNotifications();
                } else if (activeTab === "sent-requests") {
                    // Mark all sent requests as viewed
                    await markSentRequestsAsViewed(token);
                    await refreshNotifications();
                }
            } catch (err) {
                console.error("Error marking requests as viewed:", err);
            }
        };

        // Only mark as viewed after the data has been loaded
        if (activeTab === "received-requests" && !requestsLoading && receivedRequests.length > 0) {
            markAsViewed();
        } else if (activeTab === "sent-requests" && !requestsLoading && sentRequests.length > 0) {
            markAsViewed();
        }
    }, [activeTab, requestsLoading, receivedRequests.length, sentRequests.length]);

    // Request actions - accept
    const handleAcceptRequestAction = async (requestId) => {
        try {
            const token = await currentUser.getIdToken();

            // Accept the request 
            await acceptRequest(currentUser, requestId, contactInfo);

            // Update received requests status locally
            const updatedRequests = receivedRequests.map(req =>
                req.id === requestId
                    ? { ...req, status: "accepted", contactInfo }
                    : req
            );

            setReceivedRequests(updatedRequests);

            // Mark as viewed
            await markRequestAsViewed(requestId, token);

            // Refresh notifications
            await refreshNotifications();

            return true;
        } catch (err) {
            console.error("Error accepting request:", err);
            throw err;
        }
    };

    // Request actions - reject
    const handleRejectRequestAction = async (requestId) => {
        try {
            const token = await currentUser.getIdToken();

            // Reject the request 
            await rejectRequest(currentUser, requestId);

            // Update received requests status locally
            const updatedRequests = receivedRequests.map(req =>
                req.id === requestId ? { ...req, status: "rejected" } : req
            );

            setReceivedRequests(updatedRequests);

            // Mark as viewed
            await markRequestAsViewed(requestId, token);

            // Refresh notifications
            await refreshNotifications();

            return true;
        } catch (err) {
            console.error("Error rejecting request:", err);
            throw err;
        }
    };

    // Fetch user profile
    useEffect(() => {
        async function fetchProfile() {
            try {
                setLoading(true);
                const token = await getIdToken(currentUser);
                const user = await fetchUserProfile(token);
                setProfile(user);
                setContactInfo({ email: user?.email || "", phone: "" });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, [currentUser]);

    // Fetch tab data
    useEffect(() => {
        if (activeTab === "listings") fetchMyListings();
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === "received-requests") fetchReceivedRequests();
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === "sent-requests") fetchSentRequests();
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === "wishlist") fetchWishlist();
    }, [activeTab]);

    // Fetch functions - user's listings
    async function fetchMyListings() {
        try {
            setListingsLoading(true);
            const data = await fetchUserListings(currentUser);
            setMyListings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching listings:", err);
            setError(err.message);
        } finally {
            setListingsLoading(false);
        }
    }

    // Fetch functions - user's received requests
    async function fetchReceivedRequests() {
        try {
            setRequestsLoading(true);
            const data = await getReceivedRequests(currentUser);
            setReceivedRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching received requests:", err);
            setError(err.message);
        } finally {
            setRequestsLoading(false);
        }
    }

    // Fetch functions - user's sent requests
    async function fetchSentRequests() {
        try {
            setRequestsLoading(true);

            const data = await getSentRequests(currentUser);
            setSentRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching sent requests:", err);
            setError(err.message);
        } finally {
            setRequestsLoading(false);
        }
    }

    // Fetch functions - user's wishlist
    async function fetchWishlist() {
        try {
            setWishlistLoading(true);

            const data = await getWishlist(currentUser);
            setWishlist(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching wishlist:", err);
            setError(err.message);
        } finally {
            setWishlistLoading(false);
        }
    }

    // Delete a user's listing
    async function handleDeleteListing(listingId) {
        if (!confirm("Are you sure you want to delete this listing?")) return;
        try {
            await deleteListing(currentUser, listingId);
            setMyListings(myListings.filter(listing => listing.id !== listingId));
        } catch (err) {
            console.error("Error deleting listing:", err);
            alert("Failed to delete listing");
        }
    }

    // Remove a listing from wishlist
    async function handleRemoveFromWishlist(wishlistId) {
        try {
            await removeFromWishlist(currentUser, wishlistId);
            setWishlist(wishlist.filter(item => item.id !== wishlistId));
        } catch (err) {
            console.error("Error removing from wishlist:", err);
            alert("Failed to remove from wishlist");
        }
    }

    // Handle accepting request 
    function handleAcceptRequest(request) {
        setSelectedRequest(request);
        setShowContactModal(true);
    }

    // Confirm request acceptance
    async function confirmAcceptRequest() {
        if (!selectedRequest || !contactInfo?.email) return;

        try {
            await acceptRequest(currentUser, selectedRequest.id, contactInfo);
            setShowContactModal(false);
            alert("Request accepted successfully!");
        } catch (err) {
            alert(`Error accepting request: ${err.message}`);
        }
    }

    // Handle rejecting request 
    async function handleRejectRequest(requestId) {
        if (!confirm("Are you sure you want to reject this request?")) return;

        try {
            await handleRejectRequestAction(requestId);
            alert("Request rejected successfully");
        } catch (err) {
            alert(`Error rejecting request: ${err.message}`);
        }
    }

    // Handle canceling request
    async function handleCancelRequest(requestId) {
        if (!confirm("Are you sure you want to cancel this request?")) return;
        try {
            await cancelRequest(currentUser, requestId);

            // Remove the request from the list
            setSentRequests(sentRequests.filter(req => req.id !== requestId));

            // Show success message
            alert("Request cancelled successfully");

        } catch (err) {
            console.error("Error cancelling request:", err);
            alert(`Error cancelling request: ${err.message}`);
        }
    }

    // Loading and error
    if (loading) {
        return <div className="loading">Loading profile...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="profile-container">
            {/* Profile Header */}
            <div className="profile-header-section">
                <h1 className="profile-header">My Profile</h1>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === "listings" ? "active" : ""}`}
                    onClick={() => setActiveTab("listings")}
                >
                    My Listings
                </button>
                <button
                    className={`tab tab-with-badge ${activeTab === "received-requests" ? "active" : ""}`}
                    onClick={() => setActiveTab("received-requests")}
                >
                    Received Requests
                    <NotificationBadge count={notificationCounts.unviewedReceivedRequests} />
                </button>
                <button
                    className={`tab tab-with-badge ${activeTab === "sent-requests" ? "active" : ""}`}
                    onClick={() => setActiveTab("sent-requests")}
                >
                    Sent Requests
                    <NotificationBadge count={notificationCounts.unviewedSentRequests} />
                </button>
                <button
                    className={`tab ${activeTab === "wishlist" ? "active" : ""}`}
                    onClick={() => setActiveTab("wishlist")}
                >
                    Wishlist
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* User listings tab */}
                {activeTab === "listings" && (
                    <div className="listings-section">
                        <h2>My Listings</h2>
                        <p className="section-description">Manage your active listings here.</p>
                        {listingsLoading ? (
                            <p>Loading listings...</p>
                        ) : myListings.length === 0 ? (
                            <p className="empty-state">You haven't created any listings yet.</p>
                        ) : (
                            <div className="listings-list">
                                {myListings.map(listing => (
                                    <div key={listing.id} className="listing-card">
                                        <div className="listing-card-header">
                                            <span className={`status-badge ${listing.status}`}>{listing.status}</span>
                                            <span className="listing-card-price">${listing.price}</span>
                                        </div>
                                        <div className="listing-card-body">
                                            <div className="listing-card-left">
                                                <img src={listing.images[0]} alt={listing.listingName} className="listing-card-image" />
                                                <div className="listing-card-location">{listing.condition} • {listing.location}</div>
                                            </div>
                                            <div className="listing-card-right">
                                                <h3 className="listing-card-name">{listing.listingName}</h3>
                                                <div className="listing-card-actions">
                                                    <button onClick={() => navigate(`/listing/${listing.id}`)} className="view-btn">View</button>
                                                    <button onClick={() => handleDeleteListing(listing.id)} className="delete-btn">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* User's received requests tab */}
                {activeTab === "received-requests" && (
                    <div className="requests-section">
                        <h2>Received Requests</h2>
                        <p className="section-description">These are requests from other users who want to swap or buy your listings.</p>
                        {requestsLoading ? (
                            <p>Loading requests...</p>
                        ) : receivedRequests.length === 0 ? (
                            <p className="empty-state">No requests received yet.</p>
                        ) : (
                            <div className="requests-list">
                                {receivedRequests.map(request => (
                                    <div key={request.id} className="request-item">
                                        <div className="request-header">
                                            <span className={`request-type ${request.requestType}`}>{request.requestType}</span>
                                            <span className={`request-status ${request.status}`}>{request.status}</span>
                                        </div>
                                        <div className="request-content">
                                            <div className="request-listing">
                                                <h4>Your Listing:</h4>
                                                {request.targetListing && (
                                                    <div className="mini-listing">
                                                        <img src={request.targetListing.images[0]} alt="" />
                                                        <div>
                                                            <p className="listing-name">{request.targetListing.listingName}</p>
                                                            <p className="listing-price">${request.targetListing.price}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {request.requestType === "swap" && request.offeredListing && (
                                                <div className="request-listing">
                                                    <h4>They're Offering:</h4>
                                                    <div className="mini-listing">
                                                        <img src={request.offeredListing.images[0]} alt="" />
                                                        <div>
                                                            <p className="listing-name">{request.offeredListing.listingName}</p>
                                                            <p className="listing-price">${request.offeredListing.price}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {request.message && (
                                                <div className="request-message">
                                                    <h4>Their Message:</h4>
                                                    <p>{request.message}</p>
                                                </div>
                                            )}
                                        </div>
                                        {request.status === "pending" && (
                                            <div className="request-actions">
                                                <button onClick={() => handleAcceptRequest(request)} className="accept-btn">Accept</button>
                                                <button onClick={() => handleRejectRequest(request.id)} className="reject-btn">Reject</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* User's sent requests tab */}
                {activeTab === "sent-requests" && (
                    <div className="requests-section">
                        <h2>Sent Requests</h2>
                        <p className="section-description">Track your swap and buy requests to other users.</p>
                        {requestsLoading ? (
                            <p>Loading requests...</p>
                        ) : sentRequests.length === 0 ? (
                            <p className="empty-state">You haven't sent any requests yet.</p>
                        ) : (
                            <div className="requests-list">
                                {sentRequests.map(request => (
                                    <div key={request.id} className="request-item">
                                        <div className="request-header">
                                            <span className={`request-type ${request.requestType}`}>{request.requestType}</span>
                                            <span className={`request-status ${request.status}`}>{request.status}</span>
                                        </div>
                                        <div className="request-content">
                                            <div className="request-listing">
                                                <h4>You're Requesting:</h4>
                                                {request.targetListing && (
                                                    <div className="mini-listing">
                                                        <img src={request.targetListing.images[0]} alt="" />
                                                        <div>
                                                            <p className="listing-name">{request.targetListing.listingName}</p>
                                                            <p className="listing-price">${request.targetListing.price}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {request.requestType === "swap" && request.offeredListing && (
                                                <div className="request-listing">
                                                    <h4>You're Offering:</h4>
                                                    <div className="mini-listing">
                                                        <img src={request.offeredListing.images[0]} alt="" />
                                                        <div>
                                                            <p className="listing-name">{request.offeredListing.listingName}</p>
                                                            <p className="listing-price">${request.offeredListing.price}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {request.message && (
                                                <div className="request-message">
                                                    <h4>Your Message:</h4>
                                                    <p>{request.message}</p>
                                                </div>
                                            )}
                                            {request.status === "accepted" && request.contactInfo && (
                                                <div className="contact-info-display success">
                                                    <h4>Contact Info Received:</h4>
                                                    <p>Email: {request.contactInfo?.email || "N/A"}</p>
                                                    {request.contactInfo.phone && <p>Phone: {request.contactInfo.phone}</p>}
                                                </div>
                                            )}
                                        </div>
                                        {request.status === "pending" && (
                                            <div className="request-actions">
                                                <button onClick={() => handleCancelRequest(request.id)} className="cancel-btn">Cancel Request</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* User's wishlist tab */}
                {activeTab === "wishlist" && (
                    <div className="wishlist-section">
                        <h2>My Wishlist</h2>
                        <p className="section-description">Listings you've saved for later.</p>
                        {wishlistLoading ? (
                            <p>Loading wishlist...</p>
                        ) : wishlist.length === 0 ? (
                            <p className="empty-state">Your wishlist is empty. Browse listings to add some!</p>
                        ) : (
                            <div className="listings-list">
                                {wishlist.map(item => item.listing && (
                                    <div key={item.id} className="listing-card">
                                        <div className="listing-card-header">
                                            <span className="listing-card-price">${item.listing.price}</span>
                                        </div>
                                        <div className="listing-card-body">
                                            <div className="listing-card-left">
                                                <img src={item.listing.images[0]} alt={item.listing.listingName} className="listing-card-image" />
                                                <div className="listing-card-location">{item.listing.condition} • {item.listing.location}</div>
                                            </div>
                                            <div className="listing-card-right">
                                                <h3 className="listing-card-name">{item.listing.listingName}</h3>
                                                <div className="listing-card-actions">
                                                    <button onClick={() => navigate(`/listing/${item.listing.id}`)} className="view-btn">View</button>
                                                    <button onClick={() => handleRemoveFromWishlist(item.id)} className="remove-btn">Remove</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Contact Modal */}
            {showContactModal && (
                <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Share Your Contact Information</h3>
                        <p>This information will be shared with the requester.</p>
                        <div className="form-group">
                            <label>Email *</label>
                            <input
                                type="email"
                                value={contactInfo?.email || ""}
                                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                                placeholder="your@email.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone (Optional)</label>
                            <input
                                type="tel"
                                value={contactInfo.phone}
                                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                                placeholder="(555) 123-4567"
                            />
                        </div>
                        <div className="modal-actions">
                            <button onClick={confirmAcceptRequest} className="confirm-btn">Accept & Share</button>
                            <button onClick={() => setShowContactModal(false)} className="cancel-modal-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}