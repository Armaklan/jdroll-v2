import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '../api/campaigns';
import { CampaignSummary } from '../types/campaign';
import { CampaignDetailModal } from '../components/CampaignDetailModal';
import { CampaignCard } from '../components/CampaignCard';
import { CampaignGridSkeleton } from '../components/CampaignCardSkeleton';
import { FeedbackAlert } from '../components/FeedbackAlert';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { isUserAdmin } from '../utils/user';
import { AppView } from '../components/Navbar';
import {
  Sparkles,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Layers,
  Archive,
  Clock,
} from 'lucide-react';

interface JoinCampaignPageProps {
  onNavigate?: (view: AppView) => void;
}

type FilterMode = 'recruiting' | 'all' | 'preparation';

export const JoinCampaignPage: React.FC<JoinCampaignPageProps> = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isUserAdmin(user);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<FilterMode>('recruiting');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
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
      const shouldIncludePreparation = isAdmin && (filterMode === 'preparation' || filterMode === 'all');
      const shouldIncludeArchived = filterMode === 'all' && includeArchived;
      const data = await campaignsApi.getAllCampaigns(
        shouldIncludeArchived,
        searchQuery,
        shouldIncludePreparation
      );

      if (filterMode === 'preparation') {
        setCampaigns(data.filter((c) => c.statut === 3));
      } else if (filterMode === 'all') {
        if (!isAdmin) {
          setCampaigns(data.filter((c) => c.statut !== 3));
        } else {
          setCampaigns(data);
        }
      } else {
        const recruitingCampaigns = data.filter(
          (c) => c.isRecrutementOpen && !c.isArchived && c.statut !== 2 && c.statut !== 3
        );
        setCampaigns(recruitingCampaigns);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les campagnes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, filterMode, includeArchived, isAdmin]);

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

  const handleToggleObserve = async (campagne: CampaignSummary, currentlyObserving: boolean) => {
    try {
      const response = await campaignsApi.toggleObserveCampaign(campagne.id, currentlyObserving);
      setActionFeedback({
        type: 'success',
        message: response.message,
      });
      fetchCampaigns();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || "Erreur lors de la modification de l'observation",
      });
    }
  };

  const handleJoinSuccess = (_campaignId: number, message: string) => {
    setActionFeedback({
      type: 'success',
      message,
    });
    fetchCampaigns();
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            {filterMode === 'recruiting' && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tables Ouvertes aux Joueurs</span>
              </>
            )}
            {filterMode === 'all' && (
              <>
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Toutes les Campagnes</span>
              </>
            )}
            {filterMode === 'preparation' && (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Parties en Préparation</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {filterMode === 'recruiting'
              ? 'Rejoindre une Campagne'
              : filterMode === 'preparation'
              ? 'Campagnes en Préparation'
              : 'Toutes les Campagnes'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {filterMode === 'recruiting'
              ? "Découvrez toutes les campagnes actives actuellement en phase de recrutement. Consultez leur fiche détaillée pour découvrir l'univers et postuler."
              : filterMode === 'preparation'
              ? 'Consultez les campagnes actuellement en cours de préparation par les Maîtres du Jeu (accès réservé aux administrateurs).'
              : "Explorez l'ensemble des tables de jeu de la plateforme, qu'elles soient ouvertes aux recrutements, en cours de jeu ou archivées."}
          </p>
        </div>

        <button
          onClick={fetchCampaigns}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start md:self-auto px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition shadow-2xs disabled:opacity-50 cursor-pointer"
          title="Actualiser la liste"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Global Action Feedback Alert */}
      {actionFeedback && (
        <FeedbackAlert
          type={actionFeedback.type}
          message={actionFeedback.message}
          onClose={() => setActionFeedback(null)}
        />
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
                title="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Mode Toggle : Recrutement vs Voir tout vs En préparation (Admin) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setFilterMode('recruiting')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterMode === 'recruiting'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recrutements ouverts</span>
              </button>

              <button
                onClick={() => setFilterMode('all')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Voir tout</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setFilterMode('preparation')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filterMode === 'preparation'
                      ? 'bg-white text-amber-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>En préparation</span>
                </button>
              )}
            </div>

            {filterMode === 'all' && (
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setIncludeArchived(!includeArchived)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    includeArchived
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archives</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="font-semibold text-slate-700">
            {filterMode === 'recruiting'
              ? `${campaigns.length} table${campaigns.length > 1 ? 's' : ''} ouverte${campaigns.length > 1 ? 's' : ''} au recrutement`
              : filterMode === 'preparation'
              ? `${campaigns.length} campagne${campaigns.length > 1 ? 's' : ''} en préparation`
              : `${campaigns.length} campagne${campaigns.length > 1 ? 's' : ''} au total`}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline cursor-pointer"
            >
              Effacer la recherche
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
            className="text-xs bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <CampaignGridSkeleton count={6} />}

      {/* Empty State */}
      {!isLoading && !error && campaigns.length === 0 && (
        <EmptyState
          icon={filterMode === 'recruiting' ? Sparkles : filterMode === 'preparation' ? Clock : Layers}
          title={
            searchQuery
              ? 'Aucune table trouvée'
              : filterMode === 'recruiting'
              ? 'Aucune campagne ne recrute actuellement'
              : filterMode === 'preparation'
              ? 'Aucune campagne en préparation'
              : 'Aucune campagne trouvée'
          }
          description={
            searchQuery
              ? `Aucune table ne correspond à votre recherche "${searchQuery}".`
              : filterMode === 'recruiting'
              ? 'Il n’y a actuellement aucune campagne ouverte aux nouveaux joueurs. Vous pouvez afficher toutes les tables existantes ou revenir bientôt !'
              : filterMode === 'preparation'
              ? 'Il n’y a pour le moment aucune campagne avec le statut en préparation.'
              : 'Il n’y a pour le moment aucune campagne disponible sur la plateforme.'
          }
          actions={[
            ...(searchQuery
              ? [
                  {
                    label: 'Effacer le filtre de recherche',
                    onClick: () => setSearchQuery(''),
                    variant: 'secondary' as const,
                  },
                ]
              : []),
            ...(filterMode !== 'all'
              ? [
                  {
                    label: 'Voir toutes les campagnes',
                    onClick: () => setFilterMode('all'),
                    variant: 'primary' as const,
                    icon: Layers,
                  },
                ]
              : []),
          ]}
        />
      )}

      {/* Campaigns Grid */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campagne) => (
            <CampaignCard
              key={campagne.id}
              campaign={campagne}
              cardClickAction="detail"
              onOpenDetail={handleOpenDetail}
              onSelectCampaign={(id) => navigate(`/forum/${id}`)}
              onJoin={handleDirectJoin}
              isJoining={joiningId === campagne.id}
              onToggleObserve={handleToggleObserve}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onJoinSuccess={handleJoinSuccess}
        onObserveChange={() => fetchCampaigns()}
      />
    </div>
  );
};
