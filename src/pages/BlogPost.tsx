import React, { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, User, Clock, ArrowLeft, Share2, Tag } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { blogPosts } from '@/data/posts';
import { cn } from '@/lib/utils';
import AdBanner2 from '@/components/AdBanner2';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find(p => p.slug === slug);

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return blogPosts
      .filter(p => p.category === post.category && p.slug !== post.slug)
      .slice(0, 3);
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "image": "https://qimhook.pages.dev/og-image.png",
    "datePublished": post.date,
    "author": {
      "@type": "Person",
      "name": post.author,
      "url": "https://qimhook.pages.dev/about"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Qimhook",
      "logo": {
        "@type": "ImageObject",
        "url": "https://qimhook.pages.dev/logo.png"
      }
    }
  };

  return (
    <div className="min-h-screen bg-qimtek-bg flex flex-col font-sans">
      <SEO
        title={post.title}
        description={post.excerpt}
        type="article"
        canonical={`https://qimhook.pages.dev/blog/${post.slug}`}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-qimtek-text-secondary hover:text-[#82c91e] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <article>
          <header className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <span className="px-3 py-1 rounded-full bg-qimtek-bg-secondary text-xs font-medium text-[#82c91e] border border-qimtek-border">
                {post.category}
              </span>
              <span className="text-qimtek-text-tertiary text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" /> {post.readTime} min read
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-qimtek-text mb-6 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center justify-between border-b border-qimtek-border pb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#82c91e] to-blue-500 flex items-center justify-center text-black font-bold text-sm">
                  {post.author.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-qimtek-text">{post.author}</div>
                  <div className="text-xs text-qimtek-text-secondary flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigator.share?.({ title: post.title, url: window.location.href })}
                className="p-2 rounded-full hover:bg-qimtek-bg-secondary text-qimtek-text-secondary hover:text-[#82c91e] transition-colors"
                aria-label="Share this article"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div
            className="prose prose-invert prose-qimtek max-w-none mb-16"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Author Bio Section (E-A-T) */}
          <div className="bg-qimtek-bg-surface border border-qimtek-border rounded-2xl p-8 mb-16">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#82c91e] to-blue-500 flex items-center justify-center text-black font-bold text-3xl flex-shrink-0">
                {post.author.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-qimtek-text mb-2">About {post.author}</h3>
                <p className="text-qimtek-text-secondary leading-relaxed">
                  {post.author} is a Senior Developer Advocate at Qimhook, specializing in {post.category.toLowerCase()} and API infrastructure.
                  With over 10 years of experience in distributed systems, they are passionate about helping developers build reliable webhook integrations.
                </p>
              </div>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section className="border-t border-qimtek-border pt-12">
              <h2 className="text-2xl font-bold text-qimtek-text mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((related, index) => (
                  <div key={related.slug} className="contents">
                    <div>
                      <Link
                        to={`/blog/${related.slug}`}
                        className="group bg-qimtek-bg-surface rounded-xl border border-qimtek-border p-5 hover:border-[#82c91e]/50 hover:shadow-lg transition-all block h-full"
                      >
                        <div className="text-xs text-[#82c91e] mb-2">{related.category}</div>
                        <h3 className="font-bold text-qimtek-text mb-2 group-hover:text-[#82c91e] transition-colors line-clamp-2">
                          {related.title}
                        </h3>
                        <div className="text-xs text-qimtek-text-tertiary">
                          {new Date(related.date).toLocaleDateString()}
                        </div>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
}
