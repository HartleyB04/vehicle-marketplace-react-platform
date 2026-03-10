import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import SwapRequestModal from "../components/SwapRequestModal";
import "./ListingDetail.css";
import { fetchListingById } from "../services/listingService";
import { checkWishlist, toggleWishlist } from "../services/wishlistService";

export default function ListingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    // Load listing details on component mount or when ID changes
    useEffect(() => {
        async function loadListing() {
            setLoading(true);
            try {
                const data = await fetchListingById(id);
                setListing(data);

                // Check if listing is in user's wishlist
                if (currentUser) {
                    const inWishlist = await checkWishlist(currentUser, id);
                    setIsInWishlist(inWishlist);
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || "Listing not found");
            } finally {
                setLoading(false);
            }
        }

        loadListing();
    }, [id, currentUser]);

    // Handle adding/removing listing from wishlist
    async function handleToggleWishlist() {
        if (!currentUser) {
            alert("Please log in to save listings");
            navigate("/login");
            return;
        }

        setWishlistLoading(true);

        try {
            const updatedStatus = await toggleWishlist(currentUser, id, isInWishlist);
            setIsInWishlist(updatedStatus);
        } catch (err) {
            console.error(err);
            alert("Failed to update wishlist: " + (err.response?.data?.message || err.message));
        } finally {
            setWishlistLoading(false);
        }
    }

    // Handle click on "Request Swap or Buy" button
    function handleRequestClick() {
        if (!currentUser) {
            alert("Please log in to request listings");
            navigate("/login");
            return;
        }

        // Prevent requesting own listing
        if (listing.userId === currentUser.uid) {
            alert("You cannot request your own listing");
            return;
        }
        setShowSwapModal(true); // Open the swap request modal
    }

    // Callback for when a swap/buy request is successful
    function handleRequestSuccess() {
        alert("Request sent successfully! Check your profile to track it.");
    }

    // Show loading state while fetching data
    if (loading) {
        return (
            <div className="listing-detail-container loading">
                <p>Loading listing...</p>
            </div>
        );
    }

    // Show error state if listing is not found
    if (error || !listing) {
        return (
            <div className="listing-detail-container error">
                <h2>Listing Not Found</h2>
                <p>{error || "This listing doesn't exist or has been removed."}</p>
                <button onClick={() => navigate("/browse")}>Back to Browse</button>
            </div>
        );
    }
    
    // Destructure category info for display
    const { category } = listing;
    const mainTitle = `${category.year} ${category.make} ${category.model}`;
    const specs = [
        category.badge,
        category.transmission,
        category.driveType,
        category.bodyType,
    ].filter(Boolean).join(" • ");

    const isOwnListing = currentUser && listing.userId === currentUser.uid;

    return (
        <div className="listing-detail-container">
            <button className="back-button" onClick={() => navigate("/browse")}>
                ← Back to Browse
            </button>

            <div className="listing-detail-content">
                <div className="listing-images-section">
                    <div className="main-image-container">
                        <img
                            src={listing.images[selectedImageIndex]}
                            alt={`${listing.listingName} - Image ${selectedImageIndex + 1}`}
                            className="main-image"
                        />
                    </div>

                    {listing.images.length > 1 && (
                        <div className="thumbnail-gallery">
                            {listing.images.map((image, index) => (
                                <img
                                    key={index}
                                    src={image}
                                    alt={`Thumbnail ${index + 1}`}
                                    className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="listing-info-section">
                    <div className="listing-header">
                        <h1 className="listing-title">{mainTitle}</h1>

                        {listing.suspended && (
                            <p className="listing-suspended-warning">
                                ⚠️ This listing's owner account is suspended. You cannot request or save this listing.
                            </p>
                        )}

                        <p className="listing-specs">{specs}</p>
                        <p className="listing-price">${Number(listing.price).toLocaleString()}</p>
                        {isOwnListing && (
                            <span className="own-listing-badge">Your Listing</span>
                        )}
                    </div>

                    <div className="specs-grid">
                        <div className="spec-item">
                            <span className="spec-label">Odometer</span>
                            <span className="spec-value">{Number(category.odometer).toLocaleString()} km</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Body Type</span>
                            <span className="spec-value">{category.bodyType}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Transmission</span>
                            <span className="spec-value">{category.transmission}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Drive Type</span>
                            <span className="spec-value">{category.driveType}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Fuel Type</span>
                            <span className="spec-value">{category.fuelType}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Engine</span>
                            <span className="spec-value">{category.engine}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Condition</span>
                            <span className="spec-value">{listing.condition}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Location</span>
                            <span className="spec-value">{listing.location}</span>
                        </div>
                    </div>

                    <div className="description-section">
                        <h3>Description</h3>
                        <p>{listing.description}</p>
                    </div>

                    {!isOwnListing && (
                        <div className="action-buttons">
                            <button
                                className="contact-button primary"
                                onClick={handleRequestClick}
                                disabled={listing.suspended}
                            >
                                Request Swap or Buy
                            </button>
                            <button
                                className={`save-button ${isInWishlist ? 'saved' : ''}`}
                                onClick={handleToggleWishlist}
                                disabled={wishlistLoading || listing.suspended}
                            >
                                {wishlistLoading ? "..." : isInWishlist ? "❤️ Saved" : "🤍 Save Listing"}
                            </button>
                        </div>
                    )}

                    {isOwnListing && (
                        <div className="action-buttons">
                            <button
                                className="edit-button"
                                onClick={() => navigate(`/listing/${id}/edit`)}
                            >
                                Edit Listing
                            </button>
                            <button
                                className="view-requests-button"
                                onClick={() => navigate("/profile", { state: { activeTab: "received-requests" } })}
                            >
                                View Requests
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showSwapModal && (
                <SwapRequestModal
                    targetListing={listing}
                    isOpen={showSwapModal}
                    onClose={() => setShowSwapModal(false)}
                    onSuccess={handleRequestSuccess}
                />
            )}
        </div>
    );
}