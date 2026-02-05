import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import Logo from '@/components/Logo';
import { Mail, MessageSquare, MapPin, Send } from 'lucide-react';
import Header from '@/components/Header';
import AdBanner from '@/components/AdBanner';

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-qimtek-bg text-qimtek-text font-sans flex flex-col">
      <SEO
        title="Contact Us"
        name="Qimhook"
        description="Get in touch with the Qimhook team. We are here to help with support, inquiries, and feedback."
        canonical="https://qimhook.pages.dev/contact"
      />

      <Header />

      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-qimtek-text tracking-tight mb-6">
              Contact <span className="text-[#82c91e]">Us</span>
            </h1>
            <p className="text-xl text-qimtek-text-secondary max-w-2xl mx-auto leading-relaxed">
              Have questions, feedback, or need support? We'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl p-8 h-full">
                <h2 className="text-2xl font-bold text-qimtek-text mb-6">Get in Touch</h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-[#82c91e]/10 mt-1">
                      <Mail className="w-5 h-5 text-[#82c91e]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-qimtek-text mb-1">Email Us</h3>
                      <p className="text-qimtek-text-secondary mb-2">For general inquiries and support:</p>
                      <a href="mailto:support@qimhook.pages.dev" className="text-[#82c91e] hover:underline font-medium">
                        support@qimhook.pages.dev
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-[#82c91e]/10 mt-1">
                      <MessageSquare className="w-5 h-5 text-[#82c91e]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-qimtek-text mb-1">Social</h3>
                      <p className="text-qimtek-text-secondary mb-2">Follow us for updates:</p>
                      <a href="https://github.com/qimhook" target="_blank" rel="noopener noreferrer" className="text-[#82c91e] hover:underline font-medium block">
                        GitHub
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form (Visual Only for now, acts as a redirect to mailto) */}
            <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl p-8">
              <h2 className="text-2xl font-bold text-qimtek-text mb-6">Send a Message</h2>
              <form
                action="mailto:support@qimhook.pages.dev"
                method="post"
                encType="text/plain"
                className="space-y-4"
              >
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-qimtek-text-secondary mb-1">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-2 rounded-lg bg-qimtek-bg border border-qimtek-border text-qimtek-text focus:outline-none focus:border-[#82c91e] focus:ring-1 focus:ring-[#82c91e] transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-qimtek-text-secondary mb-1">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-2 rounded-lg bg-qimtek-bg border border-qimtek-border text-qimtek-text focus:outline-none focus:border-[#82c91e] focus:ring-1 focus:ring-[#82c91e] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-qimtek-text-secondary mb-1">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-qimtek-bg border border-qimtek-border text-qimtek-text focus:outline-none focus:border-[#82c91e] focus:ring-1 focus:ring-[#82c91e] transition-colors resize-none"
                    placeholder="How can we help?"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-lg bg-[#82c91e] text-black font-semibold hover:bg-[#82c91e]/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>

        <AdBanner />
      </main>
    </div>
  );
}
