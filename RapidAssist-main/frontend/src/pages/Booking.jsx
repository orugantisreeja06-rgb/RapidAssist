import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingService } from "../services/bookingService.js";
import { workerService } from "../services/workerService.js";

export default function Booking() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [form, setForm] = useState({ serviceType: "", bookingDate: "", address: "", description: "", emergency: false });
  const [error, setError] = useState("");

  useEffect(() => {
    workerService.getById(workerId).then((data) => {
      setWorker(data.worker);
      setForm((current) => ({ ...current, serviceType: data.worker.skills?.[0] || "" }));
    });
  }, [workerId]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        workerId,
        serviceType: form.serviceType,
        bookingDate: form.bookingDate,
        address: form.address,
        description: form.description,
        totalAmount: worker?.serviceCharges || 0,
      };
      if (form.emergency) await bookingService.emergency(payload);
      else await bookingService.create(payload);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page narrow">
      <form className="form-shell" onSubmit={submit}>
        <span className="eyebrow">New booking</span>
        <h1>{worker ? `Book ${worker.name}` : "Book service"}</h1>
        {error && <p className="alert error">{error}</p>}
        <label>Service type<input value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} required /></label>
        {!form.emergency && <label>Date and time<input type="datetime-local" value={form.bookingDate} onChange={(e) => setForm({ ...form, bookingDate: e.target.value })} required /></label>}
        <label>Address<textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></label>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="check-row"><input type="checkbox" checked={form.emergency} onChange={(e) => setForm({ ...form, emergency: e.target.checked })} />Emergency request</label>
        <button className="btn btn-primary">Confirm booking</button>
      </form>
    </div>
  );
}
