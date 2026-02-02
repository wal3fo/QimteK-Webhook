import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import SEO from '@/components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-qimtek-bg text-qimtek-text font-sans flex items-center justify-center p-4">
      <SEO
        title="404 - Page Not Found"
        name="Qimhook"
        description="The page you are looking for does not exist."
        canonical="https://qimhook.pages.dev/404"
      />
      
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-[#82c91e]/20 blur-3xl rounded-full"></div>
          <FileQuestion className="w-32 h-32 text-[#82c91e] relative z-10 mx-auto" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-qimtek-text tracking-tighter">404</h1>
          <h2 className="text-2xl font-semibold text-qimtek-text-secondary">Page not found</h2>
          <p className="text-qimtek-text-tertiary">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or never existed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 bg-[#82c91e] text-black font-semibold rounded-lg hover:bg-[#72b319] transition-all transform hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-3 bg-qimtek-bg-secondary border border-qimtek-border text-qimtek-text-secondary hover:text-qimtek-text hover:border-qimtek-text-secondary rounded-lg transition-all w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
