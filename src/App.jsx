import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AdminApprovals from "./pages/AdminApprovals";
import CodeSandbox from "./pages/CodeSandbox";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";

import TaskPage from "./pages/TaskPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import SubmissionReview from "./pages/SubmissionReview";
import Leaderboard from "./pages/Leaderboard";
import StudentProfile from "./pages/StudentProfile";
import AdminCourses from "./pages/AdminCourses";
import AuditLog from "./pages/AuditLog";
import Simulation from "./pages/Simulation";
import LabGate from "./components/LabGate";
import LearnGate from "./components/LearnGate";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectEditor from "./pages/ProjectEditor";
import LiveClassesPage from "./pages/LiveClassesPage";
import LiveClassRoom from "./pages/LiveClassRoom";
import CreateClass from "./pages/CreateClass";
import SiteSettings from "./pages/SiteSettings";
import PaymentPage from "./pages/PaymentPage";
import Learn from "./pages/Learn";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminUserManagement from "./pages/AdminUserManagement";
import DesignTemplates from "./pages/admin/DesignTemplates";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav";

// Unknown URL: signed-in users go to the dashboard instead of the public
// landing page; signed-out visitors see the landing page.
function FallbackRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
        {/* Keyboard/screen-reader skip link; main wraps the routes with
            display:contents so page layouts are completely unaffected.
            The reveal on focus is pure CSS (.skip-link:focus in index.css). */}
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1} style={{ display: "contents" }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          {/* Password-reset link target (recovery session, not gated) */}
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes - any authenticated, approved user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Learning routes */}
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <CoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <CourseDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks/:taskId"
            element={
              <ProtectedRoute>
                <TaskPage />
              </ProtectedRoute>
            }
          />

          {/* Sandbox */}
          <Route
            path="/sandbox"
            element={
              <ProtectedRoute>
                <CodeSandbox />
              </ProtectedRoute>
            }
          />

          {/* Leaderboard */}
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />

          {/* Student Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <StudentProfile />
              </ProtectedRoute>
            }
          />

          {/* Teacher routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute requiredRole="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <ProtectedRoute requiredRole="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/review"
            element={
              <ProtectedRoute requiredRole="teacher">
                <SubmissionReview />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminCourses />
              </ProtectedRoute>
            }
          />

          {/* User Management - Super Admin */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AdminUserManagement />
              </ProtectedRoute>
            }
          />

          {/* Analytics - Admin & Super Admin */}
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Site Settings - Admin & Super Admin */}
          <Route
            path="/admin/site-settings"
            element={
              <ProtectedRoute requiredRole="admin">
                <SiteSettings />
              </ProtectedRoute>
            }
          />

          {/* Certificate & poster designer — admin */}
          <Route
            path="/admin/designs"
            element={
              <ProtectedRoute requiredRole="admin">
                <DesignTemplates />
              </ProtectedRoute>
            }
          />

          {/* Super Admin routes */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/approvals"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AdminApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-log"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AuditLog />
              </ProtectedRoute>
            }
          />

          {/* Projects */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectEditor />
              </ProtectedRoute>
            }
          />

          {/* Live Classes */}
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <LiveClassesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes/create"
            element={
              <ProtectedRoute>
                <CreateClass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes/:classId"
            element={
              <ProtectedRoute>
                <LiveClassRoom />
              </ProtectedRoute>
            }
          />

          {/* Payment */}
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          {/* 3D Simulation */}
          <Route
            path="/simulation"
            element={
              <ProtectedRoute>
                <LabGate>
                  <Simulation />
                </LabGate>
              </ProtectedRoute>
            }
          />

          {/* Learning Engine (bundled static sub-app) — admin-set free/paid */}
          <Route
            path="/learn"
            element={
              <ProtectedRoute>
                <LearnGate>
                  <Learn />
                </LearnGate>
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
        </main>
        <BottomNav />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
