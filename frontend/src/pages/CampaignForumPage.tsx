import React, { useState, useEffect } from 'react';
import { campaignsApi } from '../api/campaigns';
import { CampaignForumData } from '../types/campaign';
import { AppView } from '../components/Navbar';
import {
  ArrowLeft,
  MessageSquare,
  Pin,
  Lock,
  EyeOff,
  Clock,
  Users,
  Crown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Archive,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  MessageCircle,
  BookOpen,
} from 'lucide-react';

interface CampaignForumPageProps {
  campaignId: number;
  onNavigate: (view: AppView) => void;
  onBack?: () => void;
}

export const CampaignForumPage: React.FC<CampaignForumPageProps> = ({
  campaignId,
  onNavigate,
  onBack,
}) => {
  const [forumData, setForumData] = useState<CampaignForumData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  const fetchForum = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getCampaignForum(campaignId);
      setForumData(data);

      // Initialize collapsed state from defaultCollapse
      const initialCollapse: Record<number, boolean> = {};
      data.sections.forEach((sec) => {
        initialCollapse[sec.id] = sec.defaultCollapse;
      });
      setCollapsedSections(initialCollapse);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le forum de la campagne.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchForum();
    }
  }, [campaignId]);

  const toggleSection = (sectionId: number) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'Date inconnue';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-600 font-medium text-sm">Chargement du forum de la campagne...</p>
      </div>
    );
  }

  if (error || !forumData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-red-900 mb-1">Erreur de chargement</h3>
        <p className="text-sm text-red-700 mb-6">{error || 'Campagne introuvable.'}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => (onBack ? onBack() : onNavigate('my-campaigns'))}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition"
          >
            Retour aux campagnes
          </button>
          <button
            onClick={fetchForum}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const { campaign, sections } = forumData;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Back button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={() => (onBack ? onBack() : onNavigate('my-campaigns'))}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux campagnes</span>
          </button>
          <span>/</span>
          <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
            {campaign.name}
          </span>
          <span>/</span>
          <span className="text-indigo-600 font-semibold">Forum</span>
        </div>

        <button
          onClick={fetchForum}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition shadow-2xs"
          title="Actualiser le forum"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Campaign Header Banner Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="h-40 sm:h-48 relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">
          {campaign.banniere ? (
            <img
              src={campaign.banniere}
              alt={campaign.name}
              className="w-full h-full object-cover opacity-75"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <BookOpen className="w-24 h-24 text-white" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-600 text-white shadow-xs">
                {campaign.systeme || 'Système libre'}
              </span>
              {campaign.univers && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800/80 backdrop-blur-md text-slate-200 border border-slate-700/50">
                  {campaign.univers}
                </span>
              )}
              {campaign.isArchived ? (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-950/80 backdrop-blur-md text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Archive className="w-3 h-3" /> Archivée
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> En cours
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {campaign.name}
            </h1>
          </div>
        </div>

        {/* Campaign Meta Bar */}
        <div className="p-4 sm:px-6 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5 font-medium">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Maître du Jeu :</span>
              <span className="font-semibold text-slate-900">{campaign.mjUsername}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Joueurs :</span>
              <span className="font-semibold text-slate-900">
                {campaign.nbJoueursActuel} / {campaign.nbJoueurs}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Forum de la campagne</span>
            </span>
          </div>
        </div>
      </div>

      {/* Forum Sections List */}
      {sections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Aucune section créée</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Le Maître du Jeu n'a pas encore configuré de sections dans le forum de cette campagne.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const isCollapsed = collapsedSections[section.id];

            return (
              <div
                key={section.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-5 py-3.5 bg-slate-100/80 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between transition group text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderOpen className="w-5 h-5 text-indigo-600 group-hover:scale-105 transition-transform" />
                    <h2 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                      {section.title}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-xs font-medium">
                      {section.topics.length} sujet{section.topics.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 transition">
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Section Content: Topics Table */}
                {!isCollapsed && (
                  <div>
                    {section.topics.length === 0 ? (
                      <div className="p-8 text-center text-xs sm:text-sm text-slate-500">
                        Aucun sujet dans cette section pour le moment.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {/* Desktop Table Header */}
                        <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <div className="col-span-7 flex items-center gap-2">Sujet</div>
                          <div className="col-span-2 text-center">Messages</div>
                          <div className="col-span-3 text-right">Dernier message</div>
                        </div>

                        {/* Topic Rows */}
                        {section.topics.map((topic) => (
                          <div
                            key={topic.id}
                            className={`p-4 sm:px-5 sm:py-3.5 hover:bg-slate-50/80 transition flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 md:items-center ${
                              !topic.isRead ? 'bg-indigo-50/30' : ''
                            }`}
                          >
                            {/* Topic Title & Badges */}
                            <div className="md:col-span-7 flex items-start gap-3">
                              {/* Read/Unread Icon Indicator */}
                              <div className="pt-0.5 flex-shrink-0">
                                {!topic.isRead ? (
                                  <div
                                    className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs border border-indigo-200"
                                    title="Nouveaux messages non lus"
                                  >
                                    <MessageSquare className="w-4 h-4 fill-indigo-600 text-indigo-600" />
                                  </div>
                                ) : (
                                  <div
                                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200"
                                    title="Tous les messages sont lus"
                                  >
                                    <MessageSquare className="w-4 h-4 text-slate-400" />
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {topic.stickable && (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                                      <Pin className="w-3 h-3 fill-amber-500 text-amber-500" />
                                      Épinglé
                                    </span>
                                  )}
                                  {topic.isClosed && (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold">
                                      <Lock className="w-3 h-3" />
                                      Fermé
                                    </span>
                                  )}
                                  {topic.isPrivate && (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-semibold">
                                      <EyeOff className="w-3 h-3" />
                                      Privé
                                    </span>
                                  )}
                                  {!topic.isRead && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-indigo-600 text-white animate-pulse">
                                      NOUVEAU
                                    </span>
                                  )}

                                  <h3
                                    className={`text-sm sm:text-base leading-snug cursor-pointer transition-colors hover:text-indigo-600 ${
                                      !topic.isRead
                                        ? 'font-bold text-slate-900'
                                        : 'font-medium text-slate-700'
                                    }`}
                                  >
                                    {topic.title}
                                  </h3>
                                </div>
                              </div>
                            </div>

                            {/* Posts Count */}
                            <div className="md:col-span-2 flex items-center md:justify-center text-xs text-slate-500 pl-11 md:pl-0">
                              <span className="font-semibold text-slate-700 mr-1 md:mr-0">
                                {topic.postsCount}
                              </span>
                              <span className="md:hidden ml-1 text-slate-400">message(s)</span>
                            </div>

                            {/* Last Post Info */}
                            <div className="md:col-span-3 text-xs text-slate-500 md:text-right pl-11 md:pl-0">
                              {topic.lastPost ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center md:justify-end gap-1.5">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-slate-600 font-medium">
                                      {formatDate(topic.lastPost.createDate)}
                                    </span>
                                  </div>
                                  <div className="flex items-center md:justify-end gap-1.5 text-slate-600">
                                    <span className="text-slate-400">Par :</span>
                                    <span className="font-semibold text-slate-800 hover:text-indigo-600 transition">
                                      {topic.lastPost.username}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Aucun message</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Forum Legend Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <MessageSquare className="w-3 h-3 fill-indigo-600 text-indigo-600" />
            </div>
            <span>Nouveaux messages non lus</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
              <MessageSquare className="w-3 h-3 text-slate-400" />
            </div>
            <span>Tous les messages lus</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
              <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-500 mr-0.5" />
              Épinglé
            </span>
            <span>Sujet important</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold">
              <Lock className="w-2.5 h-2.5 mr-0.5" />
              Fermé
            </span>
            <span>Verrouillé</span>
          </div>
        </div>
      </div>
    </div>
  );
};
