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
  Compass,
  Search,
  Archive,
  RefreshCw,
  AlertCircle,
  X,
  Layers,
  Filter,
} from 'lucide-react';

interface AllCampaignsPageProps {
  onNavigate?: (view: AppView) => void;
  onSelectCampaign?: (campaignId: number) => void;
}

export const AllCampaignsPage: React.FC<AllCampaignsPageProps> = ({ onSelectCampaign }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Joining state for card direct action
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    const timer = setTimeout(() => {
      fetchCampaigns();
    }, 250);

    return () => clearTimeout(timer);
  }, [includeArchived, searchQuery]);

  const handleResetSearch = () => {
    setSearchQuery('');
  };

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
      navigate('/login', { state: { from: '/all-campaigns' } });
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition cursor-pointer"
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  !includeArchived
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Campagnes actives
              </button>
              <button
                onClick={() => setIncludeArchived(true)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                <button onClick={handleResetSearch} className="hover:text-indigo-900 cursor-pointer">
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
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline text-xs cursor-pointer"
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
          icon={searchQuery ? Search : Layers}
          title={searchQuery ? 'Aucune campagne ne correspond à votre recherche' : 'Aucune campagne disponible'}
          description={
            searchQuery
              ? `Aucun résultat pour "${searchQuery}". Essayez avec d'autres termes (nom de campagne, système ou univers) ou affichez les archives.`
              : 'Il n’y a pour le moment aucune campagne active sur la plateforme.'
          }
          actions={[
            ...(searchQuery
              ? [
                  {
                    label: 'Effacer la recherche',
                    onClick: handleResetSearch,
                    variant: 'primary' as const,
                  },
                ]
              : []),
            ...(!includeArchived
              ? [
                  {
                    label: 'Inclure les campagnes archivées',
                    onClick: () => setIncludeArchived(true),
                    variant: 'secondary' as const,
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
              onOpenDetail={handleOpenDetail}
              onSelectCampaign={handleSelectCampaign}
              onJoin={handleDirectJoin}
              isJoining={joiningId === campagne.id}
            />
          ))}
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
