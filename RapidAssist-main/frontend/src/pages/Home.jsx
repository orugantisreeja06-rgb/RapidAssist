import { ArrowRight, BadgeCheck, Clock, MapPinned, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { SERVICES } from "../utils/constants.js";

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Fast local help for everyday repairs</span>
          <h1>RapidAssist</h1>
          <p>Book verified electricians, plumbers, cleaners, mechanics, and home service professionals with transparent pricing and real-time updates.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/search">Find a worker <ArrowRight size={18} /></Link>
            <Link className="btn btn-secondary" to="/worker-register">Join as worker</Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="metric-card"><Search size={22} /><strong>Search</strong><span>Filter by skill, city, price, and rating.</span></div>
          <div className="metric-card"><BadgeCheck size={22} /><strong>Verified</strong><span>Admin-approved workers shown to customers.</span></div>
          <div className="metric-card"><Clock size={22} /><strong>Emergency</strong><span>Immediate request flow for urgent jobs.</span></div>
          <div className="metric-card"><MapPinned size={22} /><strong>Nearby</strong><span>Location-aware support for local assistance.</span></div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Popular services</span>
          <h2>Everything important, one booking away</h2>
        </div>
        <div className="service-grid">
          {SERVICES.map((service) => (
            <Link className="service-tile" key={service} to={`/search?skill=${encodeURIComponent(service)}`}>
              <span>{service.slice(0, 2)}</span>
              {service}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
