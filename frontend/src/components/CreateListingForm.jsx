import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { createListing } from "../services/listingService";
import "./CreateListingForm.css";

export default function CreateListingForm() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        // Essential Details
        year: "",
        make: "",
        model: "",
        badge: "", // variant / trim (e.g., LX, LT, Sport)
        price: "",

        // Key Specifications 
        odometer: "",
        bodyType: "",
        transmission: "",
        driveType: "",
        fuelType: "",
        engine: "",

        // Condition Location
        condition: "",
        location: "",
        description: "",

        // Images
        images: [],
    });

    const [imageFiles, setImageFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Special handling for price - remove non-numeric characters
        if (name === "price") {
            const numericValue = value.replace(/[^0-9]/g, "");
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    // Format price with commas for display
    const formatPrice = (value) => {
        if (!value) return "";
        return Number(value).toLocaleString();
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImageFiles(files);
        
        // Create preview URLs
        const urls = files.map(file => URL.createObjectURL(file));
        setFormData({ ...formData, images: urls });
    };

    // Move image up in order
    const moveImageUp = (index) => {
        if (index === 0) return;
        const newFiles = [...imageFiles];
        const newUrls = [...formData.images];
        
        [newFiles[index], newFiles[index - 1]] = [newFiles[index - 1], newFiles[index]];
        [newUrls[index], newUrls[index - 1]] = [newUrls[index - 1], newUrls[index]];
        
        setImageFiles(newFiles);
        setFormData({ ...formData, images: newUrls });
    };

    // Move image down in order
    const moveImageDown = (index) => {
        if (index === imageFiles.length - 1) return;
        const newFiles = [...imageFiles];
        const newUrls = [...formData.images];
        
        [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
        [newUrls[index], newUrls[index + 1]] = [newUrls[index + 1], newUrls[index]];
        
        setImageFiles(newFiles);
        setFormData({ ...formData, images: newUrls });
    };

    // Remove image
    const removeImage = (index) => {
        const newFiles = imageFiles.filter((_, i) => i !== index);
        const newUrls = formData.images.filter((_, i) => i !== index);
        
        setImageFiles(newFiles);
        setFormData({ ...formData, images: newUrls });
    };

    // Generate listing title automatically
    const generateListingName = () => {
        const { year, make, model, badge } = formData;
        const parts = [year, make, model, badge].filter(Boolean);
        return parts.join(" ");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            // Validate images
            if (imageFiles.length === 0) {
                alert("Please upload at least one image");
                setUploading(false);
                return;
            }

            // Get Firebase ID token
            const token = await currentUser.getIdToken();

            // Generate listing name
            const listingName = generateListingName();
            
            // Create FormData for multipart upload
            const data = new FormData();
            data.append("listingName", listingName);
            data.append("price", formData.price);
            data.append("condition", formData.condition);
            data.append("location", formData.location);
            data.append("description", formData.description);
            
            // Add category/specs as JSON
            const category = {
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
            };
            data.append("category", JSON.stringify(category));

            // Append image files
            imageFiles.forEach((file) => {
                data.append("images", file);
            });

            // Call backend API
            await createListing(data, token);
            
            alert("Listing created successfully!");
            // Navigate to browse page
            navigate("/browse");

        } catch (err) {
            console.error("Error creating listing:", err);
            alert("Failed to create listing: " + err.message);
        } finally {
            setUploading(false);
            setUploadProgress("");
        }
    };

    if (!currentUser) {
        return (
            <div className="auth-warning">
                <p>You must be logged in to create a listing.</p>
                <button onClick={() => navigate("/login")}>Go to Login</button>
            </div>
        );
    }

    return (
        <div className="create-listing-container">
            <form onSubmit={handleSubmit} className="create-listing-form">
                
                {/* SECTION 1: Essential Vehicle Details */}
                <section className="form-section">
                    <h3>Vehicle Details</h3>
                    
                    <div className="form-row">
                        <label>
                            <span className="required">Year</span>
                            <input
                                type="number"
                                name="year"
                                placeholder="e.g. 2017"
                                value={formData.year}
                                onChange={handleChange}
                                min="1900"
                                max={new Date().getFullYear() + 1}
                                required
                            />
                        </label>

                        <label>
                            <span className="required">Make</span>
                            <input
                                type="text"
                                name="make"
                                placeholder="e.g. Toyota"
                                value={formData.make}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            <span className="required">Model</span>
                            <input
                                type="text"
                                name="model"
                                placeholder="e.g. Corolla"
                                value={formData.model}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                    <div className="form-row">
                        <label>
                            <span>Badge/Variant</span>
                            <input
                                type="text"
                                name="badge"
                                placeholder="e.g. Sport"
                                value={formData.badge}
                                onChange={handleChange}
                            />
                        </label>

                            <label>
                                <span className="required">Price (AUD)</span>
                                <div className="price-input-wrapper">
                                    <span className="price-symbol">$</span>
                                    <input
                                        type="text"
                                        name="price"
                                        placeholder="e.g. 12,500"
                                        value={formatPrice(formData.price)}
                                        onChange={handleChange}
                                        className="price-input"
                                        required
                                    />
                                </div>
                            </label>
                    </div>
                </section>

                {/* SECTION 2: Additional Specifications */}
                <section className="form-section">
                    <h3>Additional Specifications</h3>
                    
                    <div className="form-row">
                        <label>
                            <span className="required">Odometer (km)</span>
                            <input
                                type="number"
                                name="odometer"
                                placeholder="e.g. 85000"
                                value={formData.odometer}
                                onChange={handleChange}
                                min="0"
                                required
                            />
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
                            <input
                                type="text"
                                name="engine"
                                placeholder="e.g. 4 cylinders, Petrol Aspirated, 1.8L"
                                value={formData.engine}
                                onChange={handleChange}
                                required
                            />
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
                            <input
                                type="text"
                                name="location"
                                placeholder="e.g. Sydney, NSW"
                                value={formData.location}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                    <label className="full-width">
                        <span className="required">Vehicle Description</span>
                        <textarea
                            name="description"
                            placeholder="Describe your vehicle's features, history, modifications, condition, etc."
                            value={formData.description}
                            onChange={handleChange}
                            rows="6"
                            required
                        />
                    </label>
                </section>

                {/* SECTION 4: Images */}
                <section className="form-section">
                    <h3>Images</h3>
                    <p className="help-text">Upload 1 - 10 images. First image will be your main photo.</p>
                    
                    <input
                        id="fileInput"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                    />

                    <button
                        type="button"
                        className="upload-btn"
                        onClick={() => document.getElementById("fileInput").click()}
                    >
                        {formData.images.length === 0 ? "Upload Images" : "Change Images"}
                    </button>

                    {formData.images.length > 0 && (
                        <div className="image-manager">
                            {formData.images.map((url, index) => (
                                <div key={index} className="image-item">
                                    <img src={url} alt={`Preview ${index + 1}`} />
                                    <div className="image-controls">
                                        <span className="image-label">
                                            {index === 0 ? "Main Image" : `Image ${index + 1}`}
                                        </span>
                                        <div className="image-buttons">
                                            <button
                                                type="button"
                                                onClick={() => moveImageUp(index)}
                                                disabled={index === 0}
                                                title="Move up"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveImageDown(index)}
                                                disabled={index === imageFiles.length - 1}
                                                title="Move down"
                                            >
                                                ▼
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="delete-btn"
                                                title="Remove"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Submit Button */}
                <button type="submit" className="submit-btn" disabled={uploading}>
                    {uploading ? uploadProgress : "Create Listing"}
                </button>
            </form>
        </div>
    );
}