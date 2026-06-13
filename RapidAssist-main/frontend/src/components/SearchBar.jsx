import { Search, SlidersHorizontal } from "lucide-react";
import { SERVICES } from "../utils/constants.js";

export default function SearchBar({ filters, onChange, onSubmit }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <form className="search-panel" onSubmit={onSubmit}>
      <label>
        <Search size={18} />
        <select value={filters.skill || ""} onChange={(e) => update("skill", e.target.value)}>
          <option value="">All services</option>
          {SERVICES.map((service) => (
            <option key={service} value={service}>{service}</option>
          ))}
        </select>
      </label>
      <label>
        <span>City</span>
        <input value={filters.city || ""} onChange={(e) => update("city", e.target.value)} placeholder="Mumbai" />
      </label>
      <label>
        <span>Max price</span>
        <input type="number" value={filters.maxPrice || ""} onChange={(e) => update("maxPrice", e.target.value)} placeholder="1500" />
      </label>
      <label>
        <SlidersHorizontal size={18} />
        <select value={filters.sortBy || "rating"} onChange={(e) => update("sortBy", e.target.value)}>
          <option value="rating">Best rated</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
        </select>
      </label>
      <button className="btn btn-primary" type="submit">Search</button>
    </form>
  );
}
