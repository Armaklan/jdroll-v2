import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '../api/campaigns';
import { CampaignSummary } from '../types/campaign';
import { CampaignDetailModal } from '../components/CampaignDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { AppView } from '../components/Navbar';
import {
  Sparkles,
  Search,
  RefreshCw,
  Users,
  AlertCircle,
  X,
  Crown,
  BookOpen,
  FileText,
  Dice5,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface JoinCampaignPageProps {
  onNavigate?: (view: AppView) => void;
}

export const JoinCampaignPage: React.FC<JoinCampaignPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Joining state for card direct action
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get all active campaigns, and filter for those with isRecrutementOpen === true
      const data = await campaignsApi.getAllCampaigns(false, searchQuery);
      const recruitingCampaigns = data.filter((c) => c.isRecrutementOpen && !c.isArchived && c.statut !== 2);
      setCampaigns(recruitingCampaigns);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les campagnes en recrutement.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenDetail = (campaign: CampaignSummary) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDirectJoin = async (campagne: CampaignSummary, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/join-campaign' } });
      return;
    }

    if (user && user.id === campagne.mjId) {
      setActionFeedback({
        type: 'error',
        message: 'Vous êtes déjà le Maître du Jeu de cette campagne.',
      });
      return;
    }

    setJoiningId(campagne.id);
    setActionFeedback(null);

    try {
      const response = await campaignsApi.joinCampaign(campagne.id);
      setActionFeedback({
        type: 'success',
        message: response.message || `Vous avez rejoint « ${campagne.name} » avec succès !`,
      });
      // Refresh list to update player counts
      fetchCampaigns();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Erreur lors de l’inscription à la campagne.',
      });
    } finally {
      setJoiningId(null);
    }
  };

  const handleJoinSuccess = (_campaignId: number, message: string) => {
    setActionFeedback({
      type: 'success',
      message,
    });
    fetchCampaigns();
  };


  // Rhythm label helper
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

  // RP style helper
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

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tables Ouvertes aux Joueurs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Rejoindre une Campagne
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Découvrez toutes les campagnes actives actuellement en phase de recrutement. Consultez leur fiche détaillée pour découvrir l'univers et postuler.
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

      {/* Global Action Feedback Alert */}
      {actionFeedback && (
        <div
          className={`border rounded-2xl p-4 flex items-start justify-between gap-3 animate-in fade-in duration-150 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            )}
            <div className="text-sm font-medium">{actionFeedback.message}</div>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par nom de campagne, système ou univers..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm transition outline-none text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition"
                title="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800 text-sm">{campaigns.length}</span> table{campaigns.length > 1 ? 's' : ''} ouverte{campaigns.length > 1 ? 's' : ''} au recrutement
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
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {searchQuery ? 'Aucune campagne en recrutement ne correspond à votre recherche' : 'Aucun recrutement en cours'}
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            {searchQuery
              ? `Aucune table ouverte trouvée pour "${searchQuery}". Essayez d'élargir vos termes de recherche.`
              : 'Toutes les tables actuelles sont au complet ou ont clôturé leur recrutement. Vous pouvez aussi parcourir toutes les campagnes ou créer la vôtre !'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs sm:text-sm transition shadow-2xs"
              >
                Effacer la recherche
              </button>
            )}
            <button
              onClick={() => {
                if (onNavigate) onNavigate('all-campaigns');
                else navigate('/all-campaigns');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs sm:text-sm transition"
            >
              Voir toutes les campagnes
            </button>
          </div>
        </div>
      )}

      {/* Campaigns Grid */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campagne) => {
            const rythmeLabel = getRythmeLabel(campagne.rythme);
            const rpLabel = getRpLabel(campagne.rp);
            const isUserMj = user && user.id === campagne.mjId;

            return (
              <div
                key={campagne.id}
                onClick={() => handleOpenDetail(campagne)}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group cursor-pointer"
              >
                {/* Campaign Banner / Header Image */}
                <div className="relative h-36 bg-slate-800 overflow-hidden">
                  {campagne.banniere || campagne.banniereForum ? (
                    <img
                      src={campagne.banniere || campagne.banniereForum || undefined}
                      alt={campagne.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-600/90 text-white backdrop-blur-md shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      Recrutement ouvert
                    </span>

                    <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] text-white font-medium">
                      <Users className="w-3 h-3 text-indigo-300" />
                      <span>{campagne.nbJoueursActuel} / {campagne.nbJoueurs} PJ</span>
                    </div>
                  </div>

                  {/* Bottom Gradient Fade */}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                  {/* MJ Tag overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                    <div className="flex items-center gap-1.5 drop-shadow-sm">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>MJ : <span className="font-semibold">{campagne.mjUsername}</span></span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    {/* Tags : Système & Univers */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {campagne.systeme && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Dice5 className="w-3 h-3 text-indigo-500" />
                          {campagne.systeme}
                        </span>
                      )}
                      {campagne.univers && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                          <Layers className="w-3 h-3 text-purple-500" />
                          {campagne.univers}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition">
                      {campagne.name}
                    </h2>
                  </div>

                  {/* Footer metadata & Details */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
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

                    {/* Actions button: Fiche détail, Voir le forum, Rejoindre */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(campagne);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
                        title="Consulter la fiche détaillée"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Fiche détail</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/campaigns/${campagne.id}`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold rounded-lg text-xs transition"
                          title="Accéder au forum"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Forum</span>
                        </button>

                        {!isUserMj && (
                          <button
                            onClick={(e) => handleDirectJoin(campagne, e)}
                            disabled={joiningId === campagne.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-2xs disabled:opacity-50"
                            title="Rejoindre cette campagne"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${joiningId === campagne.id ? 'animate-spin' : ''}`} />
                            <span>{joiningId === campagne.id ? '...' : 'Rejoindre'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onJoinSuccess={handleJoinSuccess}
      />
    </div>
  );
};
