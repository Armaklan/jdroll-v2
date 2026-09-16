import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { campaignsApi } from '../api/campaigns';
import { TopicDetail, CharacterSummary } from '../types/campaign';
import { AppView, viewToPath } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { getUserColorClass, isUserAdmin } from '../utils/user';
import { WysiwygEditor } from '../components/WysiwygEditor';
import { DiceTowerModal } from '../components/DiceTowerModal';
import { CampaignHeader } from '../components/CampaignHeader';
import { CharacterWidgetsRenderer } from '../components/CharacterWidgetsRenderer';
import {
  serializeWidgets,
  changeWidgetValue,
  mergeCharacterWidgets,
} from '../utils/widgets';
import { parseDiceInHtml } from '../utils/dice-parser';
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
  Dices,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Users,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

interface TopicViewPageProps {
  topicId?: number;
  initialPage?: number;
  onNavigate?: (view: AppView) => void;
  onBackToForum?: () => void;
}

export const TopicViewPage: React.FC<TopicViewPageProps> = ({
  topicId,
  initialPage,
  onNavigate,
  onBackToForum,
}) => {
  const params = useParams<{ campaignId?: string; topicId?: string; page?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const effectiveTopicId = topicId ?? (params.topicId ? Number(params.topicId) : 0);
  const pageFromParam = params.page ? parseInt(params.page, 10) : undefined;
  const pageFromQuery = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
  const targetPageFromUrl =
    pageFromParam !== undefined && !isNaN(pageFromParam)
      ? pageFromParam
      : pageFromQuery !== undefined && !isNaN(pageFromQuery)
      ? pageFromQuery
      : initialPage;

  const { user, isAuthenticated } = useAuth();
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire d'envoi de message
  const [postContent, setPostContent] = useState<string>('');
  const [selectedPersoId, setSelectedPersoId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Formulaire de jet de dés
  const [diceFormula, setDiceFormula] = useState<string>('');
  const [diceDescription, setDiceDescription] = useState<string>('');
  const [isRollingDice, setIsRollingDice] = useState<boolean>(false);
  const [diceError, setDiceError] = useState<string | null>(null);
  const [diceSuccess, setDiceSuccess] = useState<string | null>(null);
  const [showDiceHelp, setShowDiceHelp] = useState<boolean>(false);
  const [isDiceTowerOpen, setIsDiceTowerOpen] = useState<boolean>(false);

  // État d'édition d'un message
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editPostContent, setEditPostContent] = useState<string>('');
  const [editPersoId, setEditPersoId] = useState<number | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // État de suppression d'un message
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState<boolean>(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const lastScrolledRef = useRef<string | null>(null);

  const handleNavigate = (view: AppView) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      navigate(viewToPath(view));
    }
  };

  const handleBackToForum = () => {
    if (onBackToForum) {
      onBackToForum();
    } else {
      const campId = topicDetail?.campagneId ?? (params.campaignId ? Number(params.campaignId) : 0);
      navigate(`/forum/${campId}`);
    }
  };

  const fetchTopic = async (pageToFetch?: number) => {
    if (!effectiveTopicId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getTopicPosts(effectiveTopicId, pageToFetch);
      setTopicDetail(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les messages du sujet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveTopicId) {
      fetchTopic(targetPageFromUrl);
    }
  }, [effectiveTopicId, targetPageFromUrl]);

  // Défilement automatique vers l'ancre du post (ex: #post1081687), vers le 1er non lu, ou vers la zone de post si tout lu
  useEffect(() => {
    if (!isLoading && topicDetail) {
      const campId = topicDetail.campagneId ?? (params.campaignId ? Number(params.campaignId) : 0);

      // Mettre à jour l'URL sans rechargement pour refléter la page chargée si non spécifiée dans l'URL
      if (pageFromParam === undefined && topicDetail.page) {
        window.history.replaceState(
          null,
          '',
          `/forum/${campId}/${effectiveTopicId}/page/${topicDetail.page}${window.location.hash}`
        );
      }

      const scrollKey = `${effectiveTopicId}_p${topicDetail.page}_${window.location.hash}`;
      if (lastScrolledRef.current === scrollKey) {
        return;
      }
      lastScrolledRef.current = scrollKey;

      const hash = window.location.hash;
      if (hash) {
        const cleanId = hash.replace(/^#/, '');
        const rawNum = cleanId.replace(/^post-?/, '');
        const findTargetElement = () =>
          document.getElementById(cleanId) ||
          document.getElementById(`post${rawNum}`) ||
          document.getElementById(`post-${rawNum}`);

        const timer = setTimeout(() => {
          const el = findTargetElement();
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'transition-all');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
            }, 3000);
          }
        }, 150);

        return () => clearTimeout(timer);
      } else if (pageFromParam === undefined && pageFromQuery === undefined) {
        // Arrivée sur le topic depuis la liste du forum sans numéro de page explicite
        const timer = setTimeout(() => {
          if (topicDetail.firstUnreadPostId) {
            const el =
              document.getElementById(`post${topicDetail.firstUnreadPostId}`) ||
              document.getElementById(`post-${topicDetail.firstUnreadPostId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'transition-all');
              setTimeout(() => {
                el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
              }, 3000);
            }
          } else {
            // Tout est lu -> défilement jusqu'à la zone de réponse
            if (formRef.current) {
              formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
          }
        }, 150);

        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, topicDetail]);

  const handlePageChange = (newPage: number) => {
    if (!topicDetail || newPage === topicDetail.page || newPage < 1 || newPage > topicDetail.totalPages) {
      return;
    }
    const campId = topicDetail.campagneId ?? (params.campaignId ? Number(params.campaignId) : 0);
    navigate(`/forum/${campId}/${effectiveTopicId}/page/${newPage}`);
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

  const handleStartEdit = (post: any) => {
    setEditingPostId(post.id);
    setEditPostContent(post.content || '');
    setEditPersoId(post.perso ? post.perso.id : null);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditPostContent('');
    setEditPersoId(null);
    setEditError(null);
  };

  const handleUpdatePostCharacterWidget = async (persoId: number, widgetId: string, delta: number) => {
    if (!topicDetail) return;
    const targetPost = topicDetail.posts.find((p) => p.perso && p.perso.id === persoId);
    if (!targetPost || !targetPost.perso) return;

    const campaignWidgetsRaw = topicDetail.campaign?.widgets;
    const currentWidgets = mergeCharacterWidgets(campaignWidgetsRaw, targetPost.perso.widgets);
    const updatedWidgets = changeWidgetValue(currentWidgets, widgetId, delta);
    const serialized = serializeWidgets(updatedWidgets);

    // Optimistically update all posts with this character
    setTopicDetail((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        posts: prev.posts.map((p) => {
          if (p.perso && p.perso.id === persoId) {
            return {
              ...p,
              perso: {
                ...p.perso,
                widgets: serialized,
              },
            };
          }
          return p;
        }),
      };
    });

    try {
      await campaignsApi.updateCharacter(persoId, { widgets: serialized }, topicDetail.campagneId || undefined);
    } catch (err) {
      console.error('Erreur lors de la mise à jour des widgets:', err);
    }
  };

  const handleSaveEdit = async (postId: number) => {
    if (!editPostContent.trim()) {
      setEditError('Le message ne peut pas être vide');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      const response = await campaignsApi.updatePost(postId, {
        content: editPostContent,
        persoId: editPersoId,
      });

      if (response && response.post) {
        setTopicDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            posts: prev.posts.map((p) => (p.id === postId ? response.post : p)),
          };
        });
      }
      setEditingPostId(null);
      setEditPostContent('');
      setEditPersoId(null);
    } catch (err: any) {
      setEditError(err.message || 'Erreur lors de la modification du message');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.');
    if (!confirmed) return;

    setDeletingPostId(postId);
    setIsDeletingPost(true);
    try {
      await campaignsApi.deletePost(postId);
      if (topicDetail) {
        if (topicDetail.posts.length === 1 && topicDetail.page > 1) {
          await fetchTopic(topicDetail.page - 1);
        } else {
          await fetchTopic(topicDetail.page);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression du message');
    } finally {
      setDeletingPostId(null);
      setIsDeletingPost(false);
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
      const res = await campaignsApi.createPost(effectiveTopicId, postContent, selectedPersoId);
      setPostContent('');
      setIsPreviewOpen(false);
      setSubmitSuccess('Votre message a été publié avec succès !');

      const campId = topicDetail?.campagneId ?? (params.campaignId ? Number(params.campaignId) : 0);
      const newPostId = res?.post?.id;
      if (newPostId) {
        navigate(`/forum/${campId}/${effectiveTopicId}/page/1#post${newPostId}`);
      } else {
        navigate(`/forum/${campId}/${effectiveTopicId}/page/1`);
      }
      await fetchTopic(1);

      setTimeout(() => {
        setSubmitSuccess(null);
      }, 4000);
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de la publication du message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollDice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDiceError(null);
    setDiceSuccess(null);

    if (!diceFormula.trim()) {
      setDiceError('Veuillez saisir une formule de dés (ex: 3d6, 3d8g2, 4df...)');
      return;
    }

    setIsRollingDice(true);
    try {
      const res = await campaignsApi.rollDice(effectiveTopicId, {
        formula: diceFormula.trim(),
        description: diceDescription.trim(),
      });

      setDiceFormula('');
      setDiceDescription('');
      setDiceSuccess(
        `Jet de dé effectué avec succès ! Résultat : ${res.evaluation.total}${res.evaluation.isSuccessCount ? ' succès' : ''}`
      );

      const campId = topicDetail?.campagneId ?? (params.campaignId ? Number(params.campaignId) : 0);
      const newPostId = res?.post?.id;
      if (newPostId) {
        navigate(`/forum/${campId}/${effectiveTopicId}/page/1#post${newPostId}`);
      } else {
        navigate(`/forum/${campId}/${effectiveTopicId}/page/1`);
      }
      await fetchTopic(1);

      setTimeout(() => {
        setDiceSuccess(null);
      }, 5000);
    } catch (err: any) {
      setDiceError(err.message || 'Erreur lors du lancer de dé.');
    } finally {
      setIsRollingDice(false);
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
          onClick={handleBackToForum}
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

  const campaignStyles = {
    '--pensee-color': topicDetail.penseeColor || '#8844CC',
    '--dialogue-color': topicDetail.dialogueColor || '#4488CC',
    '--rp1-color': topicDetail.rp1Color || '#ff6600',
    '--rp2-color': topicDetail.rp2Color || '#5EFF6C',
    '--color-pensee': topicDetail.penseeColor || '#8844CC',
    '--color-dialogue': topicDetail.dialogueColor || '#4488CC',
    '--color-rp1': topicDetail.rp1Color || '#ff6600',
    '--color-rp2': topicDetail.rp2Color || '#5EFF6C',
  } as React.CSSProperties;

  return (
    <div className="space-y-6" style={campaignStyles}>
      {/* Campaign Header */}
      {topicDetail.campaign && (
        <CampaignHeader
          campaign={topicDetail.campaign}
          activeTab="topic"
          onOpenDiceTower={() => setIsDiceTowerOpen(true)}
        />
      )}

      {/* Navigation / Fil d'Ariane & En-tête */}
      <div
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"
        style={{
          backgroundColor: topicDetail.sidebarColor || undefined,
          color: topicDetail.linkSidebarColor || topicDetail.textColor || undefined,
          borderColor: topicDetail.sidebarColor ? 'rgba(0, 0, 0, 0.1)' : undefined,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100/30">
          <div
            className="flex items-center gap-2 text-xs font-semibold"
            style={{ color: topicDetail.linkSidebarColor || topicDetail.textColor || undefined }}
          >
            <button
              onClick={handleBackToForum}
              className="hover:opacity-80 transition flex items-center gap-1"
              style={{ color: topicDetail.linkSidebarColor || undefined }}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{topicDetail.campaignTitle}</span>
            </button>
            <span>/</span>
            <span style={{ color: topicDetail.linkSidebarColor || topicDetail.textColor || undefined }}>
              {topicDetail.sectionTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToForum}
              style={{
                backgroundColor: topicDetail.sidebarColor ? 'rgba(255, 255, 255, 0.1)' : undefined,
                color: topicDetail.linkSidebarColor || undefined,
                borderColor: topicDetail.sidebarColor ? 'rgba(255, 255, 255, 0.2)' : undefined,
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au forum</span>
            </button>
          </div>
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
              {(topicDetail.isPrivate === 1 || topicDetail.isPrivate === true) ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  <EyeOff className="w-3 h-3 text-purple-600" />
                  <span>Privé</span>
                </span>
              ) : (topicDetail.isPrivate as any) === 2 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  <Globe className="w-3 h-3 text-teal-600" />
                  <span>Grand public</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <span>Public</span>
                </span>
              )}
              <h2
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ color: topicDetail.linkSidebarColor || topicDetail.textColor || undefined }}
              >
                {topicDetail.title}
              </h2>
            </div>

            {(topicDetail.isPrivate === 1 || topicDetail.isPrivate === true) && (
              <div className="flex items-center gap-2 p-2.5 bg-purple-50/90 border border-purple-200 rounded-xl text-xs text-purple-900 mt-2">
                <Users className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="font-bold">Accès au sujet :</span>{' '}
                  {topicDetail.canReadUsers && topicDetail.canReadUsers.length > 0
                    ? `Accessible par le MJ et ${topicDetail.canReadUsers.map((u) => u.username).join(', ')}`
                    : 'Accessible uniquement par le Maître du Jeu'}
                </div>
              </div>
            )}

            <p
              className="text-xs"
              style={{
                color: topicDetail.linkSidebarColor || topicDetail.textColor || undefined,
                opacity: 0.8,
              }}
            >
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
          {topicDetail.posts.map((post, postIdx) => {
            const isLastRead = topicDetail.lastReadPostId === post.id;
            const isFirstUnread = topicDetail.firstUnreadPostId === post.id;
            const isSystem = !post.perso && (!post.user || !post.user.id || post.user.id === 0 || post.user.username === 'Système');
            const authorName = post.perso?.name || (isSystem ? 'Jet de dés' : post.user.username);
            const avatarUrl = post.perso?.avatar || post.user.avatar;
            const isGm = !isSystem && post.user.profil === 1;

            const isMj = topicDetail.userRole === 'mj' || Boolean(topicDetail.campaign && topicDetail.campaign.mjId === user?.id);
            const isGeneralForumAdmin = (!topicDetail.campagneId || topicDetail.campagneId === 0) && isUserAdmin(user?.profil);
            const isAuthor = Boolean(user && post.user && post.user.id === user.id);
            const isTopicClosed = Boolean(topicDetail.isClosed);
            const canEdit = Boolean(isAuthenticated && (isMj || isGeneralForumAdmin || (isAuthor && !isTopicClosed)));
            const isLastPostInThread = topicDetail.page === 1 && postIdx === topicDetail.posts.length - 1;
            const canDelete = Boolean(isAuthenticated && (isMj || isGeneralForumAdmin || (isAuthor && isLastPostInThread && !isTopicClosed)));
            const isCurrentlyEditing = editingPostId === post.id;

            const isOdd = postIdx % 2 === 0;
            const postBg = isOdd
              ? topicDetail.oddLineColor
              : topicDetail.evenLineColor;
            const postTextColor = topicDetail.textColor;
            const postLinkColor = topicDetail.linkColor;

            return (
              <div
                key={post.id}
                id={`post${post.id}`}
                data-post-id={post.id}
                style={{
                  backgroundColor: postBg || undefined,
                  color: postTextColor || undefined,
                  borderColor: postBg ? 'rgba(0, 0, 0, 0.1)' : undefined,
                  ...(postLinkColor ? { '--link-color': postLinkColor } : {}),
                  ...(postTextColor ? { '--text-color': postTextColor } : {}),
                } as React.CSSProperties}
                className={`border rounded-2xl p-5 shadow-xs transition duration-150 ${
                  isFirstUnread
                    ? 'border-indigo-500 ring-2 ring-indigo-200'
                    : isLastRead
                    ? 'border-indigo-400 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                } ${!postBg ? 'bg-white' : ''}`}
              >
                {/* En-tête du message */}
                <div
                  className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 text-xs text-slate-500"
                  style={{ color: postTextColor || undefined }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold opacity-70" style={{ color: postTextColor || undefined }}>
                      #{post.id}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 opacity-70" style={{ color: postTextColor || undefined }} />
                      <span style={{ color: postTextColor || undefined }}>{formatDate(post.createDate)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFirstUnread && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>1er non lu</span>
                      </span>
                    )}
                    {isLastRead && !isFirstUnread && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                        <BookmarkCheck className="w-3 h-3" />
                        <span>Dernier lu</span>
                      </span>
                    )}

                    {/* Actions : Édition & Suppression */}
                    {!isCurrentlyEditing && (
                      <div className="flex items-center gap-1 ml-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(post)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition shadow-2xs cursor-pointer"
                            title="Modifier ce message"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Éditer</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={isDeletingPost && deletingPostId === post.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Supprimer ce message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Corps du message : Auteur à gauche, Texte à droite */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Colonne Profil / Personnage (Gauche) */}
                  <div className="md:col-span-3 flex md:flex-col items-center md:items-start gap-3 md:gap-2 pb-3 md:pb-0 md:border-r border-slate-100 md:pr-4">
                    {/* Avatar */}
                    <div className="relative">
                      {isSystem ? (
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-2 border-indigo-400 flex items-center justify-center font-bold text-2xl shadow-xs">
                          <Dices className="w-7 h-7" />
                        </div>
                      ) : avatarUrl ? (
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
                      <h4
                        className={`font-bold text-sm sm:text-base leading-tight ${
                          !post.perso ? getUserColorClass(post.user?.profil) : ''
                        }`}
                        style={{ color: postLinkColor || postTextColor || undefined }}
                      >
                        {authorName}
                      </h4>

                      {isSystem && (
                        <span className="inline-block text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          Système
                        </span>
                      )}

                      {post.perso?.concept && (
                        <p className="text-xs font-medium italic opacity-90" style={{ color: postTextColor || undefined }}>
                          {post.perso.concept}
                        </p>
                      )}

                      {!isSystem && post.perso && (
                        <p className="text-[11px] opacity-75" style={{ color: postTextColor || undefined }}>
                          Joueur :{' '}
                          <span className={`font-medium ${getUserColorClass(post.user?.profil)}`} style={{ color: postLinkColor || postTextColor || undefined }}>
                            {post.user.username}
                          </span>
                        </p>
                      )}

                      {!isSystem && !post.perso && post.user.titre && (
                        <p className="text-[11px] font-medium opacity-80" style={{ color: postTextColor || undefined }}>
                          {post.user.titre}
                        </p>
                      )}

                      {/* Widgets du personnage dans le forum */}
                      {(() => {
                        if (!post.perso) return null;
                        const isCharacterOwner = Boolean(user && post.perso.userId === user.id);
                        const canSeeWidgets = isMj || isCharacterOwner;
                        if (!canSeeWidgets) return null;

                        const charWidgets = mergeCharacterWidgets(topicDetail.campaign?.widgets, post.perso.widgets);
                        if (charWidgets.length === 0) return null;

                        return (
                          <div className="w-full pt-1.5">
                            <CharacterWidgetsRenderer
                              widgets={charWidgets}
                              isEditable={isMj || isCharacterOwner}
                              onUpdateWidget={(widgetId, delta) =>
                                handleUpdatePostCharacterWidget(post.perso!.id, widgetId, delta)
                              }
                              variant="sidebar"
                              textColor={postTextColor}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Contenu du message (Droite) */}
                  <div className="md:col-span-9 min-w-0">
                    {isCurrentlyEditing ? (
                      <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-slate-800">
                        {editError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                            <span>{editError}</span>
                          </div>
                        )}

                        {/* Choix du personnage si applicable */}
                        {topicDetail.campagneId && topicDetail.availableCharacters && topicDetail.availableCharacters.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Poster en tant que :</span>
                            </label>
                            <select
                              value={editPersoId ?? ''}
                              onChange={(e) => setEditPersoId(e.target.value ? Number(e.target.value) : null)}
                              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            >
                              <option value="">Aucun personnage ({post.user?.username || user?.username})</option>
                              {(isMj
                                ? topicDetail.availableCharacters
                                : topicDetail.availableCharacters.filter((c) => c.userId === post.user?.id)
                              ).map((perso) => (
                                <option key={perso.id} value={perso.id}>
                                  {perso.name} {perso.concept ? `(${perso.concept})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <WysiwygEditor
                          value={editPostContent}
                          onChange={setEditPostContent}
                          placeholder="Modifier votre message..."
                          minHeight="160px"
                        />

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSavingEdit}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Annuler</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(post.id)}
                            disabled={isSavingEdit || !editPostContent.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                          >
                            {isSavingEdit ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Enregistrement...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Enregistrer</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="post-content-container text-sm sm:text-base leading-relaxed space-y-3 prose max-w-none break-words"
                        style={{
                          color: postTextColor || undefined,
                          '--tw-prose-body': postTextColor || 'inherit',
                          '--tw-prose-headings': postTextColor || 'inherit',
                          '--tw-prose-links': postLinkColor || '#2563eb',
                          '--tw-prose-bold': postTextColor || 'inherit',
                          '--tw-prose-quotes': postTextColor || 'inherit',
                        } as React.CSSProperties}
                        dangerouslySetInnerHTML={{ __html: parseDiceInHtml(post.content) }}
                      />
                    )}
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
                    className="wysiwyg-content post-content-container text-slate-900 text-sm sm:text-base leading-relaxed space-y-3 prose prose-slate max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: parseDiceInHtml(postContent) }}
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
            onClick={handleBackToForum}
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
      <div ref={formRef} className="pt-2 space-y-4">
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
                Vous devez être connecté pour pouvoir publier un message ou lancer des dés.
              </p>
            </div>
            <button
              onClick={() => handleNavigate('login')}
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
          <>
            {/* Section Lancer un jet de dé */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Dices className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Demander un jet de dé</h3>
                    <p className="text-xs text-slate-500">
                      Saisissez une formule et une description pour effectuer un jet immédiat
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDiceHelp(!showDiceHelp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{showDiceHelp ? 'Masquer les syntaxes' : 'Syntaxes supportées'}</span>
                  {showDiceHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Aide aux syntaxes de dés */}
              {showDiceHelp && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs text-slate-700 space-y-2.5">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Guide des formules de dés supportées :</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">3d6</span> : Lance 3 dés à 6 faces
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">3du</span> : Lance 3 dés ubiquity (0 ou 1)
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">4df</span> : Lance 4 dés fudge (-1, 0, +1)
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">3d6 + 3</span> : Lance 3 dés à 6 faces et ajoute 3
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">1d8 + 2d10</span> : Lance 1 dé à 8 faces et 2 dés à 10 faces, puis les ajoute
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">3d8g2</span> : Lance 3 dés à 8 faces et conserve les 2 meilleurs (great)
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">3d8l2</span> : Lance 3 dés à 8 faces et conserve les 2 moins bons (less)
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">(1d8 + 2d6)g1</span> : Lance 1 dé à 8 faces et 2 dés à 6 faces, puis conserve le meilleur
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">3d10&gt;7</span> : Lance 3 dés à 10 faces et compte les résultats &gt; 7
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100">
                      <span className="font-bold text-indigo-600">3d10&lt;7</span> : Lance 3 dés à 10 faces et compte les résultats &lt; 7
                    </div>
                  </div>
                </div>
              )}

              {/* Notification succès jet de dé */}
              {diceSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{diceSuccess}</span>
                </div>
              )}

              {/* Notification erreur jet de dé */}
              {diceError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{diceError}</span>
                </div>
              )}

              {/* Formulaire de saisie du jet */}
              <form onSubmit={handleRollDice} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label htmlFor="dice-formula" className="block text-xs font-bold text-slate-700 mb-1">
                      Formule <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="dice-formula"
                      type="text"
                      value={diceFormula}
                      onChange={(e) => setDiceFormula(e.target.value)}
                      placeholder="ex: 3d6+3, 3d8g2, 4df..."
                      disabled={isRollingDice}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition"
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label htmlFor="dice-description" className="block text-xs font-bold text-slate-700 mb-1">
                      Description du jet
                    </label>
                    <input
                      id="dice-description"
                      type="text"
                      value={diceDescription}
                      onChange={(e) => setDiceDescription(e.target.value)}
                      placeholder="ex: Jet de perception, Attaque à l'épée..."
                      disabled={isRollingDice}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Raccourcis de formules courantes */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">Raccourcis :</span>
                  {[
                    '3d6',
                    '3du',
                    '4df',
                    '3d6 + 3',
                    '1d8 + 2d10',
                    '3d8g2',
                    '3d8l2',
                    '(1d8 + 2d6)g1',
                    '3d10>7',
                    '3d10<7',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDiceFormula(preset)}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium bg-slate-100 border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isRollingDice || !diceFormula.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs disabled:cursor-not-allowed transition"
                  >
                    {isRollingDice ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Lancement en cours...</span>
                      </>
                    ) : (
                      <>
                        <Dices className="w-3.5 h-3.5" />
                        <span>Lancer les dés</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Formulaire de publication WYSIWYG */}
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
              onUploadImage={
                topicDetail && topicDetail.campagneId
                  ? async (file: File) => {
                      const res = await campaignsApi.uploadCampaignImage(topicDetail.campagneId!, file);
                      return res.url;
                    }
                  : undefined
              }
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
          </>
        )}
        {topicDetail && Boolean(topicDetail.campagneId && (topicDetail.userRole === 'mj' || topicDetail.userRole === 'player')) && (
          <DiceTowerModal
            isOpen={isDiceTowerOpen}
            onClose={() => setIsDiceTowerOpen(false)}
            campaignId={topicDetail.campagneId!}
            campaignName={topicDetail.campaignTitle}
            isMj={topicDetail.userRole === 'mj'}
          />
        )}
      </div>
    </div>
  );
};
