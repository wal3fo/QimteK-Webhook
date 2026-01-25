import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Github, ExternalLink, Heart, Code, Zap, Shield, Users, TrendingUp, Book } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Features', href: '#features' },
      { name: 'How It Works', href: '#how-it-works' },
      { name: 'API Documentation', href: '#docs' },
    ],
    company: [
      { name: 'About QimteK', href: import.meta.env.VITE_COMPANY_URL, external: true },
      { name: 'Our Mission', href: import.meta.env.VITE_COMPANY_URL, external: true },
      { name: 'Contact Us', href: import.meta.env.VITE_COMPANY_URL, external: true },
    ],
    resources: [
      { name: 'GitHub Repository', href: import.meta.env.VITE_GITHUB_URL, external: true },
      { name: 'Documentation', href: '#docs' },
      { name: 'Support', href: import.meta.env.VITE_PAYPAL_URL, external: true },
    ],
  };

  return (
    <footer className="bg-qimtek-bg-surface border-t border-qimtek-border mt-auto relative overflow-hidden font-mono">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#82c91e]/5 via-transparent to-transparent pointer-events-none" />

      <div className="w-full px-0 py-2 relative z-10">
        {/* Main Footer Content */}
        <div className="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12 px-2 sm:px-4 lg:px-6">
          {/* Brand Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Logo size="xl" className="opacity-95" />
            </div>
            <div>
              <p className="text-sm text-qimtek-text-secondary leading-relaxed mb-4">
                The ultimate webhook inspection tool for developers. Capture, inspect, and debug HTTP requests in real-time with ease.
              </p>
              <div className="flex items-center gap-2 text-xs text-qimtek-text-tertiary">
                <Shield className="w-4 h-4 text-[#82c91e]/70" />
                <span>Secure • Fast • Free</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-qimtek-text uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#82c91e]" />
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className={cn(
                      'text-sm text-qimtek-text-secondary hover:text-[#82c91e]',
                      'transition-all duration-200 inline-flex items-center gap-1.5',
                      'group touch-manipulation'
                    )}
                    aria-label={link.name}
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                      {link.name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-qimtek-text uppercase tracking-wider flex items-center gap-2">
              <Code className="w-4 h-4 text-[#82c91e]" />
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className={cn(
                      'text-sm text-qimtek-text-secondary hover:text-[#82c91e]',
                      'transition-all duration-200 inline-flex items-center gap-1.5',
                      'group touch-manipulation'
                    )}
                    aria-label={link.name}
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                      {link.name}
                    </span>
                    {link.external && (
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources & Connect */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-qimtek-text uppercase tracking-wider flex items-center gap-2">
              <Github className="w-4 h-4 text-[#82c91e]" />
              Resources
            </h4>
            <ul className="space-y-3 mb-6">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className={cn(
                      'text-sm text-qimtek-text-secondary hover:text-[#82c91e]',
                      'transition-all duration-200 inline-flex items-center gap-1.5',
                      'group touch-manipulation'
                    )}
                    aria-label={link.name}
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                      {link.name}
                    </span>
                    {link.external && (
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}
                  </a>
                </li>
              ))}
            </ul>

            {/* Social Links */}
            <div className="pt-4 border-t border-qimtek-border">
              <p className="text-xs text-qimtek-text-tertiary mb-3">Connect with us</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/wal3fo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'p-2.5 rounded-lg bg-qimtek-bg-secondary border border-qimtek-border',
                    'hover:bg-[#82c91e]/10 hover:border-[#82c91e]/30',
                    'text-qimtek-text-secondary hover:text-[#82c91e]',
                    'transition-all duration-200 hover:scale-110 active:scale-95',
                    'touch-manipulation'
                  )}
                  aria-label="Visit our GitHub profile"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://qimtek.ma"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'p-2.5 rounded-lg bg-qimtek-bg-secondary border border-qimtek-border',
                    'hover:bg-[#82c91e]/10 hover:border-[#82c91e]/30',
                    'text-qimtek-text-secondary hover:text-[#82c91e]',
                    'transition-all duration-200 hover:scale-110 active:scale-95',
                    'touch-manipulation'
                  )}
                  aria-label="Visit QimteK website"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-qimtek-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 sm:px-4 lg:px-6">
            {/* Copyright */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
              <p className="text-xs sm:text-sm text-qimtek-text-secondary">
                © {currentYear} <span className="text-qimtek-text font-semibold">QimteK Inc</span>. All rights reserved.
              </p>
              <span className="hidden sm:inline text-qimtek-text-tertiary">•</span>
              <p className="text-xs text-qimtek-text-tertiary flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                <span>Built with passion for developers</span>
              </p>
            </div>

            {/* Support Link */}
            <div className="flex items-center gap-1">
              <Link
                to="/docs"
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-qimtek-bg-secondary border border-qimtek-border',
                  'hover:bg-[#82c91e]/10 hover:border-[#82c91e]/30',
                  'text-sm text-qimtek-text-secondary hover:text-[#82c91e]',
                  'transition-all duration-200 hover:scale-105 active:scale-95',
                  'touch-manipulation font-medium'
                )}
                aria-label="Documentation">
                <Book className="w-4 h-4 text-[#82c91e]" />
                <span>Documentation</span>
              </Link>
              <a
                href={import.meta.env.VITE_PAYPAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-qimtek-bg-secondary border border-qimtek-border',
                  'hover:bg-[#82c91e]/10 hover:border-[#82c91e]/30',
                  'text-sm text-qimtek-text-secondary hover:text-[#82c91e]',
                  'transition-all duration-200 hover:scale-105 active:scale-95',
                  'touch-manipulation font-medium'
                )}
                aria-label="Support us on PayPal">
                <Heart className="w-4 h-4 text-red-500" />
                <span>Support Our Work</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
