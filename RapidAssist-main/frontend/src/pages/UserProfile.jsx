import { useEffect, useState } from "react";
import Loader from "../components/Loader.jsx";
import WorkerCard from "../components/WorkerCard.jsx";
import useAuth from "../hooks/useAuth.js";
import { userService } from "../services/userService.js";

export default function UserProfile() {
  const { user, role, refreshAccount } = useAuth();
  const [profile, setProfile] = useState(user);
  const [savedWorkers, setSavedWorkers] = useState([]);
  const [loading, setLoading] = useState(role === "customer");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (role !== "customer") return;
    userService.profile()
      .then((data) => {
        setProfile(data.user);
        setSavedWorkers(data.user.savedWorkers || []);
      })
      .finally(() => setLoading(false));
  }, [role]);

  const update = async (event) => {
    event.preventDefault();
    const data = await userService.updateProfile({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
    });
    setProfile(data.user);
    refreshAccount(data.user);
    setNotice("Profile updated.");
  };

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="section-heading">
        <span className="eyebrow">Account</span>
        <h1>Profile settings</h1>
      </div>
      {notice && <p className="alert">{notice}</p>}
      <form className="form-shell" onSubmit={update}>
        <div className="form-grid">
          <label>Name<input value={profile?.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
          <label>Email<input value={profile?.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
          <label>Phone<input value={profile?.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
          <label>Role<input value={role || ""} disabled /></label>
          {role === "customer" && <label className="span-2">Address<textarea value={profile?.address || ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></label>}
        </div>
        {role === "customer" && <button className="btn btn-primary">Save changes</button>}
      </form>
      {role === "customer" && (
        <section className="section">
          <div className="section-heading"><span className="eyebrow">Saved</span><h2>Saved workers</h2></div>
          <div className="worker-grid">
            {savedWorkers.map((worker) => <WorkerCard key={worker._id} worker={worker} />)}
            {!savedWorkers.length && <p className="empty">No saved workers yet.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
