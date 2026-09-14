import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '../api/campaigns';
import { CampaignSummary } from '../types/campaign';
import { AppView, viewToPath } from '../components/Navbar';
import {
  Compass,
  Search,
  Archive,
  RefreshCw,
  Users,
  Sparkles,
  AlertCircle,
  X,
  Layers,
  Crown,
  BookOpen,
  Filter,
  CheckCircle2,
} from 'lucide-react';

interface AllCampaignsPageProps {
  onNavigate?: (view: AppView) => void;
  onSelectCampaign?: (campaignId: number) => void;
}

export const AllCampaignsPage: React.FC<AllCampaignsPageProps> = ({ onNavigate, onSelectCampaign }) => {
  const navigate = useNavigate();
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleNavigate = (view: AppView) => {
    if (onNavigate) onNavigate(view);
    else navigate(viewToPath(view));
  };

  const handleSelectCampaign = (campaignId: number) => {
    if (onSelectCampaign) onSelectCampaign(campaignId);
    else navigate(`/campaigns/${campaignId}`);
  };

  const fetchCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getAllCampaigns(includeArchived, searchQuery);
      setCampaigns(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la liste des campagnes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search slightly to avoid excessive requests when typing
    const timer = setTimeout(() => {
      fetchCampaigns();
    }, 250);

    return () => clearTimeout(timer);
  }, [includeArchived, searchQuery]);

  // Strip HTML for campaign description preview
  const formatDescription = (html: string): string => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.length > 170 ? text.substring(0, 170) + '...' : text;
  };

  // Human readable Rhythm helper
  const getRythmeLabel = (rythme?: number): string | null => {
    switch (rythme) {
      case 1:
        return 'Rapide (1+ msg/jour)';
      case 2:
        return 'Moyen (plusieurs msg/semaine)';
      case 3:
        return 'Posé (1 msg/semaine)';
      default:
        return null;
    }
  };

  // Human readable RP style helper
  const getRpLabel = (rp?: number): string | null => {
    switch (rp) {
      case 1:
        return 'RP Narratif / Littéraire';
      case 2:
        return 'RP Semi-Développé';
      case 3:
        return 'RP Direct / Court';
      default:
        return null;
    }
  };

  const handleResetSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Annuaire des aventures</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Toutes les Campagnes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explorez l'ensemble des parties créées sur JdRoll, découvrez les univers et trouvez l'aventure qui vous inspire.
          </p>
        </div>

        <button
          onClick={fetchCampaigns}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start md:self-auto px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition shadow-2xs disabled:opacity-50"
          title="Actualiser la liste"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          {/* Search input (Nom / Système / Univers) */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, système ou univers..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm transition outline-none text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={handleResetSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition"
                title="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Archive Filter Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Statut :
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setIncludeArchived(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  !includeArchived
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Campagnes actives
              </button>
              <button
                onClick={() => setIncludeArchived(true)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  includeArchived
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-slate-400" />
                <span>Toutes (avec archives)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active filters indicators & count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''} trouvée{campaigns.length > 1 ? 's' : ''}
            </span>
            {!includeArchived && (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
                Actives seulement
              </span>
            )}
            {includeArchived && (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
                Archives incluses
              </span>
            )}
            {searchQuery && (
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1">
                Recherche : "{searchQuery}"
                <button onClick={handleResetSearch} className="hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {(searchQuery || includeArchived) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIncludeArchived(false);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline text-xs"
            >
              Réinitialiser tous les filtres
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Une erreur est survenue</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchCampaigns}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1.5 rounded-lg font-medium transition"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-pulse flex flex-col"
            >
              <div className="h-36 bg-slate-200" />
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-12 bg-slate-100 rounded w-full mt-2" />
                </div>
                <div className="h-8 bg-slate-100 rounded mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && campaigns.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-xs">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
            {searchQuery ? <Search className="w-7 h-7" /> : <Layers className="w-7 h-7" />}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {searchQuery ? 'Aucune campagne ne correspond à votre recherche' : 'Aucune campagne disponible'}
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            {searchQuery
              ? `Aucun résultat pour "${searchQuery}". Essayez avec d'autres termes (nom de campagne, système ou univers) ou affichez les archives.`
              : 'Il n’y a pour le moment aucune campagne active sur la plateforme.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {searchQuery && (
              <button
                onClick={handleResetSearch}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs sm:text-sm transition shadow-2xs"
              >
                Effacer la recherche
              </button>
            )}
            {!includeArchived && (
              <button
                onClick={() => setIncludeArchived(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs sm:text-sm transition"
              >
                Inclure les campagnes archivées
              </button>
            )}
          </div>
        </div>
      )}

      {/* Campaigns Grid */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campagne) => {
            const rythmeLabel = getRythmeLabel(campagne.rythme);
            const rpLabel = getRpLabel(campagne.rp);
            const cleanDescription = formatDescription(campagne.description);

            return (
              <div
                key={campagne.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group ${
                  campagne.isArchived
                    ? 'border-slate-300 opacity-85 hover:opacity-100'
                    : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                {/* Campaign Banner / Header Image */}
                <div className="relative h-36 bg-slate-800 overflow-hidden">
                  {campagne.banniere || campagne.banniereForum ? (
                    <img
                      src={campagne.banniere || campagne.banniereForum || undefined}
                      alt={campagne.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback on broken image
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-indigo-400/40" />
                    </div>
                  )}

                  {/* Top Badges overlay */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                    {/* Status badge */}
                    {campagne.isArchived ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 text-white backdrop-blur-md shadow-xs">
                        <Archive className="w-3 h-3" />
                        Archivée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600/90 text-white backdrop-blur-md shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        En cours
                      </span>
                    )}

                    {/* Recruitment badge */}
                    {campagne.isRecrutementOpen ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-600/90 text-white backdrop-blur-md shadow-xs">
                        <Sparkles className="w-3 h-3" />
                        Recrutement ouvert
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900/70 text-slate-200 backdrop-blur-md">
                        Complet / Fermé
                      </span>
                    )}
                  </div>

                  {/* Bottom Gradient Fade */}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                  {/* MJ Tag overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                    <div className="flex items-center gap-1.5 drop-shadow-sm">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>MJ : <span className="font-semibold">{campagne.mjUsername}</span></span>
                    </div>

                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md text-[11px]">
                      <Users className="w-3 h-3 text-slate-300" />
                      <span>{campagne.nbJoueursActuel} / {campagne.nbJoueurs} PJ</span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    {/* Tags : Système & Univers */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {campagne.systeme}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                        {campagne.univers}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
                      {campagne.name}
                    </h2>

                    {/* Description preview */}
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {cleanDescription || 'Aucune description fournie pour cette campagne.'}
                    </p>
                  </div>

                  {/* Footer metadata & Details */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    {/* Rhythm / RP Badges */}
                    {(rythmeLabel || rpLabel) && (
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {rythmeLabel && (
                          <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {rythmeLabel}
                          </span>
                        )}
                        {rpLabel && (
                          <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {rpLabel}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions button */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] text-slate-400">
                        ID #{campagne.id}
                      </div>

                      <div className="flex items-center gap-2">
                        {campagne.isRecrutementOpen && !campagne.isArchived && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate('join-campaign');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Rejoindre</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleSelectCampaign(campagne.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold rounded-lg text-xs transition"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Voir le forum</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
