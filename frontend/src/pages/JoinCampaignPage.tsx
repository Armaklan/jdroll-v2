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
import { AppView } from '../components/Navbar';
import {
  Sparkles,
  Search,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';

interface JoinCampaignPageProps {
  onNavigate?: (view: AppView) => void;
}

export const JoinCampaignPage: React.FC<JoinCampaignPageProps> = () => {
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
                title="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              {campaigns.length} table{campaigns.length > 1 ? 's' : ''} ouverte{campaigns.length > 1 ? 's' : ''} au recrutement
            </span>
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
            className="text-xs bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <CampaignGridSkeleton count={3} />}

      {/* Empty State */}
      {!isLoading && !error && campaigns.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title={searchQuery ? 'Aucune table trouvée' : 'Aucune campagne ne recrute actuellement'}
          description={
            searchQuery
              ? `Aucune table ouverte au recrutement ne correspond à votre recherche "${searchQuery}".`
              : 'Revenez très bientôt ! De nouvelles campagnes de jeu de rôle ouvrent régulièrement leurs portes.'
          }
          actions={
            searchQuery
              ? [
                  {
                    label: 'Effacer le filtre de recherche',
                    onClick: () => setSearchQuery(''),
                    variant: 'primary',
                  },
                ]
              : []
          }
        />
      )}

      {/* Campaigns Grid */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campagne) => (
            <CampaignCard
              key={campagne.id}
              campaign={campagne}
              onOpenDetail={handleOpenDetail}
              onSelectCampaign={(id) => navigate(`/campaigns/${id}`)}
              onJoin={handleDirectJoin}
              isJoining={joiningId === campagne.id}
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
      />
    </div>
  );
};
