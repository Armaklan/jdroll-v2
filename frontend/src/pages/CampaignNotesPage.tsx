import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { CampaignHeader } from '../components/CampaignHeader';
import { WysiwygEditor } from '../components/WysiwygEditor';
import { DiceTowerModal } from '../components/DiceTowerModal';
import { CampaignNotesData, Note } from '../types/campaign';
import { formatDate } from '../utils/date';
import {
  StickyNote,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  ArrowLeft,
  RotateCcw,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface CampaignNotesPageProps {
  campaignId?: number;
}

export const CampaignNotesPage: React.FC<CampaignNotesPageProps> = ({
  campaignId,
}) => {
  const params = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveCampaignId = campaignId ?? (params.campaignId ? Number(params.campaignId) : 0);

  const [data, setData] = useState<CampaignNotesData | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  // Editor state for currently selected note
  const [content, setContent] = useState<string>('');
  const [savedContent, setSavedContent] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Note to delete (for confirmation modal)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Dice tower modal state
  const [isDiceTowerOpen, setIsDiceTowerOpen] = useState<boolean>(false);

  // Banner upload state
  const [isUploadingBanner, setIsUploadingBanner] = useState<boolean>(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);

  const isDirty = content !== savedContent;

  const selectedNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  const selectedNoteIndex = useMemo(() => {
    return notes.findIndex((n) => n.id === selectedNoteId);
  }, [notes, selectedNoteId]);

  const loadData = useCallback(async () => {
    if (effectiveCampaignId === undefined || effectiveCampaignId === null) {
      setError('Identifiant de campagne manquant');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await campaignsApi.getCampaignNotes(effectiveCampaignId);
      setData(res);
      setNotes(res.notes || []);

      if (res.notes && res.notes.length > 0) {
        // Select first note by default if none selected or selected not in list
        const initialNote = res.notes[0];
        setSelectedNoteId(initialNote.id);
        setContent(initialNote.content || '');
        setSavedContent(initialNote.content || '');
        setLastUpdate(initialNote.lastUpdate || null);
      } else {
        setSelectedNoteId(null);
        setContent('');
        setSavedContent('');
        setLastUpdate(null);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos notes pour cette campagne.');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCampaignId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle switching active note
  const handleSelectNote = (note: Note) => {
    if (note.id === selectedNoteId) return;

    if (isDirty) {
      const confirmSwitch = window.confirm(
        'Vous avez des modifications non enregistrées sur cette note. Voulez-vous vraiment changer de note ? Vos modifications non enregistrées seront perdues.'
      );
      if (!confirmSwitch) return;
    }

    setSelectedNoteId(note.id);
    setContent(note.content || '');
    setSavedContent(note.content || '');
    setLastUpdate(note.lastUpdate || null);
    setSaveToast(null);
  };

  // Create a new note
  const handleCreateNote = async () => {
    if (effectiveCampaignId === undefined || effectiveCampaignId === null || isCreating) return;

    if (isDirty) {
      const confirmCreate = window.confirm(
        'Vous avez des modifications non enregistrées sur la note en cours. Voulez-vous créer une nouvelle note ?'
      );
      if (!confirmCreate) return;
    }

    setIsCreating(true);
    setSaveToast(null);

    try {
      const res = await campaignsApi.createCampaignNote(effectiveCampaignId, '');
      const newNote = res.note;
      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      setSelectedNoteId(newNote.id);
      setContent(newNote.content || '');
      setSavedContent(newNote.content || '');
      setLastUpdate(newNote.lastUpdate || new Date().toISOString());
      setSaveToast({ message: 'Nouvelle note créée avec succès.', type: 'success' });
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err: any) {
      setSaveToast({
        message: err.message || 'Erreur lors de la création de la note.',
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Save current note
  const handleSave = async () => {
    if (effectiveCampaignId === undefined || effectiveCampaignId === null || !selectedNoteId || isSaving) return;

    setIsSaving(true);
    setSaveToast(null);

    try {
      const res = await campaignsApi.updateCampaignNote(effectiveCampaignId, selectedNoteId, content);
      const updatedNote = res.note;

      setNotes((prev) =>
        prev.map((n) => (n.id === selectedNoteId ? updatedNote : n))
      );
      setSavedContent(content);
      setLastUpdate(updatedNote.lastUpdate || new Date().toISOString());
      setSaveToast({ message: 'Note enregistrée avec succès.', type: 'success' });
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err: any) {
      setSaveToast({
        message: err.message || "Erreur lors de l'enregistrement de votre note.",
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete note
  const confirmDeleteNote = async () => {
    if (effectiveCampaignId === undefined || effectiveCampaignId === null || !noteToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await campaignsApi.deleteCampaignNote(effectiveCampaignId, noteToDelete.id);
      const remainingNotes = notes.filter((n) => n.id !== noteToDelete.id);
      setNotes(remainingNotes);

      if (selectedNoteId === noteToDelete.id) {
        if (remainingNotes.length > 0) {
          const nextNote = remainingNotes[0];
          setSelectedNoteId(nextNote.id);
          setContent(nextNote.content || '');
          setSavedContent(nextNote.content || '');
          setLastUpdate(nextNote.lastUpdate || null);
        } else {
          setSelectedNoteId(null);
          setContent('');
          setSavedContent('');
          setLastUpdate(null);
        }
      }

      setNoteToDelete(null);
      setSaveToast({ message: 'Note supprimée avec succès.', type: 'success' });
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err: any) {
      setSaveToast({
        message: err.message || 'Erreur lors de la suppression de la note.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleBannerUpload = async (file: File) => {
    if (effectiveCampaignId === undefined || effectiveCampaignId === null || !data?.campaign) return;
    setIsUploadingBanner(true);
    setBannerUploadError(null);
    try {
      const res = await campaignsApi.uploadCampaignBanner(effectiveCampaignId, file);
      setData({
        ...data,
        campaign: {
          ...data.campaign,
          banniere: res.url,
        },
      });
    } catch (err: any) {
      setBannerUploadError(err.message || 'Erreur lors du téléversement de la bannière');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Helper to extract clean text from html
  const extractNoteText = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  };

  const getNoteTitleAndExcerpt = (html: string, index: number) => {
    const text = extractNoteText(html);
    const defaultTitle = `Note #${index + 1}`;
    if (!text) {
      return { title: defaultTitle, excerpt: 'Note vide' };
    }
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || '';
    const title = firstLine.length > 30 ? firstLine.slice(0, 30) + '…' : firstLine || defaultTitle;
    const excerpt = text.length > 70 ? text.slice(0, 70) + '…' : text;
    return { title, excerpt };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Chargement de vos notes...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-base font-bold">Accès impossible aux notes</h2>
            <p className="text-sm">{error || 'Cette campagne est introuvable ou vous n’y avez pas accès.'}</p>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => navigate(`/campaigns/${effectiveCampaignId}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 font-medium text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour au forum de la campagne</span>
              </button>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-slate-50 text-red-700 font-medium text-xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réessayer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isMj = Boolean(user && data?.campaign && (user.id === data.campaign.mjId || data.campaign.userRole === 'mj'));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Campaign Header - Masqué pour campaign_id = 0 (notes globales) */}
      {effectiveCampaignId !== 0 && data?.campaign && 
        <CampaignHeader
          campaign={data.campaign!}
          activeTab="notes"
          isAdminMode={isMj}
          onOpenDiceTower={() => setIsDiceTowerOpen(true)}
          onBannerUpload={handleBannerUpload}
          isUploadingBanner={isUploadingBanner}
          bannerUploadError={bannerUploadError}
          onClearBannerUploadError={() => setBannerUploadError(null)}
          onObserveChange={(isObserving) => {
            setData((prev) =>
              prev && prev.campaign ? { ...prev, campaign: { ...prev.campaign, isObserving } } : null
            );
          }}
          onAlertChange={(hasAlert) => {
            setData((prev) =>
              prev && prev.campaign ? { ...prev, campaign: { ...prev.campaign, hasAlert } } : null
            );
          }}
        />
      }

      {/* Main Multi-Note Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Notes List */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          {/* List Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">Mes notes</h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                {notes.length}
              </span>
            </div>

            <button
              onClick={handleCreateNote}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Créer une nouvelle note"
            >
              {isCreating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Nouvelle note</span>
            </button>
          </div>

          {/* List Content */}
          <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
            {notes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Aucune note pour le moment</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Créez votre première note pour consigner vos indices, rappels ou plans secrets.
                  </p>
                </div>
                <button
                  onClick={handleCreateNote}
                  disabled={isCreating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer ma première note</span>
                </button>
              </div>
            ) : (
              notes.map((note, index) => {
                const isSelected = note.id === selectedNoteId;
                const { title, excerpt } = getNoteTitleAndExcerpt(
                  isSelected ? content : note.content,
                  index
                );

                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`group relative p-4 transition cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {title}
                        </span>
                        {isSelected && isDirty && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500" title="Non sauvegardé" />
                        )}
                      </div>

                      <p className="text-2xs text-slate-500 line-clamp-2 mt-1 break-words">
                        {excerpt}
                      </p>

                      <div className="flex items-center gap-1 mt-2 text-3xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {note.lastUpdate ? formatDate(note.lastUpdate) : 'Récemment'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                      }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer shrink-0"
                      title="Supprimer cette note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Note Editor */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          {selectedNote ? (
            <>
              {/* Editor Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                    <StickyNote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-base font-bold text-slate-800">
                        {getNoteTitleAndExcerpt(content, selectedNoteIndex).title}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-2xs font-medium border border-slate-200">
                        <Lock className="w-2.5 h-2.5" /> Privé
                      </span>
                      {isDirty && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-2xs font-semibold border border-amber-200">
                          Non sauvegardé
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cette note est confidentielle et n'est visible que par vous.
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  {lastUpdate && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 mr-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(lastUpdate)}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setNoteToDelete(selectedNote)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 text-xs font-medium transition cursor-pointer"
                    title="Supprimer cette note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs shadow-xs transition cursor-pointer ${
                      isDirty
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                    } disabled:opacity-50`}
                    title="Enregistrer la note (Ctrl+S)"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
                  </button>
                </div>
              </div>

              {/* Save Feedback Banner */}
              {saveToast && (
                <div
                  className={`px-6 py-2.5 text-xs flex items-center justify-between transition-all ${
                    saveToast.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                      : 'bg-red-50 text-red-800 border-b border-red-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {saveToast.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">{saveToast.message}</span>
                  </div>
                  <button
                    onClick={() => setSaveToast(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold ml-4 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Editor Content */}
              <div className="p-6 flex-1 min-h-[450px]">
                <WysiwygEditor
                  key={selectedNote.id}
                  value={content}
                  onChange={setContent}
                  placeholder="Rédigez ici vos notes de jeu, indices trouvés, secrets, rappels, résumés..."
                  minHeight="420px"
                />
              </div>

              {/* Footer Bar */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                <div className="flex items-center gap-4">
                  <span>
                    Astuce : Utilisez <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-2xs">Ctrl + S</kbd> pour enregistrer rapidement.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{isSaving ? 'Enregistrement...' : 'Enregistrer la note'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 px-6 text-center text-slate-500 space-y-4">
              <StickyNote className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-700">Aucune note sélectionnée</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Sélectionnez une note dans la liste à gauche ou créez-en une nouvelle pour commencer à écrire.
                </p>
              </div>
              <button
                onClick={handleCreateNote}
                disabled={isCreating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer une nouvelle note</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-100 text-red-600 rounded-full shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Supprimer cette note ?</h3>
                  <p className="text-xs text-slate-500">
                    Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible et son contenu sera définitivement effacé.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs transition cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteNote}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dice Tower Modal - Masqué pour campaign_id = 0 */}
      {effectiveCampaignId !== 0 && data?.campaign && isDiceTowerOpen && (
        <DiceTowerModal
          campaignId={data.campaign.id}
          isOpen={isDiceTowerOpen}
          onClose={() => setIsDiceTowerOpen(false)}
        />
      )}
    </div>
  );
};
