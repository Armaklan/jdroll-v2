import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {campaignsApi} from '../api/campaigns';
import {CampaignRole, CampaignSummary} from '../types/campaign';
import {compareCampaignsForMyCampaigns} from '../utils/campaign-helpers';
import {CampaignDetailModal} from '../components/CampaignDetailModal';
import {CampaignCard} from '../components/CampaignCard';
import {CampaignGridSkeleton} from '../components/CampaignCardSkeleton';
import {EmptyState} from '../components/EmptyState';
import {GlobalFloatingSearch} from '../components/GlobalFloatingSearch';
import {AppView, viewToPath} from '../components/Navbar';
import {AlertCircle, Archive, Crown, Eye, Gamepad2, Layers, Lock, LogIn, Plus, Search, Sparkles, Users, X,} from 'lucide-react';

interface MyCampaignsPageProps {
  onNavigate?: (view: AppView) => void;
  onSelectCampaign?: (campaignId: number) => void;
}

export const MyCampaignsPage: React.FC<MyCampaignsPageProps> = ({ onNavigate, onSelectCampaign }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [roleFilter, setRoleFilter] = useState<CampaignRole>('all');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleNavigate = (view: AppView) => {
    if (onNavigate) onNavigate(view);
    else navigate(viewToPath(view));
  };

  const handleSelectCampaign = (campaignId: number) => {
    if (onSelectCampaign) onSelectCampaign(campaignId);
    else navigate(`/forum/${campaignId}`);
  };

  const handleOpenDetail = (campaign: CampaignSummary) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const fetchCampaigns = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getMyCampaigns(roleFilter, includeArchived);
      setCampaigns(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la liste de vos campagnes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleObserve = async (campaign: CampaignSummary, currentlyObserving: boolean) => {
    try {
      await campaignsApi.toggleObserveCampaign(campaign.id, currentlyObserving);
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour de l'observation");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [roleFilter, includeArchived, isAuthenticated]);

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = campaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.systeme && c.systeme.toLowerCase().includes(query)) ||
          (c.univers && c.univers.toLowerCase().includes(query)) ||
          (c.mjUsername && c.mjUsername.toLowerCase().includes(query)) ||
          (c.characterName && c.characterName.toLowerCase().includes(query))
      );
    }
    return [...result].sort(compareCampaignsForMyCampaigns);
  }, [campaigns, searchQuery]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <EmptyState
          icon={Lock}
          title="Connexion requise"
          description="Vous devez être connecté à votre compte pour consulter et gérer vos campagnes de jeu de rôle."
          actions={[
            {
              label: 'Se connecter',
              onClick: () => handleNavigate('login'),
              variant: 'primary',
              icon: LogIn,
            },
            {
              label: 'Créer un compte',
              onClick: () => handleNavigate('register'),
              variant: 'secondary',
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GlobalFloatingSearch activeTab="my-campaigns" />
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mes Campagnes
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => navigate('/campaigns/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une campagne</span>
          </button>

          <button
            onClick={() => navigate('/join-campaign')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs sm:text-sm font-semibold transition shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Rejoindre une campagne</span>
          </button>

          <button
            onClick={() => navigate('/join-campaign?filter=all')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition shadow-2xs cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Toutes les campagnes</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer mes campagnes (nom, univers, système)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Role Filter Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-slate-600">Rôle :</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    roleFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setRoleFilter('master')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    roleFilter === 'master'
                      ? 'bg-white text-amber-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>MJ</span>
                </button>
                <button
                  onClick={() => setRoleFilter('player')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    roleFilter === 'player'
                      ? 'bg-white text-indigo-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Joueur</span>
                </button>
                <button
                  onClick={() => setRoleFilter('observer')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    roleFilter === 'observer'
                      ? 'bg-white text-sky-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-sky-500" />
                  <span>Observateur</span>
                </button>
              </div>
            </div>

            {/* Archive Filter Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-slate-600">Statut :</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setIncludeArchived(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    !includeArchived
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  En cours
                </button>
                <button
                  onClick={() => setIncludeArchived(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    includeArchived
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5 text-slate-400" />
                  <span>Avec archives</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="font-semibold text-slate-700">
            {filteredCampaigns.length} campagne{filteredCampaigns.length > 1 ? 's' : ''} trouvée{filteredCampaigns.length > 1 ? 's' : ''}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline cursor-pointer"
            >
              Effacer le filtre
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
      {isLoading && <CampaignGridSkeleton count={3} />}

      {/* Empty state */}
      {!isLoading && !error && filteredCampaigns.length === 0 && (
        <EmptyState
          icon={searchQuery ? Search : Gamepad2}
          title={
            searchQuery
              ? 'Aucune campagne correspondante'
              : includeArchived
              ? "Vous n'avez aucune campagne pour le moment"
              : "Vous n'avez aucune campagne active en cours"
          }
          description={
            searchQuery
              ? `Aucune de vos campagnes ne correspond au filtre "${searchQuery}".`
              : includeArchived
              ? "Vous n'êtes actuellement Maître du Jeu ou participant d'aucune campagne."
              : "Vous ne participez à aucune partie active. Vos éventuelles campagnes terminées ou archivées sont masquées."
          }
          actions={[
            ...(searchQuery
              ? [
                  {
                    label: 'Effacer le filtre',
                    onClick: () => setSearchQuery(''),
                    variant: 'secondary' as const,
                  },
                ]
              : []),
            ...(!includeArchived && !searchQuery
              ? [
                  {
                    label: 'Afficher aussi les parties archivées',
                    onClick: () => setIncludeArchived(true),
                    variant: 'secondary' as const,
                    icon: Archive,
                  },
                ]
              : []),
            {
              label: 'Créer une campagne',
              onClick: () => navigate('/campaigns/new'),
              variant: 'primary' as const,
              icon: Plus,
            },
            {
              label: 'Rejoindre une campagne',
              onClick: () => navigate('/join-campaign'),
              variant: 'secondary' as const,
              icon: Sparkles,
            },
            {
              label: 'Toutes les campagnes',
              onClick: () => navigate('/join-campaign?filter=all'),
              variant: 'secondary' as const,
              icon: Layers,
            },
          ]}
        />
      )}

      {/* Campaign List Grid */}
      {!isLoading && !error && filteredCampaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              cardClickAction="forum"
              onOpenDetail={handleOpenDetail}
              onSelectCampaign={handleSelectCampaign}
              onConfigure={() => navigate(`/campaigns/${campaign.id}/edit`)}
              onToggleObserve={handleToggleObserve}
            />
          ))}
        </div>
      )}

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onObserveChange={() => fetchCampaigns()}
      />
    </div>
  );
};
