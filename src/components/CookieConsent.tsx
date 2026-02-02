import React, { useState, useEffect } from 'react';
import { Cookie, X, Check, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('qimhook-cookie-consent');
    if (!consent) {
      // Delay slightly for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('qimhook-cookie-consent', 'all');
    setShowBanner(false);
    // Here you would initialize analytics/ads scripts
  };

  const handleReject = () => {
    localStorage.setItem('qimhook-cookie-consent', 'necessary');
    setShowBanner(false);
  };

  const handleSavePreferences = (prefs: any) => {
    localStorage.setItem('qimhook-cookie-consent', JSON.stringify(prefs));
    setShowBanner(false);
    setShowPreferences(false);
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-6xl mx-auto bg-qimtek-bg-surface border border-qimtek-border rounded-xl shadow-2xl p-6 md:flex items-center justify-between gap-6 backdrop-blur-xl bg-opacity-95">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-[#82c91e]/10 rounded-lg hidden sm:block">
              <Cookie className="w-6 h-6 text-[#82c91e]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-qimtek-text mb-2 flex items-center gap-2">
                <Cookie className="w-5 h-5 text-[#82c91e] sm:hidden" />
                Cookie Settings
              </h3>
              <p className="text-sm text-qimtek-text-secondary leading-relaxed">
                We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. Read our <Link to="/privacy-policy" className="text-[#82c91e] hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 md:mt-0 w-full md:w-auto">
            <button
              onClick={() => setShowPreferences(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-qimtek-border text-qimtek-text-secondary hover:text-qimtek-text hover:bg-qimtek-bg-secondary transition-colors text-sm font-medium"
            >
              Customize
            </button>
            <button
              onClick={handleReject}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-qimtek-border text-qimtek-text hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-colors text-sm font-medium"
            >
              Reject All
            </button>
            <button
              onClick={handleAcceptAll}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#82c91e] text-black font-semibold hover:bg-[#82c91e]/90 transition-all transform hover:scale-105 shadow-lg shadow-[#82c91e]/20 text-sm"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-qimtek-border flex items-center justify-between">
              <h3 className="text-xl font-bold text-qimtek-text">Cookie Preferences</h3>
              <button onClick={() => setShowPreferences(false)} className="text-qimtek-text-secondary hover:text-qimtek-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <Check className="w-5 h-5 text-[#82c91e]" />
                </div>
                <div>
                  <h4 className="font-semibold text-qimtek-text">Necessary Cookies</h4>
                  <p className="text-sm text-qimtek-text-secondary mt-1">
                    Essential for the website to function properly. Cannot be disabled.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#82c91e] rounded" />
                </div>
                <div>
                  <h4 className="font-semibold text-qimtek-text">Analytics & Performance</h4>
                  <p className="text-sm text-qimtek-text-secondary mt-1">
                    Help us understand how visitors interact with the website.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#82c91e] rounded" />
                </div>
                <div>
                  <h4 className="font-semibold text-qimtek-text">Marketing & Ads</h4>
                  <p className="text-sm text-qimtek-text-secondary mt-1">
                    Used to deliver relevant advertisements and track ad performance.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-qimtek-border bg-qimtek-bg/50 flex justify-end gap-3">
              <button
                onClick={() => setShowPreferences(false)}
                className="px-4 py-2 rounded-lg text-qimtek-text-secondary hover:text-qimtek-text font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSavePreferences({ necessary: true, analytics: true, marketing: true })}
                className="px-6 py-2 rounded-lg bg-[#82c91e] text-black font-semibold hover:bg-[#82c91e]/90"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
