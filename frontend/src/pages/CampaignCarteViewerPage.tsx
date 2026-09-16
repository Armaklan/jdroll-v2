import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsApi } from '../api/campaigns';
import {
  CarteDetail,
  CarteMarker,
  CarteConfig,
  CarteCharacter,
} from '../types/campaign';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Users,
  Save,
  Check,
  Loader2,
  AlertCircle,
  X,
  Info,
  Layers,
  Crosshair,
  HelpCircle,
  GripVertical,
  MapPin,
  Move,
} from 'lucide-react';

export const CampaignCarteViewerPage: React.FC = () => {
  const params = useParams<{ campaignId: string; carteId: string }>();
  const navigate = useNavigate();

  const campaignId = params.campaignId ? Number(params.campaignId) : 0;
  const carteId = params.carteId ? Number(params.carteId) : 0;

  // État des données
  const [carte, setCarte] = useState<CarteDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaveSuccess, setLastSaveSuccess] = useState<boolean>(false);

  // État de la vue (Zoom & Pan)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Dimensions réelles de l'image
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 800,
  });

  // Volet latéral
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'tokens' | 'settings'>('tokens');

  // Références toujours à jour pour éviter tout problème de closure dans les écouteurs globaux
  const latestConfigRef = useRef<CarteConfig>({ markers: [], tabReduce: false });
  const carteRef = useRef<CarteDetail | null>(null);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1);
  const imageSizeRef = useRef<{ width: number; height: number }>({ width: 1200, height: 800 });

  useEffect(() => {
    carteRef.current = carte;
    if (carte?.config) {
      latestConfigRef.current = carte.config;
    }
  }, [carte]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    imageSizeRef.current = imageSize;
  }, [imageSize]);

  // Déplacement de token
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragOverMap, setIsDragOverMap] = useState<boolean>(false);
  const dragStartCoordRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedMarkerRef = useRef<boolean>(false);
  const draggedSidebarItemRef = useRef<{
    type: 'perso' | 'custom';
    id?: string | number;
    name?: string;
    image?: string;
  } | null>(null);

  // Popup / Détail du marqueur sélectionné
  const [selectedMarker, setSelectedMarker] = useState<CarteMarker | null>(null);
  const [popupNoteText, setPopupNoteText] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customImage, setCustomImage] = useState<string>('');

  // Modal d'ajout de token personnalisé (MJ)
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [newCustomName, setNewCustomName] = useState<string>('');
  const [newCustomImage, setNewCustomImage] = useState<string>('');
  const [newCustomText, setNewCustomText] = useState<string>('');

  // Paramètres de la carte (MJ)
  const [settingsName, setSettingsName] = useState<string>('');
  const [settingsDescription, setSettingsDescription] = useState<string>('');
  const [settingsImage, setSettingsImage] = useState<string>('');
  const [settingsPublished, setSettingsPublished] = useState<boolean>(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState<boolean>(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  // Références DOM
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Chargement des données
  const loadCarte = useCallback(async () => {
    if (!carteId || !campaignId) {
      setError('Paramètres manquants');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await campaignsApi.getCarte(campaignId, carteId);
      setCarte(data);
      latestConfigRef.current = data.config || { markers: [], tabReduce: false };
      setSettingsName(data.name || '');
      setSettingsDescription(data.description || '');
      setSettingsImage(data.image || '');
      setSettingsPublished(data.published);
      if (data.config?.tabReduce !== undefined) {
        setIsSidebarOpen(!data.config.tabReduce);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la carte');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, carteId]);

  useEffect(() => {
    loadCarte();
  }, [loadCarte]);

  // Détection des dimensions de l'image chargée
  const handleImageLoaded = () => {
    if (imageRef.current) {
      const nw = imageRef.current.naturalWidth || 1200;
      const nh = imageRef.current.naturalHeight || 800;
      setImageSize({ width: nw, height: nh });
    }
  };

  const isMj = Boolean(carte?.isMj);

  // Liste des marqueurs actuels
  const markers: CarteMarker[] = useMemo(() => {
    return carte?.config?.markers || [];
  }, [carte]);

  // Vérifie si un utilisateur peut déplacer un marqueur donné
  const canMoveMarker = useCallback(
    (marker: CarteMarker): boolean => {
      if (isMj) return true;
      if (marker.type !== 'perso') return false;
      const char = (carte?.personnages || []).find((p) => String(p.id) === String(marker.id));
      return Boolean(char && char.is_current_user);
    },
    [isMj, carte]
  );

  // Sauvegarde de la configuration
  const saveConfig = async (newConfig: CarteConfig) => {
    if (!carte) return;
    latestConfigRef.current = newConfig;
    setIsSaving(true);
    setLastSaveSuccess(false);

    try {
      await campaignsApi.updateCarte(campaignId, carteId, {
        config: newConfig,
      });

      setCarte((prev) => (prev ? { ...prev, config: newConfig } : null));
      setLastSaveSuccess(true);
      setTimeout(() => setLastSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Erreur de sauvegarde de la carte :', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Convertit la position [y, x] relative au centre de l'image en coordonnées pixels par rapport au coin haut-gauche de l'image
  const getMarkerPixelPosition = useCallback(
    (position: [number, number]): { left: number; top: number } => {
      const cx = imageSize.width / 2;
      const cy = imageSize.height / 2;
      const y = position[0];
      const x = position[1];

      return {
        left: cx + x,
        top: cy - y,
      };
    },
    [imageSize]
  );

  // Convertit les pixels image (depuis haut-gauche) en position [y, x] relative au centre
  const getMarkerPositionFromPixels = useCallback(
    (left: number, top: number): [number, number] => {
      const cx = imageSize.width / 2;
      const cy = imageSize.height / 2;
      const x = Math.round(left - cx);
      const y = Math.round(cy - top);
      return [y, x];
    },
    [imageSize]
  );

  // Gestion du Pan & Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev * zoomFactor, 5));
    } else {
      setZoom((prev) => Math.max(prev / zoomFactor, 0.2));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Si on clique avec le bouton gauche
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Ne pas démarrer le pan si on clique sur un bouton, un input, un marqueur ou un élément interactif
    if (target.closest('button, a, input, textarea, select, [data-interactive="true"], [data-marker="true"]')) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // Place un token (personnage ou custom) sur la carte à des coordonnées ou au centre de la vue
  const placeTokenOnMap = async (
    data: { type: 'perso' | 'custom'; id?: string | number; name?: string; image?: string },
    clientX?: number,
    clientY?: number
  ) => {
    if (!carte) return;
    if (!data || !data.type) return;

    let dropPos: [number, number] = [0, 0];

    if (clientX !== undefined && clientY !== undefined) {
      const imgRect = imageRef.current?.getBoundingClientRect();
      if (imgRect && imgRect.width > 0 && imgRect.height > 0) {
        const cursorImageX = (clientX - imgRect.left) / zoom;
        const cursorImageY = (clientY - imgRect.top) / zoom;
        dropPos = getMarkerPositionFromPixels(cursorImageX, cursorImageY);
      } else if (containerRef.current) {
        const contRect = containerRef.current.getBoundingClientRect();
        const cursorImageX = (clientX - (contRect.left + pan.x)) / zoom;
        const cursorImageY = (clientY - (contRect.top + pan.y)) / zoom;
        dropPos = getMarkerPositionFromPixels(cursorImageX, cursorImageY);
      }
    } else {
      if (containerRef.current && imageSize.width > 0 && imageSize.height > 0) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const cursorImageX = (cw / 2 - pan.x) / zoom;
        const cursorImageY = (ch / 2 - pan.y) / zoom;
        dropPos = getMarkerPositionFromPixels(cursorImageX, cursorImageY);
      }
    }

    const currentMarkers = latestConfigRef.current.markers || carte.config?.markers || [];

    if (data.type === 'perso') {
      const char = (carte.personnages || []).find((p) => String(p.id) === String(data.id));
      if (!char) return;
      if (!isMj && !char.is_current_user) return;

      const existingIndex = currentMarkers.findIndex(
        (m) => m.type === 'perso' && String(m.id) === String(char.id)
      );

      let updatedMarkers: CarteMarker[];
      let targetMarker: CarteMarker;

      if (existingIndex >= 0) {
        targetMarker = { ...currentMarkers[existingIndex], position: dropPos };
        updatedMarkers = currentMarkers.map((m, idx) => (idx === existingIndex ? targetMarker : m));
      } else {
        targetMarker = {
          type: 'perso',
          id: String(char.id),
          position: dropPos,
          popup: { text: '' },
        };
        updatedMarkers = [...currentMarkers, targetMarker];
      }

      const newConfig: CarteConfig = {
        ...latestConfigRef.current,
        ...carte.config,
        markers: updatedMarkers,
      };

      latestConfigRef.current = newConfig;
      setCarte((prev) => (prev ? { ...prev, config: newConfig } : null));
      await saveConfig(newConfig);
      setSelectedMarker(targetMarker);
    } else if (data.type === 'custom') {
      if (!isMj) return;

      const customNameValue = data.name || 'Marqueur personnalisé';
      const customImageValue = data.image || '';

      const newCustomMarker: CarteMarker = {
        type: 'custom',
        id: `custom_${Date.now()}`,
        position: dropPos,
        popup: {
          name: customNameValue,
          text: '',
          image: customImageValue,
        },
      };

      const newConfig: CarteConfig = {
        ...latestConfigRef.current,
        ...carte.config,
        markers: [...currentMarkers, newCustomMarker],
      };

      latestConfigRef.current = newConfig;
      setCarte((prev) => (prev ? { ...prev, config: newConfig } : null));
      await saveConfig(newConfig);
      setSelectedMarker(newCustomMarker);
      setCustomName(customNameValue);
      setCustomImage(customImageValue);
      setPopupNoteText('');
    }
  };

  // Gestion globale des événements de souris (Pan de carte & Déplacement de marqueurs existants)
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      } else if (draggingMarkerId !== null && carte) {
        if (dragStartCoordRef.current) {
          const dx = e.clientX - dragStartCoordRef.current.x;
          const dy = e.clientY - dragStartCoordRef.current.y;
          if (Math.hypot(dx, dy) > 4) {
            hasDraggedMarkerRef.current = true;
          }
        }

        const imgRect = imageRef.current?.getBoundingClientRect();
        if (!imgRect) return;

        const cursorImageX = (e.clientX - imgRect.left) / zoom;
        const cursorImageY = (e.clientY - imgRect.top) / zoom;

        const newLeft = cursorImageX - dragOffset.x;
        const newTop = cursorImageY - dragOffset.y;

        const newPos = getMarkerPositionFromPixels(newLeft, newTop);

        // Met à jour localement la position du marqueur pour un rendu fluide
        setCarte((prev) => {
          if (!prev) return null;
          const currentMarkers = prev.config?.markers || [];
          const updated = currentMarkers.map((m) => {
            if (String(m.id) === String(draggingMarkerId)) {
              return { ...m, position: newPos };
            }
            return m;
          });
          const newConfig = { ...prev.config, markers: updated };
          latestConfigRef.current = newConfig;
          return { ...prev, config: newConfig };
        });
      }
    };

    const handleWindowMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
      if (draggingMarkerId !== null) {
        setDraggingMarkerId(null);
        if (hasDraggedMarkerRef.current && latestConfigRef.current) {
          saveConfig(latestConfigRef.current);
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning, draggingMarkerId, panStart, carte, zoom, dragOffset, getMarkerPositionFromPixels]);

  // Début du glisser d'un marqueur sur la carte
  const handleMarkerMouseDown = (e: React.MouseEvent, marker: CarteMarker) => {
    e.stopPropagation();
    if (!canMoveMarker(marker)) return;

    const imgRect = imageRef.current?.getBoundingClientRect();
    if (!imgRect) return;

    dragStartCoordRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedMarkerRef.current = false;

    const cursorImageX = (e.clientX - imgRect.left) / zoom;
    const cursorImageY = (e.clientY - imgRect.top) / zoom;

    const markerPos = getMarkerPixelPosition(marker.position);

    setDragOffset({
      x: cursorImageX - markerPos.left,
      y: cursorImageY - markerPos.top,
    });

    setDraggingMarkerId(marker.id);
  };

  // Déposer un élément (personnage ou pion custom) sur la carte depuis le volet latéral
  const handleDropOnMap = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverMap(false);
    if (!carte) return;

    let data: any = draggedSidebarItemRef.current || (window as any).__jdroll_dragged_marker;
    if (!data) {
      const dataStr =
        e.dataTransfer.getData('application/json') ||
        e.dataTransfer.getData('text/plain') ||
        e.dataTransfer.getData('text');
      if (dataStr) {
        try {
          data = JSON.parse(dataStr);
        } catch {
          // ignore
        }
      }
    }

    if (data && data.type) {
      await placeTokenOnMap(data, e.clientX, e.clientY);
    }

    draggedSidebarItemRef.current = null;
    (window as any).__jdroll_dragged_marker = null;
  };

  // Clic sur un marqueur pour ouvrir sa popup
  const handleMarkerClick = (marker: CarteMarker) => {
    setSelectedMarker(marker);

    if (marker.type === 'perso') {
      let text = '';
      if (marker.popup) {
        if (typeof marker.popup === 'string') {
          text = marker.popup;
        } else if (typeof marker.popup === 'object' && !Array.isArray(marker.popup)) {
          text = marker.popup.text || marker.popup.description || '';
        }
      }
      setPopupNoteText(text);
    } else {
      let name = '';
      let text = '';
      let img = '';
      if (marker.popup && typeof marker.popup === 'object' && !Array.isArray(marker.popup)) {
        name = marker.popup.name || '';
        text = marker.popup.text || marker.popup.description || '';
        img = marker.popup.image || '';
      }
      setCustomName(name);
      setCustomImage(img);
      setPopupNoteText(text);
    }
  };

  // Enregistrer les modifications du marqueur sélectionné
  const handleSaveMarkerDetails = async () => {
    if (!selectedMarker || !carte) return;

    let updatedPopup: any = {};
    if (selectedMarker.type === 'perso') {
      updatedPopup = { text: popupNoteText.trim() };
    } else {
      updatedPopup = {
        name: customName.trim(),
        text: popupNoteText.trim(),
        image: customImage.trim(),
      };
    }

    const updatedMarkers = markers.map((m) => {
      if (String(m.id) === String(selectedMarker.id)) {
        return { ...m, popup: updatedPopup };
      }
      return m;
    });

    const newConfig: CarteConfig = {
      ...latestConfigRef.current,
      ...carte.config,
      markers: updatedMarkers,
    };

    latestConfigRef.current = newConfig;
    await saveConfig(newConfig);
    setSelectedMarker((prev) => (prev ? { ...prev, popup: updatedPopup } : null));
  };

  // Retirer un marqueur de la carte (MJ uniquement)
  const handleRemoveMarker = async (markerId: string | number) => {
    if (!carte || !isMj) return;

    const updatedMarkers = markers.filter((m) => String(m.id) !== String(markerId));
    const newConfig: CarteConfig = {
      ...latestConfigRef.current,
      ...carte.config,
      markers: updatedMarkers,
    };

    latestConfigRef.current = newConfig;
    setSelectedMarker(null);
    await saveConfig(newConfig);
  };

  // Placer un personnage sur la carte
  const handleAddCharacterToken = async (char: CarteCharacter) => {
    if (!carte) return;
    if (!isMj && !char.is_current_user) return;

    // Vérifie s'il est déjà sur la carte
    const existing = markers.find((m) => m.type === 'perso' && String(m.id) === String(char.id));
    if (existing) {
      centerOnMarker(existing);
      return;
    }

    await placeTokenOnMap({ type: 'perso', id: String(char.id) });
  };

  // Ajouter un marqueur personnalisé (MJ)
  const handleCreateCustomMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carte || !isMj || !newCustomName.trim()) return;

    const newMarker: CarteMarker = {
      type: 'custom',
      id: `custom_${Date.now()}`,
      position: [0, 0],
      popup: {
        name: newCustomName.trim(),
        text: newCustomText.trim(),
        image: newCustomImage.trim(),
      },
    };

    const newConfig: CarteConfig = {
      ...carte.config,
      markers: [...markers, newMarker],
    };

    setIsCustomModalOpen(false);
    setNewCustomName('');
    setNewCustomImage('');
    setNewCustomText('');

    await saveConfig(newConfig);
    centerOnMarker(newMarker);
  };

  // Enregistrer les paramètres de la carte (MJ)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMj || !carte) return;

    setIsUpdatingSettings(true);
    setSettingsMessage(null);

    try {
      await campaignsApi.updateCarte(campaignId, carteId, {
        name: settingsName.trim(),
        description: settingsDescription.trim(),
        image: settingsImage.trim(),
        published: settingsPublished,
      });

      setCarte((prev) =>
        prev
          ? {
              ...prev,
              name: settingsName.trim(),
              description: settingsDescription.trim(),
              image: settingsImage.trim(),
              published: settingsPublished,
            }
          : null
      );

      setSettingsMessage('Paramètres de la carte enregistrés avec succès !');
      setTimeout(() => setSettingsMessage(null), 3000);
    } catch (err: any) {
      setSettingsMessage(`Erreur : ${err.message || 'Impossible de mettre à jour la carte'}`);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Centrer sur un marqueur
  const centerOnMarker = (marker: CarteMarker) => {
    const pos = getMarkerPixelPosition(marker.position);
    if (!containerRef.current) return;

    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    setPan({
      x: cw / 2 - pos.left * zoom,
      y: ch / 2 - pos.top * zoom,
    });
  };

  // Réinitialiser la vue
  const resetView = () => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    const scaleX = (cw - 40) / imageSize.width;
    const scaleY = (ch - 40) / imageSize.height;
    const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.5);

    setZoom(fitZoom);
    setPan({
      x: (cw - imageSize.width * fitZoom) / 2,
      y: (ch - imageSize.height * fitZoom) / 2,
    });
  };

  // Initialisation du cadrage dès que l'image est prête
  useEffect(() => {
    if (imageSize.width && containerRef.current) {
      resetView();
    }
  }, [imageSize.width]);

  // Bascule Plein écran
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Informations sur le personnage du marqueur sélectionné
  const selectedCharacterInfo = useMemo(() => {
    if (!selectedMarker || selectedMarker.type !== 'perso' || !carte) return null;
    return carte.personnages.find((p) => String(p.id) === String(selectedMarker.id)) || null;
  }, [selectedMarker, carte]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* Barre supérieure d'outils */}
      <header className="h-14 bg-slate-950/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/campaigns/${campaignId}/cartes`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Toutes les cartes</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm sm:text-base text-slate-100 line-clamp-1">
              {carte?.name || 'Carte'}
            </h1>

            {carte?.published ? (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <Eye className="w-3 h-3" />
                <span>Visible joueurs</span>
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                <EyeOff className="w-3 h-3" />
                <span>Brouillon MJ</span>
              </span>
            )}
          </div>
        </div>

        {/* Indicateur de sauvegarde & Contrôles de Zoom */}
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="inline-flex items-center gap-1 text-xs text-indigo-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Sauvegarde...</span>
            </span>
          )}
          {lastSaveSuccess && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enregistré</span>
            </span>
          )}

          <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(z / 1.25, 0.2))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition cursor-pointer"
              title="Zoom arrière"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-400 min-w-[45px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.25, 5))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition cursor-pointer"
              title="Zoom avant"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition cursor-pointer ml-1 border-l border-slate-700"
              title="Ajuster la vue"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer hidden sm:block"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Toggle Sidebar */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`p-2 rounded-lg border transition cursor-pointer ${
              isSidebarOpen
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title={isSidebarOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Zone Principale : Canvas de la carte + Panneau latéral */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Chargement & Erreur */}
        {isLoading && (
          <div className="absolute inset-0 z-40 bg-slate-900 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-slate-400">Chargement de la carte et des pions...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-40 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <h2 className="text-lg font-bold text-slate-200">Impossible d'afficher la carte</h2>
            <p className="text-sm text-slate-400 max-w-md mt-1 mb-4">{error}</p>
            <button
              onClick={() => navigate(`/campaigns/${campaignId}/cartes`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
            >
              Retour à la liste des cartes
            </button>
          </div>
        )}

        {/* Espace interactif de la carte */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            if (!isDragOverMap) setIsDragOverMap(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOverMap(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget === e.target) {
              setIsDragOverMap(false);
            }
          }}
          onDrop={handleDropOnMap}
          className={`flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center transition-colors ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          } ${isDragOverMap ? 'ring-4 ring-indigo-500/60 ring-inset bg-slate-900/40' : ''}`}
          style={{ touchAction: 'none' }}
        >
          {/* Overlay de survol lors du glisser d'un pion */}
          {isDragOverMap && (
            <div
              className="absolute inset-0 z-40 bg-indigo-950/30 border-4 border-indigo-500/60 border-dashed rounded-xl flex items-center justify-center backdrop-blur-[1px]"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (e.currentTarget === e.target) {
                  setIsDragOverMap(false);
                }
              }}
              onDrop={handleDropOnMap}
            >
              <div className="px-5 py-3 bg-indigo-600/95 text-white text-sm font-bold rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce pointer-events-none">
                <MapPin className="w-5 h-5 text-indigo-200" />
                <span>Relâchez pour placer le pion ici sur la carte</span>
              </div>
            </div>
          )}

          {carte && (
            <div
              className={`absolute top-0 left-0 origin-top-left ${
                isPanning || draggingMarkerId !== null ? 'transition-none' : 'transition-transform duration-75'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                if (!isDragOverMap) setIsDragOverMap(true);
              }}
              onDrop={handleDropOnMap}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                width: `${imageSize.width}px`,
                height: `${imageSize.height}px`,
              }}
            >
              {/* Image de Fond */}
              <img
                ref={imageRef}
                src={carte.image}
                alt={carte.name}
                onLoad={handleImageLoaded}
                draggable={false}
                className="w-full h-full object-contain pointer-events-none select-none rounded shadow-2xl"
              />

              {/* Rendu des Marqueurs / Tokens */}
              {markers.map((marker) => {
                const pos = getMarkerPixelPosition(marker.position);
                const isDraggable = canMoveMarker(marker);
                const isSelected = selectedMarker?.id === marker.id;

                let charInfo: CarteCharacter | undefined = undefined;
                let markerName = 'Élément';
                let markerAvatar: string | null = null;
                let isOwner = false;

                if (marker.type === 'perso') {
                  charInfo = carte.personnages.find((p) => String(p.id) === String(marker.id));
                  markerName = charInfo ? charInfo.name : `Perso #${marker.id}`;
                  markerAvatar = charInfo?.avatar || null;
                  isOwner = Boolean(charInfo?.is_current_user);
                } else if (marker.popup && typeof marker.popup === 'object' && !Array.isArray(marker.popup)) {
                  markerName = marker.popup.name || 'Marqueur';
                  markerAvatar = marker.popup.image || null;
                }

                return (
                  <div
                    key={`${marker.type}_${marker.id}`}
                    data-marker="true"
                    onMouseDown={(e) => handleMarkerMouseDown(e, marker)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasDraggedMarkerRef.current) return;
                      handleMarkerClick(marker);
                    }}
                    style={{
                      left: `${pos.left}px`,
                      top: `${pos.top}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isSelected || draggingMarkerId === marker.id ? 50 : 20,
                    }}
                    className={`absolute flex flex-col items-center group cursor-pointer ${
                      draggingMarkerId === marker.id ? 'transition-none' : 'transition-transform duration-75'
                    } select-none`}
                  >
                    {/* Badge / Cercle Avatar */}
                    <div
                      className={`relative w-11 h-11 rounded-full p-0.5 shadow-lg flex items-center justify-center transition ${
                        isOwner
                          ? 'ring-3 ring-emerald-400 ring-offset-2 ring-offset-slate-950 bg-emerald-500'
                          : isDraggable
                          ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 bg-indigo-600'
                          : 'ring-1 ring-slate-400 bg-slate-700'
                      } ${isSelected ? 'scale-115 ring-4 ring-amber-400' : 'hover:scale-110'}`}
                    >
                      {markerAvatar ? (
                        <img
                          src={markerAvatar}
                          alt={markerName}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200">
                          {markerName.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Indicateur de propriétaire */}
                      {isOwner && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                      )}
                    </div>

                    {/* Étiquette du Nom */}
                    <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 text-white text-[10px] font-bold shadow-md border border-slate-800 whitespace-nowrap pointer-events-none group-hover:bg-indigo-950 transition">
                      {markerName}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal / Fiche flottante de détail d'un marqueur */}
        {selectedMarker && (
          <div
            data-interactive="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-6 left-6 z-40 max-w-sm w-full bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                {selectedMarker.type === 'perso' ? (
                  <div className="w-9 h-9 rounded-full bg-indigo-600 overflow-hidden shrink-0 border border-indigo-400">
                    {selectedCharacterInfo?.avatar ? (
                      <img
                        src={selectedCharacterInfo.avatar}
                        alt={selectedCharacterInfo.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                        {selectedCharacterInfo?.name.substring(0, 2).toUpperCase() || 'P'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-white shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    {selectedMarker.type === 'perso'
                      ? selectedCharacterInfo?.name || `Personnage #${selectedMarker.id}`
                      : customName || 'Élément personnalisé'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {selectedMarker.type === 'perso'
                      ? selectedCharacterInfo?.is_current_user
                        ? 'Votre personnage (déplaçable)'
                        : isMj
                        ? 'Personnage joueur (déplaçable par le MJ)'
                        : 'Personnage (non déplaçable)'
                      : 'Élément de décor / PNJ'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedMarker(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps de la popup */}
            <div className="mt-3 space-y-3">
              {/* Pour les custom markers : édition du nom/image si MJ */}
              {selectedMarker.type === 'custom' && isMj && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nom de l'élément
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Image / Icône (URL)
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={customImage}
                      onChange={(e) => setCustomImage(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {/* Note / Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description / Notes sur ce pion
                </label>
                {isMj || (selectedMarker.type === 'perso' && selectedCharacterInfo?.is_current_user) ? (
                  <textarea
                    rows={2}
                    placeholder="Ajouter une note ou un état visible..."
                    value={popupNoteText}
                    onChange={(e) => setPopupNoteText(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800 min-h-[40px]">
                    {popupNoteText || 'Aucune note.'}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                {isMj ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveMarker(selectedMarker.id)}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer de la carte</span>
                  </button>
                ) : <div />}

                {(isMj || (selectedMarker.type === 'perso' && selectedCharacterInfo?.is_current_user)) && (
                  <button
                    type="button"
                    onClick={handleSaveMarkerDetails}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Enregistrer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Panneau latéral (Drawer) */}
        {isSidebarOpen && (
          <aside className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 z-30 animate-in slide-in-from-right duration-150">
            {/* Onglets Panneau */}
            <div className="flex border-b border-slate-800 bg-slate-900/50">
              <button
                onClick={() => setSidebarTab('tokens')}
                className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  sidebarTab === 'tokens'
                    ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Pions & PNJ ({carte?.personnages.length || 0})</span>
              </button>

              {isMj && (
                <button
                  onClick={() => setSidebarTab('settings')}
                  className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    sidebarTab === 'settings'
                      ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Configuration</span>
                </button>
              )}
            </div>

            {/* Contenu Onglet Pions */}
            {sidebarTab === 'tokens' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Section Marqueur personnalisé (MJ) */}
                {isMj && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Pion personnalisé
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsCustomModalOpen(true)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        Options
                      </button>
                    </div>

                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        const payload = { type: 'custom' as const, name: 'Marqueur personnalisé' };
                        draggedSidebarItemRef.current = payload;
                        (window as any).__jdroll_dragged_marker = payload;
                        const json = JSON.stringify(payload);
                        e.dataTransfer.setData('application/json', json);
                        e.dataTransfer.setData('text/plain', json);
                        e.dataTransfer.effectAllowed = 'copyMove';
                      }}
                      onDragEnd={() => {
                        draggedSidebarItemRef.current = null;
                        (window as any).__jdroll_dragged_marker = null;
                        setIsDragOverMap(false);
                      }}
                      className="group bg-slate-950 border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-xl p-2.5 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing hover:bg-slate-900/80 transition shadow-xs select-none"
                      title="Glissez ce pion sur la carte ou cliquez sur Placer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pointer-events-none">
                        <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            Nouveau pion
                          </p>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                            <Move className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span>Glisser sur la carte</span>
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            placeTokenOnMap({ type: 'custom', name: 'Marqueur personnalisé' });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold transition cursor-pointer"
                          title="Placer au centre de la vue"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Placer</span>
                        </button>
                        <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Personnages de la campagne</span>
                    <span className="text-[10px] text-slate-500 font-normal">Glissez pour placer</span>
                  </h4>

                  <div className="space-y-2">
                    {carte?.personnages.map((char) => {
                      const isOnMap = markers.some(
                        (m) => m.type === 'perso' && String(m.id) === String(char.id)
                      );
                      const canDrag = isMj || char.is_current_user;

                      return (
                        <div
                          key={char.id}
                          draggable={canDrag}
                          onDragStart={(e) => {
                            if (!canDrag) return;
                            const payload = { type: 'perso' as const, id: String(char.id) };
                            draggedSidebarItemRef.current = payload;
                            (window as any).__jdroll_dragged_marker = payload;
                            const json = JSON.stringify(payload);
                            e.dataTransfer.setData('application/json', json);
                            e.dataTransfer.setData('text/plain', json);
                            e.dataTransfer.effectAllowed = 'copyMove';
                          }}
                          onDragEnd={() => {
                            draggedSidebarItemRef.current = null;
                            (window as any).__jdroll_dragged_marker = null;
                            setIsDragOverMap(false);
                          }}
                          className={`border rounded-xl p-2.5 flex items-center justify-between gap-3 transition group select-none ${
                            char.is_current_user
                              ? 'bg-emerald-950/20 border-emerald-800/60 hover:border-emerald-600'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          } ${canDrag ? 'cursor-grab active:cursor-grabbing hover:scale-[1.01]' : ''}`}
                          title={
                            canDrag
                              ? 'Glissez ce personnage directement sur la carte pour le positionner'
                              : 'Vous ne pouvez déplacer que votre propre personnage'
                          }
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pointer-events-none">
                            {canDrag && (
                              <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                            )}
                            <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                              {char.avatar ? (
                                <img
                                  src={char.avatar}
                                  alt={char.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-200">
                                  {char.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                                <span>{char.name}</span>
                                {char.is_current_user && (
                                  <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 text-[9px] rounded font-medium border border-emerald-800/80">
                                    Vous
                                  </span>
                                )}
                              </p>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {char.is_current_user
                                  ? 'Votre personnage'
                                  : char.userId
                                  ? 'Personnage joueur'
                                  : 'PNJ'}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            {isOnMap ? (
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const m = markers.find(
                                    (marker) => marker.type === 'perso' && String(marker.id) === String(char.id)
                                  );
                                  if (m) centerOnMarker(m);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded-lg text-[10px] font-bold hover:bg-emerald-900 transition cursor-pointer"
                                title="Centrer la vue sur ce pion"
                              >
                                <Crosshair className="w-3 h-3" />
                                <span>Centrer</span>
                              </button>
                            ) : canDrag ? (
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddCharacterToken(char);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold transition cursor-pointer"
                                title="Placer au centre de la vue"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Placer</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Non placé</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Aide pour les utilisateurs */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Instructions</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Glissez les pions depuis ce panneau directement sur la carte pour les placer.</li>
                    <li>Glissez sur la carte pour vous déplacer (pan) et utilisez la molette pour zoomer.</li>
                    {isMj ? (
                      <li>En tant que MJ, vous pouvez créer et déplacer tous les pions.</li>
                    ) : (
                      <li>Vous pouvez placer et déplacer uniquement vos propres personnages.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Contenu Onglet Configuration (MJ uniquement) */}
            {sidebarTab === 'settings' && isMj && (
              <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto p-4 space-y-4">
                {settingsMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      settingsMessage.startsWith('Erreur')
                        ? 'bg-red-950/80 border border-red-800 text-red-300'
                        : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                    }`}
                  >
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{settingsMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nom de la carte
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={settingsDescription}
                    onChange={(e) => setSettingsDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Image de fond (URL)
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsImage}
                    onChange={(e) => setSettingsImage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Visible aux joueurs
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {settingsPublished ? 'Publiée' : 'Brouillon privé'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsPublished}
                    onChange={(e) => setSettingsPublished(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingSettings}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isUpdatingSettings ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Enregistrer les modifications</span>
                </button>
              </form>
            )}
          </aside>
        )}
      </div>

      {/* Modal Création de Marqueur Personnalisé (MJ) */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-2xs">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Nouveau pion personnalisé</span>
              </h3>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomMarker} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nom du pion <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Coffre, Monstre, Piège, Objectif..."
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  URL de l'image / portrait (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newCustomImage}
                  onChange={(e) => setNewCustomImage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description / Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Détails visibles lors du clic sur le pion..."
                  value={newCustomText}
                  onChange={(e) => setNewCustomText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Créer et placer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
