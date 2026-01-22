import { cn } from '@/lib/utils';
import Logo from './Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-qimtek-bg-surface border-t border-qimtek-border mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Logo and Company Info */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <Logo size="lg" className="opacity-90" />
            <div className="text-center sm:text-left">
              <p className="text-sm sm:text-base font-semibold text-qimtek-text">
                QimteK Inc
              </p>
              <p className="text-xs sm:text-sm text-qimtek-text-secondary">
                Webhook Inspection Tool
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center sm:text-right">
            <p className="text-xs sm:text-sm text-qimtek-text-secondary">
              © {currentYear} QimteK Inc. All rights reserved.
            </p>
            <p className="text-xs text-qimtek-text-tertiary mt-1">
              Made with ❤️ for developers
            </p>
          </div>
        </div>

        {/* Additional Links (Optional) */}
        <div className="hidden mt-6 pt-6 border-t border-qimtek-border flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-qimtek-text-secondary">
          <a
            href="https://www.paypal.com/paypalme/drgineer/5?currencyCode=USD"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#82c91e] transition-colors duration-200 touch-manipulation"
          >
            Support Us
          </a>
          <span className="hidden sm:inline text-qimtek-text-tertiary">•</span>
          <a
            href="https://github.com/wal3fo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#82c91e] transition-colors duration-200 touch-manipulation"
            aria-label="Visit our GitHub profile"
          >
            GitHub
          </a>
          <span className="hidden sm:inline text-qimtek-text-tertiary">•</span>
          <a
            href="https://qimtek.ma"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#82c91e] transition-colors duration-200 touch-manipulation"
            aria-label="Visit QimteK website"
          >
            QimteK.ma
          </a>
        </div>
      </div>
    </footer>
  );
}