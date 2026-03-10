import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { fetchListingById, editListing } from "../services/listingService";
import "./CreateListingForm.css";

export default function EditListingForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // Form state to hold all listing fields
    const [formData, setFormData] = useState({
        year: "",
        make: "",
        model: "",
        badge: "",
        price: "",
        odometer: "",
        bodyType: "",
        transmission: "",
        driveType: "",
        fuelType: "",
        engine: "",
        condition: "",
        location: "",
        description: "",
        images: [],
    });

    const [imageFiles, setImageFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Fetch listing data when component mounts
    useEffect(() => {
        async function fetchListing() {
            try {
                const data = await fetchListingById(id);
                setFormData({
                    year: data.category?.year || "",
                    make: data.category?.make || "",
                    model: data.category?.model || "",
                    badge: data.category?.badge || "",
                    price: data.price || "",
                    odometer: data.category?.odometer || "",
                    bodyType: data.category?.bodyType || "",
                    transmission: data.category?.transmission || "",
                    driveType: data.category?.driveType || "",
                    fuelType: data.category?.fuelType || "",
                    engine: data.category?.engine || "",
                    condition: data.condition || "",
                    location: data.location || "",
                    description: data.description || "",
                    images: data.images || [],
                });
            } catch (err) {
                alert("Error loading listing: " + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        }
        fetchListing();
    }, [id]);

    // Handle text/number input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "price") {
            const numericValue = value.replace(/[^0-9]/g, "");
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    // Format price for display (e.g., 10000 → "10,000")
    const formatPrice = (value) => {
        if (!value) return "";
        return Number(value).toLocaleString();
    };

    // Handle image file selection
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImageFiles(files);
        const urls = files.map(file => URL.createObjectURL(file));
        setFormData({ ...formData, images: urls });
    };

    // Reorder images (move up)
    const moveImageUp = (index) => {
        if (index === 0) return;
        const newFiles = [...imageFiles];
        const newUrls = [...formData.images];
        [newFiles[index], newFiles[index - 1]] = [newFiles[index - 1], newFiles[index]];
        [newUrls[index], newUrls[index - 1]] = [newUrls[index - 1], newUrls[index]];
        setImageFiles(newFiles);
        setFormData({ ...formData, images: newUrls });
    };

    // Reorder images (move down)
    const moveImageDown = (index) => {
        if (index === imageFiles.length - 1) return;
        const newFiles = [...imageFiles];
        const newUrls = [...formData.images];
        [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
        [newUrls[index], newUrls[index + 1]] = [newUrls[index + 1], newUrls[index]];
        setImageFiles(newFiles);
        setFormData({ ...formData, images: newUrls });
    };

    // Remove an image
    const removeImage = (index) => {
        const newFiles = imageFiles.filter((_, i) => i !== index);
        const newUrls = formData.images.filter((_, i) => i !== index);
        setImageFiles(newFiles);
        setFormData({ ...formData, images: newUrls });
    };

    // Generate listing name from year, make, model, and badge
    const generateListingName = () => {
        const { year, make, model, badge } = formData;
        return [year, make, model, badge].filter(Boolean).join(" ");
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            const token = await currentUser.getIdToken();
            const listingName = generateListingName();
            const data = new FormData();

            // Append all fields to FormData
            data.append("listingName", listingName);
            data.append("price", formData.price);
            data.append("condition", formData.condition);
            data.append("location", formData.location);
            data.append("description", formData.description);
            data.append(
                "category",
                JSON.stringify({
                    year: Number(formData.year),
                    make: formData.make,
                    model: formData.model,
                    badge: formData.badge,
                    odometer: Number(formData.odometer),
                    bodyType: formData.bodyType,
                    transmission: formData.transmission,
                    driveType: formData.driveType,
                    fuelType: formData.fuelType,
                    engine: formData.engine,
                })
            );

            imageFiles.forEach((file) => data.append("images", file));

            await editListing(id, data, token);
            alert("Listing updated successfully!");
            navigate(`/listing/${id}`);
        } catch (err) {
            console.error(err);
            alert("Failed to update listing: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="auth-warning">
                <p>You must be logged in to edit a listing.</p>
                <button onClick={() => navigate("/login")}>Go to Login</button>
            </div>
        );
    }

    // Display warning if user not logged in
    if (loading) return <div className="create-listing-container"><p>Loading listing...</p></div>;

    return (
        <div className="create-listing-container">
            <form onSubmit={handleSubmit} className="create-listing-form">
                
                {/* SECTION 1: Vehicle Details */}
                <section className="form-section">
                    <h3>Vehicle Details</h3>
                    <div className="form-row">
                        <label>
                            <span className="required">Year</span>
                            <input type="number" name="year" value={formData.year} onChange={handleChange} required />
                        </label>
                        <label>
                            <span className="required">Make</span>
                            <input type="text" name="make" value={formData.make} onChange={handleChange} required />
                        </label>
                        <label>
                            <span className="required">Model</span>
                            <input type="text" name="model" value={formData.model} onChange={handleChange} required />
                        </label>
                    </div>
                    <div className="form-row">
                        <label>
                            <span>Badge/Variant</span>
                            <input type="text" name="badge" value={formData.badge} onChange={handleChange} />
                        </label>
                        <label>
                            <span className="required">Price (AUD)</span>
                            <div className="price-input-wrapper">
                                <span className="price-symbol">$</span>
                                <input type="text" name="price" value={formatPrice(formData.price)} onChange={handleChange} className="price-input" required />
                            </div>
                        </label>
                    </div>
                </section>

                {/* SECTION 2: Specifications */}
                <section className="form-section">
                    <h3>Additional Specifications</h3>
                    <div className="form-row">
                        <label>
                            <span className="required">Odometer (km)</span>
                            <input type="number" name="odometer" value={formData.odometer} onChange={handleChange} required />
                        </label>
                        <label>
                            <span className="required">Body Type</span>
                            <select name="bodyType" value={formData.bodyType} onChange={handleChange} required>
                                <option value="">Select body type</option>
                                <option value="Sedan">Sedan</option>
                                <option value="Hatchback">Hatchback</option>
                                <option value="SUV">SUV</option>
                                <option value="Ute">Ute</option>
                                <option value="Wagon">Wagon</option>
                                <option value="Coupe">Coupe</option>
                                <option value="Convertible">Convertible</option>
                                <option value="Van">Van</option>
                                <option value="Truck">Truck</option>
                            </select>
                        </label>
                        <label>
                            <span className="required">Transmission</span>
                            <select name="transmission" value={formData.transmission} onChange={handleChange} required>
                                <option value="">Select transmission</option>
                                <option value="Manual">Manual</option>
                                <option value="Automatic">Automatic</option>
                                <option value="Semi-Auto">Semi-Auto</option>
                            </select>
                        </label>
                    </div>
                    <div className="form-row">
                        <label>
                            <span className="required">Drive Type</span>
                            <select name="driveType" value={formData.driveType} onChange={handleChange} required>
                                <option value="">Select drive type</option>
                                <option value="FWD">FWD</option>
                                <option value="RWD">RWD</option>
                                <option value="AWD">AWD</option>
                            </select>
                        </label>
                        <label>
                            <span className="required">Fuel Type</span>
                            <select name="fuelType" value={formData.fuelType} onChange={handleChange} required>
                                <option value="">Select fuel type</option>
                                <option value="Petrol">Petrol</option>
                                <option value="Diesel">Diesel</option>
                                <option value="Hybrid">Hybrid</option>
                                <option value="Electric">Electric</option>
                                <option value="LPG">LPG</option>
                            </select>
                        </label>
                        <label>
                            <span className="required">Engine</span>
                            <input type="text" name="engine" value={formData.engine} onChange={handleChange} required />
                        </label>
                    </div>
                </section>

                {/* SECTION 3: Condition & Location */}
                <section className="form-section">
                    <h3>Condition & Location</h3>
                    <div className="form-row">
                        <label>
                            <span className="required">Condition</span>
                            <select name="condition" value={formData.condition} onChange={handleChange} required>
                                <option value="">Select condition</option>
                                <option value="Excellent">Excellent</option>
                                <option value="Very Good">Very Good</option>
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                                <option value="Poor">Poor</option>
                            </select>
                        </label>
                        <label>
                            <span className="required">Location</span>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} required />
                        </label>
                    </div>
                    <label className="full-width">
                        <span className="required">Vehicle Description</span>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="6" required />
                    </label>
                </section>

                {/* SECTION 4: Images */}
                <section className="form-section">
                    <h3>Images</h3>
                    <p className="help-text">Upload 1 - 10 images. First image will be your main photo.</p>
                    <input type="file" id="fileInput" accept="image/*" multiple onChange={handleImageChange} style={{ display: "none" }} />
                    <button type="button" className="upload-btn" onClick={() => document.getElementById("fileInput").click()}>
                        {formData.images.length === 0 ? "Upload Images" : "Change Images"}
                    </button>

                    {formData.images.length > 0 && (
                        <div className="image-manager">
                            {formData.images.map((url, index) => (
                                <div key={index} className="image-item">
                                    <img src={url} alt={`Preview ${index + 1}`} />
                                    <div className="image-controls">
                                        <span className="image-label">{index === 0 ? "Main Image" : `Image ${index + 1}`}</span>
                                        <div className="image-buttons">
                                            <button type="button" onClick={() => moveImageUp(index)} disabled={index === 0}>▲</button>
                                            <button type="button" onClick={() => moveImageDown(index)} disabled={index === imageFiles.length - 1}>▼</button>
                                            <button type="button" onClick={() => removeImage(index)} className="delete-btn">✕</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <button type="submit" className="submit-btn" disabled={uploading}>
                    {uploading ? "Saving..." : "Save Changes"}
                </button>
            </form>
        </div>
    );
}
