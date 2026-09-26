import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '../api/campaigns';
import { GeneralForumData, ForumSectionSummary, ForumTopicSummary } from '../types/campaign';
import { AppView, viewToPath } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { isUserAdmin } from '../utils/user';
import { UserPseudoLink } from '../components/UserPseudoLink';
import { WysiwygEditor } from '../components/WysiwygEditor';
import { formatDate } from '../utils/date';
import {
  MessageSquare,
  Pin,
  Lock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Globe,
  SlidersHorizontal,
  Plus,
  GripVertical,
  X,
  Check,
  FilePlus,
  Shield,
  Loader2,
  Upload,
  Pencil,
  Trash2,
} from 'lucide-react';
import { GlobalFloatingSearch } from '../components/GlobalFloatingSearch';

interface GeneralForumPageProps {
  onNavigate?: (view: AppView) => void;
  onSelectTopic?: (topicId: number) => void;
}

export const GeneralForumPage: React.FC<GeneralForumPageProps> = ({
  onNavigate,
  onSelectTopic,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isUserAdmin(user?.profil);

  const [forumData, setForumData] = useState<GeneralForumData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string | number, boolean>>({});

  // Mode Administration
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Drag and drop states
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);
  const [draggedTopicInfo, setDraggedTopicInfo] = useState<{
    sectionId: number;
    topicIndex: number;
    topicId: number;
  } | null>(null);
  const [dragOverTopicInfo, setDragOverTopicInfo] = useState<{
    sectionId: number;
    topicIndex: number;
  } | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<number | null>(null);

  // Modal Création de Section
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState<boolean>(false);
  const [newSectionTitle, setNewSectionTitle] = useState<string>('');
  const [newSectionDefaultCollapse, setNewSectionDefaultCollapse] = useState<boolean>(false);
  const [newSectionBanniere, setNewSectionBanniere] = useState<string>('');
  const [sectionBanniereMode, setSectionBanniereMode] = useState<'url' | 'upload'>('upload');
  const [isUploadingSectionBanniere, setIsUploadingSectionBanniere] = useState<boolean>(false);
  const sectionBanniereInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingSection, setIsSubmittingSection] = useState<boolean>(false);
  const [sectionModalError, setSectionModalError] = useState<string | null>(null);

  // Modal Édition de Section
  const [editingSection, setEditingSection] = useState<ForumSectionSummary | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState<string>('');
  const [editSectionDefaultCollapse, setEditSectionDefaultCollapse] = useState<boolean>(false);
  const [editSectionBanniere, setEditSectionBanniere] = useState<string>('');
  const [editSectionBanniereMode, setEditSectionBanniereMode] = useState<'url' | 'upload'>('upload');
  const [isUploadingEditSectionBanniere, setIsUploadingEditSectionBanniere] = useState<boolean>(false);
  const editSectionBanniereInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingEditSection, setIsSubmittingEditSection] = useState<boolean>(false);
  const [editSectionModalError, setEditSectionModalError] = useState<string | null>(null);

  // Modal Suppression de Section
  const [deletingSection, setDeletingSection] = useState<ForumSectionSummary | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState<boolean>(false);
  const [deleteSectionError, setDeleteSectionError] = useState<string | null>(null);

  // Modal Création de Sujet
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState<boolean>(false);
  const [createTopicSectionId, setCreateTopicSectionId] = useState<number>(0);
  const [newTopicTitle, setNewTopicTitle] = useState<string>('');
  const [newTopicStickable, setNewTopicStickable] = useState<boolean>(false);
  const [newTopicIsClosed, setNewTopicIsClosed] = useState<boolean>(false);
  const [newTopicFirstPost, setNewTopicFirstPost] = useState<string>('');
  const [isSubmittingTopic, setIsSubmittingTopic] = useState<boolean>(false);
  const [topicModalError, setTopicModalError] = useState<string | null>(null);

  // Modal Édition de Sujet
  const [editingTopic, setEditingTopic] = useState<{
    id: number;
    sectionId: number;
    title: string;
    stickable: boolean;
    isClosed: boolean;
  } | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState<string>('');
  const [editTopicStickable, setEditTopicStickable] = useState<boolean>(false);
  const [editTopicIsClosed, setEditTopicIsClosed] = useState<boolean>(false);
  const [isSubmittingEditTopic, setIsSubmittingEditTopic] = useState<boolean>(false);
  const [editTopicError, setEditTopicError] = useState<string | null>(null);

  // Modal Suppression de Sujet
  const [deletingTopic, setDeletingTopic] = useState<ForumTopicSummary | null>(null);
  const [isDeletingTopic, setIsDeletingTopic] = useState<boolean>(false);
  const [deleteTopicError, setDeleteTopicError] = useState<string | null>(null);

  // Mark all topics as read
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState<boolean>(false);

  const handleMarkAllAsRead = async () => {
    if (!isAuthenticated || !user) return;

    setIsMarkingAllAsRead(true);

    try {
      await campaignsApi.markAllGeneralForumTopicsAsRead();
      // Refresh the forum data to update read status
      const data = await campaignsApi.getGeneralForum();
      setForumData(data);
    } catch (err: any) {
      console.error('Erreur lors du marquage comme lu:', err);
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  const handleNavigate = (view: AppView) => {
    if (onNavigate) onNavigate(view);
    else navigate(viewToPath(view));
  };

  const handleSelectTopic = (topicId: number) => {
    if (onSelectTopic) onSelectTopic(topicId);
    else navigate(`/forum/0/${topicId}`);
  };

  const fetchForum = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getGeneralForum();
      setForumData(data);

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

  const toggleSection = (sectionId: string | number) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Gestion des Bannières de Section
  const handleSectionBanniereUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSectionModalError('Le fichier déposé doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }
    setIsUploadingSectionBanniere(true);
    setSectionModalError(null);
    try {
      // Pour une nouvelle section, on peut uploader en tant qu'image de campagne 0
      const res = await campaignsApi.uploadCampaignImage(0, file);
      setNewSectionBanniere(res.url);
      setSectionBanniereMode('upload');
    } catch (err: any) {
      setSectionModalError(err.message || 'Erreur lors du téléversement de la bannière.');
    } finally {
      setIsUploadingSectionBanniere(false);
      if (sectionBanniereInputRef.current) {
        sectionBanniereInputRef.current.value = '';
      }
    }
  };

  const handleEditSectionBanniereUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setEditSectionModalError('Le fichier déposé doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }
    if (!editingSection) return;
    setIsUploadingEditSectionBanniere(true);
    setEditSectionModalError(null);
    try {
      const res = await campaignsApi.uploadSectionBanner(editingSection.id, file);
      setEditSectionBanniere(res.url);
      setEditSectionBanniereMode('upload');
    } catch (err: any) {
      setEditSectionModalError(err.message || 'Erreur lors du téléversement de la bannière.');
    } finally {
      setIsUploadingEditSectionBanniere(false);
      if (editSectionBanniereInputRef.current) {
        editSectionBanniereInputRef.current.value = '';
      }
    }
  };

  // Section Creation
  const handleOpenCreateSection = () => {
    setNewSectionTitle('');
    setNewSectionDefaultCollapse(false);
    setNewSectionBanniere('');
    setSectionBanniereMode('upload');
    setSectionModalError(null);
    setIsCreateSectionOpen(true);
  };

  const handleCreateSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) {
      setSectionModalError('Le titre de la section est requis.');
      return;
    }

    setIsSubmittingSection(true);
    setSectionModalError(null);

    try {
      await campaignsApi.createSection(0, {
        title: newSectionTitle.trim(),
        defaultCollapse: newSectionDefaultCollapse,
        banniere: newSectionBanniere.trim() || undefined,
      });

      await fetchForum();
      setIsCreateSectionOpen(false);
      setSaveStatusMessage('Section créée avec succès !');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setSectionModalError(err.message || 'Erreur lors de la création de la section.');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  // Section Edition
  const handleOpenEditSection = (section: ForumSectionSummary) => {
    setEditingSection(section);
    setEditSectionTitle(section.title);
    setEditSectionDefaultCollapse(Boolean(section.defaultCollapse));
    setEditSectionBanniere(section.banniere || '');
    setEditSectionBanniereMode(section.banniere ? 'url' : 'upload');
    setEditSectionModalError(null);
  };

  const handleEditSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    if (!editSectionTitle.trim()) {
      setEditSectionModalError('Le titre de la section est requis.');
      return;
    }

    setIsSubmittingEditSection(true);
    setEditSectionModalError(null);

    try {
      const res = await campaignsApi.updateSection(editingSection.id, {
        title: editSectionTitle.trim(),
        defaultCollapse: editSectionDefaultCollapse,
        banniere: editSectionBanniere.trim(),
      });

      if (forumData) {
        const updatedSections = forumData.sections.map((sec) =>
          sec.id === editingSection.id
            ? {
                ...sec,
                title: res.section.title,
                defaultCollapse: res.section.defaultCollapse,
                banniere: res.section.banniere,
              }
            : sec
        );
        setForumData({
          ...forumData,
          sections: updatedSections,
        });
      }

      setEditingSection(null);
      setSaveStatusMessage('Section modifiée avec succès !');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setEditSectionModalError(err.message || 'Erreur lors de la modification de la section.');
    } finally {
      setIsSubmittingEditSection(false);
    }
  };

  // Section Deletion
  const handleOpenDeleteSection = (section: ForumSectionSummary) => {
    setDeletingSection(section);
    setDeleteSectionError(null);
  };

  const handleDeleteSectionConfirm = async () => {
    if (!deletingSection) return;
    setIsDeletingSection(true);
    setDeleteSectionError(null);

    try {
      await campaignsApi.deleteSection(deletingSection.id);
      await fetchForum();
      setDeletingSection(null);
      setSaveStatusMessage('Section et ses sujets supprimés avec succès !');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setDeleteSectionError(err.message || 'Erreur lors de la suppression de la section.');
    } finally {
      setIsDeletingSection(false);
    }
  };

  // Topic Creation
  const handleOpenCreateTopic = (sectionId?: number) => {
    const secId = sectionId || (forumData && forumData.sections.length > 0 ? forumData.sections[0].id : 0);
    setCreateTopicSectionId(secId);
    setNewTopicTitle('');
    setNewTopicStickable(false);
    setNewTopicIsClosed(false);
    setNewTopicFirstPost('');
    setTopicModalError(null);
    setIsCreateTopicOpen(true);
  };

  const handleCreateTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTopicSectionId) {
      setTopicModalError('Veuillez sélectionner une section.');
      return;
    }
    if (!newTopicTitle.trim()) {
      setTopicModalError('Le titre du sujet est requis.');
      return;
    }

    setIsSubmittingTopic(true);
    setTopicModalError(null);

    try {
      const res = await campaignsApi.createTopic(createTopicSectionId, {
        title: newTopicTitle.trim(),
        stickable: isAdmin ? newTopicStickable : false,
        isClosed: isAdmin ? newTopicIsClosed : false,
        firstPostContent: newTopicFirstPost.trim() || undefined,
      });

      setIsCreateTopicOpen(false);
      if (res.topic && res.topic.id) {
        handleSelectTopic(res.topic.id);
      } else {
        await fetchForum();
      }
    } catch (err: any) {
      setTopicModalError(err.message || 'Erreur lors de la création du sujet.');
    } finally {
      setIsSubmittingTopic(false);
    }
  };

  // Topic Edition
  const handleOpenEditTopic = (sectionId: number, topic: ForumTopicSummary) => {
    setEditingTopic({
      id: topic.id,
      sectionId,
      title: topic.title,
      stickable: Boolean(topic.stickable),
      isClosed: Boolean(topic.isClosed),
    });
    setEditTopicTitle(topic.title);
    setEditTopicStickable(Boolean(topic.stickable));
    setEditTopicIsClosed(Boolean(topic.isClosed));
    setEditTopicError(null);
  };

  const handleEditTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;
    if (!editTopicTitle.trim()) {
      setEditTopicError('Le titre du sujet est requis.');
      return;
    }

    setIsSubmittingEditTopic(true);
    setEditTopicError(null);

    try {
      await campaignsApi.updateTopic(editingTopic.id, {
        title: editTopicTitle.trim(),
        stickable: editTopicStickable,
        isClosed: editTopicIsClosed,
      });

      await fetchForum();
      setEditingTopic(null);
      setSaveStatusMessage('Sujet modifié avec succès !');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setEditTopicError(err.message || 'Erreur lors de la modification du sujet.');
    } finally {
      setIsSubmittingEditTopic(false);
    }
  };

  // Topic Deletion
  const handleOpenDeleteTopic = (topic: ForumTopicSummary) => {
    setDeletingTopic(topic);
    setDeleteTopicError(null);
  };

  const handleDeleteTopicConfirm = async () => {
    if (!deletingTopic) return;
    setIsDeletingTopic(true);
    setDeleteTopicError(null);

    try {
      await campaignsApi.deleteTopic(deletingTopic.id);
      await fetchForum();
      setDeletingTopic(null);
      setSaveStatusMessage('Sujet et ses messages supprimés avec succès !');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setDeleteTopicError(err.message || 'Erreur lors de la suppression du sujet.');
    } finally {
      setIsDeletingTopic(false);
    }
  };

  // Drag and drop sections
  const handleSectionDragStart = (e: React.DragEvent, index: number) => {
    if (!isAdminMode || draggedTopicInfo) return;
    setDraggedSectionIndex(index);
    e.dataTransfer.setData('text/plain', `section:${index}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    if (!isAdminMode) return;
    if (draggedSectionIndex !== null && draggedSectionIndex !== index) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverSectionIndex(index);
    }
  };

  const handleSectionDrop = async (e: React.DragEvent, targetIndex: number) => {
    if (!isAdminMode) return;
    e.preventDefault();
    if (draggedSectionIndex !== null && draggedSectionIndex !== targetIndex && forumData) {
      const newSections = [...forumData.sections];
      const [movedSection] = newSections.splice(draggedSectionIndex, 1);
      newSections.splice(targetIndex, 0, movedSection);

      setForumData({ ...forumData, sections: newSections });
      setDraggedSectionIndex(null);
      setDragOverSectionIndex(null);

      try {
        setIsSavingOrder(true);
        await campaignsApi.reorderSections(0, newSections.map((s) => s.id));
        setSaveStatusMessage('Ordre des sections mis à jour');
        setTimeout(() => setSaveStatusMessage(null), 3000);
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la sauvegarde de l’ordre des sections');
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  // Drag and drop topics
  const handleTopicDragStart = (e: React.DragEvent, sectionId: number, topicIndex: number, topicId: number) => {
    if (!isAdminMode) return;
    e.stopPropagation();
    setDraggedTopicInfo({ sectionId, topicIndex, topicId });
    e.dataTransfer.setData('text/plain', `topic:${sectionId}:${topicIndex}:${topicId}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTopicDragOver = (e: React.DragEvent, sectionId: number, topicIndex: number) => {
    if (!isAdminMode || !draggedTopicInfo) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTopicInfo({ sectionId, topicIndex });
    setDragOverSectionId(sectionId);
  };

  const handleTopicDrop = async (e: React.DragEvent, targetSectionId: number, targetTopicIndex: number) => {
    if (!isAdminMode || !draggedTopicInfo || !forumData) return;
    e.preventDefault();
    e.stopPropagation();

    const { sectionId: sourceSectionId, topicIndex: sourceTopicIndex } = draggedTopicInfo;

    if (sourceSectionId === targetSectionId && sourceTopicIndex === targetTopicIndex) {
      setDraggedTopicInfo(null);
      setDragOverTopicInfo(null);
      setDragOverSectionId(null);
      return;
    }

    const newSections = forumData.sections.map((sec) => {
      const copyTopics = [...sec.topics];
      return { ...sec, topics: copyTopics };
    });

    const sourceSec = newSections.find((s) => s.id === sourceSectionId);
    const targetSec = newSections.find((s) => s.id === targetSectionId);

    if (!sourceSec || !targetSec) return;

    const [movedTopic] = sourceSec.topics.splice(sourceTopicIndex, 1);
    targetSec.topics.splice(targetTopicIndex, 0, movedTopic);

    setForumData({ ...forumData, sections: newSections });
    setDraggedTopicInfo(null);
    setDragOverTopicInfo(null);
    setDragOverSectionId(null);

    try {
      setIsSavingOrder(true);
      const reorderPayload = newSections.map((sec) => ({
        sectionId: sec.id,
        topicIds: sec.topics.map((t) => t.id),
      }));

      await campaignsApi.reorderTopics(0, reorderPayload);
      setSaveStatusMessage('Ordre des sujets mis à jour');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde de l’ordre des sujets');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSectionTopicsDrop = async (e: React.DragEvent, targetSectionId: number) => {
    if (!isAdminMode || !draggedTopicInfo || !forumData) return;
    e.preventDefault();
    e.stopPropagation();

    const targetSec = forumData.sections.find((s) => s.id === targetSectionId);
    const targetIndex = targetSec ? targetSec.topics.length : 0;
    await handleTopicDrop(e, targetSectionId, targetIndex);
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
            onClick={fetchForum}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl transition cursor-pointer"
          >
            Réessayer
          </button>
          <button
            onClick={() => handleNavigate('home')}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl transition cursor-pointer"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const unreadTopics = forumData.sections.flatMap((sec) =>
    sec.topics
      .filter((topic) => !topic.isRead)
      .map((topic) => ({ ...topic, sectionTitle: sec.title }))
  );

  return (
    <div className="space-y-6">
      <GlobalFloatingSearch activeTab="general-forum" />
      {/* En-tête du Forum Général */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-50 rounded-full blur-2xl opacity-60 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
              <Globe className="w-3.5 h-3.5" />
              <span>Communauté & Discussions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Forum Général
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Discussions ouvertes entre joueurs et maîtres du jeu. Retrouvez ici les actualités du site, les annonces de parties et les échanges autour du jeu de rôle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {isAdmin && (
              <button
                onClick={() => setIsAdminMode(!isAdminMode)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer ${
                  isAdminMode
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{isAdminMode ? 'Quitter l’administration' : 'Administrer'}</span>
              </button>
            )}

            {isAuthenticated && (
              <>
                <button
                  onClick={() => handleOpenCreateTopic()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau sujet</span>
                </button>
                {unreadTopics.length > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={isMarkingAllAsRead}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMarkingAllAsRead ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Tout marquer comme lu</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Barre d'outils du mode administration */}
        {isAdminMode && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 -mx-6 -mb-6 p-4 sm:px-6 rounded-b-3xl">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Mode administrateur actif : réorganisez les sections et sujets par glisser-déposer ou modifiez-les.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateSection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouvelle section</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message de notification d'action */}
      {saveStatusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveStatusMessage}</span>
          </div>
        </div>
      )}

      {/* Message de sauvegarde en cours */}
      {isSavingOrder && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-xs">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          <span>Sauvegarde de l'ordre en cours...</span>
        </div>
      )}

      {/* Sections du forum */}
      {forumData.sections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Aucune section pour le moment</h3>
          <p className="text-xs text-slate-500 mb-6">Le forum ne contient encore aucune catégorie de discussion.</p>
          {isAdmin && (
            <button
              onClick={handleOpenCreateSection}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer la première section</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section Messages non lus */}
          {unreadTopics.length > 0 && (
            <div className="bg-white border border-indigo-200 ring-1 ring-indigo-100 rounded-2xl shadow-xs overflow-hidden">
              {/* En-tête de la section non lus */}
              <div className="p-4 sm:px-6 bg-indigo-50/70 flex items-center justify-between gap-4 border-b border-indigo-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
                    Messages non lus
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-200/70 text-indigo-800 shrink-0">
                    {unreadTopics.length} {unreadTopics.length > 1 ? 'sujets' : 'sujet'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSection('unread')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-indigo-100/50 transition cursor-pointer"
                    title={collapsedSections['unread'] ? 'Déplier la section' : 'Replier la section'}
                  >
                    {collapsedSections['unread'] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Liste des sujets non lus */}
              {!collapsedSections['unread'] && (
                <div className="divide-y divide-slate-100">
                  {unreadTopics.map((topic) => (
                    <div
                      key={`unread-${topic.id}`}
                      className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0">
                          {topic.stickable ? (
                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                              <Pin className="w-4 h-4" />
                            </div>
                          ) : topic.isClosed ? (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center">
                              <Lock className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl border flex items-center justify-center bg-indigo-50 text-indigo-600 border-indigo-200">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {topic.sectionTitle && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {topic.sectionTitle}
                              </span>
                            )}
                            {topic.stickable && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Épinglé
                              </span>
                            )}
                            {topic.isClosed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Fermé
                              </span>
                            )}
                            <button
                              onClick={() => handleSelectTopic(topic.id)}
                              className="text-sm font-bold truncate text-left hover:text-indigo-600 transition cursor-pointer text-slate-900"
                            >
                              {topic.title}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>
                              {topic.postsCount} {topic.postsCount > 1 ? 'messages' : 'message'}
                            </span>

                            {topic.lastPost && (
                              <>
                                <span>&bull;</span>
                                <span>
                                  Dernier message par{' '}
                                  <strong className="font-semibold">
                                    <UserPseudoLink
                                      userId={topic.lastPost.userId}
                                      username={topic.lastPost.username}
                                      profil={topic.lastPost.userProfil}
                                      className="text-slate-700"
                                    />
                                  </strong>{' '}
                                  le {formatDate(topic.lastPost.createDate)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleSelectTopic(topic.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border border-slate-200 transition cursor-pointer"
                        >
                          Voir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {forumData.sections.map((section, sectionIdx) => {
            const isCollapsed = collapsedSections[section.id];
            const isSectionDragged = draggedSectionIndex === sectionIdx;
            const isSectionDragOver = dragOverSectionIndex === sectionIdx;

            return (
              <div
                key={section.id}
                draggable={isAdminMode && !draggedTopicInfo}
                onDragStart={(e) => handleSectionDragStart(e, sectionIdx)}
                onDragOver={(e) => handleSectionDragOver(e, sectionIdx)}
                onDrop={(e) => handleSectionDrop(e, sectionIdx)}
                className={`bg-white border rounded-2xl shadow-xs transition-all duration-200 overflow-hidden ${
                  isSectionDragged
                    ? 'opacity-40 border-dashed border-indigo-400'
                    : isSectionDragOver
                    ? 'border-indigo-500 ring-2 ring-indigo-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Bannière de section optionnelle */}
                {section.banniere && (
                  <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-slate-900 border-b border-slate-100">
                    <img
                      src={section.banniere}
                      alt={section.title}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <h2 className="text-lg sm:text-xl font-bold drop-shadow-md">
                        {section.title}
                      </h2>
                    </div>
                  </div>
                )}

                {/* En-tête de section */}
                <div className="p-4 sm:px-6 bg-slate-50/80 flex items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    {isAdminMode && (
                      <div
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1"
                        title="Glisser pour réordonner la section"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}

                    {!section.banniere && (
                      <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
                        {section.title}
                      </h2>
                    )}

                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 shrink-0">
                      {section.topics.length} {section.topics.length > 1 ? 'sujets' : 'sujet'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAdminMode && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateTopic(section.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Ajouter un sujet dans cette section"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditSection(section)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Modifier la section"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteSection(section)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Supprimer la section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition cursor-pointer"
                      title={isCollapsed ? 'Déplier la section' : 'Replier la section'}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Liste des sujets de la section */}
                {!isCollapsed && (
                  <div
                    onDragOver={(e) => {
                      if (isAdminMode && draggedTopicInfo) {
                        e.preventDefault();
                        setDragOverSectionId(section.id);
                      }
                    }}
                    onDrop={(e) => handleSectionTopicsDrop(e, section.id)}
                    className={`divide-y divide-slate-100 min-h-[48px] ${
                      dragOverSectionId === section.id && section.topics.length === 0
                        ? 'bg-indigo-50/50'
                        : ''
                    }`}
                  >
                    {section.topics.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 italic">
                        Aucun sujet dans cette section.
                        {isAuthenticated && (
                          <button
                            onClick={() => handleOpenCreateTopic(section.id)}
                            className="block mx-auto mt-2 text-indigo-600 font-bold hover:underline not-italic cursor-pointer"
                          >
                            + Créer un sujet
                          </button>
                        )}
                      </div>
                    ) : (
                      section.topics.map((topic, topicIdx) => {
                        const isTopicDragged =
                          draggedTopicInfo?.topicId === topic.id;
                        const isTopicDragOver =
                          dragOverTopicInfo?.sectionId === section.id &&
                          dragOverTopicInfo?.topicIndex === topicIdx;

                        return (
                          <div
                            key={topic.id}
                            draggable={isAdminMode}
                            onDragStart={(e) => handleTopicDragStart(e, section.id, topicIdx, topic.id)}
                            onDragOver={(e) => handleTopicDragOver(e, section.id, topicIdx)}
                            onDrop={(e) => handleTopicDrop(e, section.id, topicIdx)}
                            className={`p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors ${
                              isTopicDragged
                                ? 'opacity-30 bg-slate-100'
                                : isTopicDragOver
                                ? 'border-t-2 border-indigo-500 bg-indigo-50/30'
                                : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {isAdminMode && (
                                <div
                                  className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 shrink-0"
                                  title="Glisser pour déplacer le sujet"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                              )}

                              <div className="shrink-0">
                                {topic.stickable ? (
                                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                                    <Pin className="w-4 h-4" />
                                  </div>
                                ) : topic.isClosed ? (
                                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center">
                                    <Lock className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <div
                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                                      topic.isRead
                                        ? 'bg-slate-50 text-slate-400 border-slate-200'
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                    }`}
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {topic.stickable && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Épinglé
                                    </span>
                                  )}
                                  {topic.isClosed && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                      Fermé
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleSelectTopic(topic.id)}
                                    className={`text-sm font-bold truncate text-left hover:text-indigo-600 transition cursor-pointer ${
                                      topic.isRead ? 'text-slate-800 font-semibold' : 'text-slate-900 font-bold'
                                    }`}
                                  >
                                    {topic.title}
                                  </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                  <span>
                                    {topic.postsCount} {topic.postsCount > 1 ? 'messages' : 'message'}
                                  </span>

                                  {topic.lastPost && (
                                    <>
                                      <span>&bull;</span>
                                      <span>
                                        Dernier message par{' '}
                                        <strong className="font-semibold">
                                          <UserPseudoLink
                                            userId={topic.lastPost.userId}
                                            username={topic.lastPost.username}
                                            profil={topic.lastPost.userProfil}
                                            className="text-slate-700"
                                          />
                                        </strong>{' '}
                                        le {formatDate(topic.lastPost.createDate)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions d'administration du sujet */}
                            <div className="flex items-center gap-1 shrink-0">
                              {isAdminMode && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTopic(section.id, topic)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                    title="Modifier le sujet"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteTopic(topic)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                    title="Supprimer le sujet"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleSelectTopic(topic.id)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border border-slate-200 transition cursor-pointer"
                              >
                                Voir
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Création de Section */}
      {isCreateSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <h3>Nouvelle section</h3>
              </div>
              <button
                onClick={() => setIsCreateSectionOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sectionModalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sectionModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre de la section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Ex: Règles et Annonces, Taverne HRP..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              {/* Mode bannière : Upload ou URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Bannière de section (optionnelle)
                  </label>
                  <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setSectionBanniereMode('upload')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        sectionBanniereMode === 'upload'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Téléverser
                    </button>
                    <button
                      type="button"
                      onClick={() => setSectionBanniereMode('url')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        sectionBanniereMode === 'url'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      URL externe
                    </button>
                  </div>
                </div>

                {sectionBanniereMode === 'upload' ? (
                  <div className="space-y-2">
                    <div
                      onClick={() => sectionBanniereInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-indigo-50/30 flex flex-col items-center justify-center gap-1.5"
                    >
                      {isUploadingSectionBanniere ? (
                        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin my-1" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400" />
                      )}
                      <p className="text-xs font-semibold text-slate-700">
                        {isUploadingSectionBanniere
                          ? 'Téléversement en cours...'
                          : 'Cliquez pour choisir une image'}
                      </p>
                      <p className="text-[11px] text-slate-400">PNG, JPG, WebP, GIF (max 10 Mo)</p>
                    </div>
                    <input
                      ref={sectionBanniereInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSectionBanniereUpload(file);
                      }}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <input
                    type="url"
                    value={newSectionBanniere}
                    onChange={(e) => setNewSectionBanniere(e.target.value)}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                )}

                {newSectionBanniere && (
                  <div className="mt-2 relative rounded-xl overflow-hidden h-20 border border-slate-200">
                    <img
                      src={newSectionBanniere}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewSectionBanniere('')}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-md hover:bg-black/80 transition"
                      title="Supprimer la bannière"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="newSectionDefaultCollapse"
                  checked={newSectionDefaultCollapse}
                  onChange={(e) => setNewSectionDefaultCollapse(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="newSectionDefaultCollapse" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Replier cette section par défaut pour les utilisateurs
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateSectionOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection || isUploadingSectionBanniere}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingSection ? 'Création...' : 'Créer la section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Édition de Section */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <h3>Modifier la section</h3>
              </div>
              <button
                onClick={() => setEditingSection(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSectionModalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editSectionModalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre de la section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSectionTitle}
                  onChange={(e) => setEditSectionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Bannière de section
                  </label>
                  <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setEditSectionBanniereMode('upload')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        editSectionBanniereMode === 'upload'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Téléverser
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSectionBanniereMode('url')}
                      className={`px-2 py-0.5 rounded-md transition ${
                        editSectionBanniereMode === 'url'
                          ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      URL externe
                    </button>
                  </div>
                </div>

                {editSectionBanniereMode === 'upload' ? (
                  <div className="space-y-2">
                    <div
                      onClick={() => editSectionBanniereInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-indigo-50/30 flex flex-col items-center justify-center gap-1.5"
                    >
                      {isUploadingEditSectionBanniere ? (
                        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin my-1" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400" />
                      )}
                      <p className="text-xs font-semibold text-slate-700">
                        {isUploadingEditSectionBanniere
                          ? 'Téléversement en cours...'
                          : 'Cliquez pour remplacer l’image'}
                      </p>
                      <p className="text-[11px] text-slate-400">PNG, JPG, WebP, GIF (max 10 Mo)</p>
                    </div>
                    <input
                      ref={editSectionBanniereInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleEditSectionBanniereUpload(file);
                      }}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <input
                    type="url"
                    value={editSectionBanniere}
                    onChange={(e) => setEditSectionBanniere(e.target.value)}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                )}

                {editSectionBanniere && (
                  <div className="mt-2 relative rounded-xl overflow-hidden h-20 border border-slate-200">
                    <img
                      src={editSectionBanniere}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditSectionBanniere('')}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-md hover:bg-black/80 transition"
                      title="Supprimer la bannière"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editSectionDefaultCollapse"
                  checked={editSectionDefaultCollapse}
                  onChange={(e) => setEditSectionDefaultCollapse(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editSectionDefaultCollapse" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Replier cette section par défaut pour les utilisateurs
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditSection || isUploadingEditSectionBanniere}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEditSection ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression de Section */}
      {deletingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-3 text-red-600 font-bold">
              <div className="p-2.5 rounded-2xl bg-red-50 border border-red-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base text-slate-900">Supprimer la section ?</h3>
            </div>

            {deleteSectionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteSectionError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer la section <strong className="text-slate-900 font-bold">« {deletingSection.title} »</strong> ?
              <br />
              <span className="text-red-600 font-semibold mt-1 block">
                Attention : Cette action est irréversible et supprimera l'ensemble des {deletingSection.topics.length} sujet(s) et messages contenus dans cette catégorie.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingSection(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteSectionConfirm}
                disabled={isDeletingSection}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isDeletingSection ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création de Sujet */}
      {isCreateTopicOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <FilePlus className="w-5 h-5 text-indigo-600" />
                <h3>Créer un nouveau sujet</h3>
              </div>
              <button
                onClick={() => setIsCreateTopicOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {topicModalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{topicModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={createTopicSectionId}
                  onChange={(e) => setCreateTopicSectionId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  required
                >
                  {forumData.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre du sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="Ex: Présentation des nouveaux membres..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              {isAdmin && (
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTopicStickable}
                      onChange={(e) => setNewTopicStickable(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Épingler ce sujet en haut</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTopicIsClosed}
                      onChange={(e) => setNewTopicIsClosed(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Fermer le sujet (verrouiller les réponses)</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Premier message (optionnel)
                </label>
                <WysiwygEditor
                  value={newTopicFirstPost}
                  onChange={setNewTopicFirstPost}
                  placeholder="Rédigez le premier message du sujet..."
                  minHeight="180px"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTopicOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTopic}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingTopic ? 'Création...' : 'Créer le sujet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Édition de Sujet */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <h3>Modifier le sujet</h3>
              </div>
              <button
                onClick={() => setEditingTopic(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editTopicError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editTopicError}</span>
              </div>
            )}

            <form onSubmit={handleEditTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre du sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTopicTitle}
                  onChange={(e) => setEditTopicTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editTopicStickable}
                    onChange={(e) => setEditTopicStickable(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Épingler ce sujet en haut</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editTopicIsClosed}
                    onChange={(e) => setEditTopicIsClosed(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Fermer le sujet (verrouiller les réponses)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditTopic}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEditTopic ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation de Suppression de Sujet */}
      {deletingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-3 text-red-600 font-bold">
              <div className="p-2.5 rounded-2xl bg-red-50 border border-red-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base text-slate-900">Supprimer le sujet ?</h3>
            </div>

            {deleteTopicError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteTopicError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer le sujet <strong className="text-slate-900 font-bold">« {deletingTopic.title} »</strong> ?
              <br />
              <span className="text-red-600 font-semibold mt-1 block">
                Attention : Cette action est irréversible et supprimera l'intégralité des {deletingTopic.postsCount} message(s) de ce sujet.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTopic(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteTopicConfirm}
                disabled={isDeletingTopic}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isDeletingTopic ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
