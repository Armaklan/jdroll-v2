import React, {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {campaignsApi} from '../api/campaigns';
import {
  CampaignForumData,
  CampaignParticipant,
  ForumSectionSummary,
  ForumTopicSummary,
  TopicUserSummary
} from '../types/campaign';
import {AppView} from '../components/Navbar';
import {useAuth} from '../contexts/AuthContext';
import {DiceTowerModal} from '../components/DiceTowerModal';
import {CampaignHeader} from '../components/CampaignHeader';
import {UserPseudoLink} from '../components/UserPseudoLink';
import {formatDate, formatDayDate} from '../utils/date';
import {
  AlertCircle,
  CalendarOff,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  EyeOff,
  FilePlus,
  FolderOpen,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface CampaignForumPageProps {
  campaignId?: number;
  onNavigate?: (view: AppView) => void;
  onSelectTopic?: (topicId: number) => void;
  onBack?: () => void;
}

export const CampaignForumPage: React.FC<CampaignForumPageProps> = ({
  campaignId,
  onSelectTopic,
  onBack,
}) => {
  const params = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const effectiveCampaignId = campaignId ?? (params.campaignId ? Number(params.campaignId) : 0);

  const { user } = useAuth();
  const [forumData, setForumData] = useState<CampaignForumData | null>(null);
  const [participants, setParticipants] = useState<CampaignParticipant[]>([]);
  const [pendingParticipants, setPendingParticipants] = useState<CampaignParticipant[]>([]);
  const [actionParticipantUserId, setActionParticipantUserId] = useState<number | null>(null);
  const [participantActionFeedback, setParticipantActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string | number, boolean>>({});
  const [isDiceTowerOpen, setIsDiceTowerOpen] = useState<boolean>(false);

  // Mode Administration state
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Campaign banner upload state
  const [isUploadingBanner, setIsUploadingBanner] = useState<boolean>(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);

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

  // Create Section Modal state
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState<boolean>(false);
  const [newSectionTitle, setNewSectionTitle] = useState<string>('');
  const [newSectionDefaultCollapse, setNewSectionDefaultCollapse] = useState<boolean>(false);
  const [newSectionBanniere, setNewSectionBanniere] = useState<string>('');
  const [sectionBanniereMode, setSectionBanniereMode] = useState<'url' | 'upload'>('upload');
  const [isUploadingSectionBanniere, setIsUploadingSectionBanniere] = useState<boolean>(false);
  const [isDraggingSectionBanniere, setIsDraggingSectionBanniere] = useState<boolean>(false);
  const sectionBanniereInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingSection, setIsSubmittingSection] = useState<boolean>(false);
  const [sectionModalError, setSectionModalError] = useState<string | null>(null);

  const handleSectionBanniereUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSectionModalError('Le fichier déposé doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }
    setIsUploadingSectionBanniere(true);
    setSectionModalError(null);
    try {
      const res = await campaignsApi.uploadCampaignImage(effectiveCampaignId, file);
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

  const handleBannerUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setBannerUploadError('Le fichier déposé doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }
    setIsUploadingBanner(true);
    setBannerUploadError(null);
    try {
      const res = await campaignsApi.uploadCampaignBanner(effectiveCampaignId, file);
      setForumData((prev) =>
        prev
          ? {
              ...prev,
              campaign: {
                ...prev.campaign,
                banniereForum: res.url,
                banniere: prev.campaign.banniere || res.url,
              },
            }
          : prev
      );
      setSaveStatusMessage('Bannière de la campagne mise à jour !');
      setTimeout(() => {
        setSaveStatusMessage(null);
      }, 3500);
    } catch (err: any) {
      setBannerUploadError(err.message || 'Erreur lors du téléversement de la bannière.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Create Topic Modal state
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState<boolean>(false);
  const [targetTopicSectionId, setTargetTopicSectionId] = useState<number | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState<string>('');
  const [newTopicStickable, setNewTopicStickable] = useState<boolean>(false);
  const [newTopicIsPrivate, setNewTopicIsPrivate] = useState<number>(0);
  const [newTopicCanReadUserIds, setNewTopicCanReadUserIds] = useState<number[]>([]);
  const [newTopicIsClosed, setNewTopicIsClosed] = useState<boolean>(false);
  const [newTopicFirstPost, setNewTopicFirstPost] = useState<string>('');
  const [isSubmittingTopic, setIsSubmittingTopic] = useState<boolean>(false);
  const [topicModalError, setTopicModalError] = useState<string | null>(null);

  // Section Direct Banner Drag-and-Drop state
  const [dragOverSectionBannerId, setDragOverSectionBannerId] = useState<number | null>(null);
  const [uploadingSectionBannerId, setUploadingSectionBannerId] = useState<number | null>(null);

  // Edit Section Modal state
  const [editingSection, setEditingSection] = useState<ForumSectionSummary | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState<string>('');
  const [editSectionDefaultCollapse, setEditSectionDefaultCollapse] = useState<boolean>(false);
  const [editSectionBanniere, setEditSectionBanniere] = useState<string>('');
  const [editSectionBanniereMode, setEditSectionBanniereMode] = useState<'url' | 'upload'>('upload');
  const [isUploadingEditSectionBanniere, setIsUploadingEditSectionBanniere] = useState<boolean>(false);
  const [isDraggingEditSectionBanniere, setIsDraggingEditSectionBanniere] = useState<boolean>(false);
  const editSectionBanniereInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingEditSection, setIsSubmittingEditSection] = useState<boolean>(false);
  const [editSectionError, setEditSectionError] = useState<string | null>(null);

  // Delete Section Modal state
  const [deletingSection, setDeletingSection] = useState<ForumSectionSummary | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState<boolean>(false);
  const [deleteSectionError, setDeleteSectionError] = useState<string | null>(null);

  // Edit Topic Modal state
  const [editingTopic, setEditingTopic] = useState<{
    id: number;
    sectionId: number;
    title: string;
    stickable: boolean;
    isPrivate: number;
    isClosed: boolean;
    canReadUsers?: TopicUserSummary[];
  } | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState<string>('');
  const [editTopicStickable, setEditTopicStickable] = useState<boolean>(false);
  const [editTopicIsPrivate, setEditTopicIsPrivate] = useState<number>(0);
  const [editTopicCanReadUserIds, setEditTopicCanReadUserIds] = useState<number[]>([]);
  const [editTopicIsClosed, setEditTopicIsClosed] = useState<boolean>(false);
  const [isSubmittingEditTopic, setIsSubmittingEditTopic] = useState<boolean>(false);
  const [editTopicError, setEditTopicError] = useState<string | null>(null);

  // Delete Topic Modal state
  const [deletingTopic, setDeletingTopic] = useState<ForumTopicSummary | null>(null);
  const [isDeletingTopic, setIsDeletingTopic] = useState<boolean>(false);
  const [deleteTopicError, setDeleteTopicError] = useState<string | null>(null);

  // Mark all topics as read
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState<boolean>(false);

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    setIsMarkingAllAsRead(true);

    try {
      await campaignsApi.markAllCampaignForumTopicsAsRead(effectiveCampaignId);
      // Refresh the forum data to update read status
      const data = await campaignsApi.getCampaignForum(effectiveCampaignId);
      setForumData(data);
    } catch (err: any) {
      console.error('Erreur lors du marquage comme lu:', err);
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/my-campaigns');
    }
  };

  const handleSelectTopic = (topicId: number) => {
    if (onSelectTopic) {
      onSelectTopic(topicId);
    } else {
      navigate(`/forum/${effectiveCampaignId}/${topicId}`);
    }
  };

  const fetchForum = async () => {
    if (!effectiveCampaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getCampaignForum(effectiveCampaignId);
      setForumData(data);
      if (data.pendingParticipants) {
        setPendingParticipants(data.pendingParticipants);
      } else {
        setPendingParticipants([]);
      }

      // Initialize collapsed state from defaultCollapse
      const initialCollapse: Record<number, boolean> = {};
      data.sections.forEach((sec) => {
        initialCollapse[sec.id] = sec.defaultCollapse;
      });
      setCollapsedSections(initialCollapse);

      try {
        const pList = await campaignsApi.getCampaignParticipants(effectiveCampaignId);
        setParticipants(pList);
      } catch {
        // Ignorer si récupération échoue
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le forum de la campagne.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptParticipant = async (candidateUserId: number) => {
    setActionParticipantUserId(candidateUserId);
    setParticipantActionFeedback(null);
    try {
      const res = await campaignsApi.acceptParticipant(effectiveCampaignId, candidateUserId);
      setPendingParticipants((prev) => prev.filter((p) => p.id !== candidateUserId));
      setParticipantActionFeedback({
        type: 'success',
        message: res.message || "L'inscription a été validée avec succès.",
      });
      try {
        const pList = await campaignsApi.getCampaignParticipants(effectiveCampaignId);
        setParticipants(pList);
      } catch {}
    } catch (err: any) {
      setParticipantActionFeedback({
        type: 'error',
        message: err.message || "Erreur lors de la validation de l'inscription.",
      });
    } finally {
      setActionParticipantUserId(null);
    }
  };

  const handleRejectParticipant = async (candidateUserId: number) => {
    setActionParticipantUserId(candidateUserId);
    setParticipantActionFeedback(null);
    try {
      const res = await campaignsApi.rejectParticipant(effectiveCampaignId, candidateUserId);
      setPendingParticipants((prev) => prev.filter((p) => p.id !== candidateUserId));
      setParticipantActionFeedback({
        type: 'success',
        message: res.message || "L'inscription a été refusée.",
      });
    } catch (err: any) {
      setParticipantActionFeedback({
        type: 'error',
        message: err.message || "Erreur lors du refus de l'inscription.",
      });
    } finally {
      setActionParticipantUserId(null);
    }
  };

  useEffect(() => {
    if (effectiveCampaignId) {
      fetchForum();
    }
  }, [effectiveCampaignId]);

  const toggleSection = (sectionId: string | number) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Section Creation
  const handleOpenCreateSection = () => {
    setNewSectionTitle('');
    setNewSectionDefaultCollapse(false);
    setNewSectionBanniere('');
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
      const res = await campaignsApi.createSection(effectiveCampaignId, {
        title: newSectionTitle.trim(),
        defaultCollapse: newSectionDefaultCollapse,
        banniere: newSectionBanniere.trim() || undefined,
      });

      const createdSection: ForumSectionSummary = {
        id: res.section.id,
        campagneId: effectiveCampaignId,
        title: res.section.title,
        ordre: res.section.ordre,
        defaultCollapse: res.section.defaultCollapse,
        banniere: res.section.banniere || '',
        topics: [],
      };

      if (forumData) {
        setForumData({
          ...forumData,
          sections: [...forumData.sections, createdSection],
        });
      }

      setIsCreateSectionOpen(false);
      setSaveStatusMessage('Section créée avec succès !');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setSectionModalError(err.message || 'Erreur lors de la création de la section.');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  // Topic Creation
  const handleOpenCreateTopic = (sectionId: number) => {
    setTargetTopicSectionId(sectionId);
    setNewTopicTitle('');
    setNewTopicStickable(false);
    setNewTopicIsPrivate(0);
    setNewTopicCanReadUserIds([]);
    setNewTopicIsClosed(false);
    setNewTopicFirstPost('');
    setTopicModalError(null);
    setIsCreateTopicOpen(true);
  };

  const handleCreateTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTopicSectionId) {
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
      await campaignsApi.createTopic(targetTopicSectionId, {
        title: newTopicTitle.trim(),
        stickable: newTopicStickable,
        isPrivate: newTopicIsPrivate,
        canReadUserIds: newTopicIsPrivate === 1 ? newTopicCanReadUserIds : undefined,
        isClosed: newTopicIsClosed,
        firstPostContent: newTopicFirstPost.trim() || undefined,
      });

      await fetchForum();

      setIsCreateTopicOpen(false);
      setSaveStatusMessage('Sujet créé avec succès !');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setTopicModalError(err.message || 'Erreur lors de la création du sujet.');
    } finally {
      setIsSubmittingTopic(false);
    }
  };

  // Section Direct Banner Drag-and-Drop
  const handleSectionBannerFileDragOver = (e: React.DragEvent, sectionId: number) => {
    if (!isAdminMode) return;
    if (draggedSectionIndex !== null || draggedTopicInfo !== null) return;
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (dragOverSectionBannerId !== sectionId) {
        setDragOverSectionBannerId(sectionId);
      }
    }
  };

  const handleSectionBannerFileDragLeave = (e: React.DragEvent, sectionId: number) => {
    if (!isAdminMode) return;
    if (draggedSectionIndex !== null || draggedTopicInfo !== null) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverSectionBannerId === sectionId) {
      setDragOverSectionBannerId(null);
    }
  };

  const handleSectionBannerFileDrop = async (e: React.DragEvent, sectionId: number) => {
    if (!isAdminMode) return;
    if (draggedSectionIndex !== null || draggedTopicInfo !== null) return;
    if (!e.dataTransfer.types.includes('Files') && !e.dataTransfer.files?.length) return;

    e.preventDefault();
    e.stopPropagation();
    setDragOverSectionBannerId(null);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      setSaveStatusMessage('Le fichier déposé doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      setTimeout(() => setSaveStatusMessage(null), 4000);
      return;
    }

    setUploadingSectionBannerId(sectionId);
    try {
      const res = await campaignsApi.uploadSectionBanner(sectionId, file, effectiveCampaignId);
      if (forumData) {
        const updatedSections = forumData.sections.map((s) =>
          s.id === sectionId ? { ...s, banniere: res.url } : s
        );
        setForumData({
          ...forumData,
          sections: updatedSections,
        });
      }
      setSaveStatusMessage('Bannière de section mise à jour avec succès !');
      setTimeout(() => setSaveStatusMessage(null), 3500);
    } catch (err: any) {
      setSaveStatusMessage(err.message || 'Erreur lors du téléversement de la bannière.');
      setTimeout(() => setSaveStatusMessage(null), 4000);
    } finally {
      setUploadingSectionBannerId(null);
    }
  };

  // Section Edition
  const handleOpenEditSection = (section: ForumSectionSummary) => {
    setEditingSection(section);
    setEditSectionTitle(section.title);
    setEditSectionDefaultCollapse(section.defaultCollapse);
    setEditSectionBanniere(section.banniere || '');
    setEditSectionBanniereMode(
      section.banniere && section.banniere.startsWith('http') ? 'url' : 'upload'
    );
    setEditSectionError(null);
  };

  const handleEditSectionBanniereUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setEditSectionError('Le fichier déposé doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }
    setIsUploadingEditSectionBanniere(true);
    setEditSectionError(null);
    try {
      const res = await campaignsApi.uploadCampaignImage(effectiveCampaignId, file);
      setEditSectionBanniere(res.url);
      setEditSectionBanniereMode('upload');
    } catch (err: any) {
      setEditSectionError(err.message || 'Erreur lors du téléversement de la bannière.');
    } finally {
      setIsUploadingEditSectionBanniere(false);
      if (editSectionBanniereInputRef.current) {
        editSectionBanniereInputRef.current.value = '';
      }
    }
  };

  const handleEditSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    if (!editSectionTitle.trim()) {
      setEditSectionError('Le titre de la section est requis.');
      return;
    }

    setIsSubmittingEditSection(true);
    setEditSectionError(null);

    try {
      const res = await campaignsApi.updateSection(
        editingSection.id,
        {
          title: editSectionTitle.trim(),
          defaultCollapse: editSectionDefaultCollapse,
          banniere: editSectionBanniere.trim(),
        },
        effectiveCampaignId
      );

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
      setEditSectionError(err.message || 'Erreur lors de la modification de la section.');
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
      await campaignsApi.deleteSection(deletingSection.id, effectiveCampaignId);
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

  // Topic Edition
  const handleOpenEditTopic = (sectionId: number, topic: ForumTopicSummary) => {
    const isPrivateNum = topic.isPrivate === true || (topic.isPrivate as any) === 1 ? 1 : ((topic.isPrivate as any) === 2 ? 2 : 0);
    setEditingTopic({
      id: topic.id,
      sectionId,
      title: topic.title,
      stickable: Boolean(topic.stickable),
      isPrivate: isPrivateNum,
      isClosed: Boolean(topic.isClosed),
      canReadUsers: topic.canReadUsers,
    });
    setEditTopicTitle(topic.title);
    setEditTopicStickable(Boolean(topic.stickable));
    setEditTopicIsPrivate(isPrivateNum);
    setEditTopicCanReadUserIds(topic.canReadUsers ? topic.canReadUsers.map((u) => u.id) : []);
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
      await campaignsApi.updateTopic(
        editingTopic.id,
        {
          title: editTopicTitle.trim(),
          stickable: editTopicStickable,
          isPrivate: editTopicIsPrivate,
          canReadUserIds: editTopicIsPrivate === 1 ? editTopicCanReadUserIds : undefined,
          isClosed: editTopicIsClosed,
        },
        effectiveCampaignId
      );

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
      await campaignsApi.deleteTopic(deletingTopic.id, effectiveCampaignId);
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

  // Section Drag and Drop handlers
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
        await campaignsApi.reorderSections(
          effectiveCampaignId,
          newSections.map((s) => s.id)
        );
        setSaveStatusMessage('Ordre des sections mis à jour');
        setTimeout(() => setSaveStatusMessage(null), 2500);
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la réorganisation des sections.');
        fetchForum();
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  const handleSectionDragEnd = () => {
    setDraggedSectionIndex(null);
    setDragOverSectionIndex(null);
  };

  // Topic Drag and Drop handlers
  const handleTopicDragStart = (
    e: React.DragEvent,
    sectionId: number,
    topicIndex: number,
    topicId: number
  ) => {
    if (!isAdminMode) return;
    e.stopPropagation();
    setDraggedTopicInfo({
      sectionId,
      topicIndex,
      topicId,
    });
    e.dataTransfer.setData('text/plain', `topic:${topicId}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTopicDragOver = (
    e: React.DragEvent,
    sectionId: number,
    topicIndex: number
  ) => {
    if (!isAdminMode || !draggedTopicInfo) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTopicInfo({ sectionId, topicIndex });
    setDragOverSectionId(sectionId);
  };

  const handleTopicDropOnTopic = async (
    e: React.DragEvent,
    targetSectionId: number,
    targetTopicIndex: number
  ) => {
    if (!isAdminMode || !draggedTopicInfo || !forumData) return;
    e.preventDefault();
    e.stopPropagation();

    const sourceSectionId = draggedTopicInfo.sectionId;
    const sourceTopicIndex = draggedTopicInfo.topicIndex;

    if (sourceSectionId === targetSectionId && sourceTopicIndex === targetTopicIndex) {
      setDraggedTopicInfo(null);
      setDragOverTopicInfo(null);
      setDragOverSectionId(null);
      return;
    }

    const newSections = forumData.sections.map((sec) => ({
      ...sec,
      topics: [...sec.topics],
    }));

    const sourceSection = newSections.find((s) => s.id === sourceSectionId);
    const targetSection = newSections.find((s) => s.id === targetSectionId);

    if (sourceSection && targetSection) {
      const [movedTopic] = sourceSection.topics.splice(sourceTopicIndex, 1);
      movedTopic.sectionId = targetSectionId;
      targetSection.topics.splice(targetTopicIndex, 0, movedTopic);

      setForumData({ ...forumData, sections: newSections });
      setDraggedTopicInfo(null);
      setDragOverTopicInfo(null);
      setDragOverSectionId(null);

      try {
        setIsSavingOrder(true);
        const payload = newSections.map((s) => ({
          sectionId: s.id,
          topicIds: s.topics.map((t) => t.id),
        }));
        await campaignsApi.reorderTopics(effectiveCampaignId, payload);
        setSaveStatusMessage('Ordre des sujets mis à jour');
        setTimeout(() => setSaveStatusMessage(null), 2500);
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la réorganisation des sujets.');
        fetchForum();
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  const handleTopicDropOnSection = async (
    e: React.DragEvent,
    targetSectionId: number
  ) => {
    if (!isAdminMode || !draggedTopicInfo || !forumData) return;
    e.preventDefault();

    const sourceSectionId = draggedTopicInfo.sectionId;
    const sourceTopicIndex = draggedTopicInfo.topicIndex;

    const newSections = forumData.sections.map((sec) => ({
      ...sec,
      topics: [...sec.topics],
    }));

    const sourceSection = newSections.find((s) => s.id === sourceSectionId);
    const targetSection = newSections.find((s) => s.id === targetSectionId);

    if (sourceSection && targetSection) {
      const [movedTopic] = sourceSection.topics.splice(sourceTopicIndex, 1);
      movedTopic.sectionId = targetSectionId;
      targetSection.topics.push(movedTopic);

      setForumData({ ...forumData, sections: newSections });
      setDraggedTopicInfo(null);
      setDragOverTopicInfo(null);
      setDragOverSectionId(null);

      try {
        setIsSavingOrder(true);
        const payload = newSections.map((s) => ({
          sectionId: s.id,
          topicIds: s.topics.map((t) => t.id),
        }));
        await campaignsApi.reorderTopics(effectiveCampaignId, payload);
        setSaveStatusMessage('Sujet déplacé dans la nouvelle section');
        setTimeout(() => setSaveStatusMessage(null), 2500);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du déplacement du sujet.');
        fetchForum();
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  const handleTopicDragEnd = () => {
    setDraggedTopicInfo(null);
    setDragOverTopicInfo(null);
    setDragOverSectionId(null);
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
            onClick={handleBack}
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
  const isMj = Boolean(user && (campaign.mjId === user.id || campaign.userRole === 'mj'));
  const isPlayer = Boolean(user && campaign.userRole === 'player');
  const isCampaignMember = isMj || isPlayer;
  const currentAbsences = forumData.currentAbsences ?? [];

  const unreadTopics = sections.flatMap((sec) =>
    sec.topics
      .filter((topic) => !topic.isRead)
      .map((topic) => ({ ...topic, sectionTitle: sec.title }))
  );

  const campaignStyles = {
    '--pensee-color': campaign.penseeColor || '#8844CC',
    '--dialogue-color': campaign.dialogueColor || '#4488CC',
    '--rp1-color': campaign.rp1Color || '#ff6600',
    '--rp2-color': campaign.rp2Color || '#5EFF6C',
    '--color-pensee': campaign.penseeColor || '#8844CC',
    '--color-dialogue': campaign.dialogueColor || '#4488CC',
    '--color-rp1': campaign.rp1Color || '#ff6600',
    '--color-rp2': campaign.rp2Color || '#5EFF6C',
    '--hr-image': campaign.hr ? `url(${campaign.hr})` : 'none',
  } as React.CSSProperties;

  return (
    <div className="space-y-6" style={campaignStyles}>
      {/* Navigation Breadcrumb & Back button & Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
        </div>

        <div className="flex items-center gap-2.5">
          {isMj && (
            <>
              <button
                onClick={() => navigate(`/campaigns/${effectiveCampaignId}/edit`)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
                title="Modifier la configuration générale de la campagne"
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Configurer</span>
              </button>

              <button
                onClick={() => setIsAdminMode(!isAdminMode)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer ${
                  isAdminMode
                    ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-300'
                    : 'bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200'
                }`}
                title="Activer ou désactiver le mode administration du forum"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{isAdminMode ? 'Ne plus administrer' : 'Administrer'}</span>
              </button>
            </>
          )}

          {isCampaignMember && unreadTopics.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllAsRead}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Marquer tous les sujets comme lus"
            >
              {isMarkingAllAsRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Tout marquer comme lu</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Mode Bar banner */}
      {isAdminMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>Administration de la Campagne</span>
                {isSavingOrder && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-normal">
                    <Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...
                  </span>
                )}
                {isUploadingBanner && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-normal">
                    <Loader2 className="w-3 h-3 animate-spin" /> Téléversement de la bannière...
                  </span>
                )}
                {saveStatusMessage && !isSavingOrder && !isUploadingBanner && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Check className="w-3 h-3" /> {saveStatusMessage}
                  </span>
                )}
              </h3>
              <p className="text-xs text-amber-800">
                Glissez-déposez une image sur la bannière pour la modifier, créez des sections ou réorganisez le forum par glisser-déposer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateSection}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une section</span>
            </button>
          </div>
        </div>
      )}

      {/* Campaign Header */}
      <CampaignHeader
        campaign={campaign}
        activeTab="forum"
        isAdminMode={isAdminMode}
        onOpenDiceTower={() => setIsDiceTowerOpen(true)}
        onBannerUpload={handleBannerUpload}
        isUploadingBanner={isUploadingBanner}
        bannerUploadError={bannerUploadError}
        onClearBannerUploadError={() => setBannerUploadError(null)}
      />

      {/* Membres actuellement absents (MJ et joueurs) - avant les messages non lus */}
      {currentAbsences.length > 0 && (
        <div
          className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xs"
          data-testid="campaign-absences-banner"
        >
          <div className="flex items-center gap-2 mb-2">
            <CalendarOff className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-950">
              Membres actuellement absents
            </h3>
          </div>
          <ul className="space-y-1.5">
            {currentAbsences.map((absence) => (
              <li
                key={absence.id}
                className="text-xs sm:text-sm text-amber-900 flex flex-wrap items-baseline gap-x-1.5"
                data-testid="campaign-absence-item"
              >
                <UserPseudoLink
                  userId={absence.userId}
                  username={absence.username}
                  className="font-bold text-amber-900"
                />
                {absence.isMj && (
                  <span className="font-semibold text-amber-700" title="Maître du Jeu">
                    (MJ)
                  </span>
                )}
                <span>— absent du {formatDayDate(absence.beginDate)} au {formatDayDate(absence.endDate)}</span>
                {absence.commentaire && <span>— {absence.commentaire}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Forum Sections List */}
      {sections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Aucune section créée</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            Le Maître du Jeu n'a pas encore configuré de sections dans le forum de cette campagne.
          </p>
          {isMj && (
            <button
              onClick={handleOpenCreateSection}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs"
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
            <div className="relative bg-white border border-indigo-200 ring-1 ring-indigo-100 rounded-2xl overflow-hidden shadow-xs transition-all duration-200">
              {/* En-tête de la section non lus */}
              <div
                style={{
                  backgroundColor: campaign.sidebarColor || undefined,
                  color: campaign.linkSidebarColor || undefined,
                }}
                className="w-full px-5 py-3.5 bg-indigo-50/80 border-b border-slate-200 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleSection('unread')}
                    className="flex items-center gap-2.5 text-left truncate flex-1"
                  >
                    <MessageSquare
                      className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105"
                      style={{ color: campaign.linkSidebarColor || undefined }}
                    />
                    <h2
                      className="font-bold text-sm sm:text-base tracking-tight truncate"
                      style={{ color: campaign.linkSidebarColor || undefined }}
                    >
                      Messages non lus
                    </h2>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 shrink-0"
                      style={{
                        backgroundColor: campaign.sidebarColor ? 'rgba(255,255,255,0.25)' : undefined,
                        color: campaign.linkSidebarColor || undefined,
                      }}
                    >
                      {unreadTopics.length} {unreadTopics.length > 1 ? 'sujets' : 'sujet'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSection('unread')}
                    className="p-1 rounded hover:bg-black/10 transition"
                    style={{ color: campaign.linkSidebarColor || undefined }}
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

              {/* Contenu de la section non lus */}
              {!collapsedSections['unread'] && (
                <div className="divide-y divide-slate-100">
                  {/* Topic Rows */}
                  {unreadTopics.map((topic, topicIdx) => {
                    const isOdd = topicIdx % 2 === 0;
                    const rowBg = isOdd
                      ? campaign.oddLineColor
                      : campaign.evenLineColor;
                    const rowTextColor = campaign.textColor;
                    const rowLinkColor = campaign.linkColor;

                    return (
                      <div
                        key={`unread-${topic.id}`}
                        onClick={() => handleSelectTopic(topic.id)}
                        style={{
                          backgroundColor: rowBg || undefined,
                          color: rowTextColor || undefined,
                        }}
                        className="p-4 sm:px-5 sm:py-3.5 hover:brightness-95 transition flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 md:items-center cursor-pointer"
                      >
                        {/* Topic Title & Badges */}
                        <div className="md:col-span-9 flex items-start justify-between gap-3 min-w-0">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Read/Unread Icon Indicator */}
                            <div className="mt-0.5 shrink-0">
                              <div className="relative">
                                <MessageSquare className="w-4 h-4 text-indigo-600" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                              </div>
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {topic.sectionTitle && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                                  >
                                    {topic.sectionTitle}
                                  </span>
                                )}

                                {topic.stickable && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                                    <Pin className="w-3 h-3 text-amber-600" />
                                    Épinglé
                                  </span>
                                )}

                                {topic.isClosed && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider">
                                    <Lock className="w-3 h-3 text-red-600" />
                                    Fermé
                                  </span>
                                )}

                                {(topic.isPrivate === 1 || topic.isPrivate === true) ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider">
                                    <EyeOff className="w-3 h-3 text-purple-600" />
                                    Privé
                                  </span>
                                ) : (topic.isPrivate as any) === 2 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                                    <Globe className="w-3 h-3 text-teal-600" />
                                    Grand public
                                  </span>
                                ) : null}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectTopic(topic.id);
                                  }}
                                  style={{ color: rowLinkColor || undefined }}
                                  className="font-bold text-sm hover:underline text-left line-clamp-2 text-slate-900"
                                >
                                  {topic.title}
                                </button>
                              </div>

                              {(topic.isPrivate === 1 || topic.isPrivate === true) && (
                                <div className="flex items-center gap-1.5 text-[11px] text-purple-700 bg-purple-50/90 px-2 py-0.5 rounded-md border border-purple-200/70 w-fit">
                                  <Users className="w-3 h-3 text-purple-500 shrink-0" />
                                  <span className="font-semibold">Accès :</span>
                                  <span className="truncate max-w-xs sm:max-w-md">
                                    {topic.canReadUsers && topic.canReadUsers.length > 0
                                      ? topic.canReadUsers.map((u, index) => (
                                          <React.Fragment key={u.id}>
                                            {index > 0 && ', '}
                                            <UserPseudoLink userId={u.id} username={u.username} profil={u.profil} />
                                          </React.Fragment>
                                        ))
                                      : 'MJ uniquement'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Last Post Info */}
                        <div className="md:col-span-3 text-xs text-slate-500 flex md:flex-col md:items-end justify-between gap-1">
                          {topic.lastPost ? (
                            <>
                              <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                                <span className="text-slate-400">par</span>
                                <span className="font-semibold truncate">
                                  <UserPseudoLink
                                    userId={topic.lastPost.userId}
                                    username={topic.lastPost.username}
                                    profil={topic.lastPost.userProfil}
                                    className="text-slate-700"
                                  />
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(topic.lastPost.createDate)}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">Aucun message</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {sections.map((section, secIdx) => {
            const isCollapsed = collapsedSections[section.id];
            const isSectionDragged = draggedSectionIndex === secIdx;
            const isSectionDragOver = dragOverSectionIndex === secIdx;
            const isFileDragOverSection = dragOverSectionBannerId === section.id;
            const isUploadingBannerOnSection = uploadingSectionBannerId === section.id;
            const isTopicTargetSection =
              draggedTopicInfo !== null && dragOverSectionId === section.id;

            return (
              <div
                key={section.id}
                draggable={isAdminMode && draggedTopicInfo === null && dragOverSectionBannerId === null}
                onDragStart={(e) => handleSectionDragStart(e, secIdx)}
                onDragOver={(e) => {
                  if (isAdminMode && e.dataTransfer.types.includes('Files')) {
                    handleSectionBannerFileDragOver(e, section.id);
                  } else {
                    handleSectionDragOver(e, secIdx);
                  }
                }}
                onDragLeave={(e) => {
                  if (isAdminMode && e.dataTransfer.types.includes('Files')) {
                    handleSectionBannerFileDragLeave(e, section.id);
                  }
                }}
                onDrop={(e) => {
                  if (isAdminMode && (e.dataTransfer.types.includes('Files') || e.dataTransfer.files?.length > 0)) {
                    handleSectionBannerFileDrop(e, section.id);
                  } else {
                    handleSectionDrop(e, secIdx);
                  }
                }}
                onDragEnd={handleSectionDragEnd}
                className={`relative bg-white border rounded-2xl overflow-hidden shadow-xs transition-all duration-200 ${
                  isFileDragOverSection
                    ? 'border-indigo-600 ring-4 ring-indigo-200'
                    : isSectionDragOver
                    ? 'border-indigo-500 ring-2 ring-indigo-200'
                    : isSectionDragged
                    ? 'opacity-40 border-dashed border-slate-400'
                    : 'border-slate-200'
                }`}
              >
                {/* Drag file over section overlay */}
                {isFileDragOverSection && (
                  <div className="absolute inset-0 z-30 bg-indigo-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 rounded-2xl pointer-events-none transition animate-in fade-in">
                    <ImageIcon className="w-10 h-10 mb-2 animate-bounce" />
                    <p className="text-base font-bold">Déposez l'image pour définir la bannière de la section</p>
                    <p className="text-xs text-indigo-100 mt-1">PNG, JPG, WebP, GIF, SVG, AVIF</p>
                  </div>
                )}

                {/* Uploading banner overlay */}
                {isUploadingBannerOnSection && (
                  <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center text-slate-800 p-6 rounded-2xl pointer-events-none">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                    <p className="text-sm font-semibold">Téléversement de la bannière...</p>
                  </div>
                )}

                {/* Section Header */}
                <div
                  style={{
                    backgroundColor: campaign.sidebarColor || undefined,
                    color: campaign.linkSidebarColor || undefined,
                  }}
                  className="w-full px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isAdminMode && (
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/10 transition text-slate-400 hover:text-slate-700"
                        title="Glisser pour réorganiser cette section"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}

                    <button
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center gap-2.5 text-left truncate flex-1"
                    >
                      <FolderOpen
                        className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105"
                        style={{ color: campaign.linkSidebarColor || undefined }}
                      />
                      {section.banniere ? (
                        <img
                          src={section.banniere}
                          alt={section.title}
                          className="max-h-12 max-w-full object-contain rounded"
                        />
                      ) : (
                        <h2
                          className="font-bold text-sm sm:text-base tracking-tight truncate"
                          style={{ color: campaign.linkSidebarColor || undefined }}
                        >
                          {section.title}
                        </h2>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdminMode && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditSection(section);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-xs font-semibold shadow-2xs border border-slate-200/80 transition cursor-pointer"
                          title="Éditer cette section"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-600" />
                          <span>Éditer</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateTopic(section.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-xs font-semibold shadow-2xs border border-slate-200/80 transition cursor-pointer"
                          title="Créer un sujet dans cette section"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nouveau sujet</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteSection(section);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg text-xs font-semibold shadow-2xs border border-slate-200/80 transition cursor-pointer"
                          title="Supprimer cette section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => toggleSection(section.id)}
                      className="p-1 rounded hover:bg-black/10 transition"
                      style={{ color: campaign.linkSidebarColor || undefined }}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Section Content: Topics Table & Drop Zone */}
                {!isCollapsed && (
                  <div
                    onDragOver={(e) => {
                      if (draggedTopicInfo) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverSectionId(section.id);
                      }
                    }}
                    onDrop={(e) => handleTopicDropOnSection(e, section.id)}
                    className={`transition-colors ${
                      isTopicTargetSection && section.topics.length === 0
                        ? 'bg-indigo-50/50 border-2 border-dashed border-indigo-400'
                        : ''
                    }`}
                  >
                    {section.topics.length === 0 ? (
                      <div className="p-8 text-center text-xs sm:text-sm text-slate-500">
                        {isAdminMode ? (
                          <div className="space-y-2">
                            <p>Cette section ne contient aucun sujet pour le moment.</p>
                            <p className="text-xs text-indigo-600 font-medium">
                              Glissez un sujet ici ou cliquez sur "Nouveau sujet" pour en créer un.
                            </p>
                          </div>
                        ) : (
                          'Aucun sujet dans cette section pour le moment.'
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {/* Topic Rows */}
                        {section.topics.map((topic, topicIdx) => {
                          const isOdd = topicIdx % 2 === 0;
                          const rowBg = isOdd
                            ? campaign.oddLineColor
                            : campaign.evenLineColor;
                          const rowTextColor = campaign.textColor;
                          const rowLinkColor = campaign.linkColor;

                          const isTopicDragged =
                            draggedTopicInfo?.topicId === topic.id;
                          const isTopicDragOver =
                            dragOverTopicInfo?.sectionId === section.id &&
                            dragOverTopicInfo?.topicIndex === topicIdx;

                          return (
                            <div
                              key={topic.id}
                              draggable={isAdminMode}
                              onDragStart={(e) =>
                                handleTopicDragStart(e, section.id, topicIdx, topic.id)
                              }
                              onDragOver={(e) =>
                                handleTopicDragOver(e, section.id, topicIdx)
                              }
                              onDrop={(e) =>
                                handleTopicDropOnTopic(e, section.id, topicIdx)
                              }
                              onDragEnd={handleTopicDragEnd}
                              onClick={() => {
                                if (!isAdminMode) {
                                  handleSelectTopic(topic.id);
                                }
                              }}
                              style={{
                                backgroundColor: rowBg || undefined,
                                color: rowTextColor || undefined,
                              }}
                              className={`p-4 sm:px-5 sm:py-3.5 hover:brightness-95 transition flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 md:items-center ${
                                !topic.isRead && !rowBg ? 'bg-indigo-50/30' : ''
                              } ${
                                isTopicDragOver
                                  ? 'border-t-2 border-indigo-500 bg-indigo-50/40'
                                  : ''
                              } ${
                                isTopicDragged
                                  ? 'opacity-40 border-dashed border-2 border-slate-400'
                                  : ''
                              } ${isAdminMode ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              {/* Topic Title & Badges */}
                              <div className="md:col-span-9 flex items-start justify-between gap-3 min-w-0">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  {isAdminMode && (
                                    <div
                                      className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 rounded transition shrink-0 mt-0.5"
                                      title="Glisser pour réorganiser ou changer de section"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  )}

                                  {/* Read/Unread Icon Indicator */}
                                  <div className="mt-0.5 shrink-0">
                                    {topic.isRead ? (
                                      <MessageSquare className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <div className="relative">
                                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {topic.stickable && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                                          <Pin className="w-3 h-3 text-amber-600" />
                                          Épinglé
                                        </span>
                                      )}

                                      {topic.isClosed && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider">
                                          <Lock className="w-3 h-3 text-red-600" />
                                          Fermé
                                        </span>
                                      )}

                                      {(topic.isPrivate === 1 || topic.isPrivate === true) ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider">
                                          <EyeOff className="w-3 h-3 text-purple-600" />
                                          Privé
                                        </span>
                                      ) : (topic.isPrivate as any) === 2 ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                                          <Globe className="w-3 h-3 text-teal-600" />
                                          Grand public
                                        </span>
                                      ) : null}

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectTopic(topic.id);
                                        }}
                                        style={{ color: rowLinkColor || undefined }}
                                        className={`font-semibold text-sm hover:underline text-left line-clamp-2 ${
                                          topic.isRead
                                            ? 'text-slate-800'
                                            : 'text-slate-900 font-bold'
                                        }`}
                                      >
                                        {topic.title}
                                      </button>
                                    </div>

                                    {(topic.isPrivate === 1 || topic.isPrivate === true) && (
                                      <div className="flex items-center gap-1.5 text-[11px] text-purple-700 bg-purple-50/90 px-2 py-0.5 rounded-md border border-purple-200/70 w-fit">
                                        <Users className="w-3 h-3 text-purple-500 shrink-0" />
                                        <span className="font-semibold">Accès :</span>
                                        <span className="truncate max-w-xs sm:max-w-md">
                                          {topic.canReadUsers && topic.canReadUsers.length > 0
                                            ? topic.canReadUsers.map((u, index) => (
                                                <React.Fragment key={u.id}>
                                                  {index > 0 && ', '}
                                                  <UserPseudoLink userId={u.id} username={u.username} profil={u.profil} />
                                                </React.Fragment>
                                              ))
                                            : 'MJ uniquement'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {isAdminMode && (
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditTopic(section.id, topic);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                                      title="Éditer ce sujet"
                                    >
                                      <Pencil className="w-3 h-3 text-slate-500" />
                                      <span>Éditer</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDeleteTopic(topic);
                                      }}
                                      className="inline-flex items-center p-1 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                                      title="Supprimer ce sujet"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Last Post Info */}
                              <div className="md:col-span-3 text-xs text-slate-500 flex md:flex-col md:items-end justify-between gap-1">
                                {topic.lastPost ? (
                                  <>
                                    <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                                      <span className="text-slate-400">par</span>
                                      <span className="font-semibold truncate">
                                        <UserPseudoLink
                                          userId={topic.lastPost.userId}
                                          username={topic.lastPost.username}
                                          profil={topic.lastPost.userProfil}
                                          className="text-slate-700"
                                        />
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatDate(topic.lastPost.createDate)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">Aucun message</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inscriptions en attente de validation (MJ) */}
      {isMj && pendingParticipants.length > 0 && (
        <div className="mt-8 bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden animate-in fade-in">
          <div className="px-5 py-4 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  Inscriptions en attente de validation
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-semibold">
                    {pendingParticipants.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Validez les inscriptions pour créer automatiquement leur personnage et leur donner l'accès joueur, ou refusez-les.
                </p>
              </div>
            </div>
          </div>

          {participantActionFeedback && (
            <div
              className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
                participantActionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {participantActionFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{participantActionFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setParticipantActionFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="p-5 divide-y divide-slate-100">
            {pendingParticipants.map((candidate) => {
              const isProcessing = actionParticipantUserId === candidate.id;
              return (
                <div
                  key={candidate.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between flex-wrap gap-3"
                >
                  <div className="flex items-center gap-3">
                    {candidate.avatar ? (
                      <img
                        src={candidate.avatar.startsWith('http') ? candidate.avatar : `/files/${candidate.avatar}`}
                        alt={candidate.username}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                        {candidate.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">
                        {candidate.username}
                      </div>
                      <div className="text-xs text-slate-500">
                        Demande d'inscription en attente
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAcceptParticipant(candidate.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Valider l'inscription</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRejectParticipant(candidate.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 disabled:opacity-50 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>Refuser</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message candidat en attente de validation */}
      {forumData?.campaign.isPending && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-sm shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900">
              Votre inscription est en attente de validation
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Votre demande d'inscription à cette campagne est actuellement en attente de validation par le Maître du Jeu. Vous pourrez poster sur les sujets et accéder aux personnages dès que votre inscription sera validée.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Créer une section */}
      {isCreateSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <span>Créer une nouvelle section</span>
              </h3>
              <button
                onClick={() => setIsCreateSectionOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sectionModalError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{sectionModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Titre de la section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Ex : Actes de jeu, Taverne HRP..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Bannière de la section (optionnelle)
                  </label>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setSectionBanniereMode('upload')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        sectionBanniereMode === 'upload'
                          ? 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Uploader</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSectionBanniereMode('url')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        sectionBanniereMode === 'url'
                          ? 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>URL Web</span>
                    </button>
                  </div>
                </div>

                {sectionBanniereMode === 'url' ? (
                  <input
                    type="url"
                    value={newSectionBanniere}
                    onChange={(e) => setNewSectionBanniere(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                ) : (
                  <div>
                    <input
                      ref={sectionBanniereInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/avif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSectionBanniereUpload(file);
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingSectionBanniere(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingSectionBanniere(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingSectionBanniere(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingSectionBanniere(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleSectionBanniereUpload(file);
                      }}
                      onClick={() => sectionBanniereInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                        isDraggingSectionBanniere
                          ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                          : newSectionBanniere
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                      }`}
                    >
                      {isUploadingSectionBanniere ? (
                        <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold py-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Téléversement de la bannière...</span>
                        </div>
                      ) : newSectionBanniere ? (
                        <div className="flex items-center justify-between w-full px-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-medium text-slate-700 truncate font-mono">
                              {newSectionBanniere}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewSectionBanniere('');
                            }}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium p-1 cursor-pointer"
                          >
                            Supprimer
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Glissez-déposez une bannière ou <u>parcourez</u></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sectionCollapseCheckbox"
                  checked={newSectionDefaultCollapse}
                  onChange={(e) => setNewSectionDefaultCollapse(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label
                  htmlFor="sectionCollapseCheckbox"
                  className="text-xs font-medium text-slate-700 select-none cursor-pointer"
                >
                  Réduire la section par défaut à l'ouverture
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateSectionOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingSection && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Créer la section</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Créer un topic */}
      {isCreateTopicOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-indigo-600" />
                <span>Créer un nouveau sujet</span>
              </h3>
              <button
                onClick={() => setIsCreateTopicOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {topicModalError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{topicModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Section de destination <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetTopicSectionId || ''}
                  onChange={(e) => setTargetTopicSectionId(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  required
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Titre du sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="Ex : Chapitre 1 : L'Auberge maudite"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Premier message (optionnel)
                </label>
                <textarea
                  value={newTopicFirstPost}
                  onChange={(e) => setNewTopicFirstPost(e.target.value)}
                  placeholder="Écrivez le message d'ouverture du sujet..."
                  rows={4}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
                />
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Niveau d'accessibilité du sujet
                  </label>
                  <div className="space-y-2">
                    {[
                      {
                        val: 0,
                        title: '0 - Public',
                        desc: 'Tout le monde peut lire le topic. Seul les joueurs ou le MJ peuvent poster.',
                      },
                      {
                        val: 1,
                        title: '1 - Privé',
                        desc: 'Seul le MJ et les joueurs sélectionnés peuvent voir le topic et poster dedans.',
                      },
                      {
                        val: 2,
                        title: '2 - Grand public',
                        desc: 'Tout le monde peut lire le topic. Tout le monde peut poster.',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.val}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                          newTopicIsPrivate === opt.val
                            ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="newTopicAccessibility"
                          value={opt.val}
                          checked={newTopicIsPrivate === opt.val}
                          onChange={() => setNewTopicIsPrivate(opt.val)}
                          className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-slate-900">{opt.title}</span>
                          <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {newTopicIsPrivate === 1 && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        <span>Joueurs autorisés à accéder au sujet :</span>
                      </label>
                      {participants.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setNewTopicCanReadUserIds(participants.map((p) => p.id))}
                            className="text-indigo-600 hover:underline font-medium cursor-pointer"
                          >
                            Tous
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setNewTopicCanReadUserIds([])}
                            className="text-slate-500 hover:underline cursor-pointer"
                          >
                            Aucun
                          </button>
                        </div>
                      )}
                    </div>

                    {participants.length === 0 ? (
                      <p className="text-xs text-purple-700 italic">
                        Aucun joueur inscrit dans la campagne pour le moment. Le MJ a automatiquement accès.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
                        {participants.map((p) => {
                          const isSelected = newTopicCanReadUserIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-purple-100/90 border-purple-300 text-purple-950 font-semibold'
                                  : 'bg-white border-purple-100 text-slate-700 hover:bg-purple-50/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewTopicCanReadUserIds((prev) => [...prev, p.id]);
                                  } else {
                                    setNewTopicCanReadUserIds((prev) => prev.filter((id) => id !== p.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-purple-300 cursor-pointer"
                              />
                              <span className="truncate">{p.username}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[11px] text-purple-600">
                      ℹ️ Le Maître du Jeu a toujours accès au sujet.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTopicStickable}
                      onChange={(e) => setNewTopicStickable(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Épinglé</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTopicIsClosed}
                      onChange={(e) => setNewTopicIsClosed(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Fermé</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTopicOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTopic}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingTopic && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Créer le sujet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Éditer une section */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <span>Éditer la section</span>
              </h3>
              <button
                onClick={() => setEditingSection(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSectionError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{editSectionError}</span>
              </div>
            )}

            <form onSubmit={handleEditSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Titre de la section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSectionTitle}
                  onChange={(e) => setEditSectionTitle(e.target.value)}
                  placeholder="Ex : Actes de jeu, Taverne HRP..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Bannière de la section (optionnelle)
                  </label>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditSectionBanniereMode('upload')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        editSectionBanniereMode === 'upload'
                          ? 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Uploader</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSectionBanniereMode('url')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        editSectionBanniereMode === 'url'
                          ? 'bg-white text-indigo-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>URL Web</span>
                    </button>
                  </div>
                </div>

                {editSectionBanniereMode === 'url' ? (
                  <input
                    type="url"
                    value={editSectionBanniere}
                    onChange={(e) => setEditSectionBanniere(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                ) : (
                  <div>
                    <input
                      ref={editSectionBanniereInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/avif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleEditSectionBanniereUpload(file);
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingEditSectionBanniere(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingEditSectionBanniere(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingEditSectionBanniere(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingEditSectionBanniere(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleEditSectionBanniereUpload(file);
                      }}
                      onClick={() => editSectionBanniereInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                        isDraggingEditSectionBanniere
                          ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                          : editSectionBanniere
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                      }`}
                    >
                      {isUploadingEditSectionBanniere ? (
                        <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold py-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Téléversement de la bannière...</span>
                        </div>
                      ) : editSectionBanniere ? (
                        <div className="flex items-center justify-between w-full px-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-medium text-slate-700 truncate font-mono">
                              {editSectionBanniere}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditSectionBanniere('');
                            }}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium p-1 cursor-pointer"
                          >
                            Supprimer
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Glissez-déposez une bannière ou <u>parcourez</u></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editSectionCollapseCheckbox"
                  checked={editSectionDefaultCollapse}
                  onChange={(e) => setEditSectionDefaultCollapse(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label
                  htmlFor="editSectionCollapseCheckbox"
                  className="text-xs font-medium text-slate-700 select-none cursor-pointer"
                >
                  Réduire la section par défaut à l'ouverture
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditSection}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEditSection && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Éditer un topic */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <span>Éditer le sujet</span>
              </h3>
              <button
                onClick={() => setEditingTopic(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editTopicError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{editTopicError}</span>
              </div>
            )}

            <form onSubmit={handleEditTopicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Titre du sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTopicTitle}
                  onChange={(e) => setEditTopicTitle(e.target.value)}
                  placeholder="Ex : Chapitre 1 : L'Auberge maudite"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Niveau d'accessibilité du sujet
                  </label>
                  <div className="space-y-2">
                    {[
                      {
                        val: 0,
                        title: '0 - Public',
                        desc: 'Tout le monde peut lire le topic. Seul les joueurs ou le MJ peuvent poster.',
                      },
                      {
                        val: 1,
                        title: '1 - Privé',
                        desc: 'Seul le MJ et les joueurs sélectionnés peuvent voir le topic et poster dedans.',
                      },
                      {
                        val: 2,
                        title: '2 - Grand public',
                        desc: 'Tout le monde peut lire le topic. Tout le monde peut poster.',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.val}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                          editTopicIsPrivate === opt.val
                            ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="editTopicAccessibility"
                          value={opt.val}
                          checked={editTopicIsPrivate === opt.val}
                          onChange={() => setEditTopicIsPrivate(opt.val)}
                          className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-slate-900">{opt.title}</span>
                          <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {editTopicIsPrivate === 1 && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        <span>Joueurs autorisés à accéder au sujet :</span>
                      </label>
                      {participants.length > 0 && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setEditTopicCanReadUserIds(participants.map((p) => p.id))}
                            className="text-indigo-600 hover:underline font-medium cursor-pointer"
                          >
                            Tous
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setEditTopicCanReadUserIds([])}
                            className="text-slate-500 hover:underline cursor-pointer"
                          >
                            Aucun
                          </button>
                        </div>
                      )}
                    </div>

                    {participants.length === 0 ? (
                      <p className="text-xs text-purple-700 italic">
                        Aucun joueur inscrit dans la campagne pour le moment. Le MJ a automatiquement accès.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
                        {participants.map((p) => {
                          const isSelected = editTopicCanReadUserIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-purple-100/90 border-purple-300 text-purple-950 font-semibold'
                                  : 'bg-white border-purple-100 text-slate-700 hover:bg-purple-50/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditTopicCanReadUserIds((prev) => [...prev, p.id]);
                                  } else {
                                    setEditTopicCanReadUserIds((prev) => prev.filter((id) => id !== p.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-purple-300 cursor-pointer"
                              />
                              <span className="truncate">{p.username}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[11px] text-purple-600">
                      ℹ️ Le Maître du Jeu a toujours accès au sujet.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editTopicStickable}
                      onChange={(e) => setEditTopicStickable(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Épinglé</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editTopicIsClosed}
                      onChange={(e) => setEditTopicIsClosed(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Fermé</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditTopic}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEditTopic && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Confirmation de suppression de Section */}
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

      {/* Modal: Confirmation de suppression de Sujet */}
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

      {/* Modal: Tour à dés */}
      {isCampaignMember && (
        <DiceTowerModal
          isOpen={isDiceTowerOpen}
          onClose={() => setIsDiceTowerOpen(false)}
          campaignId={effectiveCampaignId}
          campaignName={forumData?.campaign?.name}
          isMj={isMj}
        />
      )}
    </div>
  );
};
