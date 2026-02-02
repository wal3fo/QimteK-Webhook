import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, LogIn, LogOut, CircleUser, Server, ShieldCheck,
  Home, Book, Info, Mail, Shield, FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Logo from '@/components/Logo';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import MfaSetupModal from '@/components/MfaSetupModal';

export default function Header() {
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout, loading: authLoading } = useAuth();
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Docs', href: '/docs', icon: Book },
    { name: 'Blog', href: '/blog', icon: FileText },
    { name: 'About', href: '/about', icon: Info },
    { name: 'Contact', href: '/contact', icon: Mail },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header className="w-full border-b border-qimtek-border bg-qimtek-bg/95 backdrop-blur supports-[backdrop-filter]:bg-qimtek-bg/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <Logo size="lg" />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-[#82c91e] flex items-center gap-2",
                      isActive(item.href) ? "text-[#82c91e]" : "text-qimtek-text-secondary"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Auth Controls */}
              {authLoading ? (
                <div className="h-9 w-24 bg-qimtek-bg-secondary animate-pulse rounded-lg" />
              ) : isAuthenticated ? (
                <div className="hidden md:flex items-center gap-3">
                  {/* User Profile */}
                  <button
                    onClick={() => setChangePasswordModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e] rounded-lg transition-all duration-200 group"
                    title="Change Password"
                  >
                    <CircleUser className="w-4 h-4" />
                    <span className="text-sm max-w-[150px] truncate">{user?.email}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold border ml-1 uppercase",
                      user?.role === 'Administrator' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                        user?.role === 'Professional' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          "bg-[#82c91e]/10 text-[#82c91e] border-[#82c91e]/20"
                    )}>
                      {user?.role === 'Administrator' ? 'ADMIN' : user?.role === 'Professional' ? 'PRO' : 'FREE'}
                    </span>
                  </button>

                  {/* Admin Access */}
                  {isAdmin && (
                    <Link
                      to="/admin/users"
                      className="p-2 bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e] rounded-lg transition-all"
                      title="Server Access"
                    >
                      <Server className="w-4 h-4" />
                    </Link>
                  )}

                  {/* MFA */}
                  <button
                    onClick={() => setMfaModalOpen(true)}
                    className={cn(
                      "p-2 rounded-lg transition-all border",
                      user?.mfa_enabled
                        ? "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20 hover:border-orange-500/50 text-orange-500"
                        : "bg-qimtek-bg-secondary hover:bg-qimtek-bg-surface border-qimtek-border hover:border-[#82c91e]/50 text-qimtek-text-secondary hover:text-[#82c91e]"
                    )}
                    title={user?.mfa_enabled ? "Disable 2FA" : "Enable 2FA"}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>

                  {/* Logout */}
                  <button
                    onClick={logout}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 text-red-500 hover:text-red-400 rounded-lg transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#82c91e] text-black font-semibold rounded-lg hover:bg-[#72b319] transition-colors text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-qimtek-text-secondary hover:text-qimtek-text"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-qimtek-border bg-qimtek-bg-surface animate-in slide-in-from-top-5">
            <div className="space-y-1 p-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-[#82c91e]/10 text-[#82c91e]"
                      : "text-qimtek-text-secondary hover:bg-qimtek-bg-secondary hover:text-qimtek-text"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}

              <div className="h-px bg-qimtek-border my-4" />

              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="px-3 flex items-center gap-3 text-qimtek-text-secondary">
                    <CircleUser className="w-5 h-5" />
                    <span className="text-sm">{user?.email}</span>
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin/users"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-qimtek-text-secondary hover:bg-qimtek-bg-secondary hover:text-qimtek-text"
                    >
                      <Server className="w-5 h-5" />
                      Server Access
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setChangePasswordModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-qimtek-text-secondary hover:bg-qimtek-bg-secondary hover:text-qimtek-text"
                  >
                    <Shield className="w-5 h-5" />
                    Change Password
                  </button>

                  <button
                    onClick={() => {
                      setMfaModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-qimtek-text-secondary hover:bg-qimtek-bg-secondary hover:text-qimtek-text"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    {user?.mfa_enabled ? "Disable 2FA" : "Enable 2FA"}
                  </button>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-red-500 hover:bg-red-500/10"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#82c91e] text-black font-semibold rounded-lg hover:bg-[#72b319] transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)} onConfirm={function (data: { currentPassword: string; newPassword: string; }): Promise<void> {
          throw new Error('Function not implemented.');
        }} />

      <MfaSetupModal
        isOpen={mfaModalOpen}
        onClose={() => setMfaModalOpen(false)}
      // onComplete={() => setMfaModalOpen(false)}
      />
    </>
  );
}
