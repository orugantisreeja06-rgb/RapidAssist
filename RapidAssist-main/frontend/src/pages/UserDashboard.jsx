import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, IndianRupee } from "lucide-react";
import Loader from "../components/Loader.jsx";
import { bookingService } from "../services/bookingService.js";
import { BOOKING_STATUSES } from "../utils/constants.js";

export default function UserDashboard({ mode = "customer" }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const isWorker = mode === "worker";

  const load = async () => {
    setLoading(true);
    const data = isWorker ? await bookingService.workerBookings() : await bookingService.userBookings();
    setBookings(data.bookings || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [mode]);

  const updateStatus = async (id, status) => {
    await bookingService.updateStatus(id, status);
    load();
  };

  const cancel = async (id) => {
    await bookingService.cancel(id);
    load();
  };

  const active = bookings.filter((booking) => !["Completed", "Cancelled"].includes(booking.status));
  const completed = bookings.filter((booking) => booking.status === "Completed");
  const revenue = completed.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);

  return (
    <div className="page">
      <div className="section-heading">
        <span className="eyebrow">{isWorker ? "Worker workspace" : "Customer workspace"}</span>
        <h1>{isWorker ? "Manage incoming jobs" : "Your bookings"}</h1>
      </div>
      <div className="stats-grid">
        <div className="stat"><CalendarDays /><span>Total bookings</span><strong>{bookings.length}</strong></div>
        <div className="stat"><Clock3 /><span>Active</span><strong>{active.length}</strong></div>
        <div className="stat"><CheckCircle2 /><span>Completed</span><strong>{completed.length}</strong></div>
        <div className="stat"><IndianRupee /><span>{isWorker ? "Completed value" : "Spent on completed"}</span><strong>{revenue}</strong></div>
      </div>
      {loading ? <Loader /> : (
        <div className="table-shell">
          <table>
            <thead><tr><th>Service</th><th>{isWorker ? "Customer" : "Worker"}</th><th>Date</th><th>Status</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>{booking.serviceType}</td>
                  <td>{isWorker ? booking.user?.name : booking.worker?.name}</td>
                  <td>{new Date(booking.bookingDate).toLocaleString()}</td>
                  <td><span className="pill">{booking.status}</span></td>
                  <td>Rs. {booking.totalAmount || 0}</td>
                  <td>
                    {isWorker ? (
                      <select value={booking.status} onChange={(e) => updateStatus(booking._id, e.target.value)}>
                        {BOOKING_STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    ) : booking.status === "Pending" ? (
                      <button className="btn btn-danger" onClick={() => cancel(booking._id)}>Cancel</button>
                    ) : <span className="muted">No action</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bookings.length && <p className="empty">No bookings yet.</p>}
        </div>
      )}
    </div>
  );
}
