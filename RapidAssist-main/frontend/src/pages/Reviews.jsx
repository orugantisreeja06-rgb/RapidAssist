import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import RatingStars from "../components/RatingStars.jsx";
import { reviewService } from "../services/reviewService.js";

export default function Reviews() {
  const { workerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewService.workerReviews(workerId).then(setData).finally(() => setLoading(false));
  }, [workerId]);

  if (loading) return <Loader />;

  return (
    <div className="page narrow">
      <div className="section-heading">
        <span className="eyebrow">Reviews</span>
        <h1>{data?.worker?.name || "Worker"} ratings</h1>
        <RatingStars rating={data?.worker?.averageRating} count={data?.worker?.totalReviews} size={18} />
      </div>
      <div className="list">
        {(data?.reviews || []).map((review) => (
          <article className="list-item" key={review._id}>
            <div className="row between">
              <strong>{review.user?.name || "Customer"}</strong>
              <RatingStars rating={review.rating} />
            </div>
            <p>{review.comment || "No comment added."}</p>
          </article>
        ))}
        {!data?.reviews?.length && <p className="empty">No reviews yet.</p>}
      </div>
    </div>
  );
}
