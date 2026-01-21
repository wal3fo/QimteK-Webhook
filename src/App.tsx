import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";

// Lazy load pages for code splitting and better performance
const Home = lazy(() => import("@/pages/Home"));
const RequestDetails = lazy(() => import("@/pages/RequestDetails"));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-qimtek-bg flex items-center justify-center">
    <div className="text-qimtek-text-secondary flex items-center gap-3">
      <div className="spinner w-5 h-5 border-2 border-[#82c91e] border-t-transparent rounded-full"></div>
      Loading...
    </div>
  </div>
);

export default function App() {
  useEffect(() => {
    // Set dark theme attribute
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/request/:id" element={<RequestDetails />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
