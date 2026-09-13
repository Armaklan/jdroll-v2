import React, { useState, useEffect } from 'react';
import { campaignsApi } from '../api/campaigns';
import { TopicDetail, ForumPost } from '../types/campaign';
import { AppView } from '../components/Navbar';
import {
  ArrowLeft,
  Pin,
  Lock,
  EyeOff,
  Clock,
  Crown,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  FolderOpen,
} from 'lucide-react';

interface TopicViewPageProps {
  topicId: number;
  initialPage?: number;
  onNavigate: (view: AppView) => void;
  onBackToForum: () => void;
}

export const TopicViewPage: React.FC<TopicViewPageProps> = ({
  topicId,
  initialPage,
  onNavigate: _onNavigate,
  onBackToForum,
}) => {
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [currentPage, setCurrentPage] = useState<number | undefined>(initialPage);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopic = async (pageToFetch?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getTopicPosts(topicId, pageToFetch);
      setTopicDetail(data);
      setCurrentPage(data.page);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les messages du sujet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (topicId) {
      fetchTopic(currentPage);
    }
  }, [topicId]);

  const handlePageChange = (newPage: number) => {
    if (!topicDetail || newPage === topicDetail.page || newPage < 1 || newPage > topicDetail.totalPages) {
      return;
    }
    setCurrentPage(newPage);
    fetchTopic(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && !topicDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-600 font-medium text-sm">Chargement des messages...</p>
      </div>
    );
  }

  if (error || !topicDetail) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-red-900 mb-1">Erreur de chargement</h3>
        <p className="text-sm text-red-700 mb-6">{error || 'Sujet introuvable.'}</p>
        <button
          onClick={onBackToForum}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition"
        >
          Retour au forum
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Navigation Top Bar / Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBackToForum}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au forum ({topicDetail.campaignTitle})</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FolderOpen className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-700">{topicDetail.sectionTitle}</span>
          <span>&bull;</span>
          <span>{topicDetail.totalPosts} message{topicDetail.totalPosts > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Topic Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {topicDetail.stickable && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              Sujet Épinglé
            </span>
          )}
          {topicDetail.isClosed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              Sujet Fermé
            </span>
          )}
          {topicDetail.isPrivate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
              <EyeOff className="w-3.5 h-3.5" />
              Sujet Privé
            </span>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {topicDetail.title}
        </h1>
      </div>

      {/* Pagination & History Info Header */}
      <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5 text-xs text-slate-600">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span>
              Page {topicDetail.page} sur {topicDetail.totalPages} ({topicDetail.totalPosts} message{topicDetail.totalPosts > 1 ? 's' : ''})
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            <span className="font-medium text-indigo-600">Page 1</span> : 10 derniers messages récents &bull; <span className="font-medium">Pages 2+</span> : Historique antérieur
          </p>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(topicDetail.page - 1)}
            disabled={topicDetail.page <= 1}
            className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1 ${
              topicDetail.page <= 1
                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 shadow-xs'
            }`}
            title="Page précédente (plus récente)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Précédent</span>
          </button>

          {Array.from({ length: topicDetail.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`min-w-8 h-8 px-2.5 rounded-xl text-xs font-bold transition ${
                pageNum === topicDetail.page
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300'
              }`}
            >
              {pageNum === 1 ? '1 (Récents)' : pageNum}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(topicDetail.page + 1)}
            disabled={topicDetail.page >= topicDetail.totalPages}
            className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1 ${
              topicDetail.page >= topicDetail.totalPages
                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 shadow-xs'
            }`}
            title="Page suivante (plus ancienne)"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages List */}
      {topicDetail.posts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Aucun message</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Ce sujet ne contient aucun message pour l'instant.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topicDetail.posts.map((post: ForumPost) => {
            const isLastRead = topicDetail.lastReadPostId === post.id;
            const authorName = post.perso?.name || post.user.username;
            const isGm = post.user.profil === 1 || post.user.titre?.toLowerCase().includes('maître');

            return (
              <div
                key={post.id}
                id={`post-${post.id}`}
                className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition ${
                  isLastRead
                    ? 'border-indigo-400 ring-2 ring-indigo-100'
                    : !post.isRead
                    ? 'border-indigo-200 bg-indigo-50/15'
                    : 'border-slate-200'
                }`}
              >
                {/* Post Top Meta Bar */}
                <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-600">{formatDate(post.createDate)}</span>

                    {isLastRead && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        Dernier message lu
                      </span>
                    )}

                    {!post.isRead && !isLastRead && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-indigo-600 text-white animate-pulse">
                        NON LU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                    <span>#post-{post.id}</span>
                  </div>
                </div>

                {/* Post Main Body Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 sm:p-6">
                  {/* Author Card (Left) */}
                  <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4 flex md:flex-col items-center md:items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {post.perso?.avatar || post.user.avatar ? (
                        <img
                          src={post.perso?.avatar || post.user.avatar}
                          alt={authorName}
                          className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-indigo-100 text-indigo-700 border-2 border-indigo-200 flex items-center justify-center font-bold text-base md:text-xl shadow-xs">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {isGm && (
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs"
                          title="Maître du Jeu"
                        >
                          <Crown className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Author Details */}
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                        {authorName}
                      </h4>

                      {post.perso?.concept && (
                        <p className="text-xs text-indigo-600 font-medium italic">
                          {post.perso.concept}
                        </p>
                      )}

                      {post.perso && (
                        <p className="text-[11px] text-slate-400">
                          Joueur : <span className="text-slate-600 font-medium">{post.user.username}</span>
                        </p>
                      )}

                      {!post.perso && post.user.titre && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          {post.user.titre}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message Content (Right) */}
                  <div className="md:col-span-9 min-w-0">
                    <div
                      className="text-slate-800 text-sm sm:text-base leading-relaxed space-y-3 prose prose-slate max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Pagination Bar */}
      {topicDetail.totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <button
            onClick={onBackToForum}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au forum</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(topicDetail.page - 1)}
              disabled={topicDetail.page <= 1}
              className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1 ${
                topicDetail.page <= 1
                  ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            {Array.from({ length: topicDetail.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`min-w-8 h-8 px-2.5 rounded-xl text-xs font-bold transition ${
                  pageNum === topicDetail.page
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNum === 1 ? '1 (Récents)' : pageNum}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(topicDetail.page + 1)}
              disabled={topicDetail.page >= topicDetail.totalPages}
              className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1 ${
                topicDetail.page >= topicDetail.totalPages
                  ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={scrollToTop}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Haut de page</span>
          </button>
        </div>
      )}
    </div>
  );
};
