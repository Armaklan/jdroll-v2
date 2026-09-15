import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { CampaignSummary } from '../types/campaign';
import { getRythmeLabel, getRpLabel } from '../utils/campaign-helpers';
import {
  X,
  Compass,
  Crown,
  Users,
  Sparkles,
  Archive,
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
  Dice5,
  UserCheck,
  AlertCircle,
  LogIn,
  Feather,
  Clock,
  PauseCircle,
} from 'lucide-react';

interface CampaignDetailModalProps {
  campaign: CampaignSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess?: (campaignId: number, message: string) => void;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  campaign,
  isOpen,
  onClose,
  onJoinSuccess,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccessMessage, setJoinSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !campaign) return null;

  const isMj = user && user.id === campaign.mjId;
  const isArchived = campaign.isArchived || campaign.statut === 2;
  const isRecruitmentOpen = campaign.isRecrutementOpen && !isArchived;

  const handleGoToForum = () => {
    onClose();
    navigate(`/campaigns/${campaign.id}`);
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setJoinSuccessMessage(null);

    try {
      const response = await campaignsApi.joinCampaign(campaign.id);
      const msg = response.message || `Vous avez rejoint la campagne « ${campaign.name} » avec succès !`;
      setJoinSuccessMessage(msg);
      if (onJoinSuccess) {
        onJoinSuccess(campaign.id, msg);
      }
    } catch (err: any) {
      setJoinError(err.message || 'Impossible de rejoindre la campagne.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Banner image */}
        <div className="relative h-44 sm:h-56 bg-slate-900 shrink-0 overflow-hidden">
          {campaign.banniere || campaign.banniereForum ? (
            <img
              src={campaign.banniere || campaign.banniereForum || undefined}
              alt={campaign.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 flex items-center justify-center">
              <Compass className="w-16 h-16 text-indigo-400/30" />
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition shadow-md"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Status and Recruitment Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 pointer-events-none">
            {campaign.statut === 3 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white shadow-md">
                <Clock className="w-3.5 h-3.5" />
                En préparation
              </span>
            ) : campaign.statut === 1 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md">
                <PauseCircle className="w-3.5 h-3.5" />
                En pause
              </span>
            ) : isArchived ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-600 text-white shadow-md">
                <Archive className="w-3.5 h-3.5" />
                Campagne Archivée
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Partie Ouverte
              </span>
            )}

            {isRecruitmentOpen ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                Recrutement Ouvert
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900/80 text-slate-200 backdrop-blur-md">
                Recrutement Fermé
              </span>
            )}
          </div>

          {/* Bottom Gradient and MJ / Players overlay */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none" />

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-4 text-white">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs sm:text-sm font-semibold mb-1 drop-shadow-sm">
                <Crown className="w-4 h-4" />
                <span>Maître du Jeu : {campaign.mjUsername}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md line-clamp-1">
                {campaign.name}
              </h2>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border border-white/10 shrink-0">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>{campaign.nbJoueursActuel} / {campaign.nbJoueurs} Joueurs</span>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Feedback banners */}
          {joinSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-medium">
                {joinSuccessMessage}
              </div>
            </div>
          )}

          {joinError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-medium">
                {joinError}
              </div>
            </div>
          )}

          {/* Key metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Système */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Dice5 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Système de jeu
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {campaign.systeme || 'Non spécifié'}
                </span>
              </div>
            </div>

            {/* Univers */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Univers & Ambiance
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {campaign.univers || 'Non spécifié'}
                </span>
              </div>
            </div>

            {/* Rythme */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Rythme attendu
                </span>
                <span className="text-xs font-semibold text-slate-900 leading-tight block mt-0.5">
                  {getRythmeLabel(campaign.rythme, true)}
                </span>
              </div>
            </div>

            {/* Niveau RP */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 sm:col-span-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Feather className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Format d'écriture & RP
                </span>
                <span className="text-xs font-semibold text-slate-900 leading-tight block mt-0.5">
                  {getRpLabel(campaign.rp, true)}
                </span>
              </div>
            </div>

            {/* Multi-persos */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Multi-personnages
                </span>
                <span className="text-xs font-semibold text-slate-900 leading-tight block mt-0.5">
                  {campaign.isMultiCharacter ? 'Autorisé (plusieurs PJ)' : '1 seul PJ par joueur'}
                </span>
              </div>
            </div>
          </div>

          {/* Description / Synopsis Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Synopsis & Description de la Campagne</span>
            </h3>

            {campaign.description && campaign.description.trim() ? (
              <div
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 text-sm text-slate-700 leading-relaxed wysiwyg-content space-y-3 overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: campaign.description }}
              />
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500 italic">
                Aucune description détaillée n'a été rédigée pour cette aventure.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 self-start sm:self-auto">
            Campagne <span className="font-semibold text-slate-700">#{campaign.id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition"
            >
              Fermer
            </button>

            <button
              onClick={handleGoToForum}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-sm transition"
            >
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span>Voir le forum</span>
            </button>

            {isRecruitmentOpen && !isMj && (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50"
              >
                {isAuthenticated ? (
                  <>
                    <Sparkles className={`w-4 h-4 ${isJoining ? 'animate-spin' : ''}`} />
                    <span>{isJoining ? 'Inscription...' : 'Rejoindre la campagne'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Se connecter pour rejoindre</span>
                  </>
                )}
              </button>
            )}

            {isMj && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                Vous êtes le Maître du Jeu
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
