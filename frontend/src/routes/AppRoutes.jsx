import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminDashboard from '../pages/AdminDashboard'
import Booking from '../pages/Booking'
import Complaints from '../pages/Complaints'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Notifications from '../pages/Notifications'
import Register from '../pages/Register'
import Reviews from '../pages/Reviews'
import SearchWorkers from '../pages/SearchWorkers'
import UserDashboard from '../pages/UserDashboard'
import UserProfile from '../pages/UserProfile'
import WorkerProfile from '../pages/WorkerProfile'
import WorkerRegister from '../pages/WorkerRegister'

function AppLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_34%),linear-gradient(180deg,#0f172a_0%,#0b1120_100%)] text-slate-100">
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="worker/register" element={<WorkerRegister />} />
          <Route path="search" element={<SearchWorkers />} />
          <Route path="workers/:id" element={<WorkerProfile />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="booking" element={<Booking />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="notifications" element={<Notifications />} />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

