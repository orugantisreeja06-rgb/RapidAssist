import { Star } from "lucide-react";

export default function RatingStars({ rating = 0, count, size = 16 }) {
  const normalized = Math.round(Number(rating) || 0);
  return (
    <span className="rating-stars" aria-label={`${rating || 0} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={size}
          fill={index < normalized ? "currentColor" : "none"}
          strokeWidth={2}
        />
      ))}
      <span>{Number(rating || 0).toFixed(1)}{count ? ` (${count})` : ""}</span>
    </span>
  );
}
