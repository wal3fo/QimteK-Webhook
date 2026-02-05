import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import { Users, Target, Shield, Globe, Award, Heart } from 'lucide-react';
import Logo from '@/components/Logo';
import AdBanner from '@/components/AdBanner';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-qimtek-bg text-qimtek-text font-sans flex flex-col">
      <SEO
        title="About Us"
        name="Qimhook"
        description="Learn about Qimhook's mission to simplify webhook debugging for developers worldwide. Secure, fast, and developer-focused."
        canonical="https://qimhook.pages.dev/about"
      />

      <header className="border-b border-qimtek-border bg-qimtek-bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo size="lg" className="group-hover:opacity-90 transition-opacity" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm font-medium text-qimtek-text-secondary hover:text-qimtek-text transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-qimtek-text tracking-tight mb-6">
              About <span className="text-[#82c91e]">Qimhook</span>
            </h1>
            <p className="text-xl text-qimtek-text-secondary max-w-2xl mx-auto leading-relaxed">
              We are building the most reliable and accessible webhook inspection tools for the modern developer ecosystem.
            </p>
          </div>

          <div className="space-y-16">
            {/* Mission Section */}
            <section className="bg-qimtek-bg-surface border border-qimtek-border rounded-2xl p-8 sm:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Target className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-[#82c91e]/10">
                    <Target className="w-6 h-6 text-[#82c91e]" />
                  </div>
                  <h2 className="text-2xl font-bold text-qimtek-text m-0">Our Mission</h2>
                </div>
                <p className="text-qimtek-text-secondary text-lg leading-relaxed">
                  Our mission is to empower developers by removing the friction from webhook integration and debugging. We believe that critical infrastructure tools should be fast, secure, and accessible to everyone—from solo developers to enterprise teams.
                </p>
              </div>
            </section>

            {/* Who We Are */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl p-6 hover:border-[#82c91e]/30 transition-colors">
                <Users className="w-8 h-8 text-[#82c91e] mb-4" />
                <h3 className="text-xl font-bold text-qimtek-text mb-3">Who We Are</h3>
                <p className="text-qimtek-text-secondary leading-relaxed">
                  Qimhook is operated by a dedicated team of engineers and developer experience experts. We understand the pain points of API integrations because we've lived them.
                </p>
              </div>
              <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl p-6 hover:border-[#82c91e]/30 transition-colors">
                <Shield className="w-8 h-8 text-[#82c91e] mb-4" />
                <h3 className="text-xl font-bold text-qimtek-text mb-3">Privacy First</h3>
                <p className="text-qimtek-text-secondary leading-relaxed">
                  We prioritize data privacy and security. Qimhook is designed to be a transparent tool that respects user data and adheres to strict privacy standards.
                </p>
              </div>
            </div>

            {/* Values */}
            <section>
              <h2 className="text-3xl font-bold text-qimtek-text text-center mb-10">Our Core Values</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center p-6 rounded-xl bg-qimtek-bg-surface border border-qimtek-border">
                  <Globe className="w-10 h-10 text-[#82c91e] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-qimtek-text mb-2">Accessibility</h3>
                  <p className="text-sm text-qimtek-text-secondary">Tools available for everyone, everywhere.</p>
                </div>
                <div className="text-center p-6 rounded-xl bg-qimtek-bg-surface border border-qimtek-border">
                  <Award className="w-10 h-10 text-[#82c91e] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-qimtek-text mb-2">Excellence</h3>
                  <p className="text-sm text-qimtek-text-secondary">High-performance infrastructure you can trust.</p>
                </div>
                <div className="text-center p-6 rounded-xl bg-qimtek-bg-surface border border-qimtek-border">
                  <Heart className="w-10 h-10 text-[#82c91e] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-qimtek-text mb-2">Community</h3>
                  <p className="text-sm text-qimtek-text-secondary">Built with and for the developer community.</p>
                </div>
              </div>
            </section>

            <AdBanner />
          </div>
        </div>
      </main>
    </div>
  );
}
