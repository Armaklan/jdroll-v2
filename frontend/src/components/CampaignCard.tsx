import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CampaignSummary, CampaignRole } from '../types/campaign';
import { useAuth } from '../contexts/AuthContext';
import { getRythmeLabel, getRpLabel } from '../utils/campaign-helpers';
import {
  Crown,
  Users,
  Archive,
  BookOpen,
  Sparkles,
  Dice5,
  Layers,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  UserCheck,
  Loader2,
  MessageSquare,
  Clock,
  PauseCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface CampaignCardProps {
  campaign: CampaignSummary;
  onOpenDetail?: (campaign: CampaignSummary) => void;
  onSelectCampaign?: (campaignId: number) => void;
  onJoin?: (campaign: CampaignSummary, e: React.MouseEvent) => void;
  isJoining?: boolean;
  onConfigure?: (campaignId: number) => void;
  onToggleObserve?: (campaign: CampaignSummary, isCurrentlyObserving: boolean, e: React.MouseEvent) => void;
  isObservingLoading?: boolean;
  roleContext?: CampaignRole | null;
  showRoleBadge?: boolean;
  cardClickAction?: 'forum' | 'detail';
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onOpenDetail,
  onSelectCampaign,
  onJoin,
  isJoining = false,
  onConfigure,
  onToggleObserve,
  isObservingLoading = false,
  roleContext,
  showRoleBadge = true,
  cardClickAction,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isMj = Boolean(user && user.id === campaign.mjId);
  const isPlayer = Boolean(
    campaign.userRole === 'player' ||
    (user && campaign.characterName)
  );
  const isObserver = Boolean(
    campaign.userRole === 'observer' ||
    campaign.isObserving ||
    roleContext === 'observer'
  );
  const isArchived = Boolean(campaign.isArchived || campaign.statut === 2);
  const isRecruitmentOpen = Boolean(campaign.isRecrutementOpen && !isArchived && campaign.statut !== 3);

  const rythmeLabel = getRythmeLabel(campaign.rythme);
  const rpLabel = getRpLabel(campaign.rp);

  const handleCardClick = () => {
    if (cardClickAction === 'forum') {
      if (onSelectCampaign) {
        onSelectCampaign(campaign.id);
      } else {
        navigate(`/forum/${campaign.id}`);
      }
    } else if (cardClickAction === 'detail') {
      if (onOpenDetail) {
        onOpenDetail(campaign);
      }
    } else {
      if (onOpenDetail) {
        onOpenDetail(campaign);
      } else if (onSelectCampaign) {
        onSelectCampaign(campaign.id);
      } else {
        navigate(`/forum/${campaign.id}`);
      }
    }
  };

  const handleForumClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectCampaign) {
      onSelectCampaign(campaign.id);
    } else {
      navigate(`/forum/${campaign.id}`);
    }
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenDetail) {
      onOpenDetail(campaign);
    }
  };

  const handleConfigureClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConfigure) {
      onConfigure(campaign.id);
    } else {
      navigate(`/campaigns/${campaign.id}/edit`);
    }
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJoin) {
      onJoin(campaign, e);
    }
  };

  const handleToggleObserveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleObserve) {
      onToggleObserve(campaign, isObserver, e);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer ${
        isArchived
          ? 'border-slate-300 opacity-85 hover:opacity-100'
          : campaign.hasUnread
          ? 'border-rose-300 ring-1 ring-rose-200/70 hover:border-rose-400'
          : 'border-slate-200 hover:border-indigo-300'
      }`}
    >
      <div>
        {/* Banner / Header Image */}
        <div className="relative h-36 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
          {campaign.banniere || campaign.banniereForum ? (
            <img
              src={campaign.banniere || campaign.banniereForum || undefined}
              alt={campaign.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
              <BookOpen className="w-16 h-16 text-white" />
            </div>
          )}

          {/* Top Badges overlay */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
            {/* Status badge */}
            {campaign.statut === 3 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-600/90 text-white backdrop-blur-md shadow-xs">
                <Clock className="w-3 h-3" />
                En préparation
              </span>
            ) : campaign.statut === 1 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 text-white backdrop-blur-md shadow-xs">
                <PauseCircle className="w-3 h-3" />
                En pause
              </span>
            ) : isArchived ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-600/90 text-white backdrop-blur-md shadow-xs">
                <Archive className="w-3 h-3" />
                Archivée
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600/90 text-white backdrop-blur-md shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
                Ouverte
              </span>
            )}

            {/* Recruitment badge */}
            {isRecruitmentOpen ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-600/90 text-white backdrop-blur-md shadow-xs">
                <Sparkles className="w-3 h-3" />
                Recrutement ouvert
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900/75 text-slate-200 backdrop-blur-md">
                Complet / Fermé
              </span>
            )}
          </div>

          {/* Bottom Gradient Fade */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

          {/* MJ & Players overlay */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
            <div className="flex items-center gap-1.5 drop-shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>
                MJ : <span className="font-semibold">{campaign.mjUsername}</span>
              </span>
            </div>

            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md text-[11px]">
              <Users className="w-3 h-3 text-slate-300" />
              <span>
                {campaign.nbJoueursActuel}
                {campaign.nbJoueurs > 0 ? ` / ${campaign.nbJoueurs}` : ''} PJ
              </span>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-3">
          {/* Tags : Système & Univers */}
          <div className="flex flex-wrap items-center gap-1.5">
            {campaign.hasUnread && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                <MessageSquare className="w-3 h-3 text-rose-600" />
                Nouveau message
              </span>
            )}

            {campaign.systeme ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Dice5 className="w-3 h-3 text-indigo-500" />
                {campaign.systeme}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Système libre
              </span>
            )}

            {campaign.univers && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                <Layers className="w-3 h-3 text-purple-500" />
                {campaign.univers}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition">
            {campaign.name}
          </h2>

          {/* Role presentation if relevant */}
          {showRoleBadge && (roleContext || isMj || isPlayer || isObserver) && (
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
              {(roleContext === 'master' || isMj) && (
                <div className="flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Vous êtes le MJ</span>
                </div>
              )}

              {((roleContext === 'player' && campaign.characterName) || (!isMj && isPlayer && campaign.characterName)) && (
                <div className="flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  <span className="text-slate-400 text-[10px]">PJ :</span>
                  <span>{campaign.characterName}</span>
                </div>
              )}

              {(!isMj && !isPlayer && isObserver) && (
                <div className="flex items-center gap-1.5 font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  <span>Observateur</span>
                </div>
              )}
            </div>
          )}

          {/* Rhythm / RP Badges */}
          {(rythmeLabel || rpLabel) && (
            <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
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
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-5 pt-0 border-t border-slate-100 mt-3 flex flex-wrap items-center justify-between gap-2 pt-3">
        {/* Fiche détail */}
        {onOpenDetail && (
          <button
            type="button"
            onClick={handleDetailClick}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
            title="Consulter la fiche détaillée"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Fiche détail</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Configurer button (if master / admin) */}
          {(isMj || roleContext === 'master') && (
            <button
              type="button"
              onClick={handleConfigureClick}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg text-xs border border-amber-200 transition cursor-pointer"
              title="Configurer la campagne"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>Configurer</span>
            </button>
          )}

          {/* Rejoindre button */}
          {onJoin && isRecruitmentOpen && !isMj && (
            <button
              type="button"
              onClick={handleJoinClick}
              disabled={isJoining}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg text-xs transition shadow-2xs cursor-pointer"
              title="Rejoindre cette table de jeu"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Inscription...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Rejoindre</span>
                </>
              )}
            </button>
          )}

          {/* Observer / Ne plus observer button */}
          {onToggleObserve && user && !isMj && !isPlayer && (
            <button
              type="button"
              onClick={handleToggleObserveClick}
              disabled={isObservingLoading}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold rounded-lg text-xs transition cursor-pointer ${
                isObserver
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={isObserver ? "Ne plus observer cette campagne" : "Observer cette campagne"}
            >
              {isObserver ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-sky-600" />
                  <span>Ne plus observer</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Observer</span>
                </>
              )}
            </button>
          )}

          {/* Voir le forum button */}
          <button
            type="button"
            onClick={handleForumClick}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition shadow-2xs cursor-pointer"
            title="Accéder au forum de la campagne"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Forum</span>
          </button>
        </div>
      </div>
    </div>
  );
};
