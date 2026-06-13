import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import Home from "../pages/Home.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
import UserProfile from "../pages/UserProfile.jsx";
import WorkerRegister from "../pages/WorkerRegister.jsx";
import WorkerProfile from "../pages/WorkerProfile.jsx";
import SearchWorkers from "../pages/SearchWorkers.jsx";
import Booking from "../pages/Booking.jsx";
import Reviews from "../pages/Reviews.jsx";
import Complaints from "../pages/Complaints.jsx";
import Notifications from "../pages/Notifications.jsx";
import UserDashboard from "../pages/UserDashboard.jsx";
import AdminDashboard from "../pages/AdminDashboard.jsx";

export default function AppRoutes() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/worker-register" element={<WorkerRegister />} />
          <Route path="/search" element={<SearchWorkers />} />
          <Route path="/workers/:id" element={<WorkerProfile />} />
          <Route path="/reviews/:workerId" element={<Reviews />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/booking/:workerId" element={<Booking />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          <Route element={<ProtectedRoute roles={["customer"]} />}>
            <Route path="/dashboard" element={<UserDashboard />} />
          </Route>

          <Route element={<ProtectedRoute roles={["worker"]} />}>
            <Route path="/worker/dashboard" element={<UserDashboard mode="worker" />} />
          </Route>

          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
