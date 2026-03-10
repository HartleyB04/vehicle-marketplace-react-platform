import { useState, useEffect } from "react";
import { useAuth } from "../contexts/useAuth";
import "./SwapRequestModal.css";
import { createConversation } from "../services/messageService";
import { fetchUserListings } from "../services/listingService";
import { createSwapRequest } from "../services/swapRequestService";

export default function SwapRequestModal({ targetListing, isOpen, onClose, onSuccess }) {
    const { currentUser } = useAuth();
    const [requestType, setRequestType] = useState("buy");
    const [myListings, setMyListings] = useState([]);
    const [selectedListingId, setSelectedListingId] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch user's listings only if modal is open and requestType is "swap"
    useEffect(() => {
        if (isOpen && requestType === "swap") fetchMyListings();
    }, [isOpen, requestType]);

    // Fetch user's listings to offer for swap
    async function fetchMyListings() {
        try {
            const listings = await fetchUserListings(currentUser, {
            excludeListingId: targetListing.id,
            onlyActive: true,  // only show active listings
        });
            setMyListings(listings);
            if (listings.length > 0) setSelectedListingId(listings[0].id);
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    }

    // Handle form submission
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const token = await currentUser.getIdToken();
            const requestData = {
                targetListingId: targetListing.id,
                requestType,
                message: message.trim(),
                ...(requestType === "swap" && { offeredListingId: selectedListingId }),
            };

            // Send swap/buy request to backend
            await createSwapRequest(requestData, token);

            // Start conversation with seller
            await createConversation(
                { id: targetListing.id, listingName: targetListing.listingName },
                [targetListing.userId, currentUser.uid],
                token,
                message.trim()
            );

            onSuccess?.(); // callback for parent after success
            handleClose();
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Reset modal state and close
    function handleClose() {
        setError("");
        setMessage("");
        setRequestType("buy");
        setSelectedListingId("");
        onClose();
    }

    if (!isOpen) return null;  // don't render if modal is closed

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content swap-request-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Request this Listing</h2>
                    <button className="close-btn" onClick={handleClose}>&times;</button>
                </div>

                {/* Preview target listing */}
                <div className="target-listing-preview">
                    <img src={targetListing.images[0]} alt={targetListing.listingName} />
                    <div>
                        <h3>{targetListing.listingName}</h3>
                        <p className="price">${targetListing.price}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Request type selection */}
                    <div className="form-group">
                        <label>Request Type</label>
                        <div className="request-type-selector">
                            <button type="button" className={`type-btn ${requestType === "buy" ? "active" : ""}`} onClick={() => setRequestType("buy")}>
                                <span className="icon">💰</span><span>Buy</span><p>Express interest in purchasing</p>
                            </button>
                            <button type="button" className={`type-btn ${requestType === "swap" ? "active" : ""}`} onClick={() => setRequestType("swap")}>
                                <span className="icon">🔄</span><span>Swap</span><p>Offer one of your listings in exchange</p>
                            </button>
                        </div>
                    </div>

                    {/* Swap selection */}
                    {requestType === "swap" && (
                        <div className="form-group">
                            <label>Select Your Listing to Offer *</label>
                            {myListings.length === 0 ? (
                                <div className="no-listings-message">
                                    <p>You don't have any active listings to swap.</p>
                                    <p>Create a listing first to offer a swap!</p>
                                </div>
                            ) : (
                                <select value={selectedListingId} onChange={e => setSelectedListingId(e.target.value)} required>
                                    {myListings.map(listing => (
                                        <option key={listing.id} value={listing.id}>
                                            {listing.listingName} - ${listing.price}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Optional message */}
                    <div className="form-group">
                        <label>Message (Optional)</label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a message to the seller..." rows="4" />
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    {/* Modal actions */}
                    <div className="modal-actions">
                        <button type="submit" className="submit-btn" disabled={loading || (requestType === "swap" && myListings.length === 0)}>
                            {loading ? "Sending..." : "Send Request"}
                        </button>
                        <button type="button" className="cancel-btn" onClick={handleClose} disabled={loading}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
