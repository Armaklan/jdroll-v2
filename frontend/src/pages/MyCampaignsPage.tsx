import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { CampaignSummary, CampaignRole } from '../types/campaign';
import { CampaignDetailModal } from '../components/CampaignDetailModal';
import { CampaignCard } from '../components/CampaignCard';
import { CampaignGridSkeleton } from '../components/CampaignCardSkeleton';
import { EmptyState } from '../components/EmptyState';
import { AppView, viewToPath } from '../components/Navbar';
import {
  Crown,
  User,
  Archive,
  AlertCircle,
  RefreshCw,
  LogIn,
  Search,
  Lock,
  Plus,
  Sparkles,
} from 'lucide-react';

interface MyCampaignsPageProps {
  onNavigate?: (view: AppView) => void;
  onSelectCampaign?: (campaignId: number) => void;
}

export const MyCampaignsPage: React.FC<MyCampaignsPageProps> = ({ onNavigate, onSelectCampaign }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [role, setRole] = useState<CampaignRole>('master');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
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
    else navigate(`/campaigns/${campaignId}`);
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
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium transition shadow-2xs disabled:opacity-50 cursor-pointer"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  !includeArchived
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Parties en cours
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
            className="text-xs bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <CampaignGridSkeleton count={3} />}

      {/* Empty state */}
      {!isLoading && !error && campaigns.length === 0 && (
        <EmptyState
          icon={role === 'master' ? Crown : Search}
          title={
            role === 'master'
              ? 'Aucune partie maîtrisée trouvée'
              : 'Aucune partie joueur trouvée'
          }
          description={
            role === 'master'
              ? includeArchived
                ? "Vous n'avez créé aucune campagne pour le moment."
                : "Vous n'avez aucune campagne active en cours. Vos éventuelles campagnes archivées sont masquées."
              : includeArchived
                ? "Vous ne participez à aucune campagne actuellement."
                : "Vous n'avez aucune partie active en cours en tant que joueur."
          }
          actions={[
            ...(!includeArchived
              ? [
                  {
                    label: 'Afficher aussi les parties archivées',
                    onClick: () => setIncludeArchived(true),
                    variant: 'secondary' as const,
                  },
                ]
              : []),
            ...(role === 'master'
              ? [
                  {
                    label: 'Créer une campagne',
                    onClick: () => navigate('/campaigns/new'),
                    variant: 'primary' as const,
                    icon: Plus,
                  },
                ]
              : [
                  {
                    label: 'Trouver une table de jeu',
                    onClick: () => handleNavigate('join-campaign'),
                    variant: 'primary' as const,
                    icon: Sparkles,
                  },
                ]),
          ]}
        />
      )}

      {/* Campaign List Grid */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              roleContext={role}
              onOpenDetail={handleOpenDetail}
              onSelectCampaign={handleSelectCampaign}
              onConfigure={() => navigate(`/campaigns/${campaign.id}/edit`)}
            />
          ))}
        </div>
      )}

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};
