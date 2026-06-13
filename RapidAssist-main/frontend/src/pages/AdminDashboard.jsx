import { useEffect, useState } from "react";
import Loader from "../components/Loader.jsx";
import { adminService } from "../services/adminService.js";

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [dash, workerData, complaintData] = await Promise.all([
      adminService.dashboard(),
      adminService.workers(),
      adminService.complaints(),
    ]);
    setDashboard(dash);
    setWorkers(workerData.workers || []);
    setComplaints(complaintData.complaints || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader />;
  const stats = dashboard?.stats || {};

  return (
    <div className="page">
      <div className="section-heading"><span className="eyebrow">Operations</span><h1>Admin dashboard</h1></div>
      <div className="stats-grid">
        {Object.entries(stats).map(([key, value]) => (
          <div className="stat" key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{value}</strong></div>
        ))}
      </div>
      <section className="section">
        <div className="section-heading"><span className="eyebrow">Verification queue</span><h2>Workers</h2></div>
        <div className="table-shell">
          <table>
            <thead><tr><th>Name</th><th>Skills</th><th>Verified</th><th>Action</th></tr></thead>
            <tbody>
              {workers.map((worker) => (
                <tr key={worker._id}>
                  <td>{worker.name}<br /><span className="muted">{worker.email}</span></td>
                  <td>{worker.skills?.join(", ")}</td>
                  <td>{worker.isVerified ? "Yes" : "No"}</td>
                  <td><button className="btn btn-secondary" onClick={async () => { await adminService.verifyWorker(worker._id, !worker.isVerified); load(); }}>{worker.isVerified ? "Revoke" : "Verify"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><span className="eyebrow">Support</span><h2>Complaints</h2></div>
        <div className="list">
          {complaints.slice(0, 6).map((complaint) => (
            <article className="list-item" key={complaint._id}>
              <div className="row between"><strong>{complaint.complaintType}</strong><span className="pill">{complaint.status}</span></div>
              <p>{complaint.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
