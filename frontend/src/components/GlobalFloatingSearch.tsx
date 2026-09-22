import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {campaignsApi} from '../api/campaigns';
import {useAuth} from '../contexts/AuthContext';
import {CampaignSummary} from '../types/campaign';
import {compareCampaignsForMyCampaigns} from '../utils/campaign-helpers';
import {
  AlertCircle,
  Archive,
  BookOpen,
  ChevronRight,
  Compass,
  Crown,
  Eye,
  Layers,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Search,
  StickyNote,
  X,
} from 'lucide-react';

export interface GlobalFloatingSearchProps {
  activeTab?: 'my-campaigns' | 'join-campaign' | 'chat' | 'messages' | 'general-forum' | 'notes' | 'none';
}

 type FlattenedSearchResult = {
  type: 'campaign';
  id: number;
  title: string;
  subtitle?: string;
  url: string;
  avatar?: string | null;
  image?: string | null;
  isPrivate?: boolean;
  badge?: string;
  role?: 'mj' | 'player' | 'observer';
  hasAlert?: boolean;
  hasUnread?: boolean;
  isArchived?: boolean;
};

// Icônes et labels pour les menus principaux
const mainMenuItems = [
  { 
    key: 'my-campaigns', 
    label: 'Mes campagnes', 
    path: '/my-campaigns', 
    icon: Layers,
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
    borderColor: 'border-blue-600',
    hoverBg: 'hover:bg-blue-50',
    hoverText: 'hover:text-blue-600',
    hoverBorder: 'hover:border-blue-200',
  },
  { 
    key: 'notes', 
    label: 'Note', 
    path: '/campaigns/0/notes', 
    icon: StickyNote,
    bgColor: 'bg-amber-600',
    textColor: 'text-white',
    borderColor: 'border-amber-600',
    hoverBg: 'hover:bg-amber-50',
    hoverText: 'hover:text-amber-600',
    hoverBorder: 'hover:border-amber-200',
  },
  { 
    key: 'chat', 
    label: 'Tchat', 
    path: '/chat', 
    icon: MessageCircle,
    bgColor: 'bg-purple-600',
    textColor: 'text-white',
    borderColor: 'border-purple-600',
    hoverBg: 'hover:bg-purple-50',
    hoverText: 'hover:text-purple-600',
    hoverBorder: 'hover:border-purple-200',
  },
  { 
    key: 'messages', 
    label: 'Messagerie', 
    path: '/messages', 
    icon: Mail,
    bgColor: 'bg-rose-600',
    textColor: 'text-white',
    borderColor: 'border-rose-600',
    hoverBg: 'hover:bg-rose-50',
    hoverText: 'hover:text-rose-600',
    hoverBorder: 'hover:border-rose-200',
  },
  { 
    key: 'general-forum', 
    label: 'Forum', 
    path: '/general-forum', 
    icon: MessageSquare,
    bgColor: 'bg-teal-600',
    textColor: 'text-white',
    borderColor: 'border-teal-600',
    hoverBg: 'hover:bg-teal-50',
    hoverText: 'hover:text-teal-600',
    hoverBorder: 'hover:border-teal-200',
  },
];

export const GlobalFloatingSearch: React.FC<GlobalFloatingSearchProps> = ({
  activeTab = 'none',
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [myCampaigns, setMyCampaigns] = useState<CampaignSummary[]>([]);
  const [isMyCampaignsLoading, setIsMyCampaignsLoading] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  const fetchMyCampaigns = async () => {
    if (!isAuthenticated) return;
    setIsMyCampaignsLoading(true);
    try {
      const data = await campaignsApi.getMyCampaigns('all', true);
      setMyCampaigns(data);
    } catch (err) {
      console.error('Erreur lors de la récupération des campagnes de l\'utilisateur:', err);
    } finally {
      setIsMyCampaignsLoading(false);
    }
  };

  const filteredCampaigns = useMemo(() => {
    if (!myCampaigns.length) return [];
    let result = myCampaigns;
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = myCampaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.systeme && c.systeme.toLowerCase().includes(q)) ||
          (c.univers && c.univers.toLowerCase().includes(q)) ||
          (c.mjUsername && c.mjUsername.toLowerCase().includes(q)) ||
          (c.characterName && c.characterName.toLowerCase().includes(q))
      );
    }
    return [...result].sort(compareCampaignsForMyCampaigns);
  }, [myCampaigns, query]);

  // Flattened items for easy keyboard navigation
  const flattenedResults = useMemo<FlattenedSearchResult[]>(() => {
    const list: FlattenedSearchResult[] = [];

    filteredCampaigns.forEach((c) => {
      let role: 'mj' | 'player' | 'observer' = 'player';
      let roleLabel = 'Joueur';
      if (user && user.id === c.mjId) {
        role = 'mj';
        roleLabel = 'MJ';
      } else if (c.userRole === 'observer' || c.isObserving) {
        role = 'observer';
        roleLabel = 'Observateur';
      } else if (c.userRole === 'player' || c.characterName) {
        role = 'player';
        roleLabel = 'Joueur';
      }

      const subtitleParts: string[] = [];
      if (c.characterName) {
        subtitleParts.push(`Perso : ${c.characterName}`);
      } else if (user && user.id !== c.mjId && c.mjUsername) {
        subtitleParts.push(`MJ : ${c.mjUsername}`);
      }
      if (c.systeme) subtitleParts.push(c.systeme);
      if (c.univers) subtitleParts.push(c.univers);

      list.push({
        type: 'campaign',
        id: c.id,
        title: c.name,
        subtitle: subtitleParts.length > 0 ? subtitleParts.join(' • ') : undefined,
        url: `/forum/${c.id}`,
        image: c.banniere || c.banniereForum || null,
        badge: roleLabel,
        role,
        hasAlert: c.hasAlert,
        hasUnread: c.hasUnread,
        isArchived: Boolean(c.isArchived || c.statut === 2),
      });
    });

    return list;
  }, [filteredCampaigns, user]);

  // Handle Ctrl+Space shortcut to toggle modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Space or Cmd+Space
      if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  // Handle mobile swipe gesture to open/close search modal
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTouchActive = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      isTouchActive = true;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTouchActive || e.changedTouches.length !== 1) return;
      isTouchActive = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const duration = Date.now() - touchStartTime;

      const target = e.target as HTMLElement | null;

      // Ignore interactive form controls or editors when closed to avoid interfering with user input
      if (!isOpen && target) {
        const isInteractive = target.closest(
          'input, textarea, select, button, a, [contenteditable="true"], .ql-editor, .leaflet-container, .no-swipe'
        );
        if (isInteractive) {
          return;
        }
      }

      // Horizontal swipe detection:
      // - Minimum distance: 50px
      // - Horizontal movement dominant over vertical movement (ratio > 1.4) to avoid triggering during vertical scroll
      // - Quick gesture duration (<= 600ms)
      const isHorizontalSwipe =
        Math.abs(deltaX) >= 50 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.4 &&
        duration <= 600;

      if (isHorizontalSwipe) {
        if (!isOpen) {
          setIsOpen(true);
        }
      } else if (isOpen) {
        // Vertical swipe down to close modal when open
        const isSwipeDown =
          deltaY >= 80 &&
          deltaY > Math.abs(deltaX) * 1.4 &&
          duration <= 600;

        if (isSwipeDown) {
          // Only close if scroll position is at the top or swiping header/backdrop
          const isScrollableContent = target?.closest('.overflow-y-auto');
          if (!isScrollableContent || (isScrollableContent && isScrollableContent.scrollTop <= 0)) {
            setIsOpen(false);
          }
        }
      }
    };

    const handleTouchCancel = () => {
      isTouchActive = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isOpen]);

  // Reset & focus search when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      if (isAuthenticated) {
        fetchMyCampaigns();
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isAuthenticated]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      // No need to fetch results for campaign-specific items
      // as we only search in my campaigns
    }, 200);
  };

  const handleNavigate = (url: string) => {
    setIsOpen(false);
    navigate(url);
  };

  const handleNavigateToView = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flattenedResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flattenedResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flattenedResults.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flattenedResults.length) % flattenedResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flattenedResults[selectedIndex]) {
        handleNavigate(flattenedResults[selectedIndex].url);
      }
    }
  };

  // Keep selected item visible in list
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <>
      {/* Indicateur mobile - poignée de tirage pour signaler le panel à tirer */}
      <div className="md:hidden fixed right-2 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="w-1.5 h-12 bg-indigo-500 rounded-full shadow-md" />
      </div>

      {/* Bouton de recherche flottant - Visible uniquement sur desktop */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Recherche & Navigation rapide (Ctrl+Espace)"
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ring-4 ring-indigo-500/20 border border-indigo-400/30"
          aria-label="Rechercher et naviguer rapidement"
        >
          <Search className="w-5 h-5 text-indigo-100 group-hover:text-white transition-colors" />
          <span className="text-sm font-semibold tracking-wide">Recherche</span>
          <kbd className="hidden lg:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-200 bg-indigo-800/60 rounded-full border border-indigo-400/30">
            Ctrl+Espace
          </kbd>
        </button>
      </div>

      {/* Modal / Menu de navigation rapide et recherche */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-3 sm:pt-16 px-2 sm:px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Header: Menus principaux */}
            <div className="p-3.5 bg-slate-50/90 border-b border-slate-200">
              {/* Poignée visuelle pour mobile */}
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2 sm:hidden" />

              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate mr-2">
                  Navigation rapide
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer shrink-0"
                  title="Fermer (Échap)"
                  aria-label="Fermer le menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menus principaux globaux */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {mainMenuItems.map((item) => {
                  const isActive = activeTab === item.key;
                  const Icon = item.icon;
                  
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavigateToView(item.path)}
                      className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                        isActive
                          ? `${item.bgColor} ${item.textColor} ${item.borderColor} shadow-xs`
                          : `bg-white text-slate-700 ${item.hoverBg} ${item.hoverText} ${item.hoverBorder} border-slate-200`
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Champ de recherche */}
            <div className="relative border-b border-slate-200 bg-white">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Rechercher dans mes campagnes..."
                className="w-full pl-12 pr-12 py-3.5 text-base text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Résultats de recherche - uniquement mes campagnes */}
            <div ref={listRef} className="overflow-y-auto max-h-96 p-2 space-y-4">
              {isMyCampaignsLoading && flattenedResults.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span>Chargement des campagnes...</span>
                </div>
              ) : flattenedResults.length === 0 ? (
                <div className="text-center py-10 px-4">
                  {isAuthenticated ? (
                    <>
                      <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Aucune campagne trouvée</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {query.trim()
                          ? `Aucune campagne ne correspond à « ${query} »`
                          : 'Vous n\'avez aucune campagne. Rejoignez-en une pour commencer !'}
                      </p>
                    </>
                  ) : (
                    <>
                      <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Connectez-vous</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Vous devez être connecté pour voir vos campagnes.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Catégorie: Mes Campagnes */}
                  <div>
                    <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-blue-700 uppercase tracking-wider">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Mes campagnes ({filteredCampaigns.length})</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {filteredCampaigns.map((c) => {
                        const itemIndex = flattenedResults.findIndex(
                          (it) => it.type === 'campaign' && it.id === c.id
                        );
                        const isSelected = itemIndex === selectedIndex;
                        const item = flattenedResults[itemIndex];

                        return (
                          <button
                            key={`campaign-${c.id}`}
                            data-index={itemIndex}
                            type="button"
                            onClick={() => handleNavigate(item?.url || `/forum/${c.id}`)}
                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 overflow-hidden border border-blue-200">
                                {c.banniere || c.banniereForum ? (
                                  <img
                                    src={c.banniere || c.banniereForum || ''}
                                    alt={c.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <BookOpen className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-800 truncate">
                                    {c.name}
                                  </span>
                                  {item?.badge && (
                                    <span
                                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                        item.role === 'mj'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : item.role === 'observer'
                                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                      }`}
                                    >
                                      {item.role === 'mj' && <Crown className="w-2.5 h-2.5 mr-0.5" />}
                                      {item.role === 'observer' && <Eye className="w-2.5 h-2.5 mr-0.5" />}
                                      {item.badge}
                                    </span>
                                  )}
                                  {c.hasAlert && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                                      <AlertCircle className="w-2.5 h-2.5" />
                                      À traiter
                                    </span>
                                  )}
                                  {c.hasUnread && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded border border-rose-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                      Non-lus
                                    </span>
                                  )}
                                  {item?.isArchived && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                                      <Archive className="w-2.5 h-2.5" />
                                      Archivée
                                    </span>
                                  )}
                                </div>
                                {item?.subtitle && (
                                  <p className="text-xs text-slate-500 truncate">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-4 h-4 shrink-0 ml-2 transition ${
                                isSelected ? 'text-blue-600 translate-x-0.5' : 'text-slate-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer / Raccourcis clavier & Gestes mobiles */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-xs flex items-center justify-between">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono shadow-2xs">
                    ↑
                  </kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono shadow-2xs">
                    ↓
                  </kbd>
                  <span className="text-[11px]">Naviguer</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono shadow-2xs">
                    ↵
                  </kbd>
                  <span className="text-[11px]">Accéder</span>
                </span>
              </div>
              <div className="sm:hidden flex items-center gap-1 text-[11px] text-slate-400">
                <span>Glisser vers le bas pour fermer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono shadow-2xs">
                    Échap
                  </kbd>
                  <span className="text-[11px]">Fermer</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
