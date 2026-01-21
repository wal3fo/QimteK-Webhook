import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Home from "@/pages/Home";
import RequestDetails from "@/pages/RequestDetails";

export default function App() {
  useEffect(() => {
    // Set dark theme attribute
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/request/:id" element={<RequestDetails />} />
      </Routes>
    </Router>
  );
}
