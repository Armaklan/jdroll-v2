import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '../api/campaigns';
import { CampaignSummary, CampaignSearchResults } from '../types/campaign';
import {
  Search,
  MessageCircle,
  Users,
  StickyNote,
  Map,
  Dices,
  AlertCircle,
  X,
  Loader2,
  Lock,
  ChevronRight,
} from 'lucide-react';

export interface CampaignFloatingSearchProps {
  campaign: CampaignSummary;
  activeTab?: 'forum' | 'characters' | 'topic' | 'notes' | 'cartes' | 'carte' | 'none';
  onOpenDiceTower?: () => void;
  onToggleAlert?: () => Promise<void> | void;
  hasAlert?: boolean;
  isAlertLoading?: boolean;
}

type FlattenedSearchResult = {
  type: 'topic' | 'carte' | 'character';
  id: number;
  title: string;
  subtitle?: string;
  url: string;
  avatar?: string | null;
  image?: string | null;
  isPrivate?: boolean;
  badge?: string;
};

export const CampaignFloatingSearch: React.FC<CampaignFloatingSearchProps> = ({
  campaign,
  activeTab = 'none',
  onOpenDiceTower,
  onToggleAlert,
  hasAlert = false,
  isAlertLoading = false,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<CampaignSearchResults>({
    topics: [],
    cartes: [],
    characters: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  const isMj = campaign.userRole === 'mj';
  const isPlayer = campaign.userRole === 'player';
  const isCampaignMember = isMj || isPlayer;

  // Flattened items for easy keyboard navigation
  const flattenedResults = useMemo<FlattenedSearchResult[]>(() => {
    const list: FlattenedSearchResult[] = [];

    results.topics.forEach((t) => {
      list.push({
        type: 'topic',
        id: t.id,
        title: t.title,
        subtitle: t.sectionTitle ? `Section : ${t.sectionTitle}` : undefined,
        url: t.url,
        isPrivate: t.isPrivate,
        badge: t.isPrivate ? 'Topic Privé' : 'Topic',
      });
    });

    results.cartes.forEach((c) => {
      list.push({
        type: 'carte',
        id: c.id,
        title: c.name,
        subtitle: c.description || undefined,
        url: c.url,
        image: c.image,
        badge: c.published ? 'Carte' : 'Brouillon MJ',
      });
    });

    results.characters.forEach((p) => {
      list.push({
        type: 'character',
        id: p.id,
        title: p.name,
        subtitle: p.concept ? `${p.concept} • ${p.categoryName}` : p.categoryName,
        url: p.url,
        avatar: p.avatar,
        badge: p.isPlayer ? 'PJ' : 'PNJ',
      });
    });

    return list;
  }, [results]);

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

  // Reset & focus search when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      fetchResults('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const fetchResults = async (searchQuery: string) => {
    if (!campaign.id) return;
    setIsLoading(true);
    try {
      const res = await campaignsApi.searchCampaign(campaign.id, searchQuery);
      setResults(res);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Erreur lors de la recherche dans la campagne:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchResults(val);
    }, 200);
  };

  const handleNavigate = (url: string) => {
    setIsOpen(false);
    navigate(url);
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
      {/* Bouton de recherche flottant - Visible uniquement sur desktop */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Recherche & Navigation rapide (Ctrl+Espace)"
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ring-4 ring-indigo-500/20 border border-indigo-400/30"
          aria-label="Rechercher dans la campagne"
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
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Header: Grands menus de la campagne */}
            <div className="p-3.5 bg-slate-50/90 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Accès rapide • {campaign.name}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  title="Fermer (Échap)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {/* Forum */}
                <button
                  type="button"
                  onClick={() => handleNavigate(`/forum/${campaign.id}`)}
                  className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    activeTab === 'forum'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border-slate-200'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 mb-1" />
                  <span>Forum</span>
                </button>

                {/* Galerie / Personnages */}
                <button
                  type="button"
                  onClick={() => handleNavigate(`/campaigns/${campaign.id}/characters`)}
                  className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    activeTab === 'characters'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 border-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 mb-1" />
                  <span>Galerie</span>
                </button>

                {/* Notes (membres de la campagne uniquement) */}
                {isCampaignMember ? (
                  <button
                    type="button"
                    onClick={() => handleNavigate(`/campaigns/${campaign.id}/notes`)}
                    className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      activeTab === 'notes'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border-slate-200'
                    }`}
                  >
                    <StickyNote className="w-4 h-4 mb-1" />
                    <span>Note</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-100/70 border border-slate-200 cursor-not-allowed">
                    <StickyNote className="w-4 h-4 mb-1 text-slate-400" />
                    <span>Note</span>
                  </div>
                )}

                {/* Cartes */}
                <button
                  type="button"
                  onClick={() => handleNavigate(`/campaigns/${campaign.id}/cartes`)}
                  className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    activeTab === 'cartes' || activeTab === 'carte'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border-slate-200'
                  }`}
                >
                  <Map className="w-4 h-4 mb-1" />
                  <span>Cartes</span>
                </button>

                {/* Tour à dé (membres uniquement) */}
                {isCampaignMember && onOpenDiceTower ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenDiceTower();
                    }}
                    className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 transition cursor-pointer"
                  >
                    <Dices className="w-4 h-4 mb-1 text-indigo-600" />
                    <span>Tour à dé</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-100/70 border border-slate-200 cursor-not-allowed">
                    <Dices className="w-4 h-4 mb-1 text-slate-400" />
                    <span>Tour à dé</span>
                  </div>
                )}

                {/* Mettre à traiter */}
                {isCampaignMember && onToggleAlert ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await onToggleAlert();
                    }}
                    disabled={isAlertLoading}
                    className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      hasAlert
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 border-slate-200'
                    }`}
                  >
                    {isAlertLoading ? (
                      <Loader2 className="w-4 h-4 mb-1 animate-spin" />
                    ) : (
                      <AlertCircle className={`w-4 h-4 mb-1 ${hasAlert ? 'text-white' : 'text-amber-600'}`} />
                    )}
                    <span className="truncate max-w-full text-[11px]">
                      {hasAlert ? 'À traiter' : 'À traiter'}
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-100/70 border border-slate-200 cursor-not-allowed">
                    <AlertCircle className="w-4 h-4 mb-1 text-slate-400" />
                    <span className="truncate max-w-full text-[11px]">À traiter</span>
                  </div>
                )}
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
                placeholder="Rechercher par nom (topic, carte, personnage)..."
                className="w-full pl-12 pr-12 py-3.5 text-base text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    fetchResults('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Résultats de recherche */}
            <div ref={listRef} className="overflow-y-auto max-h-96 p-2 space-y-4">
              {isLoading && flattenedResults.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span>Recherche en cours...</span>
                </div>
              ) : flattenedResults.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Aucun résultat trouvé</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {query.trim()
                      ? `Aucun topic, carte ou personnage ne correspond à « ${query} »`
                      : 'Aucun contenu accessible trouvé dans cette campagne'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Catégorie: Topics */}
                  {results.topics.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Sujets du forum ({results.topics.length})</span>
                      </div>
                      <div className="mt-1 space-y-1">
                        {results.topics.map((topic) => {
                          const itemIndex = flattenedResults.findIndex(
                            (it) => it.type === 'topic' && it.id === topic.id
                          );
                          const isSelected = itemIndex === selectedIndex;
                          return (
                            <button
                              key={`topic-${topic.id}`}
                              data-index={itemIndex}
                              type="button"
                              onClick={() => handleNavigate(topic.url)}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 border border-indigo-200'
                                  : 'hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    topic.isPrivate
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-indigo-100 text-indigo-600'
                                  }`}
                                >
                                  {topic.isPrivate ? (
                                    <Lock className="w-4 h-4" />
                                  ) : (
                                    <MessageCircle className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-800 truncate">
                                      {topic.title}
                                    </span>
                                    {topic.isPrivate && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                                        Privé
                                      </span>
                                    )}
                                  </div>
                                  {topic.sectionTitle && (
                                    <p className="text-xs text-slate-500 truncate">
                                      {topic.sectionTitle}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <ChevronRight
                                className={`w-4 h-4 shrink-0 ml-2 transition ${
                                  isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Catégorie: Cartes */}
                  {results.cartes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                        <Map className="w-3.5 h-3.5" />
                        <span>Cartes ({results.cartes.length})</span>
                      </div>
                      <div className="mt-1 space-y-1">
                        {results.cartes.map((carte) => {
                          const itemIndex = flattenedResults.findIndex(
                            (it) => it.type === 'carte' && it.id === carte.id
                          );
                          const isSelected = itemIndex === selectedIndex;
                          return (
                            <button
                              key={`carte-${carte.id}`}
                              data-index={itemIndex}
                              type="button"
                              onClick={() => handleNavigate(carte.url)}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 border border-emerald-200'
                                  : 'hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 overflow-hidden">
                                  {carte.image ? (
                                    <img
                                      src={carte.image}
                                      alt={carte.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Map className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-800 truncate">
                                      {carte.name}
                                    </span>
                                    {!carte.published && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded">
                                        Brouillon MJ
                                      </span>
                                    )}
                                  </div>
                                  {carte.description && (
                                    <p className="text-xs text-slate-500 truncate">
                                      {carte.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <ChevronRight
                                className={`w-4 h-4 shrink-0 ml-2 transition ${
                                  isSelected ? 'text-emerald-600 translate-x-0.5' : 'text-slate-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Catégorie: Personnages */}
                  {results.characters.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-purple-700 uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5" />
                        <span>Galerie des personnages ({results.characters.length})</span>
                      </div>
                      <div className="mt-1 space-y-1">
                        {results.characters.map((char) => {
                          const itemIndex = flattenedResults.findIndex(
                            (it) => it.type === 'character' && it.id === char.id
                          );
                          const isSelected = itemIndex === selectedIndex;
                          return (
                            <button
                              key={`char-${char.id}`}
                              data-index={itemIndex}
                              type="button"
                              onClick={() => handleNavigate(char.url)}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-50 border border-purple-200'
                                  : 'hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 overflow-hidden border border-purple-200">
                                  {char.avatar ? (
                                    <img
                                      src={char.avatar}
                                      alt={char.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="font-bold text-xs">
                                      {char.name.substring(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-800 truncate">
                                      {char.name}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                        char.isPlayer
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {char.isPlayer ? 'PJ' : 'PNJ'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 truncate">
                                    {char.concept
                                      ? `${char.concept} • ${char.categoryName}`
                                      : char.categoryName}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight
                                className={`w-4 h-4 shrink-0 ml-2 transition ${
                                  isSelected ? 'text-purple-600 translate-x-0.5' : 'text-slate-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer / Raccourcis clavier */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
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
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono shadow-2xs">
                  Échap
                </kbd>
                <span className="text-[11px]">Fermer</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
