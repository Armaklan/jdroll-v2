import React, {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {campaignsApi} from '../api/campaigns';
import {CampaignCharacter, CampaignWidget, CreateCampaignPayload, UpdateCampaignPayload, CampaignParticipant, PredefinedTheme} from '../types/campaign';
import {WysiwygEditor} from '../components/WysiwygEditor';
import {
  Activity,
  AlertCircle,
  BookOpen,
  Clock,
  Dices,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Link as LinkIcon,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Shield,
  Sliders,
  Upload,
  Users,
  X,
  Ban,
} from 'lucide-react';
import {CharacterSheetRenderer} from '../components/CharacterSheetRenderer';
import {CampaignWidgetsConfig} from '../components/CampaignWidgetsConfig';
import {parseWidgets, serializeWidgets} from '../utils/widgets';
import {parseTemplateFields, serializeTemplateFields, TemplateField,} from '../utils/character-sheet';

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

  // 1. Vignette (Table campagne.banniere - pour l'aperçu / cartes dans les listes)
  const [vignetteMode, setVignetteMode] = useState<'upload' | 'url'>('url');
  const [vignetteUrl, setVignetteUrl] = useState<string>('');
  const [vignetteFile, setVignetteFile] = useState<File | null>(null);
  const [vignettePreview, setVignettePreview] = useState<string | null>(null);
  const [isDraggingVignette, setIsDraggingVignette] = useState<boolean>(false);
  const vignetteInputRef = useRef<HTMLInputElement>(null);

  // 2. Bannière du Forum (Table campagne_config.banniere - en-tête du forum de jeu)
  const [forumBannerMode, setForumBannerMode] = useState<'upload' | 'url'>('url');
  const [forumBannerUrl, setForumBannerUrl] = useState<string>('');
  const [forumBannerFile, setForumBannerFile] = useState<File | null>(null);
  const [forumBannerPreview, setForumBannerPreview] = useState<string | null>(null);
  const [isDraggingForumBanner, setIsDraggingForumBanner] = useState<boolean>(false);
  const forumBannerInputRef = useRef<HTMLInputElement>(null);

  // Game rules & options
  const [statut, setStatut] = useState<number>(3);
  const [isRecrutementOpen, setIsRecrutementOpen] = useState<boolean>(true);
  const [rythme, setRythme] = useState<number>(1);
  const [rp, setRp] = useState<number>(1);
  const [isMultiCharacter, setIsMultiCharacter] = useState<boolean>(false);
  const [defaultDice, setDefaultDice] = useState<string>('1d20');
  const [defaultPersoId, setDefaultPersoId] = useState<number | null>(null);
  const [campaignCharacters, setCampaignCharacters] = useState<CampaignCharacter[]>([]);

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
  const [width, setWidth] = useState<string>('800px');

  // Predefined themes (table theme)
  const [predefinedThemes, setPredefinedThemes] = useState<PredefinedTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  
  // Separator Image Configuration
  const [hrMode, setHrMode] = useState<'upload' | 'url'>('url');
  const [hrUrl, setHrUrl] = useState<string>('');
  const [hrFile, setHrFile] = useState<File | null>(null);
  const [hrPreview, setHrPreview] = useState<string | null>(null);
  const [isDraggingHr, setIsDraggingHr] = useState<boolean>(false);
  const hrInputRef = useRef<HTMLInputElement>(null);

  // Character Sheet Configuration
  const [template, setTemplate] = useState<string>('');
  const [sheetBgType, setSheetBgType] = useState<'image' | 'html'>('image');
  const [sheetImgMode, setSheetImgMode] = useState<'upload' | 'url'>('url');
  const [sheetImgUrl, setSheetImgUrl] = useState<string>('');
  const [sheetImgFile, setSheetImgFile] = useState<File | null>(null);
  const [sheetImgPreview, setSheetImgPreview] = useState<string | null>(null);
  const [isDraggingSheetImg, setIsDraggingSheetImg] = useState<boolean>(false);
  const sheetImgInputRef = useRef<HTMLInputElement>(null);
  const [sheetHtml, setSheetHtml] = useState<string>('');
  const [sheetFields, setSheetFields] = useState<TemplateField[]>([]);
  const [sheetMaxCount, setSheetMaxCount] = useState<number>(0);

  // Campaign Widgets Configuration
  const [widgetsList, setWidgetsList] = useState<CampaignWidget[]>([]);

  // Participants management
  const [mjId, setMjId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<CampaignParticipant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState<boolean>(false);
  const [excludeError, setExcludeError] = useState<string | null>(null);
  const [isExcluding, setIsExcluding] = useState<number | null>(null);
  const [participantToExclude, setParticipantToExclude] = useState<CampaignParticipant | null>(null);
  const [showExcludeModal, setShowExcludeModal] = useState<boolean>(false);

  // Active tab in form
  const [activeTab, setActiveTab] = useState<'general' | 'gameplay' | 'appearance' | 'sheet' | 'widgets'>('general');

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
        setMjId(campaign.mjId);

        // Vignette (campagne.banniere)
        setVignetteUrl(campaign.banniere || '');
        setVignettePreview(campaign.banniere || null);
        setVignetteMode(campaign.banniere?.startsWith('/files/') ? 'upload' : 'url');

        // Bannière Forum (campagne_config.banniere)
        setForumBannerUrl(campaign.banniereForum || '');
        setForumBannerPreview(campaign.banniereForum || null);
        setForumBannerMode(campaign.banniereForum?.startsWith('/files/') ? 'upload' : 'url');

        setStatut(campaign.statut ?? 3);
        setIsRecrutementOpen(Boolean(campaign.isRecrutementOpen));
        setRythme(campaign.rythme ?? 1);
        setRp(campaign.rp ?? 1);
        setIsMultiCharacter(Boolean(campaign.isMultiCharacter));
        setDefaultDice(campaign.defaultDice || '1d20');
        setDefaultPersoId(campaign.defaultPersoId ?? null);

        try {
          const charsData = await campaignsApi.getCampaignCharacters(campaignId);
          if (charsData && charsData.categories) {
            const allChars: CampaignCharacter[] = charsData.categories.flatMap((cat) => cat.characters || []);
            setCampaignCharacters(allChars);
          }
        } catch (charErr) {
          console.error('Erreur lors du chargement des personnages de la campagne:', charErr);
        }

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
        setWidth(campaign.width || '800px');
        
        // Separator Image
        setHrUrl(campaign.hr || '');
        setHrPreview(campaign.hr || null);
        setHrMode(campaign.hr?.startsWith('/files/') ? 'upload' : 'url');

        // Character Sheet
        setTemplate(campaign.template || '');
        const hasImgBg = Boolean(campaign.templateImg && campaign.templateImg.trim());
        setSheetBgType(hasImgBg ? 'image' : campaign.templateHtml ? 'html' : 'image');
        setSheetImgUrl(campaign.templateImg || '');
        setSheetImgPreview(campaign.templateImg || null);
        setSheetImgMode(campaign.templateImg?.startsWith('/files/') ? 'upload' : 'url');
        setSheetHtml(campaign.templateHtml || '');
        const parsedFields = parseTemplateFields(campaign.templateFields);
        setSheetFields(parsedFields.fields);
        setSheetMaxCount(parsedFields.maxCount);

        // Widgets
        if (campaign.widgets) {
          setWidgetsList(parseWidgets(campaign.widgets));
        }

        // Load participants if in edit mode and user is MJ
        if (user && user.id === campaign.mjId) {
          try {
            const parts = await campaignsApi.getCampaignParticipants(campaignId);
            setParticipants(parts);
          } catch (partsErr) {
            console.error('Erreur lors du chargement des participants:', partsErr);
          }
        }
      } catch (err: any) {
        setLoadError(err.message || 'Impossible de charger les données de la campagne.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaignData();
  }, [isEditMode, campaignId, user]);

  // Participants management
  const loadParticipants = async () => {
    if (!campaignId || !user || !mjId || user.id !== mjId) return;
    setIsLoadingParticipants(true);
    try {
      const parts = await campaignsApi.getCampaignParticipants(campaignId);
      setParticipants(parts);
      setExcludeError(null);
    } catch (err: any) {
      setExcludeError(err.message || 'Impossible de charger les participants.');
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleExcludeParticipant = (participant: CampaignParticipant) => {
    setParticipantToExclude(participant);
    setShowExcludeModal(true);
  };

  const confirmExcludeParticipant = async () => {
    if (!participantToExclude || !campaignId) return;
    
    setIsExcluding(participantToExclude.id);
    setShowExcludeModal(false);
    
    try {
      await campaignsApi.excludeParticipant(campaignId, participantToExclude.id);
      setExcludeError(null);
      await loadParticipants(); // Recharge la liste des participants
    } catch (err: any) {
      setExcludeError(err.message || 'Impossible d\'exclure le participant.');
    } finally {
      setIsExcluding(null);
      setParticipantToExclude(null);
    }
  };

  // Handlers for Vignette (Campagne)
  const handleVignetteFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Le fichier de la vignette doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }
    setFormError(null);
    setVignetteFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVignettePreview(objectUrl);
    setVignetteMode('upload');
  };

  const handleVignetteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVignette(true);
  };

  const handleVignetteDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVignette(false);
  };

  const handleVignetteDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVignette(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVignetteFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handlers for Forum Banner (Campagne Config)
  const handleForumBannerFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Le fichier de la bannière de forum doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }
    setFormError(null);
    setForumBannerFile(file);
    const objectUrl = URL.createObjectURL(file);
    setForumBannerPreview(objectUrl);
    setForumBannerMode('upload');
  };

  const handleForumBannerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingForumBanner(true);
  };

  const handleForumBannerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingForumBanner(false);
  };

  const handleForumBannerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingForumBanner(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleForumBannerFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handlers for Character Sheet Background Image
  const handleSheetImgFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError("Le fichier de l'image de fond doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).");
      return;
    }
    setFormError(null);
    setSheetImgFile(file);
    const objectUrl = URL.createObjectURL(file);
    setSheetImgPreview(objectUrl);
    setSheetImgMode('upload');
  };

  const handleSheetImgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSheetImg(true);
  };

  const handleSheetImgDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSheetImg(false);
  };

  const handleSheetImgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSheetImg(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSheetImgFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handlers for Separator Image
  const handleHrFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError("Le fichier de l'image de séparation doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).");
      return;
    }
    setFormError(null);
    setHrFile(file);
    const objectUrl = URL.createObjectURL(file);
    setHrPreview(objectUrl);
    setHrMode('upload');
  };

  const handleHrDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHr(true);
  };

  const handleHrDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHr(false);
  };

  const handleHrDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingHr(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleHrFileSelect(e.dataTransfer.files[0]);
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

  // Load predefined themes (table theme)
  useEffect(() => {
    let cancelled = false;
    campaignsApi
      .getThemes()
      .then((result) => {
        if (!cancelled) {
          setPredefinedThemes(result);
        }
      })
      .catch((err) => console.error('Erreur lors du chargement des thèmes pré-conçus:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyPredefinedTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    if (!themeId) return;
    const theme = predefinedThemes.find((t) => String(t.id) === themeId);
    if (!theme) return;
    setDialogueColor(theme.dialogueColor || DEFAULT_DIALOGUE_COLOR);
    setPenseeColor(theme.penseeColor || DEFAULT_PENSEE_COLOR);
    setRp1Color(theme.rp1Color || DEFAULT_RP1_COLOR);
    setRp2Color(theme.rp2Color || DEFAULT_RP2_COLOR);
    setQuoteColor(theme.quoteColor || '');
    setSidebarColor(theme.sidebarColor || '');
    setOddLineColor(theme.oddLineColor || '');
    setEvenLineColor(theme.evenLineColor || '');
    setTextColor(theme.textColor || '');
    setLinkColor(theme.linkColor || '');
    setLinkSidebarColor(theme.linkSidebarColor || '');
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
    if (trimmedSysteme.length > 100) {
      setFormError('Le système de jeu ne peut pas dépasser 100 caractères.');
      setActiveTab('general');
      return;
    }

    const trimmedUnivers = univers.trim();
    if (trimmedUnivers.length > 100) {
      setFormError("L'univers de jeu ne peut pas dépasser 100 caractères.");
      setActiveTab('general');
      return;
    }

    const trimmedDescription = description.trim();

    if (isNaN(nbJoueurs) || nbJoueurs < 1 || nbJoueurs > 50) {
      setFormError('Le nombre de joueurs doit être compris entre 1 et 50.');
      setActiveTab('gameplay');
      return;
    }

    setIsSubmitting(true);

    try {
      const initialBanniere =
        vignetteMode === 'url'
          ? vignetteUrl.trim()
          : isEditMode && !vignetteFile
          ? vignetteUrl
          : '';

      const initialBanniereForum =
        forumBannerMode === 'url'
          ? forumBannerUrl.trim() || null
          : isEditMode && !forumBannerFile
          ? forumBannerUrl || null
          : null;

      const serializedSheetFields = serializeTemplateFields(sheetMaxCount, sheetFields);

      if (isEditMode) {
        let finalBanniere =
          vignetteMode === 'url'
            ? vignetteUrl.trim()
            : !vignetteFile
            ? vignetteUrl
            : '';

        if (vignetteFile) {
          try {
            const vignetteRes = await campaignsApi.uploadCampaignImage(campaignId, vignetteFile);
            finalBanniere = vignetteRes.url;
          } catch (uploadErr) {
            console.error('Erreur lors du téléversement de la vignette:', uploadErr);
          }
        }

        let finalBanniereForum =
          forumBannerMode === 'url'
            ? forumBannerUrl.trim() || null
            : !forumBannerFile
            ? forumBannerUrl || null
            : null;

        if (forumBannerFile) {
          try {
            const bannerRes = await campaignsApi.uploadCampaignBanner(campaignId, forumBannerFile);
            finalBanniereForum = bannerRes.url;
          } catch (uploadErr) {
            console.error('Erreur lors du téléversement de la bannière de forum:', uploadErr);
          }
        }

        let finalSheetImg =
          sheetImgMode === 'url'
            ? sheetImgUrl.trim()
            : !sheetImgFile
            ? sheetImgUrl
            : '';

        if (sheetImgFile && sheetBgType === 'image') {
          try {
            const sheetRes = await campaignsApi.uploadCampaignImage(campaignId, sheetImgFile);
            finalSheetImg = sheetRes.url;
          } catch (uploadErr) {
            console.error("Erreur lors du téléversement de l'image de fond de la feuille:", uploadErr);
          }
        }

        const finalSheetImgValue = sheetBgType === 'image' ? finalSheetImg : '';
        const finalTemplateHtml =
          sheetBgType === 'image'
            ? (finalSheetImgValue ? `<img id="zoneImg" src="${finalSheetImgValue}" style="width: 800px">` : '')
            : sheetHtml;

        // Handle separator image upload
        let finalHr =
          hrMode === 'url'
            ? hrUrl.trim()
            : !hrFile
            ? hrUrl
            : '';

        if (hrFile) {
          try {
            const hrRes = await campaignsApi.uploadCampaignImage(campaignId, hrFile);
            finalHr = hrRes.url;
          } catch (uploadErr) {
            console.error("Erreur lors du téléversement de l'image de séparation:", uploadErr);
          }
        }

        // Update payload
        const payload: UpdateCampaignPayload = {
          name: trimmedName,
          systeme: trimmedSysteme,
          univers: trimmedUnivers,
          description: trimmedDescription,
          nbJoueurs,
          banniere: finalBanniere,
          banniereForum: finalBanniereForum,
          statut,
          isRecrutementOpen,
          rythme,
          rp,
          isMultiCharacter,
          defaultDice: defaultDice.trim() || null,
          defaultPersoId: defaultPersoId ?? null,
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
          hr: finalHr || null,
          width: width || '800px',
          template: template || '',
          templateImg: finalSheetImgValue,
          templateHtml: finalTemplateHtml,
          templateFields: serializedSheetFields,
          widgets: serializeWidgets(widgetsList),
        };

        const updated = await campaignsApi.updateCampaign(campaignId, payload);
        navigate(`/forum/${updated.id}`);
      } else {
        let initialSheetImg =
          sheetBgType === 'image' && sheetImgMode === 'url' ? sheetImgUrl.trim() : '';

        const initialTemplateHtml =
          sheetBgType === 'image'
            ? (initialSheetImg ? `<img id="zoneImg" src="${initialSheetImg}" style="width: 800px">` : '')
            : sheetHtml;

        // Create payload
        const payload: CreateCampaignPayload = {
          name: trimmedName,
          systeme: trimmedSysteme,
          univers: trimmedUnivers,
          description: trimmedDescription,
          nbJoueurs,
          banniere: initialBanniere,
          banniereForum: initialBanniereForum,
          statut,
          isRecrutementOpen,
          rythme,
          rp,
          isMultiCharacter,
          defaultDice: defaultDice.trim() || null,
          defaultPersoId: defaultPersoId ?? null,
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
          hr: hrMode === 'url' ? hrUrl.trim() || null : !hrFile ? hrUrl || null : null,
          template: template || '',
          templateImg: sheetBgType === 'image' ? initialSheetImg : '',
          templateHtml: initialTemplateHtml,
          templateFields: serializedSheetFields,
          widgets: serializeWidgets(widgetsList),
        };

        const created = await campaignsApi.createCampaign(payload);

        // Upload vignette file if provided
        if (vignetteFile) {
          try {
            const vignetteRes = await campaignsApi.uploadCampaignImage(created.id, vignetteFile);
            await campaignsApi.updateCampaign(created.id, { banniere: vignetteRes.url });
          } catch (uploadErr) {
            console.error('Erreur lors du téléversement de la vignette:', uploadErr);
          }
        }

        // Upload forum banner file if provided
        if (forumBannerFile) {
          try {
            await campaignsApi.uploadCampaignBanner(created.id, forumBannerFile);
          } catch (uploadErr) {
            console.error('Erreur lors du téléversement de la bannière de forum:', uploadErr);
          }
        }

        // Upload sheet image file if provided
        if (sheetImgFile && sheetBgType === 'image') {
          try {
            const sheetRes = await campaignsApi.uploadCampaignImage(created.id, sheetImgFile);
            await campaignsApi.updateCampaign(created.id, {
              templateImg: sheetRes.url,
              templateHtml: `<img id="zoneImg" src="${sheetRes.url}" style="width: 800px">`,
            });
          } catch (uploadErr) {
            console.error("Erreur lors du téléversement de l'image de fond de la feuille:", uploadErr);
          }
        }

        // Upload separator image file if provided
        if (hrFile) {
          try {
            const hrRes = await campaignsApi.uploadCampaignImage(created.id, hrFile);
            await campaignsApi.updateCampaign(created.id, { hr: hrRes.url });
          } catch (uploadErr) {
            console.error("Erreur lors du téléversement de l'image de séparation:", uploadErr);
          }
        }

        navigate(`/forum/${created.id}`);
      }
    } catch (err: any) {
      setFormError(err.message || "Une erreur est survenue lors de l'enregistrement de la campagne.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && campaignId) {
      navigate(`/forum/${campaignId}`);
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
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-xs cursor-pointer"
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
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition shadow-2xs disabled:opacity-50 cursor-pointer"
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
                ? 'Ajustez les informations générales, les règles de recrutement, le rythme de jeu, la vignette d’aperçu et la bannière du forum.'
                : 'Configurez votre nouvelle aventure sur table virtuelle : système, univers, synopsis, vignette d’aperçu et bannière de forum.'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="text-center p-3.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xs">
              <span className="block text-xl font-bold text-indigo-400">
                {nbJoueurs}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Joueurs max</span>
            </div>
            <div className="text-center p-3.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xs">
              <span className="block text-xl font-bold text-emerald-400">
                {isRecrutementOpen ? 'Ouvert' : 'Fermé'}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Recrutement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Form Error Alert */}
      {formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <strong className="font-bold">Attention : </strong>
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-2xl border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'general'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Informations Générales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gameplay')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-2xl border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'gameplay'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Règles & Recrutement</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-2xl border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'appearance'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Bannières & Apparence</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sheet')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-2xl border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'sheet'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          <span>Feuille de Personnage</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('widgets')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-2xl border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'widgets'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Widgets des Personnages</span>
          {widgetsList.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {widgetsList.length}
            </span>
          )}
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* TAB 1: General Info */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <span>Présentation de la Table</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Renseignez le nom de votre campagne ainsi que son cadre de jeu.
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
                    <span>Titre principal qui apparaîtra dans les listes et en tête de forum.</span>
                    <span>{name.length} / 100</span>
                  </div>
                </div>

                {/* Game System & Universe (2 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* System */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Système de jeu
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">(optionnel)</span>
                    </div>
                    <input
                      type="text"
                      value={systeme}
                      onChange={(e) => setSysteme(e.target.value)}
                      placeholder="Ex: D&D 5E, Cthulhu 7E, Système Libre..."
                      maxLength={100}
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
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Univers / Cadre
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">(optionnel)</span>
                    </div>
                    <input
                      type="text"
                      value={univers}
                      onChange={(e) => setUnivers(e.target.value)}
                      placeholder="Ex: Médiéval-Fantastique, Cyberpunk, Années 1920..."
                      maxLength={100}
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
                      Description & Synopsis
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">(optionnel)</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-xs text-slate-400">Riche / HTML & Mise en forme supportés</span>
                    </div>
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
          </div>
        )}

        {/* TAB 2: Rules, Gameplay & Recruitment */}
        {activeTab === 'gameplay' && (
          <div className="space-y-8">
            {/* Recruitment and Status */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Statut & Recrutement</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Définissez la capacité d'accueil et la visibilité des candidatures.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Max Players */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Nombre maximum de joueurs
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={nbJoueurs}
                      onChange={(e) => setNbJoueurs(parseInt(e.target.value, 10) || 1)}
                      className="w-32 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-bold text-slate-900 outline-hidden transition"
                    />
                    <span className="text-xs text-slate-500">
                      Recommandé : entre 3 et 6 joueurs pour une table optimale.
                    </span>
                  </div>
                </div>

                {/* Campaign Status */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    État de la campagne
                  </label>
                  <select
                    value={statut}
                    onChange={(e) => setStatut(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 bg-white outline-hidden transition cursor-pointer"
                  >
                    <option value={3}>En préparation</option>
                    <option value={0}>Ouverte</option>
                    <option value={1}>En pause</option>
                    <option value={2}>Archivé</option>
                  </select>
                </div>
              </div>

              {/* Recruitment Toggle Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-900 block">
                    Ouvrir les candidatures aux joueurs
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Permet aux aventuriers de postuler pour rejoindre votre table depuis les annonces et recherches.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecrutementOpen}
                    onChange={(e) => setIsRecrutementOpen(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Multi-Characters Toggle Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-900 block">
                    Autoriser plusieurs personnages par joueur
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Active la gestion de plusieurs fiches de héros ou comparses pour chaque participant.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMultiCharacter}
                    onChange={(e) => setIsMultiCharacter(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Participants Management Card */}
              {isEditMode && user && mjId && user.id === mjId && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-slate-900 block">
                        Gestion des participants
                      </span>
                      <span className="text-xs text-slate-500 block">
                        {participants.length} joueur(s) actif(s) dans cette campagne
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={loadParticipants}
                      disabled={isLoadingParticipants}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingParticipants ? 'animate-spin' : ''}`} />
                      <span>Actualiser</span>
                    </button>
                  </div>
                  
                  {excludeError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                      {excludeError}
                    </div>
                  )}

                  {isLoadingParticipants ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    </div>
                  ) : participants.length === 0 ? (
                    <div className="text-center p-4 text-xs text-slate-500">
                      Aucun participant pour le moment.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            {participant.avatar && (
                              <img
                                src={participant.avatar}
                                alt={participant.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900">
                                {participant.username}
                              </span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleExcludeParticipant(participant)}
                            disabled={isExcluding === participant.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition disabled:cursor-not-allowed"
                            title={`Exclure ${participant.username} de la campagne`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Exclure</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Exclude Participant Confirmation Modal */}
            {showExcludeModal && participantToExclude && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowExcludeModal(false)}>
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-rose-600" />
                    Exclure un participant
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Êtes-vous sûr de vouloir exclure <strong className="text-slate-900">{participantToExclude.username}</strong> de votre campagne ?
                    Cette action est irréversible et le joueur ne pourra plus accéder à la campagne.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExcludeModal(false);
                        setParticipantToExclude(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={confirmExcludeParticipant}
                      disabled={isExcluding !== null}
                      className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-semibold text-sm transition flex items-center gap-2"
                    >
                      {isExcluding !== null ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Exclusion...
                        </>
                      ) : (
                        'Exclure'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rhythm and RP Level */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <span>Rythme & Style d'Écriture</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Indiquez vos attentes de fréquence de publication et d'exigence narrative.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Game Rhythm */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Fréquence / Rythme de jeu
                  </label>
                  <div className="space-y-2">
                    {[
                      { val: 0, label: '1 post par mois', desc: 'Rythme mensuel très posé' },
                      { val: 1, label: '1 post par semaine', desc: 'Rythme hebdomadaire régulier' },
                      { val: 2, label: '1 post pour 3 jours', desc: 'Rythme soutenu tous les 3 jours' },
                      { val: 3, label: '1 post par jour', desc: 'Rythme quotidien actif' },
                      { val: 4, label: 'Plusieurs posts par jour', desc: 'Rythme très rapide et intensif' },
                    ].map((r) => (
                      <label
                        key={r.val}
                        onClick={() => setRythme(r.val)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          rythme === r.val
                            ? 'border-indigo-600 bg-indigo-50/60 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rythme"
                          value={r.val}
                          checked={rythme === r.val}
                          onChange={() => setRythme(r.val)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{r.label}</span>
                          <span className="block text-[11px] text-slate-500">{r.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* RP Exigence Level */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Niveau d'exigence RP
                  </label>
                  <div className="space-y-2">
                    {[
                      { val: 0, label: 'Roman de gare', desc: "Peu d'exigence en terme de Roleplay" },
                      { val: 1, label: 'Standard', desc: 'Exigence standard : action décrite correctement, quelques pensées, ...' },
                      { val: 2, label: 'Théâtre', desc: 'Exigence forte : la description prime, il faudra faire des efforts.' },
                      { val: 3, label: 'Cyrano', desc: 'De haut vol : le roleplay est au centre même de la partie !' },
                    ].map((lvl) => (
                      <label
                        key={lvl.val}
                        onClick={() => setRp(lvl.val)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          rp === lvl.val
                            ? 'border-indigo-600 bg-indigo-50/60 shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rp"
                          value={lvl.val}
                          checked={rp === lvl.val}
                          onChange={() => setRp(lvl.val)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{lvl.label}</span>
                          <span className="block text-[11px] text-slate-500">{lvl.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Default Dice Formula */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Dices className="w-5 h-5 text-indigo-600" />
                  <span>Formule de Dés par Défaut</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pré-remplit automatiquement le lanceur de dés lors de la rédaction de messages.
                </p>
              </div>

              <div className="space-y-3 max-w-md">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Formule rapide
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={defaultDice}
                    onChange={(e) => setDefaultDice(e.target.value)}
                    placeholder="1d20, 3d6, 1d100, 4df..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-mono font-bold text-indigo-700 outline-hidden transition"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {DICE_PRESETS.map((p) => (
                    <button
                      key={p.formula}
                      type="button"
                      onClick={() => setDefaultDice(p.formula)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition cursor-pointer ${
                        defaultDice === p.formula
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Default Character / PNJ */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>PNJ par Défaut</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sélectionnez le PNJ utilisé par défaut dans le champ « Poster en tant que » lors de la rédaction de messages sur le forum.
                </p>
              </div>

              <div className="space-y-3 max-w-md">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Personnage sélectionné par défaut
                </label>
                {isEditMode ? (
                  <select
                    value={defaultPersoId ?? ''}
                    onChange={(e) => setDefaultPersoId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-800 outline-hidden transition bg-white"
                  >
                    <option value="">Aucun (Moi-même)</option>
                    {campaignCharacters.map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.name} {char.concept ? `(${char.concept})` : ''} {!char.isPlayer ? '— [PNJ]' : '— [PJ]'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                    Les PNJ pourront être créés et sélectionnés comme PNJ par défaut une fois la campagne créée.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Visual Appearance, Banners & Theme Colors */}
        {activeTab === 'appearance' && (
          <div className="space-y-8">
            {/* 1. VIGNETTE DE LA CAMPAGNE (Table campagne) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                    Vignette d'aperçu
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-indigo-600" />
                    <span>Vignette de la Campagne</span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cette image est utilisée comme <strong>vignette de présentation</strong> sur les cartes de la page « Mes campagnes » et « Toutes les campagnes » (format carte / miniature).
                </p>
              </div>

              {/* Vignette Live Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Aperçu sur carte de campagne
                  </span>
                  <div className="w-full max-w-sm border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                    <div className="h-32 relative overflow-hidden bg-gradient-to-r from-slate-800 to-indigo-950">
                      {vignettePreview || (vignetteMode === 'url' && vignetteUrl) ? (
                        <img
                          src={vignettePreview || vignetteUrl}
                          alt="Aperçu vignette"
                          className="w-full h-full object-cover opacity-85"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30">
                          <BookOpen className="w-16 h-16 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/90 text-indigo-950 shadow-2xs">
                          {systeme || 'Système libre'}
                        </span>
                        {univers && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/80 text-slate-200">
                            {univers}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {name || 'Titre de la campagne'}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {description ? description.replace(/<[^>]*>/g, '') : 'Synopsis de présentation...'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vignette source selector: Upload vs URL */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-xs">
                    <button
                      type="button"
                      onClick={() => setVignetteMode('upload')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                        vignetteMode === 'upload'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Fichier image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVignetteMode('url')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                        vignetteMode === 'url'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Lien URL</span>
                    </button>
                  </div>

                  {vignetteMode === 'upload' ? (
                    <div>
                      <input
                        ref={vignetteInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVignetteFileSelect(file);
                        }}
                      />
                      <div
                        onDragOver={handleVignetteDragOver}
                        onDragEnter={handleVignetteDragOver}
                        onDragLeave={handleVignetteDragLeave}
                        onDrop={handleVignetteDrop}
                        onClick={() => vignetteInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                          isDraggingVignette
                            ? 'border-indigo-600 bg-indigo-50/70'
                            : 'border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {vignetteFile ? vignetteFile.name : 'Choisir une image de vignette'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            PNG, JPG, WebP jusqu’à 10 Mo
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={vignetteUrl}
                          onChange={(e) => {
                            setVignetteUrl(e.target.value);
                            setVignettePreview(e.target.value);
                          }}
                          placeholder="https://example.com/images/vignette.jpg"
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                        />
                        {vignetteUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setVignetteUrl('');
                              setVignettePreview(null);
                            }}
                            className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 hover:bg-rose-50 transition cursor-pointer"
                            title="Effacer l'URL"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Insérez l'URL directe vers l'image de la vignette (format carte).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. BANNIÈRE DU FORUM (Table campagne_config) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200">
                    En-tête de Forum
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                    <span>Bannière du Forum de la Campagne</span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cette <strong>bannière panoramique</strong> est affichée tout en haut de la page du forum de votre campagne (table campagne_config).
                </p>
              </div>

              {/* Forum Banner Live Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Aperçu de l'en-tête du forum
                </span>
                <div className="h-44 sm:h-52 rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 relative border border-slate-200 shadow-inner flex flex-col justify-end p-6">
                  {forumBannerPreview || (forumBannerMode === 'url' && forumBannerUrl) ? (
                    <img
                      src={forumBannerPreview || forumBannerUrl}
                      alt="Aperçu bannière forum"
                      className="absolute inset-0 w-full h-full object-cover opacity-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                      <div className="text-center space-y-1">
                        <ImageIcon className="w-12 h-12 mx-auto opacity-30 text-white" />
                        <span className="text-xs font-medium text-slate-400">Aucune bannière de forum configurée</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white text-[11px] font-semibold">
                      <span>{systeme || 'Système libre'}</span>
                      {univers && (
                        <>
                          <span>&bull;</span>
                          <span>{univers}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                      {name || 'Titre de votre campagne'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Forum Banner source selector: Upload vs URL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-xs">
                  <button
                    type="button"
                    onClick={() => setForumBannerMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      forumBannerMode === 'upload'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Téléverser un fichier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForumBannerMode('url')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      forumBannerMode === 'url'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Lien URL externe</span>
                  </button>
                </div>

                {forumBannerMode === 'upload' ? (
                  <div>
                    <input
                      ref={forumBannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleForumBannerFileSelect(file);
                      }}
                    />
                    <div
                      onDragOver={handleForumBannerDragOver}
                      onDragEnter={handleForumBannerDragOver}
                      onDragLeave={handleForumBannerDragLeave}
                      onDrop={handleForumBannerDrop}
                      onClick={() => forumBannerInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                        isDraggingForumBanner
                          ? 'border-indigo-600 bg-indigo-50/70'
                          : 'border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {forumBannerFile ? forumBannerFile.name : 'Choisir une bannière panoramique ou glissez-déposez-la ici'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PNG, JPG, WebP, GIF, SVG, AVIF jusqu’à 10 Mo (recommandé : 1200x300 px)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={forumBannerUrl}
                        onChange={(e) => {
                          setForumBannerUrl(e.target.value);
                          setForumBannerPreview(e.target.value);
                        }}
                        placeholder="https://example.com/images/ma-banniere-forum.jpg"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                      />
                      {forumBannerUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setForumBannerUrl('');
                            setForumBannerPreview(null);
                          }}
                          className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 hover:bg-rose-50 transition cursor-pointer"
                          title="Effacer l'URL"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Entrez l'URL directe d'une image hébergée en ligne pour le haut du forum.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. PALETTE DE COULEURS & THEME */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-600" />
                    <span>Palette de Couleurs & Thème du Forum</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Personnalisez le rendu visuel des messages, dialogues, pensées et sections du forum.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedThemeId}
                    onChange={(e) => handleApplyPredefinedTheme(e.target.value)}
                    aria-label="Appliquer un thème pré-conçu"
                    data-testid="predefined-theme-select"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    <option value="">Appliquer un thème pré-conçu…</option>
                    {predefinedThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleResetColors}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Réinitialiser les couleurs</span>
                  </button>
                </div>
              </div>

              {/* RP Dialogue & Pensée Colors */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Couleurs Roleplay des Messages
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Dialogue Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Paroles / Dialogue
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={dialogueColor}
                        onChange={(e) => setDialogueColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={dialogueColor}
                        onChange={(e) => setDialogueColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Pensee Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Pensée / Intériorité
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={penseeColor}
                        onChange={(e) => setPenseeColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={penseeColor}
                        onChange={(e) => setPenseeColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* RP1 Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Emphase RP 1
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={rp1Color}
                        onChange={(e) => setRp1Color(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={rp1Color}
                        onChange={(e) => setRp1Color(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* RP2 Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Emphase RP 2
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={rp2Color}
                        onChange={(e) => setRp2Color(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={rp2Color}
                        onChange={(e) => setRp2Color(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Forum Structure Colors */}
              <div className="space-y-4 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Couleurs d'Ambiance du Forum (Optionnelles)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Quote Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Fond des Citations
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={quoteColor || '#ffffff'}
                        onChange={(e) => setQuoteColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={quoteColor}
                        onChange={(e) => setQuoteColor(e.target.value)}
                        placeholder="Ex: #f8fafc"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Sidebar Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Fond Barre Latérale
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={sidebarColor || '#ffffff'}
                        onChange={(e) => setSidebarColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={sidebarColor}
                        onChange={(e) => setSidebarColor(e.target.value)}
                        placeholder="Ex: #f1f5f9"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Odd Line Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Lignes Impaires (Alternance)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={oddLineColor || '#ffffff'}
                        onChange={(e) => setOddLineColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={oddLineColor}
                        onChange={(e) => setOddLineColor(e.target.value)}
                        placeholder="Ex: #f8fafc"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Even Line Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Lignes Paires (Alternance)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={evenLineColor || '#ffffff'}
                        onChange={(e) => setEvenLineColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={evenLineColor}
                        onChange={(e) => setEvenLineColor(e.target.value)}
                        placeholder="Ex: #ffffff"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Text Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Couleur Principale du Texte
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor || '#1e293b'}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        placeholder="Ex: #0f172a"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Link Color */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Couleur des Liens Hypertextes
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={linkColor || '#4f46e5'}
                        onChange={(e) => setLinkColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={linkColor}
                        onChange={(e) => setLinkColor(e.target.value)}
                        placeholder="Ex: #4f46e5"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Separator Image Configuration */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                      Barre de Séparation
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-amber-600" />
                      <span>Image de Séparation (HR)</span>
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Configurez une image personnalisée pour les barres de séparation (balises &lt;hr&gt;) dans les messages de la campagne.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Preview */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      Aperçu
                    </span>
                    <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">Exemple de texte au-dessus</p>
                        {hrPreview || (hrMode === 'url' && hrUrl) ? (
                          <hr style={{ backgroundImage: `url(${hrPreview || hrUrl})`, height: '60px', border: 'none', backgroundSize: 'contain', backgroundPosition: 'center' }} />
                        ) : (
                          <hr className="border-slate-300" />
                        )}
                        <p className="text-sm text-slate-600">Exemple de texte en-dessous</p>
                      </div>
                    </div>
                  </div>

                  {/* Source Selector */}
                  <div className="space-y-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Source de l'image
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setHrMode('upload')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                          hrMode === 'upload'
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Téléverser</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHrMode('url')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                          hrMode === 'url'
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>URL externe</span>
                      </button>
                    </div>

                    {hrMode === 'upload' ? (
                      <div>
                        <input
                          ref={hrInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleHrFileSelect(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <div
                          onDragOver={handleHrDragOver}
                          onDragLeave={handleHrDragLeave}
                          onDrop={handleHrDrop}
                          onClick={() => hrInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                            isDraggingHr
                              ? 'border-indigo-500 bg-indigo-50/50'
                              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                          }`}
                        >
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-slate-700">
                            {hrFile ? hrFile.name : 'Cliquez ou glissez une image ici'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            PNG, JPG, WebP jusqu'à 10 Mo
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          value={hrUrl}
                          onChange={(e) => {
                            setHrUrl(e.target.value);
                            setHrPreview(e.target.value);
                          }}
                          placeholder="https://exemple.com/barre-separation.png"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Post Simulation Preview */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Aperçu en direct d'un message avec votre palette
                </span>
                <div
                  className="rounded-2xl p-5 border transition shadow-xs space-y-3"
                  style={{
                    backgroundColor: oddLineColor || '#ffffff',
                    color: textColor || '#1e293b',
                    borderColor: '#e2e8f0',
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                    <span className="font-bold">Eldrin l'Érudit</span>
                    <span className="text-slate-400">Il y a 10 minutes</span>
                  </div>
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p>
                      Le vent soufflait violemment contre les murailles de pierre ancienne.
                    </p>
                    <p style={{ color: dialogueColor }}>
                      « Regardez ces inscriptions au-dessus de l'arche, elles ne sont pas de facture humaine ! »
                    </p>
                    <p style={{ color: penseeColor, fontStyle: 'italic' }}>
                      *Pourvu que les gardes de la nuit ne nous aient pas aperçus...*
                    </p>
                    <p>
                      D'un geste précis, il leva sa torche (
                      <span style={{ color: rp1Color, fontWeight: 'bold' }}>action héroïque</span>).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Character Sheet */}
        {activeTab === 'sheet' && (
          <div className="space-y-8">
            {/* Card 1: Description technique par défaut */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Template de Personnage (Description technique)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cette zone textuelle sera recopiée dans la section "Description technique" des personnages rejoignant la partie.
                </p>
              </div>

              <div className="space-y-2">
                <WysiwygEditor
                  value={template}
                  onChange={setTemplate}
                  placeholder="Ex: Caractéristiques (FOR, DEX, CON, INT, SAG, CHA), Compétences, Inventaire..."
                  minHeight="150px"
                />
              </div>
            </div>

            {/* Card 2: Feuille de Personnage Graphique & Champs */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <LayoutTemplate className="w-5 h-5 text-indigo-600" />
                  <span>Feuille de Personnage Graphique Interactive</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configurez le fond de la fiche (image ou code HTML WYSIWYG) et positionnez les champs interactifs qui seront remplis par les joueurs.
                </p>
              </div>

              {/* 1. Choix du mode de fond */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Fond de la fiche de personnage
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label
                    onClick={() => setSheetBgType('image')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition cursor-pointer ${
                      sheetBgType === 'image'
                        ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sheetBgType"
                      checked={sheetBgType === 'image'}
                      onChange={() => setSheetBgType('image')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">
                        Utiliser une image de fond
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Idéal pour une fiche de jeu de rôle scannée ou conçue graphiquement (PNG, JPG).
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setSheetBgType('html')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition cursor-pointer ${
                      sheetBgType === 'html'
                        ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sheetBgType"
                      checked={sheetBgType === 'html'}
                      onChange={() => setSheetBgType('html')}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">
                        Utiliser un fond HTML WYSIWYG
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Rédigez la structure de votre fiche avec tableaux, titres et texte formaté.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Paramètres selon le mode de fond */}
              {sheetBgType === 'image' ? (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Image de fond
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setSheetImgMode('upload')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                          sheetImgMode === 'upload'
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Téléverser</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSheetImgMode('url')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer ${
                          sheetImgMode === 'url'
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>URL externe</span>
                      </button>
                    </div>
                  </div>

                  {sheetImgMode === 'upload' ? (
                    <div>
                      <input
                        ref={sheetImgInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleSheetImgFileSelect(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <div
                        onDragOver={handleSheetImgDragOver}
                        onDragLeave={handleSheetImgDragLeave}
                        onDrop={handleSheetImgDrop}
                        onClick={() => sheetImgInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                          isDraggingSheetImg
                            ? 'border-indigo-500 bg-indigo-50/50'
                            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">
                          {sheetImgFile ? sheetImgFile.name : 'Cliquez ou glissez une image ici'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PNG, JPG, WebP jusqu'à 10 Mo
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        value={sheetImgUrl}
                        onChange={(e) => {
                          setSheetImgUrl(e.target.value);
                          setSheetImgPreview(e.target.value);
                        }}
                        placeholder="https://exemple.com/ma-feuille-de-perso.jpg"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-hidden transition"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Contenu HTML du gabarit
                  </label>
                  <WysiwygEditor
                    value={sheetHtml}
                    onChange={setSheetHtml}
                    placeholder="Créez la structure de votre fiche (tableaux, rubriques, encarts)..."
                    minHeight="250px"
                  />
                </div>
              )}

              {/* 2. Éditeur visuel interactif */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Positionner les champs interactifs
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Glissez des champs depuis la barre d'outils sur la feuille, ajustez leur taille et leur valeur par défaut.
                    </p>
                  </div>
                </div>

                <CharacterSheetRenderer
                  mode="edit-sheet"
                  canvasWidth={width || '800px'}
                  bgType={sheetBgType}
                  templateImg={sheetBgType === 'image' ? (sheetImgPreview || sheetImgUrl) : undefined}
                  templateHtml={sheetBgType === 'html' ? sheetHtml : undefined}
                  fields={sheetFields}
                  maxCount={sheetMaxCount}
                  onFieldsChange={(newFields, newMax) => {
                    setSheetFields(newFields);
                    setSheetMaxCount(newMax);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Widgets Configuration */}
        {activeTab === 'widgets' && (
          <CampaignWidgetsConfig
            widgets={widgetsList}
            onChange={setWidgetsList}
          />
        )}

        {/* Action Bottom Bar */}
        <div className="sticky bottom-4 z-20 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer disabled:opacity-50"
          >
            Annuler
          </button>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-xs disabled:opacity-50 cursor-pointer"
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
      </form>
    </div>
  );
};
