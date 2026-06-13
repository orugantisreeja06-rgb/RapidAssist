import { Bookmark, BriefcaseBusiness, CalendarCheck, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import RatingStars from "./RatingStars.jsx";

export default function WorkerCard({ worker, onSave }) {
  const primarySkill = worker.skills?.[0] || worker.skill || "Home service";
  const city = worker.location?.city || worker.location?.address || "Service area";

  return (
    <article className="worker-card">
      <div className="avatar">{worker.profileImage ? <img src={worker.profileImage} alt="" /> : worker.name?.charAt(0)}</div>
      <div className="worker-card-body">
        <div className="row between">
          <div>
            <h3>{worker.name}</h3>
            <p className="muted">{primarySkill}</p>
          </div>
          <span className={worker.availability ? "pill success" : "pill"}>{worker.availability ? "Available" : "Busy"}</span>
        </div>
        <RatingStars rating={worker.averageRating || worker.rating} count={worker.totalReviews} />
        <div className="meta-grid">
          <span><MapPin size={16} />{city}</span>
          <span><BriefcaseBusiness size={16} />{worker.experience || 0} yrs</span>
          <span><CalendarCheck size={16} />Rs. {worker.serviceCharges || worker.serviceCharge || 0}</span>
        </div>
        <div className="row actions">
          <Link className="btn btn-secondary" to={`/workers/${worker._id}`}>View profile</Link>
          {onSave && (
            <button className="icon-btn" type="button" onClick={() => onSave(worker._id)} title="Save worker">
              <Bookmark size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
