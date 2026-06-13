import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import SearchBar from "../components/SearchBar.jsx";
import WorkerCard from "../components/WorkerCard.jsx";
import { userService } from "../services/userService.js";
import { workerService } from "../services/workerService.js";
import useAuth from "../hooks/useAuth.js";

export default function SearchWorkers() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ skill: params.get("skill") || "", city: "", maxPrice: "", sortBy: "rating" });
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const { isAuthenticated, role } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const data = await workerService.search(filters);
      setWorkers(data.workers || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveWorker = async (id) => {
    try {
      await userService.saveWorker(id);
      setNotice("Worker saved to your profile.");
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <div className="page">
      <div className="section-heading">
        <span className="eyebrow">Worker discovery</span>
        <h1>Find verified professionals</h1>
      </div>
      <SearchBar filters={filters} onChange={setFilters} onSubmit={(e) => { e.preventDefault(); load(); }} />
      {notice && <p className="alert">{notice}</p>}
      {loading ? <Loader /> : (
        <div className="worker-grid">
          {workers.map((worker) => (
            <WorkerCard key={worker._id} worker={worker} onSave={isAuthenticated && role === "customer" ? saveWorker : null} />
          ))}
          {!workers.length && <p className="empty">No verified workers matched your filters.</p>}
        </div>
      )}
    </div>
  );
}
