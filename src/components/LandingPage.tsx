import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Lock, Globe, Check, Code, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#82c91e]/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#82c91e]/10 text-[#82c91e] text-sm font-medium mb-8 border border-[#82c91e]/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#82c91e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#82c91e]"></span>
            </span>
            Now with Advanced Webhook Inspection
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-qimtek-text tracking-tight mb-8 leading-tight">
            The Ultimate Tool for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#82c91e] to-[#6ba017]">
              Webhook Debugging
            </span>
          </h1>
          
          <p className="text-xl text-qimtek-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed">
            Capture, inspect, and replay HTTP requests in real-time. 
            Designed for developers who need to debug webhooks, APIs, and third-party integrations instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/login" 
              className="px-8 py-4 bg-[#82c91e] text-black rounded-xl font-bold text-lg hover:bg-[#6ba017] transition-all hover:scale-105 shadow-lg shadow-[#82c91e]/20 flex items-center gap-2"
            >
              Get Started for Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/docs" 
              className="px-8 py-4 bg-qimtek-bg-secondary text-qimtek-text rounded-xl font-semibold hover:bg-qimtek-bg-surface border border-qimtek-border transition-all flex items-center gap-2"
            >
              Read Documentation <Code className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-qimtek-bg-surface border-y border-qimtek-border relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-qimtek-text mb-4">Why Developers Choose Qimhook</h2>
            <p className="text-qimtek-text-secondary">Everything you need to debug webhooks effectively.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-[#82c91e]" />}
              title="Real-time Capture"
              description="See requests appear instantly as they hit your endpoint. No page refreshes required."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-[#82c91e]" />}
              title="Secure & Private"
              description="Your data is encrypted. We support IP whitelisting and signature verification."
            />
            <FeatureCard 
              icon={<Globe className="w-6 h-6 text-[#82c91e]" />}
              title="Global Availability"
              description="Endpoints are deployed on Cloudflare's global edge network for low latency."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-qimtek-text mb-6">How It Works</h2>
              <div className="space-y-8">
                <Step 
                  number="1"
                  title="Generate a URL"
                  description="Click one button to create a unique, secure webhook URL."
                />
                <Step 
                  number="2"
                  title="Send Requests"
                  description="Configure your third-party service (Stripe, GitHub, etc.) to send webhooks to this URL."
                />
                <Step 
                  number="3"
                  title="Inspect Data"
                  description="View headers, body, and query parameters in a clean, readable format."
                />
              </div>
            </div>
            <div className="bg-qimtek-bg-surface p-8 rounded-2xl border border-qimtek-border shadow-2xl">
              <div className="font-mono text-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-qimtek-border pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-qimtek-text-secondary">POST /webhook/xyz-123</span>
                </div>
                <div className="space-y-2 text-qimtek-text-secondary">
                  <p><span className="text-blue-400">Content-Type:</span> application/json</p>
                  <p><span className="text-blue-400">User-Agent:</span> Stripe/1.0</p>
                  <div className="mt-4 p-4 bg-black/30 rounded border border-qimtek-border text-green-400">
                    {`{
  "id": "evt_123456789",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "amount": 2000,
    "currency": "usd"
  }
}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-qimtek-bg border border-qimtek-border hover:border-[#82c91e]/50 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-[#82c91e]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-qimtek-text mb-3">{title}</h3>
      <p className="text-qimtek-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-full bg-[#82c91e] flex items-center justify-center text-black font-bold flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-bold text-qimtek-text mb-2">{title}</h3>
        <p className="text-qimtek-text-secondary">{description}</p>
      </div>
    </div>
  );
}
