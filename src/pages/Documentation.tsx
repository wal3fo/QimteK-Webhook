import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Zap, Shield, Code, Terminal, Globe, Lock, Clock, Database, Search, User, Check, Server, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

export default function Documentation() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('introduction');

  // Handle scroll spy for active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['introduction', 'getting-started', 'inspecting', 'accounts', 'security', 'admin', 'api'];

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => (
    <button
      onClick={() => scrollToSection(id)}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
        activeSection === id
          ? "bg-[#82c91e]/10 text-[#82c91e] border border-[#82c91e]/20"
          : "text-qimtek-text-secondary hover:text-qimtek-text hover:bg-qimtek-bg-secondary"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-qimtek-bg page-enter font-mono text-sm flex flex-col">
      <SEO
        title="Documentation"
        description="Comprehensive documentation for QimteK Hooks. Learn how to generate webhooks, inspect requests, and integrate with your applications."
      />
      {/* Header */}
      <div className="w-full px-0 py-4 sm:py-6 border-b border-qimtek-border bg-qimtek-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-qimtek-text-secondary hover:text-qimtek-text transition-colors px-3 py-2 rounded-lg hover:bg-qimtek-bg-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="h-6 w-px bg-qimtek-border mx-2 hidden sm:block"></div>
            <Logo size="sm" />
            <span className="text-qimtek-text-secondary ml-2 hidden sm:inline">/ Documentation</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-qimtek-bg-secondary rounded-lg border border-qimtek-border text-qimtek-text-secondary hover:text-[#82c91e] hover:border-[#82c91e]/30 transition-all duration-200"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 lg:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar Navigation */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-2">
              <h3 className="px-4 text-xs font-semibold text-qimtek-text-tertiary uppercase tracking-wider mb-4">
                Contents
              </h3>
              <NavItem id="introduction" icon={Globe} label="Introduction" />
              <NavItem id="getting-started" icon={Zap} label="Getting Started" />
              <NavItem id="inspecting" icon={Search} label="Inspecting Requests" />
              <NavItem id="accounts" icon={User} label="User Accounts" />
              <NavItem id="security" icon={Shield} label="Security" />
              <NavItem id="admin" icon={Server} label="Admin Features" />
              <NavItem id="api" icon={Code} label="API Reference" />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-16">

            {/* Introduction */}
            <section id="introduction" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Globe className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold text-qimtek-text">Introduction</h1>
              </div>
              <p className="text-qimtek-text-secondary text-base leading-relaxed">
                QimteK Webhook is a powerful, developer-friendly tool designed to help you capture, inspect, and debug HTTP requests and webhooks in real-time. Whether you're integrating with third-party APIs (like Stripe, PayPal, or Slack) or building your own distributed systems, QimteK provides an instant endpoint to visualize exactly what data is being sent.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-qimtek-bg-surface border border-qimtek-border">
                  <Zap className="w-5 h-5 text-[#82c91e] mb-3" />
                  <h3 className="font-semibold text-qimtek-text mb-2">Real-time Capture</h3>
                  <p className="text-xs text-qimtek-text-secondary">Requests appear instantly as they arrive, with no page refresh needed.</p>
                </div>
                <div className="p-4 rounded-xl bg-qimtek-bg-surface border border-qimtek-border">
                  <Search className="w-5 h-5 text-blue-400 mb-3" />
                  <h3 className="font-semibold text-qimtek-text mb-2">Deep Inspection</h3>
                  <p className="text-xs text-qimtek-text-secondary">View headers, query parameters, and parsed body content (JSON, Form, etc.).</p>
                </div>
                <div className="p-4 rounded-xl bg-qimtek-bg-surface border border-qimtek-border">
                  <Shield className="w-5 h-5 text-purple-400 mb-3" />
                  <h3 className="font-semibold text-qimtek-text mb-2">Secure & Private</h3>
                  <p className="text-xs text-qimtek-text-secondary">Unique URLs, CORS support, and secure user authentication options.</p>
                </div>
              </div>
            </section>

            {/* Getting Started */}
            <section id="getting-started" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[#82c91e]/10 text-[#82c91e] border border-[#82c91e]/20">
                  <Zap className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-qimtek-text">Getting Started</h2>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-qimtek-text">1. Generate a Webhook</h3>
                <p className="text-qimtek-text-secondary">
                  On the homepage, simply click the <span className="text-[#82c91e]">"Generate Webhook URL"</span> button.
                  If you are logged in, you can provide a custom name (alias) for your webhook to make it easier to identify.
                </p>
                <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-lg p-4 font-mono text-xs">
                  <div className="flex items-center gap-2 mb-2 text-qimtek-text-secondary">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  </div>
                  <p className="text-[#82c91e]">POST {import.meta.env.VITE_SITE_URL}/api/webhook/9bc4533e...</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-qimtek-text">2. Send a Request</h3>
                <p className="text-qimtek-text-secondary">
                  Copy your unique URL and use it as the destination for your webhooks, or test it manually using tools like cURL, Postman, or your browser.
                </p>
                <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-lg p-4 font-mono text-xs overflow-x-auto">
                  <p className="text-qimtek-text-secondary mb-2"># Example cURL command</p>
                  <code className="text-qimtek-text">
                    curl -X POST \<br />
                    &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                    &nbsp;&nbsp;-d '{"{"}"message": "Hello QimteK!"{"}"}' \<br />
                    &nbsp;&nbsp;YOUR_WEBHOOK_URL
                  </code>
                </div>
              </div>
            </section>

            {/* Inspecting Requests */}
            <section id="inspecting" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Search className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-qimtek-text">Inspecting Requests</h2>
              </div>
              <p className="text-qimtek-text-secondary">
                Click on any incoming request in the sidebar (or list view on mobile) to see its full details.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <li className="flex gap-3 p-3 rounded-lg bg-qimtek-bg-secondary/50 border border-qimtek-border">
                  <Layout className="w-5 h-5 text-qimtek-text-secondary" />
                  <div>
                    <strong className="block text-qimtek-text text-sm mb-1">Headers & Metadata</strong>
                    <span className="text-xs text-qimtek-text-secondary">View HTTP method, IP address, timestamp, and all request headers.</span>
                  </div>
                </li>
                <li className="flex gap-3 p-3 rounded-lg bg-qimtek-bg-secondary/50 border border-qimtek-border">
                  <Code className="w-5 h-5 text-qimtek-text-secondary" />
                  <div>
                    <strong className="block text-qimtek-text text-sm mb-1">Body Content</strong>
                    <span className="text-xs text-qimtek-text-secondary">Automatically formats JSON, XML, and Form data for readability.</span>
                  </div>
                </li>
                <li className="flex gap-3 p-3 rounded-lg bg-qimtek-bg-secondary/50 border border-qimtek-border">
                  <Terminal className="w-5 h-5 text-qimtek-text-secondary" />
                  <div>
                    <strong className="block text-qimtek-text text-sm mb-1">Query Parameters</strong>
                    <span className="text-xs text-qimtek-text-secondary">Parsed URL query strings displayed in a key-value table.</span>
                  </div>
                </li>
                <li className="flex gap-3 p-3 rounded-lg bg-qimtek-bg-secondary/50 border border-qimtek-border">
                  <Globe className="w-5 h-5 text-qimtek-text-secondary" />
                  <div>
                    <strong className="block text-qimtek-text text-sm mb-1">Host Information</strong>
                    <span className="text-xs text-qimtek-text-secondary">Direct links to Whois and Shodan for the request origin IP.</span>
                  </div>
                </li>
              </ul>
            </section>

            {/* User Accounts */}
            <section id="accounts" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-qimtek-text">User Accounts</h2>
              </div>
              <p className="text-qimtek-text-secondary">
                Create an account to unlock persistent webhooks and advanced features.
              </p>

              <div className="overflow-hidden border border-qimtek-border rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-qimtek-bg-surface border-b border-qimtek-border">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-qimtek-text">Feature</th>
                      <th className="px-6 py-3 font-semibold text-qimtek-text">Guest</th>
                      <th className="px-6 py-3 font-semibold text-[#82c91e]">User</th>
                      <th className="px-6 py-3 font-semibold text-blue-400">Professional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-qimtek-border bg-qimtek-bg-secondary/20">
                    <tr>
                      <td className="px-6 py-4 text-qimtek-text-secondary">Webhook Expiration</td>
                      <td className="px-6 py-4 text-qimtek-text-tertiary">Session only</td>
                      <td className="px-6 py-4 text-qimtek-text">72 Hours</td>
                      <td className="px-6 py-4 text-qimtek-text font-bold">Never</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-qimtek-text-secondary">Max Webhooks</td>
                      <td className="px-6 py-4 text-qimtek-text-tertiary">1</td>
                      <td className="px-6 py-4 text-qimtek-text">1</td>
                      <td className="px-6 py-4 text-qimtek-text">5</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-qimtek-text-secondary">Custom Aliases</td>
                      <td className="px-6 py-4 text-red-400"><span className="sr-only">No</span>×</td>
                      <td className="px-6 py-4 text-green-400"><span className="sr-only">Yes</span>✓</td>
                      <td className="px-6 py-4 text-green-400"><span className="sr-only">Yes</span>✓</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-qimtek-text-secondary">Advanced Inspection</td>
                      <td className="px-6 py-4 text-red-400"><span className="sr-only">No</span>×</td>
                      <td className="px-6 py-4 text-red-400"><span className="sr-only">No</span>×</td>
                      <td className="px-6 py-4 text-green-400"><span className="sr-only">Yes</span>✓</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-qimtek-text-secondary">Request Replay</td>
                      <td className="px-6 py-4 text-red-400"><span className="sr-only">No</span>×</td>
                      <td className="px-6 py-4 text-red-400"><span className="sr-only">No</span>×</td>
                      <td className="px-6 py-4 text-green-400"><span className="sr-only">Yes</span>✓</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-qimtek-text-secondary">Data Export (CSV/JSON)</td>
                      <td className="px-6 py-4 text-red-400"><span className="sr-only">No</span>×</td>
                      <td className="px-6 py-4 text-green-400"><span className="sr-only">Yes</span>✓</td>
                      <td className="px-6 py-4 text-green-400"><span className="sr-only">Yes</span>✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Security */}
            <section id="security" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-qimtek-text">Security</h2>
              </div>
              <p className="text-qimtek-text-secondary">
                We take security seriously. All webhooks are generated with high-entropy tokens.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="p-2 bg-qimtek-bg-surface rounded-lg border border-qimtek-border shrink-0">
                    <Lock className="w-5 h-5 text-[#82c91e]" />
                  </div>
                  <div>
                    <h4 className="text-qimtek-text font-semibold mb-1">Multi-Factor Authentication (MFA)</h4>
                    <p className="text-xs text-qimtek-text-secondary">
                      Protect your account with TOTP-based 2FA (Google Authenticator, Authy, etc.). Enable this in your account dashboard.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="p-2 bg-qimtek-bg-surface rounded-lg border border-qimtek-border shrink-0">
                    <Shield className="w-5 h-5 text-[#82c91e]" />
                  </div>
                  <div>
                    <h4 className="text-qimtek-text font-semibold mb-1">Endpoint Protection</h4>
                    <p className="text-xs text-qimtek-text-secondary">
                      Webhook ingestion endpoints validate token existence and expiration. Inactive or expired tokens return 404/410 errors instantly.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Admin Features */}
            <section id="admin" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Server className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-qimtek-text">Admin Features</h2>
              </div>
              <p className="text-qimtek-text-secondary">
                Administrators have access to a dedicated dashboard for system management.
              </p>

              <ul className="space-y-3 list-disc list-inside text-qimtek-text-secondary ml-2">
                <li><strong className="text-qimtek-text">User Management:</strong> View, create, and delete users.</li>
                <li><strong className="text-qimtek-text">Plan Configuration:</strong> Dynamically adjust limits (max webhooks, expiration time) for each user tier.</li>
                <li><strong className="text-qimtek-text">System Stats:</strong> Monitor active webhooks and total requests.</li>
                <li><strong className="text-qimtek-text">Manual User Creation:</strong> Create new accounts directly from the admin panel without public registration.</li>
              </ul>
            </section>

            {/* API Reference */}
            <section id="api" className="scroll-mt-24 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  <Code className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-qimtek-text">API Reference</h2>
              </div>
              <p className="text-qimtek-text-secondary">
                The QimteK Webhook backend is accessible via a REST API.
              </p>

              <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-qimtek-border bg-qimtek-bg-secondary/30">
                  <h4 className="font-semibold text-qimtek-text">Key Endpoints</h4>
                </div>
                <div className="divide-y divide-qimtek-border">
                  <div className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-900/50 text-green-400 border border-green-700/50 w-fit">POST</span>
                    <code className="text-sm text-qimtek-text flex-1">/api/webhook/generate</code>
                    <span className="text-xs text-qimtek-text-secondary">Create a new webhook</span>
                  </div>
                  <div className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-blue-900/50 text-blue-400 border border-blue-700/50 w-fit">GET</span>
                    <code className="text-sm text-qimtek-text flex-1">/api/webhooks</code>
                    <span className="text-xs text-qimtek-text-secondary">List user webhooks</span>
                  </div>
                  <div className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-red-900/50 text-red-400 border border-red-700/50 w-fit">DELETE</span>
                    <code className="text-sm text-qimtek-text flex-1">/api/webhook/:token</code>
                    <span className="text-xs text-qimtek-text-secondary">Delete a webhook</span>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
