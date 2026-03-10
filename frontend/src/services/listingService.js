import axios from "axios";
import { getIdToken } from "firebase/auth";

const LISTING_API_BASE = import.meta.env.VITE_LISTING_API_BASE;

// Create new listing
export async function createListing(listingData, token) {
  try {
    const response = await axios.post(LISTING_API_BASE, listingData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error("Error creating listing:", err.response?.data || err.message);
    throw err;
  }
}

// Fetch all listings
export async function fetchListings() {
  try {
    const response = await axios.get(LISTING_API_BASE);
    return response.data;
  } catch (err) {
    console.error("Error fetching listings:", err.response?.data || err.message);
    throw err;
  }
}

// Edit an existing listing
export async function editListing(listingId, listingData, token) {
  try {
    const response = await axios.patch(`${LISTING_API_BASE}/${listingId}`, listingData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err) {
    console.error("Error updating listing:", err.response?.data || err.message);
    throw err;
  }
}

// Fetch user listings
export async function fetchUserListings(currentUser, { excludeListingId, onlyActive = false } = {}) {
  if (!currentUser) throw new Error("No user logged in");

  try {
    const token = await getIdToken(currentUser);

    const res = await axios.get(`${LISTING_API_BASE}/user/my-listings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // If server sends array directly
    const listingsArray = Array.isArray(res.data) ? res.data : res.data.listings || [];

    // Optionally filter listings
    return listingsArray.filter((listing) => {
      const notExcluded = !excludeListingId || listing.id !== excludeListingId;
      const isActive = !onlyActive || listing.status === "active";
      return notExcluded && isActive;
    });
  } catch (err) {
    console.error("Error fetching user listings:", err.response?.data || err.message);
    throw new Error("Failed to fetch user listings");
  }
}

// Fetch listing by Id
export async function fetchListingById(listingId) {
  try {
    const response = await axios.get(`${LISTING_API_BASE}/${listingId}`);
    return response.data;
  } catch (err) {
    console.error("Error fetching listing by ID:", err.response?.data || err.message);
    throw err;
  }
}

// Delete listing 
export async function deleteListing(currentUser, listingId) {
  if (!currentUser) throw new Error("No user logged in");
  try {
    const token = await getIdToken(currentUser);
    await axios.delete(`${LISTING_API_BASE}/${listingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("Error deleting listing:", err);
    throw new Error(err.response?.data?.error || "Failed to delete listing");
  }
}