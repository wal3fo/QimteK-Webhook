import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";

// Lazy load pages for code splitting and better performance
const Home = lazy(() => import("@/pages/Home"));
const RequestDetails = lazy(() => import("@/pages/RequestDetails"));
const Login = lazy(() => import("@/pages/Login"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminPlans = lazy(() => import("@/pages/AdminPlans"));
const Documentation = lazy(() => import("@/pages/Documentation"));
const WebhookDetails = lazy(() => import("@/pages/WebhookDetails"));

import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-qimtek-bg flex items-center justify-center page-enter font-mono">
    <div className="text-qimtek-text-secondary flex flex-col sm:flex-row items-center gap-3">
      <div className="spinner w-5 h-5 border-2 border-[#82c91e] border-t-transparent rounded-full"></div>
      <span className="text-sm sm:text-base">⏳ Loading...</span>
    </div>
  </div>
);

export default function App() {
  useEffect(() => {
    // Set dark theme attribute
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.documentElement.classList.add('dark');

    // Add viewport meta tag if not present (for mobile)
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
      document.head.appendChild(viewport);
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/docs" element={<Documentation />} />
            <Route
              path="/webhook/:token"
              element={
                <ProtectedRoute>
                  <WebhookDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/webhook/:token/request/:id"
              element={
                <ProtectedRoute>
                  <RequestDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/plans"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPlans />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}