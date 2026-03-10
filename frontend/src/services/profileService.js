import axios from "axios";

const PROFILE_API_BASE = import.meta.env.VITE_PROFILE_API_BASE;

// Fetch user profile
export const fetchUserProfile = async (token) => {
    try {
        const res = await axios.get(PROFILE_API_BASE, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data.user;
    } catch (err) {
        console.error("Error fetching profile:", err);
        throw new Error(err.response?.data?.error || "Failed to fetch profile");
    }
};