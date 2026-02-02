import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import Logo from '@/components/Logo';
import { AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';

export default function Disclaimer() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-qimtek-bg text-qimtek-text font-sans flex flex-col">
      <SEO
        title="Disclaimer"
        name="Qimhook"
        description="Disclaimer for Qimhook. Understanding the limitations and terms of use for our webhook inspection tools."
        canonical="https://qimhook.pages.dev/disclaimer"
      />

      <Header />

      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-4 mb-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-qimtek-text tracking-tight">
              Disclaimer
            </h1>
            <p className="text-qimtek-text-secondary text-lg max-w-2xl mx-auto">
              Please read this disclaimer carefully before using Qimhook.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-qimtek-bg-secondary border border-qimtek-border text-xs text-qimtek-text-tertiary">
              <FileText className="w-3 h-3" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          </div>

          <div className="prose prose-invert prose-qimtek max-w-none space-y-12">
            {/* General Disclaimer */}
            <section className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-[#82c91e]" />
                <h2 className="text-xl font-semibold text-qimtek-text m-0">General Disclaimer</h2>
              </div>
              <p className="text-qimtek-text-secondary leading-relaxed">
                The information provided by Qimhook ("we," "us," or "our") on https://qimhook.pages.dev (the "Site") is for general informational and educational purposes only. All information on the Site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed mt-4 font-semibold">
                Under no circumstance shall we have any liability to you for any loss or damage of any kind incurred as a result of the use of the site or reliance on any information provided on the site. Your use of the site and your reliance on any information on the site is solely at your own risk.
              </p>
            </section>

            {/* Professional Advice */}
            <section>
              <h2 className="text-2xl font-bold text-qimtek-text mb-4">Professional Advice Disclaimer</h2>
              <p className="text-qimtek-text-secondary leading-relaxed">
                The Site cannot and does not contain legal, financial, or technical advice. The information is provided for general informational and educational purposes only and is not a substitute for professional advice. Accordingly, before taking any actions based upon such information, we encourage you to consult with the appropriate professionals. We do not provide any kind of specific legal or technical advice.
              </p>
            </section>

            {/* External Links */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-[#82c91e]" />
                <h2 className="text-2xl font-bold text-qimtek-text m-0">External Links Disclaimer</h2>
              </div>
              <p className="text-qimtek-text-secondary leading-relaxed">
                The Site may contain (or you may be sent through the Site) links to other websites or content belonging to or originating from third parties or links to websites and features in banners or other advertising. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed mt-4">
                We do not warrant, endorse, guarantee, or assume responsibility for the accuracy or reliability of any information offered by third-party websites linked through the site or any website or feature linked in any banner or other advertising. We will not be a party to or in any way be responsible for monitoring any transaction between you and third-party providers of products or services.
              </p>
            </section>

            {/* Testimonials */}
            <section>
              <h2 className="text-2xl font-bold text-qimtek-text mb-4">Testimonials Disclaimer</h2>
              <p className="text-qimtek-text-secondary leading-relaxed">
                The Site may contain testimonials by users of our products and/or services. These testimonials reflect the real-life experiences and opinions of such users. However, the experiences are personal to those particular users, and may not necessarily be representative of all users of our products and/or services. We do not claim, and you should not assume, that all users will have the same experiences. Your individual results may vary.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
