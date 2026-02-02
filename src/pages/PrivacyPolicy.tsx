import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import { Shield, Lock, Eye, Cookie, Server, Mail, ExternalLink } from 'lucide-react';

export default function PrivacyPolicy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-qimtek-bg text-qimtek-text font-sans flex flex-col">
      <SEO
        title="Privacy Policy"
        name="Qimhook"
        description="Privacy Policy for Qimhook. Learn how we collect, use, and protect your data, including our use of Google AdSense and cookies."
        canonical="https://qimhook.pages.dev/privacy-policy"
      />

      {/* Header */}
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
          <div className="space-y-4 mb-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-qimtek-text tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-qimtek-text-secondary text-lg max-w-2xl mx-auto">
              We value your trust and are committed to protecting your personal information.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-qimtek-bg-secondary border border-qimtek-border text-xs text-qimtek-text-tertiary">
              <ClockIcon className="w-3 h-3" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          </div>

          <div className="prose prose-invert prose-qimtek max-w-none space-y-12">
            {/* Introduction */}
            <section className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-[#82c91e]" />
                <h2 className="text-xl font-semibold text-qimtek-text m-0">Introduction</h2>
              </div>
              <p className="text-qimtek-text-secondary leading-relaxed">
                At Qimhook (accessible from https://qimhook.pages.dev/), one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Qimhook and how we use it.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed mt-4">
                If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed mt-4">
                This Privacy Policy applies only to our online activities and is valid for visitors to our website with regards to the information that they shared and/or collect in Qimhook. This policy is not applicable to any information collected offline or via channels other than this website.
              </p>
            </section>

            {/* Consent */}
            <section>
              <h2 className="text-2xl font-bold text-qimtek-text mb-4">Consent</h2>
              <p className="text-qimtek-text-secondary leading-relaxed">
                By using our website, you hereby consent to our Privacy Policy and agree to its terms.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-6 h-6 text-[#82c91e]" />
                <h2 className="text-2xl font-bold text-qimtek-text m-0">Information We Collect</h2>
              </div>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed">
                When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.
              </p>
            </section>

            {/* Log Files */}
            <section>
              <h2 className="text-2xl font-bold text-qimtek-text mb-4">Log Files</h2>
              <p className="text-qimtek-text-secondary leading-relaxed">
                Qimhook follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.
              </p>
            </section>

            {/* Cookies and Web Beacons */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Cookie className="w-6 h-6 text-[#82c91e]" />
                <h2 className="text-2xl font-bold text-qimtek-text m-0">Cookies and Web Beacons</h2>
              </div>
              <p className="text-qimtek-text-secondary leading-relaxed">
                Like any other website, Qimhook uses "cookies". These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
              </p>
            </section>

            {/* Google DoubleClick DART Cookie */}
            <section className="bg-qimtek-bg-surface border border-qimtek-border rounded-xl p-6 sm:p-8 border-l-4 border-l-[#82c91e]">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-[#82c91e]" />
                <h2 className="text-xl font-semibold text-qimtek-text m-0">Google DoubleClick DART Cookie</h2>
              </div>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to www.website.com and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL –{" "}
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#82c91e] hover:underline inline-flex items-center gap-1"
                >
                  https://policies.google.com/technologies/ads
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed">
                Some of advertisers on our site may use cookies and web beacons. Our advertising partners are listed below. Each of our advertising partners has their own Privacy Policy for their policies on user data. For easier access, we hyperlinked to their Privacy Policies below.
              </p>
              <ul className="list-disc list-inside mt-4 text-qimtek-text-secondary">
                <li>
                  <span className="font-medium text-qimtek-text">Google</span>:{" "}
                  <a
                    href="https://policies.google.com/technologies/ads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#82c91e] hover:underline"
                  >
                    https://policies.google.com/technologies/ads
                  </a>
                </li>
              </ul>
            </section>

            {/* Advertising Partners Privacy Policies */}
            <section>
              <h2 className="text-2xl font-bold text-qimtek-text mb-4">Advertising Partners Privacy Policies</h2>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                You may consult this list to find the Privacy Policy for each of the advertising partners of Qimhook.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on Qimhook, which are sent directly to users' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed">
                Note that Qimhook has no access to or control over these cookies that are used by third-party advertisers.
              </p>
            </section>

            {/* Third Party Privacy Policies */}
            <section>
              <h2 className="text-2xl font-bold text-qimtek-text mb-4">Third Party Privacy Policies</h2>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                Qimhook's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed">
                You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers' respective websites.
              </p>
            </section>

            {/* CCPA Privacy Rights */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-[#82c91e]" />
                <h2 className="text-2xl font-bold text-qimtek-text m-0">CCPA Privacy Rights (Do Not Sell My Personal Information)</h2>
              </div>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                Under the CCPA, among other rights, California consumers have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-qimtek-text-secondary mb-4">
                <li>Request that a business that collects a consumer's personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.</li>
                <li>Request that a business delete any personal data about the consumer that a business has collected.</li>
                <li>Request that a business that sells a consumer's personal data, not sell the consumer's personal data.</li>
              </ul>
              <p className="text-qimtek-text-secondary leading-relaxed">
                If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.
              </p>
            </section>

            {/* GDPR Data Protection Rights */}
            <section>
              <h2 className="text-2xl font-bold text-qimtek-text mb-4">GDPR Data Protection Rights</h2>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:
              </p>
              <ul className="list-disc list-inside space-y-2 text-qimtek-text-secondary mb-4">
                <li><span className="font-medium text-qimtek-text">The right to access</span> – You have the right to request copies of your personal data. We may charge you a small fee for this service.</li>
                <li><span className="font-medium text-qimtek-text">The right to rectification</span> – You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.</li>
                <li><span className="font-medium text-qimtek-text">The right to erasure</span> – You have the right to request that we erase your personal data, under certain conditions.</li>
                <li><span className="font-medium text-qimtek-text">The right to restrict processing</span> – You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
                <li><span className="font-medium text-qimtek-text">The right to object to processing</span> – You have the right to object to our processing of your personal data, under certain conditions.</li>
                <li><span className="font-medium text-qimtek-text">The right to data portability</span> – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
              </ul>
              <p className="text-qimtek-text-secondary leading-relaxed">
                If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.
              </p>
            </section>

            {/* Children's Information */}
            <section>
              <h2 className="text-2xl font-bold text-qimtek-text mb-4">Children's Information</h2>
              <p className="text-qimtek-text-secondary leading-relaxed mb-4">
                Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.
              </p>
              <p className="text-qimtek-text-secondary leading-relaxed">
                Qimhook does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
