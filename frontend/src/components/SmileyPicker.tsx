import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SMILEY_CATEGORIES, SmileyItem } from '../utils/emoticons';
import { Search, X, Sparkles } from 'lucide-react';

interface SmileyPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
}

export const SmileyPicker: React.FC<SmileyPickerProps> = ({
  onSelect,
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<string>(SMILEY_CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (onClose) onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Filtered smileys based on search
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;

    const results: SmileyItem[] = [];
    const seen = new Set<string>();

    for (const category of SMILEY_CATEGORIES) {
      for (const item of category.items) {
        if (seen.has(item.emoji)) continue;

        const matchesName = item.name.toLowerCase().includes(query);
        const matchesKeyword = item.keywords.some((kw) => kw.toLowerCase().includes(query));

        if (matchesName || matchesKeyword) {
          results.push(item);
          seen.add(item.emoji);
        }
      }
    }
    return results;
  }, [searchQuery]);

  const currentCategory = SMILEY_CATEGORIES.find((c) => c.id === activeTab) || SMILEY_CATEGORIES[0];

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col w-72 sm:w-80 h-84 sm:h-96 animate-in fade-in zoom-in-95 duration-150 z-50 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Search */}
      <div className="p-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
        <div className="flex-1 relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un smiley..."
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Tabs (shown when not searching) */}
      {!searchResults && (
        <div className="flex items-center px-2 py-1.5 bg-slate-100/60 border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none">
          {SMILEY_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'
                }`}
                title={cat.label}
              >
                <span>{cat.icon}</span>
                <span className="hidden sm:inline text-[11px]">{cat.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Smileys Grid */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {searchResults ? (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 px-1 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Résultats de recherche ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Aucun smiley trouvé pour "{searchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {searchResults.map((item, idx) => (
                  <button
                    key={`${item.emoji}-${idx}`}
                    type="button"
                    onClick={() => onSelect(item.emoji)}
                    className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-indigo-50 hover:scale-115 active:scale-95 transition-all duration-75 cursor-pointer select-none"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 px-1 mb-1.5">
              {currentCategory.label}
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
              {currentCategory.items.map((item, idx) => (
                <button
                  key={`${item.emoji}-${idx}`}
                  type="button"
                  onClick={() => onSelect(item.emoji)}
                  className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-indigo-50 hover:scale-115 active:scale-95 transition-all duration-75 cursor-pointer select-none"
                  title={item.name}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick bar / footer */}
      <div className="px-2.5 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Raccourcis : :) ;) :D &lt;3 :dice:</span>
        <span className="text-slate-400">JdRoll Chat</span>
      </div>
    </div>
  );
};
