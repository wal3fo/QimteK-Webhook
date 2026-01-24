import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock, Globe, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Webhook } from '@/hooks/useWebhook';

interface WebhookSelectorProps {
  webhooks: Webhook[];
  selectedWebhook: Webhook | null;
  onSelect: (webhook: Webhook) => void;
}

export default function WebhookSelector({ webhooks, selectedWebhook, onSelect }: WebhookSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!webhooks.length) return null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-qimtek-text-secondary mb-2">
        Select Webhook ({webhooks.length} total)
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 bg-qimtek-bg-secondary border rounded-xl text-left transition-all duration-200",
          isOpen
            ? "border-[#82c91e] ring-1 ring-[#82c91e]/50"
            : "border-qimtek-border hover:border-[#82c91e]/50"
        )}
      >
        <div className="flex-1 min-w-0 mr-4">
          {selectedWebhook ? (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-qimtek-text truncate flex items-center gap-2">
                {selectedWebhook.name ? (
                  <>
                    <Tag className="w-3.5 h-3.5 text-[#82c91e]" />
                    {selectedWebhook.name}
                  </>
                ) : (
                  <span className="text-qimtek-text-secondary italic">Unnamed Webhook</span>
                )}
              </span>
              <span className="text-xs text-qimtek-text-secondary font-mono truncate mt-0.5">
                {selectedWebhook.url}
              </span>
            </div>
          ) : (
            <span className="text-qimtek-text-secondary">Select a webhook...</span>
          )}
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-qimtek-text-secondary transition-transform duration-200",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-qimtek-bg-surface border border-qimtek-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto">
          <div className="py-1">
            {webhooks.map((wh) => {
              const isSelected = selectedWebhook?.token === wh.token;
              return (
                <button
                  key={wh.token}
                  onClick={() => {
                    onSelect(wh);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 flex items-start gap-3 text-left transition-colors border-b border-qimtek-border/50 last:border-0",
                    isSelected
                      ? "bg-[#82c91e]/10"
                      : "hover:bg-qimtek-bg-secondary"
                  )}
                >
                  <div className={cn(
                    "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                    isSelected ? "bg-[#82c91e]" : "bg-qimtek-border"
                  )} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={cn(
                        "text-sm font-medium truncate flex items-center gap-2",
                        isSelected ? "text-[#82c91e]" : "text-qimtek-text"
                      )}>
                        {wh.name || <span className="text-qimtek-text-tertiary italic font-normal">Unnamed Webhook</span>}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#82c91e] flex-shrink-0" />}
                    </div>

                    <div className="text-xs text-qimtek-text-secondary font-mono break-all mb-1.5 opacity-80">
                      {wh.url}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-qimtek-text-tertiary uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {wh.expiresAt && new Date(wh.expiresAt).getFullYear() > 2100
                          ? 'Never'
                          : (wh.expiresAt ? format(new Date(wh.expiresAt), 'MMM d, HH:mm') : 'N/A')}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
