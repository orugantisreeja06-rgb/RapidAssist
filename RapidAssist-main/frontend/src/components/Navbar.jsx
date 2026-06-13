import { Bell, BriefcaseBusiness, LayoutDashboard, LogOut, Search, ShieldCheck, UserRound } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

const linkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;

export default function Navbar() {
  const { isAuthenticated, role, user, logout } = useAuth();

  return (
    <header className="site-header">
      <nav className="navbar">
        <Link className="brand" to="/">
          <span>RA</span>
          RapidAssist
        </Link>
        <div className="nav-links">
          <NavLink className={linkClass} to="/search"><Search size={17} />Find workers</NavLink>
          {isAuthenticated && role === "customer" && <NavLink className={linkClass} to="/dashboard"><LayoutDashboard size={17} />Dashboard</NavLink>}
          {isAuthenticated && role === "worker" && <NavLink className={linkClass} to="/worker/dashboard"><BriefcaseBusiness size={17} />Jobs</NavLink>}
          {isAuthenticated && role === "admin" && <NavLink className={linkClass} to="/admin"><ShieldCheck size={17} />Admin</NavLink>}
          {isAuthenticated && <NavLink className={linkClass} to="/notifications"><Bell size={17} />Alerts</NavLink>}
        </div>
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <NavLink className="profile-chip" to="/profile"><UserRound size={17} />{user?.name || "Profile"}</NavLink>
              <button className="icon-btn" type="button" onClick={logout} title="Log out"><LogOut size={18} /></button>
            </>
          ) : (
            <>
              <Link className="btn btn-secondary" to="/login">Log in</Link>
              <Link className="btn btn-primary" to="/register">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
