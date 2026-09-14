import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { CreateCampaignPayload, UpdateCampaignPayload } from '../types/campaign';
import { WysiwygEditor } from '../components/WysiwygEditor';
import {
  ArrowLeft,
  Save,
  Sparkles,
  BookOpen,
  Users,
  Shield,
  Palette,
  Layers,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Loader2,
  Dices,
  Eye,
  RefreshCw,
  Clock,
  Feather,
  X,
  Sliders,
} from 'lucide-react';

interface CampaignFormPageProps {
  mode?: 'create' | 'edit';
}

const DEFAULT_DIALOGUE_COLOR = '#4488CC';
const DEFAULT_PENSEE_COLOR = '#8844CC';
const DEFAULT_RP1_COLOR = '#FF6600';
const DEFAULT_RP2_COLOR = '#5EFF6C';

const SYSTEM_PRESETS = [
  'Donjons & Dragons 5E',
  'Pathfinder 2',
  "L'Appel de Cthulhu 7E",
  'Vampire : La Mascarade',
  'Cyberpunk RED',
  'Chroniques Oubliées',
  'Star Wars (FFG/D6)',
  'Warhammer Fantasy',
  'Système Libre',
];

const UNIVERSE_PRESETS = [
  'Médiéval-Fantastique',
  'Horreur Contemporaine',
  'Cyberpunk / SF',
  'Space Opera',
  'Post-Apocalyptique',
  'Steampunk / Uchronie',
  'Enquêtes & Mystères',
  'Dark Fantasy',
];

const DICE_PRESETS = [
  { label: 'd20 standard', formula: '1d20' },
  { label: '3d6 (GURPS / AGE)', formula: '3d6' },
  { label: 'd100 (Cthulhu / BRP)', formula: '1d100' },
  { label: '4d Fudge', formula: '4df' },
  { label: '2d6 (PbtA)', formula: '2d6' },
];

export const CampaignFormPage: React.FC<CampaignFormPageProps> = ({ mode: propMode }) => {
  const params = useParams<{ campaignId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEditMode = propMode === 'edit' || Boolean(params.campaignId);
  const campaignId = params.campaignId ? Number(params.campaignId) : 0;

  // Loading & submit states
  const [isLoading, setIsLoading] = useState<boolean>(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form core fields
  const [name, setName] = useState<string>('');
  const [systeme, setSysteme] = useState<string>('');
  const [univers, setUnivers] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [nbJoueurs, setNbJoueurs] = useState<number>(4);

  // Banner fields
  const [bannerMode, setBannerMode] = useState<'upload' | 'url'>('url');
  const [banniereUrl, setBanniereUrl] = useState<string>('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isDraggingBanner, setIsDraggingBanner] = useState<boolean>(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Game rules & options
  const [statut, setStatut] = useState<number>(0);
  const [isRecrutementOpen, setIsRecrutementOpen] = useState<boolean>(true);
  const [rythme, setRythme] = useState<number>(2);
  const [rp, setRp] = useState<number>(1);
  const [isMultiCharacter, setIsMultiCharacter] = useState<boolean>(false);
  const [defaultDice, setDefaultDice] = useState<string>('1d20');

  // Colors & visual theme
  const [dialogueColor, setDialogueColor] = useState<string>(DEFAULT_DIALOGUE_COLOR);
  const [penseeColor, setPenseeColor] = useState<string>(DEFAULT_PENSEE_COLOR);
  const [rp1Color, setRp1Color] = useState<string>(DEFAULT_RP1_COLOR);
  const [rp2Color, setRp2Color] = useState<string>(DEFAULT_RP2_COLOR);
  const [quoteColor, setQuoteColor] = useState<string>('');
  const [sidebarColor, setSidebarColor] = useState<string>('');
  const [oddLineColor, setOddLineColor] = useState<string>('');
  const [evenLineColor, setEvenLineColor] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('');
  const [linkColor, setLinkColor] = useState<string>('');
  const [linkSidebarColor, setLinkSidebarColor] = useState<string>('');

  // Active tab in form
  const [activeTab, setActiveTab] = useState<'general' | 'gameplay' | 'appearance'>('general');

  // Load existing campaign data for edit mode
  useEffect(() => {
    if (!isEditMode || !campaignId) return;

    const fetchCampaignData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const campaign = await campaignsApi.getCampaign(campaignId);

        // Security check: only MJ or Admin can edit
        if (user && campaign.mjId !== user.id && user.profil !== 1) {
          setLoadError("Vous n'êtes pas autorisé à modifier la configuration de cette campagne.");
          setIsLoading(false);
          return;
        }

        setName(campaign.name || '');
        setSysteme(campaign.systeme || '');
        setUnivers(campaign.univers || '');
        setDescription(campaign.description || '');
        setNbJoueurs(campaign.nbJoueurs || 4);
        setBanniereUrl(campaign.banniere || '');
        setBannerPreview(campaign.banniere || null);
        setBannerMode(campaign.banniere?.startsWith('/files/') ? 'upload' : 'url');

        setStatut(campaign.statut ?? 0);
        setIsRecrutementOpen(Boolean(campaign.isRecrutementOpen));
        setRythme(campaign.rythme ?? 2);
        setRp(campaign.rp ?? 1);
        setIsMultiCharacter(Boolean(campaign.isMultiCharacter));
        setDefaultDice(campaign.defaultDice || '1d20');

        setDialogueColor(campaign.dialogueColor || DEFAULT_DIALOGUE_COLOR);
        setPenseeColor(campaign.penseeColor || DEFAULT_PENSEE_COLOR);
        setRp1Color(campaign.rp1Color || DEFAULT_RP1_COLOR);
        setRp2Color(campaign.rp2Color || DEFAULT_RP2_COLOR);
        setQuoteColor(campaign.quoteColor || '');
        setSidebarColor(campaign.sidebarColor || '');
        setOddLineColor(campaign.oddLineColor || '');
        setEvenLineColor(campaign.evenLineColor || '');
        setTextColor(campaign.textColor || '');
        setLinkColor(campaign.linkColor || '');
        setLinkSidebarColor(campaign.linkSidebarColor || '');
      } catch (err: any) {
        setLoadError(err.message || 'Impossible de charger les données de la campagne.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaignData();
  }, [isEditMode, campaignId, user]);

  const handleBannerFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Le fichier sélectionné doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }
    setFormError(null);
    setBannerFile(file);
    const objectUrl = URL.createObjectURL(file);
    setBannerPreview(objectUrl);
    setBannerMode('upload');
  };

  const handleBannerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBanner(true);
  };

  const handleBannerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBanner(false);
  };

  const handleBannerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBanner(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBannerFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleResetColors = () => {
    setDialogueColor(DEFAULT_DIALOGUE_COLOR);
    setPenseeColor(DEFAULT_PENSEE_COLOR);
    setRp1Color(DEFAULT_RP1_COLOR);
    setRp2Color(DEFAULT_RP2_COLOR);
    setQuoteColor('');
    setSidebarColor('');
    setOddLineColor('');
    setEvenLineColor('');
    setTextColor('');
    setLinkColor('');
    setLinkSidebarColor('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Le nom de la campagne est obligatoire.');
      setActiveTab('general');
      return;
    }
    if (trimmedName.length > 100) {
      setFormError('Le nom de la campagne ne peut pas dépasser 100 caractères.');
      setActiveTab('general');
      return;
    }

    const trimmedSysteme = systeme.trim();
    if (!trimmedSysteme) {
      setFormError('Le système de jeu est obligatoire.');
      setActiveTab('general');
      return;
    }

    const trimmedUnivers = univers.trim();
    if (!trimmedUnivers) {
      setFormError("L'univers de jeu est obligatoire.");
      setActiveTab('general');
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setFormError('La description de la campagne est obligatoire.');
      setActiveTab('general');
      return;
    }

    if (isNaN(nbJoueurs) || nbJoueurs < 1 || nbJoueurs > 50) {
      setFormError('Le nombre de joueurs doit être compris entre 1 et 50.');
      setActiveTab('gameplay');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Update payload
        const payload: UpdateCampaignPayload = {
          name: trimmedName,
          systeme: trimmedSysteme,
          univers: trimmedUnivers,
          description: trimmedDescription,
          nbJoueurs,
          banniere: bannerMode === 'url' ? banniereUrl.trim() : banniereUrl,
          statut,
          isRecrutementOpen,
          rythme,
          rp,
          isMultiCharacter,
          defaultDice: defaultDice.trim() || null,
          dialogueColor: dialogueColor || null,
          penseeColor: penseeColor || null,
          rp1Color: rp1Color || null,
          rp2Color: rp2Color || null,
          quoteColor: quoteColor || null,
          sidebarColor: sidebarColor || null,
          oddLineColor: oddLineColor || null,
          evenLineColor: evenLineColor || null,
          textColor: textColor || null,
          linkColor: linkColor || null,
          linkSidebarColor: linkSidebarColor || null,
        };

        const updated = await campaignsApi.updateCampaign(campaignId, payload);

        // If a new banner file was selected, upload it now
        if (bannerFile) {
          try {
            await campaignsApi.uploadCampaignBanner(campaignId, bannerFile);
          } catch (uploadErr) {
            console.error('Erreur lors du téléversement de la bannière:', uploadErr);
          }
        }

        navigate(`/campaigns/${updated.id}`);
      } else {
        // Create payload
        const payload: CreateCampaignPayload = {
          name: trimmedName,
          systeme: trimmedSysteme,
          univers: trimmedUnivers,
          description: trimmedDescription,
          nbJoueurs,
          banniere: bannerMode === 'url' ? banniereUrl.trim() : '',
          statut,
          isRecrutementOpen,
          rythme,
          rp,
          isMultiCharacter,
          defaultDice: defaultDice.trim() || null,
          dialogueColor: dialogueColor || null,
          penseeColor: penseeColor || null,
          rp1Color: rp1Color || null,
          rp2Color: rp2Color || null,
          quoteColor: quoteColor || null,
          sidebarColor: sidebarColor || null,
          oddLineColor: oddLineColor || null,
          evenLineColor: evenLineColor || null,
          textColor: textColor || null,
          linkColor: linkColor || null,
          linkSidebarColor: linkSidebarColor || null,
        };

        const created = await campaignsApi.createCampaign(payload);

        // If banner file was provided, upload it to the newly created campaign
        if (bannerFile) {
          try {
            await campaignsApi.uploadCampaignBanner(created.id, bannerFile);
          } catch (uploadErr) {
            console.error('Erreur lors du téléversement de la bannière:', uploadErr);
          }
        }

        navigate(`/campaigns/${created.id}`);
      }
    } catch (err: any) {
      setFormError(err.message || "Une erreur est survenue lors de l'enregistrement de la campagne.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && campaignId) {
      navigate(`/campaigns/${campaignId}`);
    } else {
      navigate('/my-campaigns');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-slate-600 font-medium text-sm">Chargement de la campagne...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white border border-red-200 rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Accès refusé ou introuvable</h2>
        <p className="text-slate-600 text-sm max-w-md mx-auto">{loadError}</p>
        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={() => navigate('/my-campaigns')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-xs"
          >
            Retour à mes campagnes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isEditMode ? 'Retour à la campagne' : 'Retour à mes campagnes'}</span>
          </button>
          <span>/</span>
          <span className="text-slate-900 font-semibold">
            {isEditMode ? `Configuration : ${name || 'Campagne'}` : 'Nouvelle Campagne'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition shadow-2xs disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEditMode ? 'Enregistrer les modifications' : 'Créer la campagne'}</span>
          </button>
        </div>
      </div>

      {/* Main Title Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Administration & Paramètres' : 'Création de table de jeu'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isEditMode ? 'Configuration de la Campagne' : 'Créer une Nouvelle Campagne'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {isEditMode
                ? 'Ajustez les informations générales, les règles de recrutement, le rythme de jeu et l’ambiance visuelle du forum de votre campagne.'
                : 'Configurez votre nouvelle aventure sur table virtuelle : système de jeu, univers, synopsis, rythme et options de personnalisation.'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="text-center p-3.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xs">
              <span className="block text-xl font-bold text-indigo-400">
                {nbJoueurs}
              </span>
              <span className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
                Joueurs max
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold">Veuillez vérifier les informations</h4>
            <p className="text-xs text-red-700 mt-0.5">{formError}</p>
          </div>
          <button
            onClick={() => setFormError(null)}
            className="text-red-400 hover:text-red-700 text-sm font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Toolbar */}
      <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === 'general'
              ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Informations Générales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gameplay')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === 'gameplay'
              ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Règles & Recrutement</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === 'appearance'
              ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Bannière & Thème Visuel</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* TAB 1: General Info */}
        {activeTab === 'general' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Présentation de la Campagne</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Renseignez les détails fondamentaux pour identifier votre aventure.
              </p>
            </div>

            <div className="space-y-6">
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nom de la campagne <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: La Malédiction de Strahd, Ombres sur Néo-Paris..."
                  maxLength={100}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Titre évocateur qui apparaîtra dans les listes et en tête de forum.</span>
                  <span>{name.length} / 100</span>
                </div>
              </div>

              {/* Game System & Universe (2 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* System */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Système de jeu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={systeme}
                    onChange={(e) => setSysteme(e.target.value)}
                    placeholder="Ex: D&D 5E, Cthulhu 7E, Système Libre..."
                    maxLength={100}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                  />
                  {/* Preset pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SYSTEM_PRESETS.map((sys) => (
                      <button
                        key={sys}
                        type="button"
                        onClick={() => setSysteme(sys)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition font-medium cursor-pointer ${
                          systeme === sys
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {sys}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Universe */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Univers / Cadre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={univers}
                    onChange={(e) => setUnivers(e.target.value)}
                    placeholder="Ex: Médiéval-Fantastique, Cyberpunk, Années 1920..."
                    maxLength={100}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                  />
                  {/* Preset pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {UNIVERSE_PRESETS.map((univ) => (
                      <button
                        key={univ}
                        type="button"
                        onClick={() => setUnivers(univ)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition font-medium cursor-pointer ${
                          univers === univ
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {univ}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Campaign Description with WysiwygEditor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Description & Synopsis <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400">Riche / HTML & Mise en forme supportés</span>
                </div>
                <WysiwygEditor
                  value={description}
                  onChange={(val) => setDescription(val)}
                  placeholder="Présentez l'accroche de votre campagne, le contexte général de l'histoire, les attentes envers les joueurs..."
                  minHeight="220px"
                  onUploadImage={
                    isEditMode && campaignId
                      ? async (file) => {
                          const res = await campaignsApi.uploadCampaignImage(campaignId, file);
                          return res.url;
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Rules, Gameplay & Recruitment */}
        {activeTab === 'gameplay' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>Règles de Jeu, Recrutement & Statut</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gérez la capacité de votre table, les exigences de jeu et l'ouverture aux inscriptions.
              </p>
            </div>

            <div className="space-y-6">
              {/* Campaign Status selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Statut de la campagne
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatut(0)}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                      statut === 0
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                        Active
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">En cours</div>
                      <div className="text-xs text-slate-500 mt-0.5">La campagne se joue activement.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatut(1)}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                      statut === 1
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                        En pause
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Suspendue</div>
                      <div className="text-xs text-slate-500 mt-0.5">Temporairement en attente ou arrêtée.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatut(2)}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                      statut === 2
                        ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-300'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Archivée
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Terminée</div>
                      <div className="text-xs text-slate-500 mt-0.5">Aventure conclue, en consultation.</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Number of Players & Recruitment Toggle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Max players */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Nombre maximum de joueurs</span>
                    </label>
                    <span className="text-base font-extrabold text-indigo-700 bg-white px-3 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                      {nbJoueurs}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={nbJoueurs}
                    onChange={(e) => setNbJoueurs(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                    <span>1 joueur (Solo/Duo)</span>
                    <span>4 joueurs</span>
                    <span>20 joueurs (Grande table)</span>
                  </div>
                </div>

                {/* Recruitment toggle */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Recrutement de joueurs</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      {isRecrutementOpen
                        ? 'Les candidatures et créations de fiches sont ouvertes aux membres.'
                        : 'La table est complète, recrutement fermé.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRecrutementOpen(!isRecrutementOpen)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isRecrutementOpen ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isRecrutementOpen ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Rhythm of play */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Rythme de publication attendu</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: 1, title: 'Très rapide', desc: 'Plusieurs posts par jour' },
                    { id: 2, title: 'Quotidien', desc: '1 post par jour' },
                    { id: 3, title: 'Régulier', desc: '2 à 3 posts par semaine' },
                    { id: 4, title: 'Tranquille', desc: '1 post par semaine ou moins' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRythme(item.id)}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        rythme === item.id
                          ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* RP Level */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Feather className="w-4 h-4 text-indigo-600" />
                  <span>Niveau de Roleplay & Style</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 1, title: 'Débutant bienvenu', desc: 'Accessible, apprentissage encouragé' },
                    { id: 2, title: 'Intermédiaire', desc: 'Bonne qualité narrative et écriture soignée' },
                    { id: 3, title: 'Exigeant / Littéraire', desc: 'Roleplay poussé et textes immersifs' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRp(item.id)}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        rp === item.id
                          ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi Character & Default Dice Formula */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Multi-Character toggle */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Multi-personnages</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      {isMultiCharacter
                        ? 'Les joueurs peuvent créer et incarner plusieurs personnages.'
                        : 'Un seul personnage principal par joueur.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMultiCharacter(!isMultiCharacter)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isMultiCharacter ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isMultiCharacter ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Default Dice */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Dices className="w-4 h-4 text-indigo-600" />
                    <span>Formule de dé par défaut</span>
                  </label>
                  <input
                    type="text"
                    value={defaultDice}
                    onChange={(e) => setDefaultDice(e.target.value)}
                    placeholder="Ex: 1d20, 3d6, 1d100..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-mono text-slate-900 bg-white outline-hidden transition"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DICE_PRESETS.map((dp) => (
                      <button
                        key={dp.formula}
                        type="button"
                        onClick={() => setDefaultDice(dp.formula)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-mono transition cursor-pointer ${
                          defaultDice === dp.formula
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {dp.formula}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Visual Appearance & Theme Colors */}
        {activeTab === 'appearance' && (
          <div className="space-y-8">
            {/* Banner Config Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                  <span>Bannière de la Campagne</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Illustrez le haut du forum de votre campagne avec une image d'ambiance.
                </p>
              </div>

              {/* Banner Live Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Aperçu de la bannière
                </span>
                <div className="h-44 sm:h-52 rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 relative border border-slate-200 shadow-inner flex flex-col justify-end p-6">
                  {bannerPreview || (bannerMode === 'url' && banniereUrl) ? (
                    <img
                      src={bannerPreview || banniereUrl}
                      alt="Aperçu bannière"
                      className="absolute inset-0 w-full h-full object-cover opacity-75"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                      <div className="text-center space-y-1">
                        <ImageIcon className="w-12 h-12 mx-auto opacity-30 text-white" />
                        <span className="text-xs font-medium text-slate-400">Aucune bannière configurée</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white text-[11px] font-semibold">
                      <span>{systeme || 'Système de jeu'}</span>
                      <span>&bull;</span>
                      <span>{univers || 'Univers'}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                      {name || 'Titre de votre campagne'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Banner source selector: Upload vs URL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-xs">
                  <button
                    type="button"
                    onClick={() => setBannerMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      bannerMode === 'upload'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Téléverser un fichier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerMode('url')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      bannerMode === 'url'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Lien URL externe</span>
                  </button>
                </div>

                {bannerMode === 'upload' ? (
                  <div>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBannerFileSelect(file);
                      }}
                    />
                    <div
                      onDragOver={handleBannerDragOver}
                      onDragEnter={handleBannerDragOver}
                      onDragLeave={handleBannerDragLeave}
                      onDrop={handleBannerDrop}
                      onClick={() => bannerInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                        isDraggingBanner
                          ? 'border-indigo-600 bg-indigo-50/70'
                          : 'border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {bannerFile ? bannerFile.name : 'Cliquez pour choisir une image ou glissez-déposez-la ici'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Format recommandé : JPG, PNG ou WebP panoramique (ex: 1200x350px)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      URL directe de l'image de bannière
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={banniereUrl}
                        onChange={(e) => {
                          setBanniereUrl(e.target.value);
                          setBannerPreview(e.target.value);
                        }}
                        placeholder="https://example.com/images/ma-banniere.jpg"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                      />
                      {banniereUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setBanniereUrl('');
                            setBannerPreview(null);
                          }}
                          className="px-3 py-2.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Forum Colors & Styles Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-600" />
                    <span>Couleurs & Thème du Forum</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Personnalisez les balises de dialogue, pensées et éléments de mise en page des messages de jeu.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetColors}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rétablir les couleurs par défaut</span>
                </button>
              </div>

              {/* Color Pickers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Dialogue */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Dialogues</label>
                    <span className="text-[11px] font-mono text-slate-500">{dialogueColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={dialogueColor.startsWith('#') ? dialogueColor : DEFAULT_DIALOGUE_COLOR}
                      onChange={(e) => setDialogueColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={dialogueColor}
                      onChange={(e) => setDialogueColor(e.target.value)}
                      placeholder="#4488CC"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Pensée */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Pensées</label>
                    <span className="text-[11px] font-mono text-slate-500">{penseeColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={penseeColor.startsWith('#') ? penseeColor : DEFAULT_PENSEE_COLOR}
                      onChange={(e) => setPenseeColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={penseeColor}
                      onChange={(e) => setPenseeColor(e.target.value)}
                      placeholder="#8844CC"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* RP 1 */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Texte RP 1</label>
                    <span className="text-[11px] font-mono text-slate-500">{rp1Color}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={rp1Color.startsWith('#') ? rp1Color : DEFAULT_RP1_COLOR}
                      onChange={(e) => setRp1Color(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={rp1Color}
                      onChange={(e) => setRp1Color(e.target.value)}
                      placeholder="#FF6600"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* RP 2 */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Texte RP 2</label>
                    <span className="text-[11px] font-mono text-slate-500">{rp2Color}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={rp2Color.startsWith('#') ? rp2Color : DEFAULT_RP2_COLOR}
                      onChange={(e) => setRp2Color(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={rp2Color}
                      onChange={(e) => setRp2Color(e.target.value)}
                      placeholder="#5EFF6C"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview of formatted post with campaign colors */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Aperçu en direct du rendu forum</span>
                </span>
                <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-inner space-y-3 font-sans text-sm">
                  <p className="text-slate-300 italic text-xs">
                    Extrait simulé d'un post dans les topics de cette campagne :
                  </p>
                  <p style={{ color: dialogueColor }}>
                    « Ne vous avancez pas plus loin ! La porte des cryptes est piégée... » murmura le voleur.
                  </p>
                  <p style={{ color: penseeColor }}>
                    (Si seulement nous avions apporté plus de torches avant de descendre ici...)
                  </p>
                  <p style={{ color: rp1Color }}>
                    [ L'obscurité se fait plus dense alors qu'un souffle froid traverse le couloir ]
                  </p>
                  <p style={{ color: rp2Color }}>
                    [ Un cliquetis métallique résonne soudain sous vos pas ]
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition shadow-2xs disabled:opacity-50"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEditMode ? 'Enregistrer les modifications' : 'Créer la campagne'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
