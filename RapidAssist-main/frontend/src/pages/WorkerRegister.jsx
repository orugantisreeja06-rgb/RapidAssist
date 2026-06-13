import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function WorkerRegister() {
  const { registerWorker } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    skills: "",
    experience: "",
    serviceCharges: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [error, setError] = useState("");

  const update = (key, value) => setForm({ ...form, [key]: value });
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await registerWorker({
        ...form,
        skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean),
        experience: Number(form.experience),
        serviceCharges: Number(form.serviceCharges),
        location: {
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          coordinates: { lat: 0, lng: 0 },
        },
      });
      navigate("/worker/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page narrow">
      <form className="form-shell" onSubmit={submit}>
        <span className="eyebrow">Worker onboarding</span>
        <h1>Register your service profile</h1>
        {error && <p className="alert error">{error}</p>}
        <div className="form-grid">
          <label>Name<input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
          <label>Phone<input value={form.phone} onChange={(e) => update("phone", e.target.value)} required /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required /></label>
          <label>Skills<input value={form.skills} onChange={(e) => update("skills", e.target.value)} placeholder="Electrician, Wiring" required /></label>
          <label>Experience<input type="number" value={form.experience} onChange={(e) => update("experience", e.target.value)} required /></label>
          <label>Service charge<input type="number" value={form.serviceCharges} onChange={(e) => update("serviceCharges", e.target.value)} required /></label>
          <label>City<input value={form.city} onChange={(e) => update("city", e.target.value)} required /></label>
          <label className="span-2">Address<input value={form.address} onChange={(e) => update("address", e.target.value)} required /></label>
          <label>State<input value={form.state} onChange={(e) => update("state", e.target.value)} /></label>
          <label>Pincode<input value={form.pincode} onChange={(e) => update("pincode", e.target.value)} /></label>
        </div>
        <button className="btn btn-primary">Submit for verification</button>
      </form>
    </div>
  );
}
