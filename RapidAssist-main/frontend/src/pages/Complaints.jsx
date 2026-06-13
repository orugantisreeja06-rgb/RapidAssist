import { useEffect, useState } from "react";
import { complaintService } from "../services/complaintService.js";
import { COMPLAINT_TYPES } from "../utils/constants.js";

export default function Complaints() {
  const [form, setForm] = useState({ againstWorkerId: "", complaintType: COMPLAINT_TYPES[0], description: "", bookingId: "" });
  const [complaints, setComplaints] = useState([]);
  const [notice, setNotice] = useState("");

  const load = () => complaintService.userComplaints().then((data) => setComplaints(data.complaints || [])).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setNotice("");
    try {
      await complaintService.submit({
        againstWorkerId: form.againstWorkerId,
        complaintType: form.complaintType,
        description: form.description,
        bookingId: form.bookingId || undefined,
      });
      setForm({ ...form, againstWorkerId: "", description: "", bookingId: "" });
      setNotice("Complaint submitted for review.");
      load();
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <div className="page">
      <div className="section-heading"><span className="eyebrow">Support</span><h1>Complaints</h1></div>
      {notice && <p className="alert">{notice}</p>}
      <form className="form-shell" onSubmit={submit}>
        <div className="form-grid">
          <label>Worker ID<input value={form.againstWorkerId} onChange={(e) => setForm({ ...form, againstWorkerId: e.target.value })} required /></label>
          <label>Complaint type<select value={form.complaintType} onChange={(e) => setForm({ ...form, complaintType: e.target.value })}>{COMPLAINT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="span-2">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} minLength={20} required /></label>
        </div>
        <button className="btn btn-primary">Submit complaint</button>
      </form>
      <div className="list">
        {complaints.map((complaint) => (
          <article className="list-item" key={complaint._id}>
            <div className="row between"><strong>{complaint.complaintType}</strong><span className="pill">{complaint.status}</span></div>
            <p>{complaint.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
