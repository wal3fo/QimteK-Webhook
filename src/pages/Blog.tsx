import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, User, Clock, Tag, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { blogPosts } from '@/data/posts';
import { cn } from '@/lib/utils';
import AdBanner2, { AdBanner } from '@/components/AdBanner2';
import AdBanner3 from '@/components/AdBanner3';

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(blogPosts.map(post => post.category));
    return Array.from(cats);
  }, []);

  const filteredPosts = useMemo(() => {
    return blogPosts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? post.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-qimtek-bg flex flex-col font-sans">
      <SEO
        title="Blog & Tutorials - Qimhook"
        description="Learn about webhooks, API integration, and automation with our in-depth guides and tutorials."
        canonical="https://qimhook.pages.dev/blog"
      />

      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-qimtek-text mb-6">
            Developer Resources
          </h1>
          <p className="text-xl text-qimtek-text-secondary max-w-2xl mx-auto">
            Deep dives into webhooks, API patterns, and engineering best practices.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 justify-center items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-qimtek-text-tertiary" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-qimtek-bg-surface border border-qimtek-border rounded-xl text-qimtek-text focus:ring-2 focus:ring-[#82c91e]/50 focus:border-[#82c91e] transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === null
                  ? "bg-[#82c91e] text-black"
                  : "bg-qimtek-bg-surface text-qimtek-text-secondary hover:bg-qimtek-bg-secondary border border-qimtek-border"
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  selectedCategory === cat
                    ? "bg-[#82c91e] text-black"
                    : "bg-qimtek-bg-surface text-qimtek-text-secondary hover:bg-qimtek-bg-secondary border border-qimtek-border"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <div key={post.slug} className="contents">
              <Link
                to={`/blog/${post.slug}`}
                className="group flex flex-col bg-qimtek-bg-surface rounded-2xl border border-qimtek-border overflow-hidden hover:border-[#82c91e]/50 hover:shadow-lg transition-all h-full"
              >
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-qimtek-bg-secondary text-xs font-medium text-[#82c91e] border border-qimtek-border">
                      {post.category}
                    </span>
                    <span className="text-xs text-qimtek-text-tertiary flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime} min read
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-qimtek-text mb-3 group-hover:text-[#82c91e] transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  <p className="text-qimtek-text-secondary text-sm leading-relaxed mb-6 line-clamp-3 flex-grow">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-qimtek-border mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#82c91e] to-blue-500 flex items-center justify-center text-black font-bold text-xs">
                        {post.author.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-qimtek-text">{post.author}</span>
                        <span className="text-[10px] text-qimtek-text-tertiary">{post.date}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-qimtek-text-tertiary group-hover:text-[#82c91e] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
              {(index + 1) % 3 === 0 && (
                <div className="group flex flex-col bg-qimtek-bg-surface rounded-2xl border border-qimtek-border overflow-hidden hover:border-[#82c91e]/50 hover:shadow-lg transition-all h-full">
                  <AdBanner3 />
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-qimtek-text-secondary text-lg">No posts found matching your criteria.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="mt-4 text-[#82c91e] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
