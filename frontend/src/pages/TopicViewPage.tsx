import React, { useState, useEffect, useRef } from 'react';
import { campaignsApi } from '../api/campaigns';
import { TopicDetail, CharacterSummary } from '../types/campaign';
import { AppView } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { WysiwygEditor } from '../components/WysiwygEditor';
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
  Send,
  Eye,
  User as UserIcon,
  CheckCircle2,
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
  onNavigate,
  onBackToForum,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [currentPage, setCurrentPage] = useState<number | undefined>(initialPage);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire d'envoi de message
  const [postContent, setPostContent] = useState<string>('');
  const [selectedPersoId, setSelectedPersoId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

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

  const handleTogglePreview = () => {
    const nextState = !isPreviewOpen;
    setIsPreviewOpen(nextState);
    if (nextState) {
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleSubmitPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const stripped = postContent.replace(/<[^>]*>/g, '').trim();
    if (!postContent.trim() || (!stripped && !postContent.includes('<img') && !postContent.includes('<hr'))) {
      setSubmitError('Veuillez saisir un contenu pour votre message avant de publier.');
      return;
    }

    setIsSubmitting(true);
    try {
      await campaignsApi.createPost(topicId, postContent, selectedPersoId);
      setPostContent('');
      setIsPreviewOpen(false);
      setSubmitSuccess('Votre message a été publié avec succès !');

      // Recharger sur la page 1 (les 10 derniers messages) pour voir le nouveau post
      await fetchTopic(1);

      // Scroll vers le bas des messages
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 200);

      setTimeout(() => {
        setSubmitSuccess(null);
      }, 4000);
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de la publication du message.');
    } finally {
      setIsSubmitting(false);
    }
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

  // Informations de prévisualisation
  const selectedCharacter: CharacterSummary | undefined = topicDetail.availableCharacters.find(
    (c) => c.id === selectedPersoId
  );
  const previewAuthorName = selectedCharacter ? selectedCharacter.name : user?.username || 'Vous';
  const previewAvatar = selectedCharacter?.avatar || user?.avatar || '';
  const previewConcept = selectedCharacter?.concept || '';

  return (
    <div className="space-y-6">
      {/* Navigation / Fil d'Ariane & En-tête */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <button
              onClick={onBackToForum}
              className="hover:text-indigo-600 transition flex items-center gap-1"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{topicDetail.campaignTitle}</span>
            </button>
            <span>/</span>
            <span className="text-slate-700">{topicDetail.sectionTitle}</span>
          </div>

          <button
            onClick={onBackToForum}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour au forum</span>
          </button>
        </div>

        {/* Titre du sujet et badges */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {topicDetail.stickable && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Pin className="w-3 h-3 text-amber-600" />
                  <span>Épinglé</span>
                </span>
              )}
              {topicDetail.isClosed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Fermé</span>
                </span>
              )}
              {topicDetail.isPrivate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <EyeOff className="w-3 h-3 text-rose-500" />
                  <span>Secret / Privé</span>
                </span>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {topicDetail.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {topicDetail.totalPosts} {topicDetail.totalPosts > 1 ? 'messages au total' : 'message au total'}
            </p>
          </div>

          {/* Bouton pour répondre directement */}
          {topicDetail.canPost && (
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Répondre au sujet</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre de pagination supérieure */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>
            Page <strong className="text-slate-900">{topicDetail.page}</strong> sur{' '}
            <strong className="text-slate-900">{topicDetail.totalPages}</strong>
            {topicDetail.page === 1 && (
              <span className="ml-1 text-indigo-600 font-semibold">(Messages les plus récents)</span>
            )}
          </span>
        </div>

        {/* Contrôles de pagination */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(topicDetail.page - 1)}
            disabled={topicDetail.page <= 1}
            className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1 ${
              topicDetail.page <= 1
                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Page précédente (messages plus récents)"
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
            title="Page suivante (historique antérieur)"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Liste des messages du sujet */}
      {topicDetail.posts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Aucun message pour l'instant</h3>
          <p className="text-xs text-slate-500">Soyez le premier à poster dans ce sujet !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topicDetail.posts.map((post) => {
            const isLastRead = topicDetail.lastReadPostId === post.id;
            const authorName = post.perso?.name || post.user.username;
            const avatarUrl = post.perso?.avatar || post.user.avatar;
            const isGm = post.user.profil === 1;

            return (
              <div
                key={post.id}
                id={`post-${post.id}`}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition duration-150 ${
                  isLastRead
                    ? 'border-indigo-400 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* En-tête du message */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-400">
                      #{post.id}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(post.createDate)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLastRead && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <BookmarkCheck className="w-3 h-3" />
                        <span>Dernier lu</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Corps du message : Auteur à gauche, Texte à droite */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Colonne Profil / Personnage (Gauche) */}
                  <div className="md:col-span-3 flex md:flex-col items-center md:items-start gap-3 md:gap-2 pb-3 md:pb-0 md:border-r border-slate-100 md:pr-4">
                    {/* Avatar */}
                    <div className="relative">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={authorName}
                          className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-xs"
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

                    {/* Détails Auteur */}
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

                  {/* Contenu du message (Droite) */}
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

          {/* Prévisualisation en direct intégrée dans le fil */}
          {isPreviewOpen && postContent.trim() && (
            <div
              ref={previewRef}
              className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl p-5 shadow-sm transition relative"
            >
              {/* En-tête de la prévisualisation */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-200/80">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Prévisualisation</span>
                  </span>
                  <span className="text-xs text-amber-900 font-medium hidden sm:inline">
                    (Ce message est temporaire et n'est pas encore enregistré)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-xs text-amber-800 hover:text-amber-950 font-semibold px-2.5 py-1 rounded-lg hover:bg-amber-200/70 transition"
                >
                  Fermer l'aperçu
                </button>
              </div>

              {/* Rendu réel identique à un post */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3 flex md:flex-col items-center md:items-start gap-3 md:gap-2 pb-3 md:pb-0 md:border-r border-amber-200 md:pr-4">
                  {previewAvatar ? (
                    <img
                      src={previewAvatar}
                      alt={previewAuthorName}
                      className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover border-2 border-amber-300 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-amber-200 text-amber-900 border-2 border-amber-300 flex items-center justify-center font-bold text-base md:text-xl shadow-xs">
                      {previewAuthorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-0.5 min-w-0">
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                      {previewAuthorName}
                    </h4>

                    {previewConcept && (
                      <p className="text-xs text-indigo-600 font-medium italic">
                        {previewConcept}
                      </p>
                    )}

                    {selectedCharacter && (
                      <p className="text-[11px] text-slate-500">
                        Joueur : <span className="text-slate-700 font-medium">{user?.username}</span>
                      </p>
                    )}

                    {!selectedCharacter && user?.titre && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        {user.titre}
                      </p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-9 min-w-0">
                  <div
                    className="text-slate-900 text-sm sm:text-base leading-relaxed space-y-3 prose prose-slate max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: postContent }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barre de pagination inférieure */}
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

      {/* Bloc de réponse WYSIWYG / Formulaire de publication */}
      <div ref={formRef} className="pt-2">
        {topicDetail.isClosed ? (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 text-center text-slate-600">
            <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-800">Ce sujet est fermé</h4>
            <p className="text-xs text-slate-500 mt-1">
              Les réponses ont été verrouillées pour cette discussion.
            </p>
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
            <UserIcon className="w-8 h-8 text-slate-400 mx-auto" />
            <div>
              <h4 className="font-bold text-sm text-slate-800">Participer à la discussion</h4>
              <p className="text-xs text-slate-500 mt-1">
                Vous devez être connecté pour pouvoir publier un message.
              </p>
            </div>
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Se connecter
            </button>
          </div>
        ) : !topicDetail.canPost ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-600">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-800">Accès restreint</h4>
            <p className="text-xs text-slate-500 mt-1">
              Vous devez être joueur ou Maître du Jeu sur cette campagne pour pouvoir participer à ce sujet.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitPost}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Rédiger une réponse</span>
              </h3>

              {/* Sélecteur "Poster en tant que" - affiché seulement si l'utilisateur a des personnages (MJ ou joueur avec persos) */}
              {topicDetail.availableCharacters.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="post-author-select" className="font-semibold text-slate-700 whitespace-nowrap">
                    Poster en tant que :
                  </label>
                  <select
                    id="post-author-select"
                    value={selectedPersoId ?? ''}
                    onChange={(e) => setSelectedPersoId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  >
                    <option value="">Moi-même ({user?.username})</option>
                    {topicDetail.availableCharacters.map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.name} {char.concept ? `(${char.concept})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Notification de succès */}
            {submitSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* Notification d'erreur */}
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Champ WYSIWYG */}
            <WysiwygEditor
              value={postContent}
              onChange={setPostContent}
              placeholder="Écrivez votre message RP ou vos remarques de jeu..."
              disabled={isSubmitting}
              minHeight="160px"
            />

            {/* Boutons d'action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTogglePreview}
                disabled={!postContent.trim() || isSubmitting}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  isPreviewOpen
                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isPreviewOpen ? 'Masquer l’aperçu' : 'Prévisualiser le message'}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !postContent.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publication en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publier le message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
