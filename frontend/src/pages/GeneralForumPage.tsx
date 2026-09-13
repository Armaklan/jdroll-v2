import React, { useState, useEffect } from 'react';
import { campaignsApi } from '../api/campaigns';
import { GeneralForumData } from '../types/campaign';
import { AppView } from '../components/Navbar';
import {
  MessageSquare,
  Pin,
  Lock,
  EyeOff,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

interface GeneralForumPageProps {
  onNavigate: (view: AppView) => void;
  onSelectTopic?: (topicId: number) => void;
}

export const GeneralForumPage: React.FC<GeneralForumPageProps> = ({
  onNavigate,
  onSelectTopic,
}) => {
  const [forumData, setForumData] = useState<GeneralForumData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  const fetchForum = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getGeneralForum();
      setForumData(data);

      // Initialiser l'état replié/déplié à partir de defaultCollapse
      const initialCollapse: Record<number, boolean> = {};
      data.sections.forEach((sec) => {
        initialCollapse[sec.id] = Boolean(sec.defaultCollapse);
      });
      setCollapsedSections(initialCollapse);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le forum général.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForum();
  }, []);

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
        <p className="text-slate-600 font-medium text-sm">Chargement du forum général...</p>
      </div>
    );
  }

  if (error || !forumData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-red-900 mb-1">Erreur de chargement</h3>
        <p className="text-sm text-red-700 mb-6">{error || 'Forum introuvable.'}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition"
          >
            Retour à l'accueil
          </button>
          <button
            onClick={fetchForum}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-medium transition shadow-xs"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const totalTopics = forumData.sections.reduce((acc, s) => acc + s.topics.length, 0);

  return (
    <div className="space-y-6">
      {/* En-tête du Forum Général */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  Communauté JdRoll
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <MessageSquare className="w-7 h-7 text-indigo-400" />
                Forum Général
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                Auberge des rôlistes, annonces communautaires, débats sur les systèmes de jeu et échanges libres hors campagnes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={fetchForum}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xs transition"
                title="Actualiser le forum"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualiser</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-300" />
              <span>{forumData.sections.length} {forumData.sections.length > 1 ? 'sections' : 'section'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-indigo-300" />
              <span>{totalTopics} {totalTopics > 1 ? 'sujets de discussion' : 'sujet de discussion'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sections et Topics */}
      <div className="space-y-4">
        {forumData.sections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700 mb-1">Aucune section disponible</h3>
            <p className="text-xs text-slate-500">Ce forum ne comporte aucune section pour le moment.</p>
          </div>
        ) : (
          forumData.sections.map((section) => {
            const isCollapsed = collapsedSections[section.id];
            return (
              <div
                key={section.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition duration-150"
              >
                {/* En-tête de la section */}
                <div
                  onClick={() => toggleSection(section.id)}
                  className="px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200 cursor-pointer flex items-center justify-between transition select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    <h2 className="font-bold text-sm text-slate-900 tracking-tight">{section.title}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {section.topics.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
                    aria-label={isCollapsed ? 'Déplier la section' : 'Replier la section'}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Corps de la section (liste des topics) */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {section.topics.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        Aucun sujet dans cette section.
                      </div>
                    ) : (
                      section.topics.map((topic) => (
                        <div
                          key={topic.id}
                          onClick={() => onSelectTopic && onSelectTopic(topic.id)}
                          className="p-4 hover:bg-slate-50/90 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                        >
                          {/* Titre & Statuts du Topic */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="mt-0.5 shrink-0">
                              {topic.isRead ? (
                                <div
                                  className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 transition"
                                  title="Sujet lu"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </div>
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition shadow-2xs"
                                  title="Nouveaux messages non lus"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                {topic.stickable && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Pin className="w-2.5 h-2.5 text-amber-600" />
                                    <span>Épinglé</span>
                                  </span>
                                )}
                                {topic.isClosed && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                                    <span>Fermé</span>
                                  </span>
                                )}
                                {topic.isPrivate && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <EyeOff className="w-2.5 h-2.5 text-rose-500" />
                                    <span>Privé</span>
                                  </span>
                                )}
                                {!topic.isRead && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-bold bg-indigo-600 text-white">
                                    Non lu
                                  </span>
                                )}
                              </div>

                              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate">
                                {topic.title}
                              </h3>
                            </div>
                          </div>

                          {/* Métadonnées & Dernier Message */}
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                            {/* Décompte de messages */}
                            <div className="text-right text-slate-500">
                              <span className="font-semibold text-slate-700">{topic.postsCount}</span>{' '}
                              {topic.postsCount > 1 ? 'messages' : 'message'}
                            </div>

                            {/* Informations sur le dernier post */}
                            {topic.lastPost ? (
                              <div className="flex items-center gap-2 pl-3 sm:border-l border-slate-200 text-right min-w-[140px] justify-end">
                                <div className="text-right">
                                  <p className="font-medium text-slate-800 text-xs truncate max-w-[110px]">
                                    {topic.lastPost.username}
                                  </p>
                                  <div className="flex items-center justify-end gap-1 text-2xs text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(topic.lastPost.createDate)}</span>
                                  </div>
                                </div>
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0 overflow-hidden">
                                  {topic.lastPost.userAvatar ? (
                                    <img
                                      src={topic.lastPost.userAvatar}
                                      alt={topic.lastPost.username}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    topic.lastPost.username.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-2xs">Aucun message</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Légende du forum */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 shadow-xs">
        <span className="font-semibold text-slate-700">Légende :</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <MessageSquare className="w-2.5 h-2.5" />
            </div>
            <span>Messages non lus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-2.5 h-2.5" />
            </div>
            <span>Tous messages lus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 text-amber-600" />
            <span>Sujet épinglé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Sujet verrouillé / fermé</span>
          </div>
        </div>
      </div>
    </div>
  );
};
