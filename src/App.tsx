import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";

// Lazy load pages for code splitting and better performance
const Home = lazy(() => import("@/pages/Home"));
const RequestDetails = lazy(() => import("@/pages/RequestDetails"));
const Login = lazy(() => import("@/pages/Login"));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-qimtek-bg flex items-center justify-center page-enter">
    <div className="text-qimtek-text-secondary flex flex-col sm:flex-row items-center gap-3">
      <div className="spinner w-5 h-5 border-2 border-[#82c91e] border-t-transparent rounded-full"></div>
      <span className="text-sm sm:text-base">Loading...</span>
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
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/request/:id" element={<RequestDetails />} />
        </Routes>
      </Suspense>
    </Router>
  );
}