import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { CampaignSummary, CampaignRole } from '../types/campaign';
import { AppView, viewToPath } from '../components/Navbar';
import {
  Crown,
  User,
  Users,
  Archive,
  BookOpen,
  Sparkles,
  AlertCircle,
  RefreshCw,
  LogIn,
  Search,
  CheckCircle2,
  Lock,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';

interface MyCampaignsPageProps {
  onNavigate?: (view: AppView) => void;
  onSelectCampaign?: (campaignId: number) => void;
}

export const MyCampaignsPage: React.FC<MyCampaignsPageProps> = ({ onNavigate, onSelectCampaign }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [role, setRole] = useState<CampaignRole>('master');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
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
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getMyCampaigns(role, includeArchived);
      setCampaigns(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la liste des campagnes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [role, includeArchived, isAuthenticated]);

  // Strip HTML for campaign description preview
  const formatDescription = (html: string): string => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.length > 160 ? text.substring(0, 160) + '...' : text;
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-6 border border-indigo-100 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Connexion requise</h2>
          <p className="text-slate-600 max-w-md mx-auto mb-8 text-sm sm:text-base">
            Vous devez être connecté à votre compte pour consulter et gérer vos campagnes de jeu de rôle.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => handleNavigate('login')}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Se connecter</span>
            </button>
            <button
              onClick={() => handleNavigate('register')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm transition"
            >
              <span>Créer un compte</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mes Campagnes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez vos parties en tant que Maître du Jeu ou retrouvez vos personnages en jeu.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => navigate('/campaigns/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une campagne</span>
          </button>

          <button
            onClick={fetchCampaigns}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition shadow-2xs disabled:opacity-50"
            title="Actualiser la liste"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Mode switch : Maître du jeu / Joueur */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setRole('master')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                role === 'master'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Mes parties maîtrisées</span>
            </button>

            <button
              onClick={() => setRole('player')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                role === 'player'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4 text-indigo-500" />
              <span>Mes parties joueurs</span>
            </button>
          </div>

          {/* Archive Filter Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-medium text-slate-600">Affichage :</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setIncludeArchived(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  !includeArchived
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Parties en cours
              </button>
              <button
                onClick={() => setIncludeArchived(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  includeArchived
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-slate-400" />
                <span>Toutes (avec archives)</span>
              </button>
            </div>
          </div>
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
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-pulse flex flex-col"
            >
              <div className="h-32 bg-slate-200" />
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

      {/* Empty state */}
      {!isLoading && !error && campaigns.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center shadow-xs">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
            {role === 'master' ? <Crown className="w-8 h-8" /> : <Search className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {role === 'master'
              ? 'Aucune partie maîtrisée trouvée'
              : 'Aucune partie joueur trouvée'}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm mb-6">
            {role === 'master'
              ? includeArchived
                ? "Vous n'avez créé aucune campagne pour le moment."
                : "Vous n'avez aucune campagne active en cours. Vos éventuelles campagnes archivées sont masquées."
              : includeArchived
                ? "Vous ne participez à aucune campagne actuellement."
                : "Vous n'avez aucune partie active en cours en tant que joueur."}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {!includeArchived && (
              <button
                onClick={() => setIncludeArchived(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                Afficher aussi les parties archivées
              </button>
            )}
            {role === 'master' ? (
              <button
                onClick={() => navigate('/campaigns/new')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer une campagne</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavigate('join-campaign')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Trouver une table de jeu</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Campaign List Grid */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group ${
                campaign.isArchived ? 'border-slate-300 opacity-90' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Banner / Header visual */}
                <div className="h-36 relative overflow-hidden bg-gradient-to-r from-slate-800 to-indigo-950">
                  {campaign.banniere ? (
                    <img
                      src={campaign.banniere}
                      alt={campaign.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30">
                      <BookOpen className="w-16 h-16 text-white" />
                    </div>
                  )}

                  {/* Badges on banner */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {campaign.isArchived ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900/80 backdrop-blur-md text-amber-300 border border-amber-400/40 flex items-center gap-1">
                        <Archive className="w-3 h-3" /> Archivée
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> En cours
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white/90 backdrop-blur-md text-indigo-950 shadow-2xs">
                      {campaign.systeme || 'Système libre'}
                    </span>
                    {campaign.univers && (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-900/80 backdrop-blur-md text-slate-200">
                        {campaign.univers}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                      {campaign.name}
                    </h3>

                    {/* Master / Character Info */}
                    <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-3">
                      {role === 'master' ? (
                        <div className="flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Crown className="w-3.5 h-3.5" />
                          <span>Vous êtes le MJ</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <span className="text-slate-400">MJ :</span>
                          <span className="font-semibold text-slate-800">{campaign.mjUsername}</span>
                        </div>
                      )}

                      {role === 'player' && campaign.characterName && (
                        <div className="flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          <span className="text-slate-400 text-[10px]">PJ :</span>
                          <span>{campaign.characterName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description preview */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {formatDescription(campaign.description) || 'Aucune description disponible pour cette campagne.'}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      <strong className="text-slate-800">{campaign.nbJoueursActuel}</strong> / {campaign.nbJoueurs} joueurs
                    </span>
                  </div>

                  <div>
                    {campaign.isRecrutementOpen ? (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Recrutement ouvert
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Complet</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectCampaign(campaign.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs sm:text-sm transition shadow-2xs cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Accéder au forum</span>
                  </button>

                  {(role === 'master' || campaign.mjId === user?.id || campaign.userRole === 'mj') && (
                    <button
                      onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                      className="inline-flex items-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-indigo-600 font-semibold rounded-xl text-xs sm:text-sm transition shadow-2xs cursor-pointer"
                      title="Modifier la configuration de la campagne"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Configurer</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
