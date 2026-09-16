import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { CampaignSummary } from '../types/campaign';
import { getUserColorClass } from '../utils/user';
import {
  Crown,
  Users,
  MessageCircle,
  Dices,
  Archive,
  CheckCircle2,
  BookOpen,
  SlidersHorizontal,
  Upload,
  Loader2,
  AlertCircle,
  X,
  Clock,
  PauseCircle,
  Eye,
  EyeOff,
  StickyNote,
} from 'lucide-react';

export interface CampaignHeaderProps {
  campaign: CampaignSummary;
  activeTab?: 'forum' | 'characters' | 'topic' | 'notes' | 'none';
  isAdminMode?: boolean;
  onOpenDiceTower?: () => void;
  onBannerUpload?: (file: File) => Promise<void> | void;
  isUploadingBanner?: boolean;
  bannerUploadError?: string | null;
  onClearBannerUploadError?: () => void;
  onObserveChange?: (isObserving: boolean) => void;
  onAlertChange?: (hasAlert: boolean) => void;
}

export const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  campaign,
  activeTab = 'none',
  isAdminMode = false,
  onOpenDiceTower,
  onBannerUpload,
  isUploadingBanner = false,
  bannerUploadError = null,
  onClearBannerUploadError,
  onObserveChange,
  onAlertChange,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingBanner, setIsDraggingBanner] = useState<boolean>(false);
  const [isObserving, setIsObserving] = useState<boolean>(
    Boolean(campaign.isObserving || campaign.userRole === 'observer')
  );
  const [isObservingLoading, setIsObservingLoading] = useState<boolean>(false);
  const [hasAlert, setHasAlert] = useState<boolean>(Boolean(campaign.hasAlert));
  const [isAlertLoading, setIsAlertLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsObserving(Boolean(campaign.isObserving || campaign.userRole === 'observer'));
  }, [campaign.isObserving, campaign.userRole]);

  useEffect(() => {
    setHasAlert(Boolean(campaign.hasAlert));
  }, [campaign.hasAlert]);

  const isMj = Boolean(
    user && (user.id === campaign.mjId || campaign.userRole === 'mj')
  );
  const isPlayer = Boolean(campaign.userRole === 'player');
  const isCampaignMember = Boolean(
    user && (isMj || isPlayer)
  );

  const handleToggleObserve = async () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    setIsObservingLoading(true);
    try {
      const res = await campaignsApi.toggleObserveCampaign(campaign.id, isObserving);
      setIsObserving(res.isObserving);
      if (onObserveChange) {
        onObserveChange(res.isObserving);
      }
    } catch (err) {
      console.error("Erreur lors de la modification de l'observation :", err);
    } finally {
      setIsObservingLoading(false);
    }
  };

  const handleToggleAlert = async () => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    setIsAlertLoading(true);
    try {
      const res = await campaignsApi.toggleCampaignAlert(campaign.id, hasAlert);
      setHasAlert(res.hasAlert);
      if (onAlertChange) {
        onAlertChange(res.hasAlert);
      }
    } catch (err) {
      console.error("Erreur lors de la modification de l'état à traiter :", err);
    } finally {
      setIsAlertLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdminMode || !onBannerUpload) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBanner(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isAdminMode || !onBannerUpload) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingBanner(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!isAdminMode || !onBannerUpload) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBanner(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onBannerUpload(files[0]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mb-6">
      {/* Hidden File Input for Banner Upload (Admin Mode) */}
      {isAdminMode && onBannerUpload && (
        <input
          type="file"
          ref={bannerInputRef}
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onBannerUpload(file);
            }
          }}
        />
      )}

      {/* Banner Area */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`h-40 sm:h-48 relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 transition-all ${
          isAdminMode && onBannerUpload ? 'cursor-pointer select-none' : ''
        }`}
        onClick={() => {
          if (isAdminMode && onBannerUpload && !isUploadingBanner) {
            bannerInputRef.current?.click();
          }
        }}
        title={
          isAdminMode && onBannerUpload
            ? 'Glissez-déposez ou cliquez pour modifier la bannière'
            : undefined
        }
      >
        {campaign.banniereForum || campaign.banniere ? (
          <img
            src={campaign.banniereForum || campaign.banniere || undefined}
            alt={campaign.name}
            className="w-full h-full object-cover opacity-100"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <BookOpen className="w-24 h-24 text-white" />
          </div>
        )}

        {/* Gradient overlay and metadata */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-6 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-600 text-white shadow-xs">
              {campaign.systeme || 'Système libre'}
            </span>
            {campaign.univers && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800/80 backdrop-blur-md text-slate-200 border border-slate-700/50">
                {campaign.univers}
              </span>
            )}
            {campaign.statut === 3 ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-sky-950/80 backdrop-blur-md text-sky-300 border border-sky-500/40 flex items-center gap-1">
                <Clock className="w-3 h-3" /> En préparation
              </span>
            ) : campaign.statut === 1 ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-950/80 backdrop-blur-md text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <PauseCircle className="w-3 h-3" /> En pause
              </span>
            ) : campaign.isArchived || campaign.statut === 2 ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-900/80 backdrop-blur-md text-slate-300 border border-slate-600/40 flex items-center gap-1">
                <Archive className="w-3 h-3" /> Archivée
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ouverte
              </span>
            )}
            {hasAlert && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500 text-white shadow-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> À traiter
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {campaign.name}
          </h1>
        </div>

        {/* Admin Mode Visual Cue */}
        {isAdminMode && onBannerUpload && !isUploadingBanner && (
          <div className="absolute top-4 right-4 z-10 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                bannerInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white text-xs font-semibold rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              title="Glisser-déposer une image ou cliquer pour téléverser"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Changer la bannière</span>
            </button>
          </div>
        )}

        {/* Dragging Active Overlay */}
        {isAdminMode && isDraggingBanner && (
          <div className="absolute inset-0 z-20 bg-indigo-950/90 backdrop-blur-xs border-4 border-dashed border-amber-400 rounded-2xl flex flex-col items-center justify-center text-white animate-in fade-in duration-150 pointer-events-none">
            <div className="p-3 bg-amber-500/20 text-amber-300 rounded-full mb-2 animate-bounce">
              <Upload className="w-10 h-10" />
            </div>
            <p className="text-base font-bold text-amber-300">Déposez l'image ici</p>
            <p className="text-xs text-slate-300 mt-1">pour remplacer la bannière de la campagne</p>
          </div>
        )}

        {/* Uploading In Progress Overlay */}
        {isUploadingBanner && (
          <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in fade-in duration-150">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
            <p className="text-sm font-semibold text-white">Téléversement de la bannière...</p>
          </div>
        )}
      </div>

      {/* Banner Upload Error display */}
      {bannerUploadError && (
        <div className="px-4 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{bannerUploadError}</span>
          </div>
          {onClearBannerUploadError && (
            <button
              onClick={onClearBannerUploadError}
              className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Campaign Meta Bar */}
      <div className="p-4 sm:px-6 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5 font-medium">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>
              MJ : <strong className={getUserColorClass(campaign.mjProfil, 'text-slate-800 font-semibold')}>{campaign.mjUsername}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>
              Joueurs : <strong className="text-slate-800 font-semibold">{campaign.nbJoueursActuel}</strong>
              {campaign.nbJoueurs > 0 && <span> / {campaign.nbJoueurs}</span>}
            </span>
          </div>

          {isMj && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Vous êtes le Maître du Jeu
            </span>
          )}

          {isObserving && !isMj && !isPlayer && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
              <Eye className="w-3 h-3 text-sky-600" /> Observateur
            </span>
          )}
        </div>

        {/* 3 Main Action Links + Admin Config */}
        <div className="flex items-center gap-2">
          {isAdminMode && (
            <button
              onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs border border-amber-200 shadow-2xs transition cursor-pointer"
              title="Modifier la configuration de la campagne"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>Configurer</span>
            </button>
          )}

          {/* Link 1: Forum de la campagne */}
          {activeTab === 'forum' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Forum de la campagne</span>
            </span>
          ) : (
            <button
              onClick={() => navigate(`/forum/${campaign.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-semibold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Accéder au forum de la campagne"
            >
              <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>Forum de la campagne</span>
            </button>
          )}

          {/* Link 2: Galerie de personnages */}
          {activeTab === 'characters' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Galerie de personnages</span>
            </span>
          ) : (
            <button
              onClick={() => navigate(`/campaigns/${campaign.id}/characters`)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-semibold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Accéder à la galerie de personnages de la campagne"
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Galerie de personnages</span>
            </button>
          )}

          {/* Link 3: Note */}
          {isCampaignMember && (
            activeTab === 'notes' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100">
                <StickyNote className="w-3.5 h-3.5 text-indigo-600" />
                <span>Note</span>
              </span>
            ) : (
              <button
                onClick={() => navigate(`/campaigns/${campaign.id}/notes`)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-semibold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
                title="Accéder à vos notes personnelles pour cette campagne"
              >
                <StickyNote className="w-3.5 h-3.5 text-indigo-500" />
                <span>Note</span>
              </button>
            )
          )}

          {/* Link 4: Tour à dé */}
          {isCampaignMember && (
            <button
              onClick={onOpenDiceTower}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-semibold text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Ouvrir la tour à dés de la campagne"
            >
              <Dices className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tour à dé</span>
            </button>
          )}

          {/* A traiter / Ne plus être à traiter button */}
          {isCampaignMember && (
            <button
              onClick={handleToggleAlert}
              disabled={isAlertLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold text-xs border shadow-2xs transition cursor-pointer ${
                hasAlert
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-amber-700 border-slate-200'
              }`}
              title={hasAlert ? "Retirer l'état « À traiter » de cette campagne" : "Marquer cette campagne comme « À traiter »"}
            >
              {isAlertLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AlertCircle className={`w-3.5 h-3.5 ${hasAlert ? 'text-white' : 'text-amber-600'}`} />
              )}
              <span>{hasAlert ? 'À traiter' : 'Mettre à traiter'}</span>
            </button>
          )}

          {/* Observer / Ne plus observer button */}
          {user && !isMj && !isPlayer && (
            <button
              onClick={handleToggleObserve}
              disabled={isObservingLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold text-xs border shadow-2xs transition cursor-pointer ${
                isObserving
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-sky-700 border-slate-200'
              }`}
              title={isObserving ? 'Ne plus observer cette campagne' : 'Observer cette campagne'}
            >
              {isObserving ? (
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
        </div>
      </div>
    </div>
  );
};
