import { useEffect, useState, useRef } from "react";
import { fetchListings } from "../services/listingService";
import ListingCard from "../components/ListingCard";
import "./Browse.css";

export default function Browse() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilter, setShowFilter] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [makeFilter, setMakeFilter] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [minYear, setMinYear] = useState("");
    const [maxYear, setMaxYear] = useState("");
    const [sortOption, setSortOption] = useState("newest");
    const [filterCondition, setFilterCondition] = useState("all");
    const [availableMakes, setAvailableMakes] = useState([]);

    // Utility functions
    const toNumber = (v) => {
        if (v == null) return 0;
        const n = Number(String(v).replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : 0;
    };

    // Extract year from listing 
    const getYear = (l) => {
        const y = Number(l?.category?.year);
        if (y >= 1980 && y <= new Date().getFullYear() + 1) return y;
        // try to parse year from listingName/title 
        const name = l?.listingName || l?.title || "";
        const m = name.match(/\b(19[8-9]\d|20[0-3]\d)\b/); // 1980–2039
        return m ? Number(m[0]) : 0;
    };

    // Extract kilometers 
    const getKm = (l) => {
        if (l?.category?.odometer != null) return Number(l.category.odometer) || 0;
        const cands = [l.kilometers, l.km, l.kms, l.odometer, l.mileage];
        for (const c of cands) {
            const n = toNumber(c);
            if (n > 0) return n;
        }
        return 0;
    };
    
    // Refs for dropdown menus
    const filterRef = useRef(null);
    const sortRef = useRef(null);

    // fetch listings 
    useEffect(() => {
        async function getAllListings() {
            setLoading(true);
            try {
                const result = await fetchListings();
                const activeListings = result.filter(
                    (l) => l.status === "active" || !l.status
                );
                setListings(activeListings);

                // Extract unique makes and sort alphabetically
                const makesSet = new Set();
                activeListings.forEach((listing) => {
                    const make = listing.category?.make;
                    if (make && make.trim()) {
                        makesSet.add(make.trim());
                    }
                });
                const sortedMakes = Array.from(makesSet).sort((a, b) =>
                    a.localeCompare(b, 'en', { sensitivity: 'base' })
                );
                setAvailableMakes(sortedMakes);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        getAllListings();
    }, []);

    // Close filter/sort dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilter(false);
            }
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setShowSort(false);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);


    // Filter + Sort listings
    let filteredListings = listings.filter((listing) => {
        const q = searchQuery.toLowerCase();

        // Search matches
        const matchesSearch =
            listing.listingName?.toLowerCase().includes(q) ||
            listing.location?.toLowerCase().includes(q) ||
            listing.category?.make?.toLowerCase().includes(q) ||
            listing.category?.model?.toLowerCase().includes(q);

        // Make filter
        const matchesMake =
            !makeFilter || listing.category?.make?.toLowerCase() === makeFilter.toLowerCase();

        const year = getYear(listing);

        const matchesYear =
            (!minYear || year >= Number(minYear)) &&
            (!maxYear || year <= Number(maxYear));

        const price = Number(listing.price || 0);

        const matchesPrice =
            (!minPrice || price >= Number(minPrice)) &&
            (!maxPrice || price <= Number(maxPrice));

        return matchesSearch && matchesMake && matchesYear && matchesPrice;
    });

    // Sort choices
    filteredListings = filteredListings.sort((a, b) => {
        const yearA = getYear(a);
        const yearB = getYear(b);
        const kmA = getKm(a);
        const kmB = getKm(b);
        const priceA = Number(a.price || 0);
        const priceB = Number(b.price || 0);


        switch (sortOption) {
            case "price-asc": return priceA - priceB;
            case "price-desc": return priceB - priceA;
            case "km-asc": return kmA - kmB;
            case "km-desc": return kmB - kmA;
            case "year-desc": return yearB - yearA; // Newest → Oldest
            case "year-asc": return yearA - yearB; // Oldest → Newest
            default: { return 0; /* fallback to createdAt */ }
        }

    });

    return (
        <div className="browse-container">
            {/* Search Bar */}
            <div className="browse-header">
                <h1>Browse</h1>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search vehicles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="search-btn">🔍</button>
                </div>
            </div>


            {/* Actions: Filter & Sort */}
            <div className="browse-actions">
                {/* FILTER BUTTON */}
                <div className="menu-wrap" ref={filterRef}>
                    <button
                        className="menu-btn"
                        onClick={() => {
                            setShowFilter((v) => !v);
                            setShowSort(false);
                        }}
                        aria-haspopup="true"
                        aria-expanded={showFilter}
                    >
                        Filter ≔
                    </button>

                    {showFilter && (
                        <div className="dropdown">
                            {/* Row: Make */}
                            <div className="dropdown-item">
                                <span>Make</span>
                                <select
                                    className="filter-select"
                                    value={makeFilter}
                                    onChange={(e) => setMakeFilter(e.target.value)}
                                >
                                    <option value="">All Makes</option>
                                    {availableMakes.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Row: Year range */}
                            <div className="dropdown-item">
                                <span>Year</span>
                                <div className="range-row">
                                    <label>From</label>
                                    <input
                                        type="number"
                                        className="filter-input"
                                        value={minYear}
                                        onChange={(e) => setMinYear(e.target.value)}
                                        placeholder="e.g. 2015"
                                    />
                                    <label>To</label>
                                    <input
                                        type="number"
                                        className="filter-input"
                                        value={maxYear}
                                        onChange={(e) => setMaxYear(e.target.value)}
                                        placeholder="e.g. 2024"
                                    />
                                </div>
                            </div>

                            {/* Row: Price range */}
                            <div className="dropdown-item price-item">
                                <span>Price</span>
                                <div className="range-row">
                                    <label>From AUD$</label>
                                    <input
                                        type="number"
                                        className="filter-input"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        placeholder="Min"
                                    />
                                    <label>To AUD$</label>
                                    <input
                                        type="number"
                                        className="filter-input"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        placeholder="Max"
                                    />
                                </div>

                                <div className="dropdown-footer">
                                    <button className="save-btn" onClick={() => setShowFilter(false)}>
                                        Save filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* SORT BUTTON */}
                <div className="menu-wrap" ref={sortRef}>
                    <button
                        className="menu-btn"
                        onClick={() => {
                            setShowSort((v) => !v);
                            setShowFilter(false);
                        }}
                        aria-haspopup="true"
                        aria-expanded={showSort}
                    >
                        Sort ▼
                    </button>

                    {showSort && (
                        <div className="dropdown">
                            <button
                                className="drop-item"
                                onClick={() => {
                                    setSortOption("price-asc");
                                    setShowSort(false);
                                }}
                            >
                                Price: Low → High
                            </button>
                            <button
                                className="drop-item"
                                onClick={() => {
                                    setSortOption("price-desc");
                                    setShowSort(false);
                                }}
                            >
                                Price: High → Low
                            </button>
                            <button
                                className="drop-item"
                                onClick={() => {
                                    setSortOption("year-desc");
                                    setShowSort(false);
                                }}
                            >
                                Year: Newest → Oldest
                            </button>
                            <button
                                className="drop-item"
                                onClick={() => {
                                    setSortOption("year-asc");
                                    setShowSort(false);
                                }}
                            >
                                Year: Oldest → Newest
                            </button>
                            <button
                                className="drop-item"
                                onClick={() => {
                                    setSortOption("km-asc");
                                    setShowSort(false);
                                }}
                            >
                                KM: Low → High
                            </button>
                            <button
                                className="drop-item"
                                onClick={() => {
                                    setSortOption("km-desc");
                                    setShowSort(false);
                                }}
                            >
                                KM: High → Low
                            </button>
                        </div>
                    )}
                </div>
            </div>





            {/* Loading State */}
            {loading && (
                <div className="loading-message">
                    <p>Loading listings...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="error-message">
                    <p>Error: {error}</p>
                </div>
            )}

            {/* No Listings */}
            {!loading && !error && filteredListings.length === 0 && (
                <div className="no-listings">
                    <p>No listings found. {searchQuery && "Try a different search term."}</p>
                </div>
            )}

            {/* Listings Grid */}
            {!loading && !error && filteredListings.length > 0 && (
                <div className="listings-grid">
                    {filteredListings.map((listing) => (
                        <ListingCard
                            key={listing.id}
                            id={listing.id}
                            image={listing.images && listing.images[0] ? listing.images[0] : "/assets/placeholder-car.png"}
                            name={listing.listingName}
                            price={listing.price}
                            condition={listing.condition}
                            location={listing.location}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}