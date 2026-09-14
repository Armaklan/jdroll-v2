import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { WysiwygEditor } from '../components/WysiwygEditor';
import { DiceTowerModal } from '../components/DiceTowerModal';
import { CampaignHeader } from '../components/CampaignHeader';
import {
  CampaignCharactersData,
  CampaignCharacter,
  CampaignParticipant,
  CreateCharacterPayload,
  UpdateCharacterPayload,
} from '../types/campaign';
import {
  ArrowLeft,
  Users,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  X,
  User,
  Search,
  Sparkles,
  FileText,
  Lock,
  Eye,
  Plus,
  Edit2,
  Save,
  Image as ImageIcon,
  Check,
  Tag,
  Upload,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';

interface CampaignCharactersPageProps {
  campaignId?: number;
  onBack?: () => void;
}

interface CharacterFormData {
  name: string;
  concept: string;
  avatar: string;
  catId: number | null;
  assignedUserId: number | null;
  publicDescription: string;
  privateDescription: string;
  technical: string;
}

const emptyFormData: CharacterFormData = {
  name: '',
  concept: '',
  avatar: '',
  catId: null,
  assignedUserId: null,
  publicDescription: '',
  privateDescription: '',
  technical: '',
};

export const CampaignCharactersPage: React.FC<CampaignCharactersPageProps> = ({
  campaignId,
  onBack,
}) => {
  const params = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveCampaignId = campaignId ?? (params.campaignId ? Number(params.campaignId) : 0);

  const [data, setData] = useState<CampaignCharactersData | null>(null);
  const [participants, setParticipants] = useState<CampaignParticipant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedCharacter, setSelectedCharacter] = useState<CampaignCharacter | null>(null);
  const [isDiceTowerOpen, setIsDiceTowerOpen] = useState<boolean>(false);

  // Modal form state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCharacter, setEditingCharacter] = useState<CampaignCharacter | null>(null);
  const [formData, setFormData] = useState<CharacterFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Avatar upload / url state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarMode, setAvatarMode] = useState<'url' | 'upload'>('url');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState<boolean>(false);
  const [isDraggingPreview, setIsDraggingPreview] = useState<boolean>(false);

  const handleAvatarFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Le fichier doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }

    setIsUploadingAvatar(true);
    setUploadError(null);
    try {
      const res = await campaignsApi.uploadCampaignImage(effectiveCampaignId, file);
      setFormData((prev) => ({ ...prev, avatar: res.url }));
      setAvatarMode('upload');
      setToastMessage({ text: 'Portrait téléversé avec succès !', type: 'success' });
    } catch (err: any) {
      setUploadError(err.message || 'Erreur lors du téléversement de l\'image.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleAvatarFileUpload(file);
    }
  };

  const isMj = Boolean(
    data?.campaign?.userRole === 'mj' || (user && data?.campaign?.mjId === user.id)
  );
  const isPlayer = Boolean(user && data?.campaign?.userRole === 'player');
  const isCampaignMember = isMj || isPlayer;

  const canEditCharacter = (char: CampaignCharacter): boolean => {
    if (!user) return false;
    if (isMj) return true;
    return Boolean(char.userId !== null && char.userId === user.id);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/my-campaigns');
    }
  };

  const handleGoToForum = () => {
    navigate(`/campaigns/${effectiveCampaignId}`);
  };

  const fetchCharacters = async () => {
    if (!effectiveCampaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await campaignsApi.getCampaignCharacters(effectiveCampaignId);
      setData(result);

      // Initialize collapsed categories
      const initialCollapse: Record<string, boolean> = {};
      result.categories.forEach((cat, idx) => {
        const catKey = cat.id !== null ? String(cat.id) : `custom-${idx}-${cat.name}`;
        initialCollapse[catKey] = cat.defaultCollapse;
      });
      setCollapsedCategories(initialCollapse);

      // Also load participants in background for character assignment
      try {
        const pList = await campaignsApi.getCampaignParticipants(effectiveCampaignId);
        setParticipants(pList);
      } catch {
        // Fallback: ignore if participant route fails
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les personnages de la campagne.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveCampaignId) {
      fetchCharacters();
    }
  }, [effectiveCampaignId]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFormOpen) {
          setIsFormOpen(false);
        } else if (selectedCharacter) {
          setSelectedCharacter(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, selectedCharacter]);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const toggleCategory = (catKey: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  const handleOpenCreate = () => {
    setEditingCharacter(null);
    setFormData({
      name: '',
      concept: '',
      avatar: '',
      catId: null,
      assignedUserId: null,
      publicDescription: '',
      privateDescription: '',
      technical: '',
    });
    setAvatarMode('url');
    setUploadError(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (char: CampaignCharacter, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingCharacter(char);
    setFormData({
      name: char.name,
      concept: char.concept || '',
      avatar: char.avatar || '',
      catId: char.catId,
      assignedUserId: char.userId,
      publicDescription: char.publicDescription || '',
      privateDescription: char.privateDescription || '',
      technical: char.technical || '',
    });
    setAvatarMode(char.avatar && char.avatar.startsWith('/files/') ? 'upload' : 'url');
    setUploadError(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError('Le nom du personnage est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingCharacter) {
        // Edit mode
        const payload: UpdateCharacterPayload = {
          name: trimmedName,
          concept: formData.concept.trim(),
          avatar: formData.avatar.trim(),
          publicDescription: formData.publicDescription,
          privateDescription: formData.privateDescription,
          technical: formData.technical,
        };

        if (isMj) {
          payload.catId = formData.catId;
          payload.assignedUserId = formData.assignedUserId;
        }

        const updated = await campaignsApi.updateCharacter(
          editingCharacter.id,
          payload,
          effectiveCampaignId
        );

        setToastMessage({
          text: `Le personnage « ${updated.name} » a été mis à jour avec succès.`,
          type: 'success',
        });

        // Update selectedCharacter if currently open in detail modal
        if (selectedCharacter && selectedCharacter.id === editingCharacter.id) {
          setSelectedCharacter({
            ...selectedCharacter,
            ...updated,
            name: updated.name,
            concept: updated.concept,
            avatar: updated.avatar,
            publicDescription: updated.publicDescription,
            privateDescription: updated.privateDescription,
            technical: updated.technical,
            catId: updated.catId,
            userId: updated.userId,
          });
        }
      } else {
        // Create mode (GM only)
        const payload: CreateCharacterPayload = {
          name: trimmedName,
          concept: formData.concept.trim(),
          avatar: formData.avatar.trim(),
          catId: formData.catId,
          assignedUserId: formData.assignedUserId,
          publicDescription: formData.publicDescription,
          privateDescription: formData.privateDescription,
          technical: formData.technical,
        };

        const created = await campaignsApi.createCharacter(effectiveCampaignId, payload);

        setToastMessage({
          text: `Le personnage « ${created.name} » a été créé avec succès !`,
          type: 'success',
        });
      }

      setIsFormOpen(false);
      await fetchCharacters();
    } catch (err: any) {
      setFormError(err.message || "Une erreur est survenue lors de l'enregistrement du personnage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-600 font-medium text-sm">Chargement de la galerie de personnages...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Erreur</h2>
        <p className="text-slate-600 text-sm">{error || 'Campagne introuvable'}</p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={fetchCharacters}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Réessayer
          </button>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            Retour aux campagnes
          </button>
        </div>
      </div>
    );
  }

  const { campaign, categories } = data;

  // Custom campaign CSS theme colors
  const campaignStyles = {
    '--pensee-color': campaign.penseeColor || '#8844CC',
    '--dialogue-color': campaign.dialogueColor || '#4488CC',
    '--rp1-color': campaign.rp1Color || '#ff6600',
    '--rp2-color': campaign.rp2Color || '#5EFF6C',
    '--color-pensee': campaign.penseeColor || '#8844CC',
    '--color-dialogue': campaign.dialogueColor || '#4488CC',
    '--color-rp1': campaign.rp1Color || '#ff6600',
    '--color-rp2': campaign.rp2Color || '#5EFF6C',
  } as React.CSSProperties;

  // Filter categories and characters by search query
  const query = searchQuery.trim().toLowerCase();
  const filteredCategories = categories.map((cat) => {
    if (!query) return cat;
    const filteredChars = cat.characters.filter(
      (char) =>
        char.name.toLowerCase().includes(query) ||
        char.concept.toLowerCase().includes(query) ||
        (char.userName && char.userName.toLowerCase().includes(query))
    );
    return {
      ...cat,
      characters: filteredChars,
    };
  }).filter((cat) => !query || cat.characters.length > 0);

  // Available defined categories for the form (excluding virtual ones)
  const availableCategories = categories.filter((c) => c.id !== null);

  return (
    <div className="space-y-6" style={campaignStyles}>
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : 'bg-rose-900 text-rose-100 border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux campagnes</span>
          </button>
          <span>/</span>
          <button
            onClick={handleGoToForum}
            className="text-slate-700 hover:text-indigo-600 font-semibold truncate max-w-xs sm:max-w-md transition"
          >
            {campaign.name}
          </button>
          <span>/</span>
          <span className="text-indigo-600 font-semibold">Galerie de personnages</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isMj && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer"
              title="Créer un nouveau personnage dans la campagne"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau personnage</span>
            </button>
          )}

          <button
            onClick={fetchCharacters}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition shadow-2xs"
            title="Actualiser les personnages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Campaign Header */}
      <CampaignHeader
        campaign={campaign}
        activeTab="characters"
        onOpenDiceTower={() => setIsDiceTowerOpen(true)}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un personnage, concept ou joueur..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 w-full sm:w-auto text-right flex items-center justify-end gap-2">
          <span>
            Affichage de <strong>{filteredCategories.reduce((s, c) => s + c.characters.length, 0)}</strong> personnage(s)
          </span>
        </div>
      </div>

      {/* Characters Categories List */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucun personnage trouvé</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? `Aucun personnage ne correspond à votre recherche « ${searchQuery} ».`
              : 'Aucun personnage n’est encore enregistré dans cette campagne.'}
          </p>
          {isMj && (
            <div className="pt-2">
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Créer le premier personnage</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category, catIdx) => {
            const catKey = category.id !== null ? String(category.id) : `custom-${catIdx}-${category.name}`;
            const isCollapsed = collapsedCategories[catKey];

            return (
              <div
                key={catKey}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition duration-200"
              >
                {/* Category Header */}
                <div
                  style={{
                    backgroundColor: campaign.sidebarColor || undefined,
                    color: campaign.linkSidebarColor || undefined,
                  }}
                  className="w-full px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between transition group cursor-pointer select-none"
                  onClick={() => toggleCategory(catKey)}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FolderOpen
                      className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105"
                      style={{ color: campaign.linkSidebarColor || undefined }}
                    />
                    <h2
                      className="font-bold text-sm sm:text-base tracking-tight truncate"
                      style={{ color: campaign.linkSidebarColor || undefined }}
                    >
                      {category.name}
                    </h2>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                      style={{
                        backgroundColor: campaign.sidebarColor
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'rgba(0, 0, 0, 0.06)',
                        color: campaign.linkSidebarColor || undefined,
                      }}
                    >
                      {category.characters.length} personnage{category.characters.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="p-1 rounded hover:bg-black/10 transition"
                    style={{ color: campaign.linkSidebarColor || undefined }}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {/* Category Characters Grid */}
                {!isCollapsed && (
                  <div className="p-5">
                    {category.characters.length === 0 ? (
                      <p className="text-xs sm:text-sm text-slate-400 italic text-center py-6">
                        Aucun personnage dans cette catégorie.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                        {category.characters.map((character) => {
                          const isPJ = character.isPlayer;
                          const canEdit = canEditCharacter(character);

                          return (
                            <div
                              key={character.id}
                              onClick={() => setSelectedCharacter(character)}
                              className="group bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-indigo-400 rounded-2xl p-4 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between relative"
                            >
                              <div>
                                {/* Character Avatar / Image Container */}
                                <div className="aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/60 mb-3.5 relative flex items-center justify-center group-hover:ring-2 group-hover:ring-indigo-500/30 transition">
                                  {character.avatar ? (
                                    <img
                                      src={character.avatar}
                                      alt={character.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const parent = (e.target as HTMLElement).parentElement;
                                        if (parent) {
                                          const fallback = parent.querySelector('.avatar-fallback');
                                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}

                                  {/* Fallback Icon if avatar missing or broken */}
                                  <div
                                    className={`avatar-fallback w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 ${
                                      character.avatar ? 'hidden' : 'flex'
                                    }`}
                                  >
                                    <User className="w-12 h-12 text-slate-300 mb-1" />
                                    <span className="text-[11px] font-medium text-slate-400">Sans portrait</span>
                                  </div>

                                  {/* Badges */}
                                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                                    {isPJ ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600/90 text-white backdrop-blur-xs shadow-xs uppercase tracking-wider">
                                        PJ
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800/80 text-slate-200 backdrop-blur-xs shadow-xs uppercase tracking-wider">
                                        PNJ
                                      </span>
                                    )}
                                  </div>

                                  {/* Edit button overlay on avatar */}
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEdit(character, e)}
                                      className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 shadow-md backdrop-blur-xs transition transform hover:scale-110"
                                      title="Éditer ce personnage"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Character Name & Concept */}
                                <div className="space-y-1">
                                  <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition truncate">
                                    {character.name}
                                  </h3>
                                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {character.concept || 'Aucun concept défini'}
                                  </p>
                                </div>
                              </div>

                              {/* Footer Meta: Player Username if PJ */}
                              <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                                {isPJ && character.userName ? (
                                  <span className="truncate max-w-[130px]">
                                    Joueur : <strong className="text-slate-700">{character.userName}</strong>
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400">PNJ</span>
                                )}

                                <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-xs">
                                  Détails &rarr;
                                </span>
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

      {/* Character Full Detail Modal */}
      {selectedCharacter && !isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative my-auto">
            {/* Modal Header Bar with Close Button & Edit Button */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {selectedCharacter.isPlayer ? 'Personnage Joueur' : 'Personnage Non-Joueur'}
                </span>
                {selectedCharacter.categoryName && (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                    {selectedCharacter.categoryName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canEditCharacter(selectedCharacter) && (
                  <button
                    onClick={() => handleOpenEdit(selectedCharacter)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200 cursor-pointer"
                    title="Modifier la fiche du personnage"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Éditer</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedCharacter(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Fermer la fiche"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Character Header Info */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-xs flex items-center justify-center">
                  {selectedCharacter.avatar ? (
                    <img
                      src={selectedCharacter.avatar}
                      alt={selectedCharacter.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const fb = parent.querySelector('.modal-avatar-fallback');
                          if (fb) (fb as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`modal-avatar-fallback w-full h-full flex flex-col items-center justify-center text-slate-300 ${
                      selectedCharacter.avatar ? 'hidden' : 'flex'
                    }`}
                  >
                    <User className="w-12 h-12" />
                  </div>
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {selectedCharacter.name}
                  </h2>

                  {selectedCharacter.concept && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{selectedCharacter.concept}</span>
                    </div>
                  )}

                  {selectedCharacter.isPlayer && selectedCharacter.userName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Joueur assigné :</span>
                      <strong className="text-slate-800 font-semibold">{selectedCharacter.userName}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Public Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-500" />
                  <span>Description publique</span>
                </h3>
                {selectedCharacter.publicDescription ? (
                  <div
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedCharacter.publicDescription }}
                  />
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    Aucune description publique disponible pour ce personnage.
                  </p>
                )}
              </div>

              {/* Private Description (Only for MJ or Character Owner) */}
              {selectedCharacter.privateDescription !== undefined && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Notes privées / Secrets (Visible MJ & propriétaire)</span>
                  </h3>
                  {selectedCharacter.privateDescription ? (
                    <div
                      className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-sm text-amber-950 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedCharacter.privateDescription }}
                    />
                  ) : (
                    <p className="text-xs text-amber-700/70 italic bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                      Aucune note privée renseignée.
                    </p>
                  )}
                </div>
              )}

              {/* Technical Details */}
              {selectedCharacter.technical !== undefined && selectedCharacter.technical && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Fiche technique / Statistiques</span>
                  </h3>
                  <div
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedCharacter.technical }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-between items-center">
              <div>
                {canEditCharacter(selectedCharacter) && (
                  <button
                    onClick={() => handleOpenEdit(selectedCharacter)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier la fiche</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedCharacter(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Character Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative my-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  {editingCharacter ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {editingCharacter ? `Éditer : ${editingCharacter.name}` : 'Nouveau personnage'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {editingCharacter
                      ? 'Modifiez les informations et caractéristiques du personnage'
                      : 'Remplissez les informations pour ajouter un personnage à la campagne'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-5">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Nom & Concept */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nom du personnage <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ex: Kaelen, Strahd..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Concept / Archétype
                    </label>
                    <input
                      type="text"
                      value={formData.concept}
                      onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                      placeholder="ex: Guerrier nain, Mage..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Avatar URL / Upload & Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Portrait / Avatar
                    </label>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setAvatarMode('upload')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          avatarMode === 'upload'
                            ? 'bg-white text-indigo-600 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>Uploader (Drag & Drop)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarMode('url')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          avatarMode === 'url'
                            ? 'bg-white text-indigo-600 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>URL Web</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      {avatarMode === 'url' ? (
                        <div className="relative">
                          <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={formData.avatar}
                            onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                            placeholder="https://..."
                            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/avif"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                            id="character-avatar-file-input"
                          />

                          {/* Interactive Dropzone */}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDraggingAvatar(true);
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDraggingAvatar(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDraggingAvatar(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDraggingAvatar(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleAvatarFileUpload(file);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                              isDraggingAvatar
                                ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                                : formData.avatar
                                ? 'border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/40'
                                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                            }`}
                          >
                            {isUploadingAvatar ? (
                              <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Téléversement du portrait en cours...</span>
                              </div>
                            ) : formData.avatar ? (
                              <div className="flex items-center justify-between w-full px-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="text-xs font-medium text-slate-700 truncate font-mono">
                                    {formData.avatar}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] text-indigo-600 font-semibold hover:underline">
                                    Changer l'image
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFormData((prev) => ({ ...prev, avatar: '' }));
                                    }}
                                    className="text-xs text-rose-600 hover:text-rose-800 font-medium p-1 cursor-pointer"
                                    title="Supprimer l'avatar"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                  <Upload className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">
                                    Glissez-déposez une image ici
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    ou <span className="text-indigo-600 font-semibold underline">parcourez vos fichiers</span>
                                  </p>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  PNG, JPG, WebP, GIF, SVG jusqu'à 10 Mo
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {uploadError && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{uploadError}</span>
                        </div>
                      )}
                    </div>

                    {/* Live Preview Avatar (also drop target) */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingPreview(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingPreview(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingPreview(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingPreview(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleAvatarFileUpload(file);
                      }}
                      className={`w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border transition shrink-0 flex items-center justify-center shadow-xs relative ${
                        isDraggingPreview
                          ? 'border-indigo-600 ring-2 ring-indigo-400 bg-indigo-100/50'
                          : 'border-slate-200'
                      }`}
                      title="Glissez-déposez une image ici pour mettre à jour le portrait"
                    >
                      {formData.avatar ? (
                        <img
                          src={formData.avatar}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <User className="w-7 h-7 text-slate-300" />
                      )}
                      {isDraggingPreview && (
                        <div className="absolute inset-0 bg-indigo-600/80 backdrop-blur-2xs flex items-center justify-center text-white">
                          <Upload className="w-5 h-5 animate-bounce" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* GM Only fields: Category & Player Assignment */}
                {isMj && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Catégorie PNJ</span>
                      </label>
                      <select
                        value={formData.catId !== null ? String(formData.catId) : ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            catId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Sans catégorie / Non classées --</option>
                        {availableCategories.map((cat) => (
                          <option key={cat.id} value={cat.id ?? ''}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Joueur assigné (PJ)</span>
                      </label>
                      <select
                        value={formData.assignedUserId !== null ? String(formData.assignedUserId) : ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            assignedUserId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Aucun (Personnage Non-Joueur) --</option>
                        {participants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Description publique */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Description publique (Visible par tous)</span>
                  </label>
                  <WysiwygEditor
                    value={formData.publicDescription}
                    onChange={(val) => setFormData((prev) => ({ ...prev, publicDescription: val }))}
                    placeholder="Histoire connue, apparence, personnalité..."
                    minHeight="140px"
                    onUploadImage={async (file) => {
                      const res = await campaignsApi.uploadCampaignImage(effectiveCampaignId, file);
                      return res.url;
                    }}
                  />
                </div>

                {/* Notes privées / Secrets */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Notes privées / Secrets (Visible uniquement par le MJ et le propriétaire)</span>
                  </label>
                  <WysiwygEditor
                    value={formData.privateDescription}
                    onChange={(val) => setFormData((prev) => ({ ...prev, privateDescription: val }))}
                    placeholder="Secrets, objectifs cachés, faiblesses, informations sensibles..."
                    minHeight="120px"
                    onUploadImage={async (file) => {
                      const res = await campaignsApi.uploadCampaignImage(effectiveCampaignId, file);
                      return res.url;
                    }}
                  />
                </div>

                {/* Fiche technique */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Fiche technique / Statistiques</span>
                  </label>
                  <WysiwygEditor
                    value={formData.technical}
                    onChange={(val) => setFormData((prev) => ({ ...prev, technical: val }))}
                    placeholder="FOR: 14 (+2), DEX: 16 (+3), PV: 45/45, Compétences, Sorts..."
                    minHeight="140px"
                    onUploadImage={async (file) => {
                      const res = await campaignsApi.uploadCampaignImage(effectiveCampaignId, file);
                      return res.url;
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="sticky bottom-0 bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingCharacter ? 'Enregistrer les modifications' : 'Créer le personnage'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Tour à dés */}
      {isCampaignMember && (
        <DiceTowerModal
          isOpen={isDiceTowerOpen}
          onClose={() => setIsDiceTowerOpen(false)}
          campaignId={effectiveCampaignId}
          campaignName={data?.campaign?.name}
          isMj={isMj}
        />
      )}
    </div>
  );
};
