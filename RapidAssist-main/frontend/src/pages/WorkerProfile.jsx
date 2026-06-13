import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import RatingStars from "../components/RatingStars.jsx";
import { workerService } from "../services/workerService.js";

export default function WorkerProfile() {
  const { id } = useParams();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workerService.getById(id).then((data) => setWorker(data.worker)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader />;
  if (!worker) return <p className="empty">Worker not found.</p>;

  return (
    <div className="page narrow">
      <section className="profile-hero">
        <div className="avatar large">{worker.name?.charAt(0)}</div>
        <div>
          <span className={worker.availability ? "pill success" : "pill"}>{worker.availability ? "Available" : "Unavailable"}</span>
          <h1>{worker.name}</h1>
          <p className="muted">{worker.skills?.join(", ")}</p>
          <RatingStars rating={worker.averageRating} count={worker.totalReviews} />
        </div>
      </section>
      <div className="detail-grid">
        <div><span>Experience</span><strong>{worker.experience || 0} years</strong></div>
        <div><span>Service charge</span><strong>Rs. {worker.serviceCharges || 0}</strong></div>
        <div><span>Location</span><strong>{worker.location?.city || worker.location?.address || "Not provided"}</strong></div>
      </div>
      <p className="lead">{worker.bio || "This professional has not added a bio yet."}</p>
      <div className="row actions">
        <Link className="btn btn-primary" to={`/booking/${worker._id}`}>Book service</Link>
        <Link className="btn btn-secondary" to={`/reviews/${worker._id}`}>Read reviews</Link>
      </div>
    </div>
  );
}
