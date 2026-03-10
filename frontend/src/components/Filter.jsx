import { useEffect, useMemo, useState } from "react";

export default function FilterBar({ listings = [], value, onChange }) {
  const [local, setLocal] = useState(value);

  // Sync local state whe
  useEffect(() => setLocal(value), [value]);

  // Compute unique categories from listings and memoise for performance
  const categories = useMemo(() => {
    const set = new Set();
    listings.forEach(l => {
      if (l?.category) set.add(String(l.category).trim());
    });
    return ["All", ...Array.from(set).sort()]; // add "All" as default option
  }, [listings]);

  // Update local state and propagate changes to parent via `onChange`
  function update(partial) {
    const next = { ...local, ...partial };
    setLocal(next);
    onChange?.(next);
  }

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-white/50 p-3 rounded-2xl shadow">
      {/* Search */}
      <div className="md:col-span-2">
        <label className="block text-sm mb-1">Search</label>
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="title or description"
          value={local.q}
          onChange={(e) => update({ q: e.target.value })}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm mb-1">Category</label>
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={local.category}
          onChange={(e) => update({ category: e.target.value })}
        >
          {categories.map(c => (
            <option key={c} value={c === "All" ? "" : c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm mb-1">Min price</label>
          <input
            type="number"
            min="0"
            className="w-full border rounded-lg px-3 py-2"
            value={local.minPrice ?? ""}
            onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm mb-1">Max price</label>
          <input
            type="number"
            min="0"
            className="w-full border rounded-lg px-3 py-2"
            value={local.maxPrice ?? ""}
            onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      {/* Sort + extras */}
      <div className="flex gap-2 items-end md:justify-end">
        <div className="flex-1">
          <label className="block text-sm mb-1">Sort</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={local.sort}
            onChange={(e) => update({ sort: e.target.value })}
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="title-asc">Title: A → Z</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            checked={!!local.hasImages}
            onChange={(e) => update({ hasImages: e.target.checked })}
          />
          <span className="text-sm">With photos</span>
        </label>
      </div>
    </div>
  );
}
