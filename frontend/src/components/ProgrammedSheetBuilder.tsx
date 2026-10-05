import React, { useEffect, useRef, useState } from 'react';
import {
  SheetComponent,
  SheetComponentType,
  SheetDefinition,
  SheetElement,
  SheetPage,
  SheetSection,
  SheetSectionLayout,
} from '../types/campaign';
import {
  FREE_ELEMENT_MIN_HEIGHT,
  FREE_SECTION_DEFAULT_HEIGHT,
  SHEET_COMPONENT_TYPE_LABELS,
  assignFreePositions,
  computeFreePlacement,
  computeFreeResize,
  computeFlowStretch,
  createComponent,
  createEmptyPage,
  createEmptySection,
  defaultFlowWeight,
  duplicateSheetElement,
  fixedPageSize,
  flowChildStyle,
  freeChildStyle,
  isSheetSection,
  nextFreePosition,
  pageBackgroundStyle,
  sectionBackgroundStyle,
} from '../utils/programmed-sheet';
import { uploadsApi } from '../api/uploads';
import {
  Plus,
  Trash2,
  Columns3,
  Rows3,
  Pencil,
  X,
  GripVertical,
  Copy,
  Move,
  Upload,
} from 'lucide-react';

interface ProgrammedSheetBuilderProps {
  definition: SheetDefinition;
  onChange: (definition: SheetDefinition) => void;
}

const COMPONENT_TYPES = Object.keys(
  SHEET_COMPONENT_TYPE_LABELS
) as SheetComponentType[];

/**
 * Palette d'ajout : la section est un composant comme un autre.
 */
const PALETTE: Array<{ value: string; label: string }> = [
  { value: 'section', label: 'Section' },
  ...COMPONENT_TYPES.map((type) => ({
    value: type,
    label: SHEET_COMPONENT_TYPE_LABELS[type],
  })),
];

/**
 * Cible de la modale de configuration flottante.
 */
type ConfigTarget =
  | { kind: 'section'; sectionId: string }
  | { kind: 'component'; parentSectionId: string; componentId: string };

/**
 * Élément en cours de glisser-déposer, avec ses dimensions à l'écran
 * (pour dimensionner l'aperçu et agrandir le canevas libre) et la
 * position du pointeur dans l'élément au moment où il a été attrapé
 * (pour ancrer le placement sur l'élément tenu et non sur le pointeur).
 */
type DragItem = {
  kind: 'component' | 'section';
  id: string;
  width: number;
  height: number;
  grabOffsetX: number;
  grabOffsetY: number;
};

/**
 * Cible de dépôt : avant/après un enfant quelconque (composant ou section),
 * ou en fin de conteneur (section ou premier niveau).
 */
type DropTarget =
  | { kind: 'child'; id: string; position: 'before' | 'after' }
  | { kind: 'container'; sectionId: string | null };

const SECTION_CONTAINER_CLASSES = ['border-slate-200 bg-slate-50/60', 'border-slate-100 bg-white'];

/**
 * Retire le poids de répartition d'un enfant : la répartition n'a de
 * sens que pour le layout dans lequel elle a été définie.
 */
const stripSizeWeight = (child: SheetElement): SheetElement => {
  const { sizeWeight, ...rest } = child as SheetComponent & SheetSection;
  return rest as SheetElement;
};

/**
 * Constructeur WYSIWYG de fiche programmée : la fiche y est affichée
 * telle qu'elle sera sur la feuille finale, avec des boutons "+" pour
 * ajouter des composants (dont des sections) et une modale flottante
 * pour configurer chaque élément. Composants et sous-sections partagent
 * un même flux ordonné, suivant le layout de leur section.
 */
export const ProgrammedSheetBuilder: React.FC<ProgrammedSheetBuilderProps> = ({
  definition,
  onChange,
}) => {
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [configTarget, setConfigTarget] = useState<ConfigTarget | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [pageImageError, setPageImageError] = useState<string | null>(null);

  /** Dimensions à l'écran des enfants (composants et sections) pour le drag. */
  const childRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** Canevas des sections libres (pour rect et agrandissement hors zone). */
  const canvasRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** Aperçus de dépôt libre, pilotés directement dans le DOM
   * (aucun re-render React pendant le drag, pour ne pas l'interrompre). */
  const previewRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerChildRef = (id: string, el: HTMLElement | null) => {
    if (el) childRefs.current.set(id, el);
    else childRefs.current.delete(id);
  };

  const registerCanvasRef = (id: string, el: HTMLElement | null) => {
    if (el) canvasRefs.current.set(id, el);
    else canvasRefs.current.delete(id);
  };

  const registerPreviewRef = (id: string, el: HTMLElement | null) => {
    if (el) previewRefs.current.set(id, el);
    else previewRefs.current.delete(id);
  };

  /** Redimensionnement libre en cours (poignée coin bas-droit). */
  const resizeState = useRef<{
    id: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  /** Étirement de répartition en cours (sections en flux horizontal/vertical). */
  const flowStretchState = useRef<{
    sectionId: string;
    childIds: string[];
    axis: 'x' | 'y';
    sizes: number[];
    index: number;
    startX: number;
    startY: number;
    containerHeight?: number;
  } | null>(null);

  /**
   * Démarre l'étirement d'un enfant dans une section en flux (horizontal :
   * largeurs, vertical : hauteurs). La taille gagnée est perdue
   * proportionnellement par les frères : le geste se joue en direct dans
   * le DOM (flex-basis), la persistance des poids n'a lieu qu'au relâchement.
   * En vertical, le conteneur passe à hauteur fixe pour que la
   * redistribution soit visible sans re-render React.
   */
  const startFlowStretch = (
    e: React.PointerEvent,
    sectionId: string,
    childId: string,
    axis: 'x' | 'y'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const section = activePage ? findSection(activePage.sections, sectionId) : null;
    if (!section) return;
    const childIds = section.children.map((child) => child.id);
    const index = childIds.indexOf(childId);
    if (index < 0 || childIds.length <= 1) return;
    const sizes = childIds.map((id) => {
      const rect = childRefs.current.get(id)?.getBoundingClientRect();
      return axis === 'x' ? (rect?.width ?? 0) : (rect?.height ?? 0);
    });

    // Vertical : passage immédiat en contexte flex colonne à hauteur
    // figée (sinon flex-basis n'a aucun effet dans une grille). Le
    // minimum automatique des items (hauteur de contenu) est levé pour
    // que la redistribution soit visible en direct.
    let containerHeight: number | undefined;
    if (axis === 'y') {
      const containerEl = childRefs.current.get(childId)?.parentElement ?? null;
      if (containerEl) {
        containerHeight = containerEl.getBoundingClientRect().height;
        containerEl.classList.remove('grid', 'grid-cols-1');
        containerEl.classList.add('flex', 'flex-col');
        containerEl.style.height = `${Math.round(containerHeight)}px`;
        containerEl.style.minHeight = '0px';
        childIds.forEach((id, i) => {
          const el = childRefs.current.get(id);
          if (el) {
            el.style.flexBasis = `${Math.round(sizes[i])}px`;
            el.style.minHeight = '0px';
          }
        });
      }
    }

    const state = {
      sectionId,
      childIds,
      axis,
      sizes,
      index,
      startX: e.clientX,
      startY: e.clientY,
      containerHeight,
    };
    flowStretchState.current = state;

    const onMove = (ev: PointerEvent) => {
      const delta = state.axis === 'x' ? ev.clientX - state.startX : ev.clientY - state.startY;
      const next = computeFlowStretch({ sizes: state.sizes, index: state.index, delta });
      state.childIds.forEach((id, i) => {
        const el = childRefs.current.get(id);
        if (el) el.style.flexBasis = `${next[i]}px`;
      });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      flowStretchState.current = null;
      // Le relâchement peut suivre la poignée déplacée et générer un
      // clic parasite (ouverture de la modale de configuration) :
      // l'avaler en phase de capture.
      const swallowClick = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        window.removeEventListener('click', swallowClick, true);
      };
      window.addEventListener('click', swallowClick, true);
      setTimeout(() => window.removeEventListener('click', swallowClick, true), 0);
      const delta =
        state.axis === 'x' ? ev.clientX - state.startX : ev.clientY - state.startY;
      const next = computeFlowStretch({ sizes: state.sizes, index: state.index, delta });

      const nextDefinition: SheetDefinition = JSON.parse(JSON.stringify(definition));
      const page = nextDefinition.pages[activePageIndex];
      const target = findSection(page.sections, state.sectionId);
      if (!target) return;
      target.children.forEach((child, i) => {
        child.sizeWeight = next[i];
      });
      if (state.axis === 'y' && state.containerHeight !== undefined) {
        target.height = Math.round(state.containerHeight);
      }
      onChange(nextDefinition);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const activePage: SheetPage | undefined = definition.pages[activePageIndex];

  const updatePage = (pageIndex: number, updater: (page: SheetPage) => SheetPage) => {
    onChange({
      ...definition,
      pages: definition.pages.map((page, index) =>
        index === pageIndex ? updater(page) : page
      ),
    });
  };

  /**
   * Associe (ou retire) l'image de fond d'une page. À la définition d'une
   * image, la page prend une taille fixe (800px de large, hauteur au ratio
   * de l'image) mesurée au chargement ; au retrait, elle redevient flexible.
   */
  const applyPageBackground = (pageIndex: number, url: string) => {
    if (url) {
      updatePage(pageIndex, (page) => ({
        ...page,
        backgroundImage: url,
      }));
      measureAndFixPageSize(pageIndex, url);
    } else {
      updatePage(pageIndex, (page) => {
        const { backgroundImage, width, height, ...rest } = page;
        return rest as SheetPage;
      });
    }
  };

  /**
   * Mesure l'image de fond et fixe la taille de la page (800px de large,
   * hauteur au ratio). Sans effet si l'image a changé entre-temps, ou
   * si elle ne charge pas.
   */
  const measureAndFixPageSize = (pageIndex: number, url: string) => {
    const img = new Image();
    img.onload = () => {
      const size = fixedPageSize(img.naturalWidth, img.naturalHeight);
      updatePage(pageIndex, (page) =>
        page.backgroundImage === url && (!page.width || !page.height)
          ? { ...page, ...size }
          : page
      );
    };
    img.src = url;
  };

  // Définitions existantes : une page avec image de fond mais sans taille
  // fixe (fiche enregistrée avant cette règle) est mesurée au montage.
  useEffect(() => {
    definition.pages.forEach((page, index) => {
      if (page.backgroundImage && (!page.width || !page.height)) {
        measureAndFixPageSize(index, page.backgroundImage);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.pages]);

  /**
   * Téléverse l'image choisie via l'API éditeur et l'associe à la page
   * en tant que fond.
   */
  const handlePageBackgroundUpload = async (pageIndex: number, file: File) => {
    try {
      const { url } = await uploadsApi.uploadEditorImage(file);
      setPageImageError(null);
      applyPageBackground(pageIndex, url);
    } catch {
      setPageImageError(
        "Impossible de téléverser l'image (PNG, JPG, WebP, GIF, SVG, AVIF, 10 Mo max)."
      );
    }
  };

  const handleAddPage = () => {
    const page = createEmptyPage(`Page ${definition.pages.length + 1}`);
    onChange({ ...definition, pages: [...definition.pages, page] });
    setActivePageIndex(definition.pages.length);
  };

  const handleDeletePage = (pageIndex: number) => {
    const pages = definition.pages.filter((_, index) => index !== pageIndex);
    onChange({
      ...definition,
      pages: pages.length > 0 ? pages : [createEmptyPage('Page 1')],
    });
    setActivePageIndex((prev) => Math.max(0, prev - (pageIndex <= prev ? 1 : 0)));
  };

  // --- Arbre : recherche et mise à jour récursives ---

  const findSection = (
    sections: SheetSection[],
    sectionId: string
  ): SheetSection | null => {
    for (const section of sections) {
      if (section.id === sectionId) return section;
      const found = findSection(
        section.children.filter(isSheetSection),
        sectionId
      );
      if (found) return found;
    }
    return null;
  };

  const updateSectionById = (
    sections: SheetSection[],
    sectionId: string,
    updater: (section: SheetSection) => SheetSection
  ): SheetSection[] =>
    sections.map((section) => {
      const current = section.id === sectionId ? updater(section) : section;
      return {
        ...current,
        children: current.children.map((child) =>
          isSheetSection(child)
            ? updateSectionById([child], sectionId, updater)[0]
            : child
        ),
      };
    });

  const removeSectionFrom = (
    sections: SheetSection[],
    sectionId: string
  ): SheetSection[] =>
    sections
      .filter((section) => section.id !== sectionId)
      .map((section) => ({
        ...section,
        children: section.children.flatMap(
          (child): Array<SheetComponent | SheetSection> =>
            isSheetSection(child)
              ? child.id === sectionId
                ? []
                : removeSectionFrom([child], sectionId)
              : [child]
        ),
      }));

  const updateComponentIn = (
    sections: SheetSection[],
    parentSectionId: string,
    componentId: string,
    updater: (component: SheetComponent) => SheetComponent
  ): SheetSection[] =>
    updateSectionById(sections, parentSectionId, (section) => ({
      ...section,
      children: section.children.map((child) =>
        !isSheetSection(child) && child.id === componentId ? updater(child) : child
      ),
    }));

  const removeComponentIn = (
    sections: SheetSection[],
    parentSectionId: string,
    componentId: string
  ): SheetSection[] =>
    updateSectionById(sections, parentSectionId, (section) => ({
      ...section,
      children: section.children.filter(
        (child) => isSheetSection(child) || child.id !== componentId
      ),
    }));

  const sectionContains = (section: SheetSection, id: string): boolean => {
    if (section.id === id) return true;
    return section.children.some(
      (child) => isSheetSection(child) && sectionContains(child, id)
    );
  };

  /**
   * Localise un élément (composant ou section) dans l'arbre :
   * son parent (null au premier niveau) et son index dans les enfants.
   */
  const findElementLocation = (
    sections: SheetSection[],
    elementId: string,
    parent: SheetSection | null = null
  ): { element: SheetSection | SheetComponent; parent: SheetSection | null; index: number } | null => {
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].id === elementId) {
        return { element: sections[i], parent, index: i };
      }
    }
    for (const section of sections) {
      for (let i = 0; i < section.children.length; i++) {
        const child = section.children[i];
        if (child.id === elementId) {
          return { element: child, parent: section, index: i };
        }
        if (isSheetSection(child)) {
          const found = findElementLocation([child], elementId, section);
          if (found) return found;
        }
      }
    }
    return null;
  };

  const clearDrag = () => {
    setDragItem(null);
    setDropTarget(null);
    // Les aperçus et croissances visuelles étaient pilotés directement
    // dans le DOM : les réinitialiser (le drag peut être annulé sans dépôt).
    previewRefs.current.forEach((el) => {
      el.style.display = 'none';
    });
    canvasRefs.current.forEach((el, id) => {
      const section = activePage
        ? findSection(activePage.sections, id)
        : null;
      el.style.height = `${section?.height ?? FREE_SECTION_DEFAULT_HEIGHT}px`;
    });
  };

  // --- Positionnement libre (layout free) ---

  /**
   * Section libre parente de l'élément traîné, le cas échéant :
   * le drag devient alors un repositionnement libre et non un réordonnancement.
   */
  const draggedFreeParent = (): SheetSection | null => {
    if (!dragItem || !activePage) return null;
    const loc = findElementLocation(activePage.sections, dragItem.id);
    if (!loc?.parent || loc.parent.layout !== 'free') return null;
    return loc.parent;
  };

  /**
   * Bornes du positionnement libre sur une page à taille fixe (image de
   * fond) : le canevas ne peut ni grandir ni se remplir au-delà de la page.
   * Page flexible : pas de bornes.
   */
  const freeCanvasBounds = (
    canvasEl: HTMLElement
  ): { maxHeight?: number; maxWidth?: number } => {
    const page = definition.pages[activePageIndex];
    if (!page?.width || !page.height) return {};
    const pageCanvasEl = canvasEl.closest(
      '[data-testid^="sheet-page-canvas-"]'
    ) as HTMLElement | null;
    if (!pageCanvasEl) return {};
    const canvasRect = canvasEl.getBoundingClientRect();
    const pageRect = pageCanvasEl.getBoundingClientRect();
    return {
      maxHeight: Math.max(
        FREE_SECTION_DEFAULT_HEIGHT,
        page.height - (canvasRect.top - pageRect.top)
      ),
      maxWidth: canvasRect.width,
    };
  };

  /**
   * Pendant le survol : déplace l'aperçu de dépôt et agrandit visuellement
   * le canevas si le pointeur descend sous sa hauteur actuelle.
   * Tout se fait directement dans le DOM : aucun re-render React pendant
   * le drag, sinon le drag natif est interrompu. La persistance n'a lieu
   * qu'au dépôt (applyFreeDrop).
   */
  const updateFreePreview = (
    section: SheetSection,
    canvasEl: HTMLElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = canvasEl.getBoundingClientRect();
    const currentHeight = section.height ?? FREE_SECTION_DEFAULT_HEIGHT;
    const placement = computeFreePlacement({
      pointerTop: clientY - rect.top,
      pointerLeft: clientX - rect.left,
      itemWidth: dragItem?.width ?? 0,
      itemHeight: dragItem?.height ?? 48,
      grabOffsetTop: dragItem?.grabOffsetY ?? 0,
      grabOffsetLeft: dragItem?.grabOffsetX ?? 0,
      currentHeight,
      ...freeCanvasBounds(canvasEl),
    });
    const previewEl = previewRefs.current.get(section.id);
    if (previewEl) {
      previewEl.style.display = 'block';
      previewEl.style.top = `${placement.top}px`;
      previewEl.style.left = `${placement.left}px`;
      previewEl.style.width = `${dragItem?.width ?? 0}px`;
      previewEl.style.height = `${dragItem?.height ?? 48}px`;
    }
    if (placement.height > currentHeight) {
      canvasEl.style.height = `${placement.height}px`;
    }
  };

  /**
   * Dépôt libre : positionne l'élément traîné aux coordonnées du dépôt
   * (ou l'y insère s'il vient d'ailleurs) et agrandit la hauteur du canevas
   * pour contenir le bas de l'élément.
   */
  const applyFreeDrop = (
    section: SheetSection,
    canvasEl: HTMLElement,
    clientX: number,
    clientY: number
  ) => {
    if (!dragItem || !activePage) return;
    const rect = canvasEl.getBoundingClientRect();
    const placement = computeFreePlacement({
      pointerTop: clientY - rect.top,
      pointerLeft: clientX - rect.left,
      itemWidth: dragItem.width,
      itemHeight: dragItem.height,
      grabOffsetTop: dragItem.grabOffsetY,
      grabOffsetLeft: dragItem.grabOffsetX,
      currentHeight: section.height ?? FREE_SECTION_DEFAULT_HEIGHT,
      ...freeCanvasBounds(canvasEl),
    });

    const next: SheetDefinition = JSON.parse(JSON.stringify(definition));
    const page = next.pages[activePageIndex];
    const targetSection = findSection(page.sections, section.id);
    const sourceLoc = findElementLocation(page.sections, dragItem.id);
    if (!targetSection || !sourceLoc) return;
    if (dragItem.kind === 'section') {
      const dragged = sourceLoc.element as SheetSection;
      if (targetSection.id === dragged.id || sectionContains(dragged, targetSection.id)) {
        return;
      }
    }
    let element: SheetComponent | SheetSection;
    if (sourceLoc.parent?.id === targetSection.id) {
      element = sourceLoc.element;
    } else {
      if (sourceLoc.parent) {
        sourceLoc.parent.children.splice(sourceLoc.index, 1);
      } else {
        page.sections.splice(sourceLoc.index, 1);
      }
      const { position, sizeWeight, ...rest } = sourceLoc.element;
      element = rest as SheetComponent | SheetSection;
      targetSection.children.push(element);
    }
    element.position = { top: placement.top, left: placement.left };
    if (placement.height > (targetSection.height ?? FREE_SECTION_DEFAULT_HEIGHT)) {
      targetSection.height = placement.height;
    }
    onChange(next);
    clearDrag();
    // clearDrag réinitialise les hauteurs sur la définition précédente :
    // réappliquer la hauteur finale du canevas concerné.
    canvasEl.style.height = `${
      targetSection.height ?? FREE_SECTION_DEFAULT_HEIGHT
    }px`;
  };

  // --- Redimensionnement libre (poignée coin bas-droit) ---

  /**
   * Met à jour n'importe quel élément (composant ou section) de l'arbre,
   * récursivement, par identifiant.
   */
  const updateChildById = (
    sections: SheetSection[],
    elementId: string,
    updater: (element: SheetComponent | SheetSection) => SheetComponent | SheetSection
  ): SheetSection[] =>
    sections.map((section) => ({
      ...section,
      children: section.children.map((child) => {
        if (child.id === elementId) return updater(child);
        if (isSheetSection(child)) return updateChildById([child], elementId, updater)[0];
        return child;
      }),
    }));

  /**
   * Persiste la taille issue d'un redimensionnement : largeur pour tout
   * élément, hauteur (canevas / hauteur minimale) pour les sections.
   */
  const persistFreeElementSize = (
    elementId: string,
    size: { width: number; height: number }
  ) => {
    if (!activePage) return;
    updatePage(activePageIndex, (page) => ({
      ...page,
      sections: updateChildById(page.sections, elementId, (element) =>
        isSheetSection(element)
          ? { ...element, width: size.width, height: Math.max(size.height, FREE_ELEMENT_MIN_HEIGHT) }
          : { ...element, width: size.width }
      ),
    }));
    resizeState.current = null;
  };

  /**
   * Démarre le redimensionnement d'un enfant libre : la taille est suivie
   * en direct dans le DOM (aucun re-render React pendant le geste) puis
   * persistée au relâchement.
   */
  const startResize = (
    e: React.PointerEvent,
    element: SheetComponent | SheetSection,
    el: HTMLElement
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const isSection = isSheetSection(element);
    const canvasEl = isSection ? canvasRefs.current.get(element.id) : null;
    const startRect = el.getBoundingClientRect();
    const state = {
      id: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: startRect.width,
      startHeight: canvasEl
        ? canvasEl.getBoundingClientRect().height
        : startRect.height,
    };
    resizeState.current = state;

    const onMove = (ev: PointerEvent) => {
      const size = computeFreeResize({
        startWidth: state.startWidth,
        startHeight: state.startHeight,
        pointerDx: ev.clientX - state.startX,
        pointerDy: ev.clientY - state.startY,
      });
      el.style.width = `${size.width}px`;
      if (canvasEl) {
        // Section libre : la hauteur redimensionne son canevas
        canvasEl.style.height = `${size.height}px`;
      } else if (isSection) {
        // Section en flux dans un parent libre : hauteur minimale
        el.style.minHeight = `${size.height}px`;
      }
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const size = computeFreeResize({
        startWidth: state.startWidth,
        startHeight: state.startHeight,
        pointerDx: ev.clientX - state.startX,
        pointerDy: ev.clientY - state.startY,
      });
      persistFreeElementSize(state.id, size);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /**
   * Ajuste la position et le poids de répartition d'un élément inséré
   * dans un conteneur : position de dépôt par défaut dans un canevas
   * libre, poids retiré ; en flux, poids moyen des frères si la section
   * est déjà pondérée, poids retiré sinon.
   */
  const syncElementPositionAfterInsert = (
    element: SheetComponent | SheetSection,
    parentSection: SheetSection | null
  ) => {
    if (parentSection?.layout === 'free') {
      element.position = element.position ?? nextFreePosition(parentSection.children);
      delete element.sizeWeight;
    } else {
      delete element.position;
      const weight = defaultFlowWeight(parentSection?.children ?? []);
      if (weight !== null && element.sizeWeight === undefined) {
        element.sizeWeight = weight;
      } else if (weight === null) {
        delete element.sizeWeight;
      }
    }
  };

  /**
   * Applique le déplacement en cours : insère l'élément traîné
   * avant/après un enfant quelconque, ou en fin d'un conteneur.
   * Les déplacements invalides (section dans elle-même ou une de ses
   * sous-sections, composant au premier niveau) sont ignorés.
   */
  const performDrop = () => {
    if (!dragItem || !dropTarget || !activePage) return;

    const next: SheetDefinition = JSON.parse(JSON.stringify(definition));
    const page = next.pages[activePageIndex];

    if (dropTarget.kind === 'child') {
      if (dropTarget.id === dragItem.id) return;

      const sourceLoc = findElementLocation(page.sections, dragItem.id);
      if (!sourceLoc) return;
      const targetLoc = findElementLocation(page.sections, dropTarget.id);
      if (!targetLoc) return;

      // Un composant ne peut pas devenir frère d'une section de premier niveau
      if (dragItem.kind === 'component' && targetLoc.parent === null) return;

      // Une section ne peut pas être déposée à l'intérieur d'elle-même
      if (dragItem.kind === 'section') {
        const dragged = sourceLoc.element as SheetSection;
        if (targetLoc.parent && (targetLoc.parent.id === dragged.id || sectionContains(dragged, targetLoc.parent.id))) {
          return;
        }
      }

      if (sourceLoc.parent) {
        sourceLoc.parent.children.splice(sourceLoc.index, 1);
      } else {
        page.sections.splice(sourceLoc.index, 1);
      }

      const freshTarget = findElementLocation(page.sections, dropTarget.id);
      if (!freshTarget) return;
      const insertAt = dropTarget.position === 'before' ? freshTarget.index : freshTarget.index + 1;
      if (freshTarget.parent) {
        freshTarget.parent.children.splice(insertAt, 0, sourceLoc.element);
      } else {
        page.sections.splice(insertAt, 0, sourceLoc.element as SheetSection);
      }
      syncElementPositionAfterInsert(sourceLoc.element, freshTarget.parent);
      onChange(next);
      clearDrag();
      return;
    }

    // Dépôt en fin de conteneur
    if (dropTarget.sectionId === null) {
      if (dragItem.kind !== 'section') return;
      const sourceLoc = findElementLocation(page.sections, dragItem.id);
      if (!sourceLoc) return;
      if (sourceLoc.parent) {
        sourceLoc.parent.children.splice(sourceLoc.index, 1);
      } else {
        page.sections.splice(sourceLoc.index, 1);
      }
      page.sections.push(sourceLoc.element as SheetSection);
      delete sourceLoc.element.position;
      onChange(next);
      clearDrag();
      return;
    }

    const sourceLoc = findElementLocation(page.sections, dragItem.id);
    if (!sourceLoc) return;
    const targetSection = findSection(page.sections, dropTarget.sectionId);
    if (!targetSection) return;
    if (dragItem.kind === 'section') {
      const dragged = sourceLoc.element as SheetSection;
      if (targetSection.id === dragged.id || sectionContains(dragged, targetSection.id)) {
        return;
      }
    }

    if (sourceLoc.parent) {
      sourceLoc.parent.children.splice(sourceLoc.index, 1);
    } else {
      page.sections.splice(sourceLoc.index, 1);
    }
    targetSection.children.push(sourceLoc.element);
    syncElementPositionAfterInsert(sourceLoc.element, targetSection);
    onChange(next);
    clearDrag();
  };

  // --- Ajouts (palette : section = composant comme un autre) ---

  /**
   * Prépare un élément fraîchement ajouté à une section : position de
   * dépôt en canevas libre, poids moyen des frères si la section en flux
   * est déjà pondérée, tel quel sinon.
   */
  const prepareAddedChild = (
    element: SheetComponent | SheetSection,
    parent: SheetSection
  ): SheetComponent | SheetSection => {
    if (parent.layout === 'free') {
      return { ...element, position: nextFreePosition(parent.children) };
    }
    const weight = defaultFlowWeight(parent.children);
    return weight !== null ? { ...element, sizeWeight: weight } : element;
  };

  const addToPage = (pageIndex: number, parentSectionId: string | null, type: string) => {
    if (type === 'section') {
      const section = createEmptySection('vertical');
      updatePage(pageIndex, (page) => {
        if (parentSectionId === null) {
          return { ...page, sections: [...page.sections, section] };
        }
        return {
          ...page,
          sections: updateSectionById(page.sections, parentSectionId, (parent) => ({
            ...parent,
            children: [...parent.children, prepareAddedChild(section, parent)],
          })),
        };
      });
    } else {
      if (parentSectionId === null) return;
      const component = createComponent(type as SheetComponentType);
      updatePage(pageIndex, (page) => ({
        ...page,
        sections: updateSectionById(page.sections, parentSectionId, (parent) => ({
          ...parent,
          children: [...parent.children, prepareAddedChild(component, parent)],
        })),
      }));
    }
  };

  // --- Modale de configuration ---

  const closeModal = () => setConfigTarget(null);

  const deleteTarget = () => {
    if (!configTarget || !activePage) return;
    if (configTarget.kind === 'section') {
      updatePage(activePageIndex, (page) => ({
        ...page,
        sections: removeSectionFrom(page.sections, configTarget.sectionId),
      }));
    } else {
      updatePage(activePageIndex, (page) => ({
        ...page,
        sections: removeComponentIn(
          page.sections,
          configTarget.parentSectionId,
          configTarget.componentId
        ),
      }));
    }
    closeModal();
  };

  /**
   * Duplique un élément (composant ou section) : la copie est insérée
   * juste après l'original, au même niveau, avec des identifiants neufs.
   */
  const duplicateElement = (elementId: string) => {
    if (!activePage) return;
    const next: SheetDefinition = JSON.parse(JSON.stringify(definition));
    const page = next.pages[activePageIndex];
    const location = findElementLocation(page.sections, elementId);
    if (!location) return;
    const copy = duplicateSheetElement(location.element);
    if (location.parent) {
      location.parent.children.splice(location.index + 1, 0, copy);
    } else {
      page.sections.splice(location.index + 1, 0, copy as SheetSection);
    }
    onChange(next);
  };

  const renderConfigModal = (): React.ReactNode => {
    if (!configTarget || !activePage) return null;

    const updateTargetSection = (updater: (section: SheetSection) => SheetSection) => {
      if (configTarget.kind !== 'section') return;
      updatePage(activePageIndex, (page) => ({
        ...page,
        sections: updateSectionById(page.sections, configTarget.sectionId, updater),
      }));
    };

    const updateTargetComponent = (
      updater: (component: SheetComponent) => SheetComponent
    ) => {
      if (configTarget.kind !== 'component') return;
      updatePage(activePageIndex, (page) => ({
        ...page,
        sections: updateComponentIn(
          page.sections,
          configTarget.parentSectionId,
          configTarget.componentId,
          updater
        ),
      }));
    };

    const inputClasses =
      'w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400';

    let title = '';
    let body: React.ReactNode = null;

    if (configTarget.kind === 'section') {
      const section = findSection(activePage.sections, configTarget.sectionId);
      if (!section) {
        closeModal();
        return null;
      }
      title = 'Section';
      body = (
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Titre de la section
            </span>
            <input
              type="text"
              value={section.title || ''}
              onChange={(e) => updateTargetSection((s) => ({ ...s, title: e.target.value }))}
              placeholder="Ex: État civil, Compétences..."
              className={inputClasses}
              data-testid="sheet-config-title"
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Disposition
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  updateTargetSection((s) => ({
                    ...s,
                    layout: 'horizontal' as SheetSectionLayout,
                    // La répartition n'a de sens que pour le layout actif
                    children: s.children.map(stripSizeWeight),
                  }))
                }
                data-testid="sheet-config-layout-horizontal"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                  section.layout === 'horizontal'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Columns3 className="w-4 h-4" />
                <span>Horizontale (côte à côte)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTargetSection((s) => ({
                    ...s,
                    layout: 'vertical' as SheetSectionLayout,
                    children: s.children.map(stripSizeWeight),
                  }))
                }
                data-testid="sheet-config-layout-vertical"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                  section.layout === 'vertical'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Rows3 className="w-4 h-4" />
                <span>Verticale (empilée)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTargetSection((s) => ({
                    ...s,
                    layout: 'free' as SheetSectionLayout,
                    height: s.height ?? FREE_SECTION_DEFAULT_HEIGHT,
                    children: assignFreePositions(s.children.map(stripSizeWeight)),
                  }))
                }
                data-testid="sheet-config-layout-free"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                  section.layout === 'free'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Move className="w-4 h-4" />
                <span>Libre (placement manuel)</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Bordure
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span>Épaisseur (px)</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={section.borderWidth ?? ''}
                  placeholder="Défaut"
                  onChange={(e) => {
                    const raw = e.target.value;
                    updateTargetSection((s) => {
                      if (raw === '') {
                        const { borderWidth, ...rest } = s;
                        return rest as SheetSection;
                      }
                      return { ...s, borderWidth: Math.min(10, Math.max(0, parseInt(raw, 10) || 0)) };
                    });
                  }}
                  className="w-24 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-400"
                  data-testid="sheet-config-border-width"
                />
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span>Couleur</span>
                <input
                  type="color"
                  value={section.borderColor || '#94a3b8'}
                  onChange={(e) =>
                    updateTargetSection((s) => ({ ...s, borderColor: e.target.value }))
                  }
                  className="h-8 w-10 rounded-lg border border-slate-200 cursor-pointer bg-white"
                  data-testid="sheet-config-border-color"
                />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Fond
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span>Couleur</span>
                <input
                  type="color"
                  value={section.backgroundColor || '#ffffff'}
                  onChange={(e) =>
                    updateTargetSection((s) => ({ ...s, backgroundColor: e.target.value }))
                  }
                  className="h-8 w-10 rounded-lg border border-slate-200 cursor-pointer bg-white"
                  data-testid="sheet-config-background-color"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  updateTargetSection((s) => {
                    const { backgroundColor, ...rest } = s;
                    return rest as SheetSection;
                  })
                }
                data-testid="sheet-config-background-transparent"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${
                  section.backgroundColor
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    : 'border-indigo-500 bg-indigo-50 text-indigo-700'
                }`}
              >
                Transparent
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      const parent = findSection(activePage.sections, configTarget.parentSectionId);
      const component = parent?.children.find(
        (child) => !isSheetSection(child) && child.id === configTarget.componentId
      ) as SheetComponent | undefined;
      if (!component) {
        closeModal();
        return null;
      }
      title = 'Composant';
      const needsOptions = component.type === 'select' || component.type === 'radio';
      const isScoring = component.type === 'scoring';

      body = (
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Type de composant
            </span>
            <select
              value={component.type}
              onChange={(e) =>
                updateTargetComponent((c) => {
                  const nextType = e.target.value as SheetComponentType;
                  const next: SheetComponent = { ...c, type: nextType };
                  if (nextType === 'select' || nextType === 'radio') {
                    next.options = c.options && c.options.length > 0 ? c.options : ['Option 1'];
                  } else {
                    delete next.options;
                  }
                  if (nextType === 'scoring') {
                    next.max = c.max ?? 5;
                  } else {
                    delete next.max;
                  }
                  return next;
                })
              }
              className={inputClasses}
              data-testid="sheet-config-type"
            >
              {COMPONENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SHEET_COMPONENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          {component.type !== 'label' && (
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Libellé
              </span>
              <input
                type="text"
                value={component.label}
                onChange={(e) => updateTargetComponent((c) => ({ ...c, label: e.target.value }))}
                placeholder="Ex: Nom, Force, Race..."
                className={inputClasses}
                data-testid="sheet-config-label"
              />
            </label>
          )}

          {component.type !== 'label' && (
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Position du libellé
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateTargetComponent((c) => ({ ...c, labelPosition: 'above' }))
                  }
                  data-testid="sheet-config-label-above"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                    component.labelPosition !== 'left'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Au-dessus du champ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateTargetComponent((c) => ({ ...c, labelPosition: 'left' }))
                  }
                  data-testid="sheet-config-label-left"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                    component.labelPosition === 'left'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  À gauche du champ
                </button>
              </div>
            </div>
          )}

          {component.type === 'label' && (
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Texte affiché
              </span>
              <input
                type="text"
                value={component.label}
                onChange={(e) => updateTargetComponent((c) => ({ ...c, label: e.target.value }))}
                placeholder="Ex: Caractéristiques principales"
                className={inputClasses}
                data-testid="sheet-config-label"
              />
            </label>
          )}

          {needsOptions && (
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Options (une par ligne)
              </span>
              <textarea
                value={(component.options || []).join('\n')}
                onChange={(e) =>
                  updateTargetComponent((c) => ({ ...c, options: e.target.value.split('\n') }))
                }
                rows={3}
                className={inputClasses}
                data-testid="sheet-config-options"
              />
            </label>
          )}

          {isScoring && (
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Nombre de points maximum
              </span>
              <input
                type="number"
                min={0}
                value={component.max ?? 5}
                onChange={(e) =>
                  updateTargetComponent((c) => ({
                    ...c,
                    max: Math.max(0, parseInt(e.target.value, 10) || 0),
                  }))
                }
                className={`${inputClasses} w-32`}
                data-testid="sheet-config-max"
              />
            </label>
          )}

          {component.type !== 'label' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Valeur par défaut
                </span>
                <input
                  type={component.type === 'number' || isScoring ? 'number' : 'text'}
                  value={String(component.defaultValue ?? '')}
                  onChange={(e) =>
                    updateTargetComponent((c) => ({
                      ...c,
                      defaultValue:
                        c.type === 'number' || c.type === 'scoring'
                          ? e.target.value === ''
                            ? undefined
                            : Number(e.target.value)
                          : e.target.value,
                    }))
                  }
                  className={inputClasses}
                  data-testid="sheet-config-default"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Texte d'aide (optionnel)
                </span>
                <input
                  type="text"
                  value={component.helpText || ''}
                  onChange={(e) =>
                    updateTargetComponent((c) => ({ ...c, helpText: e.target.value }))
                  }
                  className={inputClasses}
                  data-testid="sheet-config-help"
                />
              </label>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => {
          // Entrée valide la modale (les valeurs s'appliquent en direct)
          // sans jamais soumettre le formulaire de campagne englobant
          if (e.key === 'Enter') {
            e.preventDefault();
            closeModal();
          }
        }}
      >
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          onClick={closeModal}
          data-testid="sheet-config-backdrop"
        />
        <div
          className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto"
          data-testid="sheet-config-modal"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Configuration — {title}
            </h3>
            <button
              type="button"
              onClick={closeModal}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {body}

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={deleteTarget}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition"
              data-testid="sheet-config-delete"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer</span>
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
              data-testid="sheet-config-close"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Aperçus WYSIWYG (mêmes rendus que la feuille finale) ---

  const renderComponentPreview = (
    component: SheetComponent,
    parentSectionId: string,
    layout: SheetSectionLayout
  ): React.ReactNode => {
    const openConfig = () =>
      setConfigTarget({
        kind: 'component',
        parentSectionId,
        componentId: component.id,
      });

    const isDragged = dragItem?.kind === 'component' && dragItem.id === component.id;
    const isDropTarget =
      dropTarget?.kind === 'child' &&
      dropTarget.id === component.id;
    const dropBefore = isDropTarget && dropTarget.position === 'before';
    const isFreeChild = layout === 'free';
    // Drag libre : le dépôt est géré par le canevas de la section parente
    const isFreeDrag = isFreeChild && Boolean(dragItem);

    const inputClasses =
      'w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5';

    let preview: React.ReactNode;
    switch (component.type) {
      case 'textarea':
        preview = <textarea disabled rows={3} className={inputClasses} placeholder="Zone de texte" />;
        break;
      case 'number':
        preview = <input disabled type="number" className={inputClasses} placeholder="0" />;
        break;
      case 'select':
        preview = (
          <select disabled className={inputClasses}>
            <option value="">—</option>
            {(component.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
        break;
      case 'radio':
        preview = (
          <div className="flex flex-wrap gap-3">
            {(component.options || []).map((option) => (
              <span key={option} className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                <input disabled type="radio" className="accent-indigo-600" />
                {option}
              </span>
            ))}
          </div>
        );
        break;
      case 'scoring': {
        const max = component.max ?? 5;
        preview = (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: max }, (_, i) => (
                <span
                  key={i}
                  data-testid={`scoring-dot-${component.id}-${i + 1}`}
                  className="w-3 h-3 rounded-full bg-slate-200"
                />
              ))}
            </div>
          </div>
        );
        break;
      }
      case 'label':
        preview = (
          <p className="text-sm font-semibold text-slate-700">
            {component.label || <span className="italic text-slate-400">Label</span>}
          </p>
        );
        break;
      default:
        preview = <input disabled type="text" className={inputClasses} />;
    }

    const showLabel =
      component.label &&
      component.type !== 'label';

    const isLabelLeft = component.labelPosition === 'left' && component.type !== 'label';

    return (
      <div
        key={component.id}
        ref={(el) => registerChildRef(component.id, el)}
        className={`group relative space-y-1 rounded-xl p-2 cursor-grab active:cursor-grabbing transition ${
          isDragged ? 'opacity-40' : ''
        } ${
          isFreeChild ? 'w-56 bg-white/80 shadow-xs ' : '-m-1 '
        }${
          layout === 'horizontal' && !isFreeChild ? 'flex-1 basis-52 sm:basis-64 min-w-0 ' : ''
        }${isDropTarget ? 'ring-1 ring-indigo-300' : ''} hover:ring-2 hover:ring-indigo-300`}
        style={
          isFreeChild
            ? freeChildStyle(component.position, component.width)
            : component.sizeWeight !== undefined
            ? flowChildStyle(component.sizeWeight)
            : undefined
        }
        draggable
        onDragStart={(e) => {
          // Le redimensionnement et l'étirement ne doivent pas démarrer un drag'n'drop
          if (resizeState.current || flowStretchState.current) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', component.id);
          const rect = childRefs.current.get(component.id)?.getBoundingClientRect();
          setDragItem({
            kind: 'component',
            id: component.id,
            width: rect?.width ?? 0,
            height: rect?.height ?? 48,
            grabOffsetX: rect ? Math.max(0, e.clientX - rect.left) : 0,
            grabOffsetY: rect ? Math.max(0, e.clientY - rect.top) : 0,
          });
          setDropTarget(null);
        }}
        onDragEnd={clearDrag}
        onDragOver={(e) => {
          if (!dragItem || isFreeDrag) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          const rect = e.currentTarget.getBoundingClientRect();
          const before =
            layout === 'horizontal'
              ? e.clientX < rect.left + rect.width / 2
              : e.clientY < rect.top + rect.height / 2;
          setDropTarget({
            kind: 'child',
            id: component.id,
            position: before ? 'before' : 'after',
          });
        }}
        onDrop={(e) => {
          if (isFreeDrag) return;
          e.preventDefault();
          e.stopPropagation();
          performDrop();
        }}
        onClick={openConfig}
        data-testid={`sheet-component-${component.id}`}
      >
        {isDropTarget && (
          layout === 'horizontal' ? (
            <div
              className={`absolute top-1 bottom-1 w-0.5 bg-indigo-500 rounded-full ${
                dropBefore ? 'left-0' : 'right-0'
              }`}
            />
          ) : (
            <div
              className={`absolute left-1 right-1 h-0.5 bg-indigo-500 rounded-full ${
                dropBefore ? 'top-0' : 'bottom-0'
              }`}
            />
          )
        )}
        <div
          className={isLabelLeft ? 'flex items-center gap-2' : 'space-y-1'}
          data-testid={`sheet-field-${component.id}`}
        >
          {showLabel && (
            <label
              className={
                isLabelLeft
                  ? 'w-28 sm:w-32 shrink-0 text-xs font-semibold text-slate-600'
                  : 'block text-xs font-semibold text-slate-600'
              }
            >
              {component.label}
            </label>
          )}
          <div className={isLabelLeft ? 'flex-1 min-w-0 space-y-1' : 'space-y-1'}>
            {preview}
            {component.helpText && (
              <p className="text-[10px] text-slate-400 italic">{component.helpText}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openConfig();
          }}
          className="absolute top-1 right-1 inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 shadow-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
          title="Configurer le composant"
          data-testid={`sheet-component-edit-${component.id}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            duplicateElement(component.id);
          }}
          className="absolute top-1 right-9 inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 shadow-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
          title="Dupliquer le composant"
          data-testid={`sheet-component-duplicate-${component.id}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        {isFreeChild && (
          <div
            onPointerDown={(e) =>
              startResize(
                e,
                component,
                childRefs.current.get(component.id) ??
                  (e.currentTarget.parentElement as HTMLElement)
              )
            }
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize rounded-tl-md bg-indigo-500/80 border border-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
            title="Redimensionner (largeur)"
            data-testid={`resize-component-${component.id}`}
          />
        )}
        {(layout === 'horizontal' || layout === 'vertical') && (
          <div
            onPointerDown={(e) =>
              startFlowStretch(
                e,
                parentSectionId,
                component.id,
                layout === 'horizontal' ? 'x' : 'y'
              )
            }
            className={`absolute bg-indigo-500/80 border border-white rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition z-10 ${
              layout === 'horizontal'
                ? 'top-1/2 -right-2 -translate-y-1/2 w-1.5 h-10 cursor-ew-resize'
                : 'left-1/2 -bottom-2 -translate-x-1/2 h-1.5 w-10 cursor-ns-resize'
            }`}
            title={
              layout === 'horizontal'
                ? 'Étirer (répartir les largeurs des frères)'
                : 'Étirer (répartir les hauteurs des frères)'
            }
            data-testid={`stretch-component-${component.id}`}
          />
        )}
      </div>
    );
  };

  const renderAddControl = (sectionId: string | null): React.ReactNode => (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) {
          addToPage(activePageIndex, sectionId, e.target.value);
          e.target.value = '';
        }
      }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 hover:bg-indigo-50 transition cursor-pointer"
      data-testid={sectionId ? `add-in-section-${sectionId}` : 'add-in-page'}
    >
      <option value="">+ Ajouter (section, champ...)</option>
      {PALETTE.map((entry) => (
        <option key={entry.value} value={entry.value}>
          {entry.label}
        </option>
      ))}
    </select>
  );

  const renderSection = (
    section: SheetSection,
    depth: number,
    stretch = false,
    freeChild = false,
    parentSectionId: string | null = null,
    parentLayout: 'page' | SheetSectionLayout = 'page'
  ): React.ReactNode => {
    const openConfig = () =>
      setConfigTarget({ kind: 'section', sectionId: section.id });

    const borderStyle =
      section.borderWidth !== undefined
        ? {
            borderWidth: `${section.borderWidth}px`,
            borderStyle: 'solid',
            ...(section.borderColor ? { borderColor: section.borderColor } : {}),
          }
        : undefined;
    // Le fond configuré (inline) prime sur les fonds Tailwind par défaut ;
    // en flux pondéré, le poids de répartition pilote le flex
    const sectionStyle = {
      ...borderStyle,
      ...sectionBackgroundStyle(section.backgroundColor),
      ...(freeChild
        ? freeChildStyle(section.position, section.width)
        : !freeChild &&
          (parentLayout === 'horizontal' || parentLayout === 'vertical') &&
          section.sizeWeight !== undefined
        ? flowChildStyle(section.sizeWeight)
        : {}),
    };

    const isFree = section.layout === 'free';
    // La section rend ses enfants en flux pondéré si au moins un enfant
    // a un poids (vertical : conteneur colonne à hauteur figée)
    const hasFlowWeights =
      section.layout !== 'free' && section.children.some((child) => child.sizeWeight !== undefined);
    // Déplacement libre en cours : le dépôt est géré par le canevas libre
    const isFreeDrag = Boolean(dragItem) && Boolean(draggedFreeParent());

    const isDragged = dragItem?.kind === 'section' && dragItem.id === section.id;
    const isHeaderDropTarget =
      dropTarget?.kind === 'child' && dropTarget.id === section.id;
    const isContainerDropTarget =
      dropTarget?.kind === 'container' && dropTarget.sectionId === section.id;

    /**
     * En-tête : titre + actions (poignée de déplacement). En disposition
     * libre, il est superposé en haut du canevas pour que toute la
     * surface de la section (bande d'en-tête comprise) reste
     * positionnable au drag'n'drop.
     */
    const sectionHeader = (
      <div
        className={`flex items-center gap-2 cursor-grab active:cursor-grabbing ${
          isFree ? 'absolute top-1 left-1 right-1' : ''
        }`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', section.id);
          const rect = childRefs.current.get(section.id)?.getBoundingClientRect();
          setDragItem({
            kind: 'section',
            id: section.id,
            width: rect?.width ?? 0,
            height: rect?.height ?? 48,
            grabOffsetX: rect ? Math.max(0, e.clientX - rect.left) : 0,
            grabOffsetY: rect ? Math.max(0, e.clientY - rect.top) : 0,
          });
          setDropTarget(null);
        }}
        onDragEnd={clearDrag}
        onDragOver={(e) => {
          if (!dragItem || isFreeDrag) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          const rect = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < rect.top + rect.height / 2;
          setDropTarget({
            kind: 'child',
            id: section.id,
            position: before ? 'before' : 'after',
          });
        }}
        onDrop={(e) => {
          if (isFreeDrag) return;
          e.preventDefault();
          e.stopPropagation();
          performDrop();
        }}
        data-testid={`section-header-${section.id}`}
      >
        <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        {section.title ? (
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {section.title}
          </h4>
        ) : (
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider italic">
            Section sans titre
          </span>
        )}
        <span
          className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider inline-flex items-center gap-1"
          title={`Disposition : ${
            section.layout === 'horizontal'
              ? 'horizontale'
              : section.layout === 'free'
              ? 'libre'
              : 'verticale'
          }`}
        >
          {section.layout === 'horizontal' ? (
            <Columns3 className="w-3 h-3" />
          ) : section.layout === 'free' ? (
            <Move className="w-3 h-3" />
          ) : (
            <Rows3 className="w-3 h-3" />
          )}
          {section.layout === 'horizontal'
            ? 'Horizontale'
            : section.layout === 'free'
            ? 'Libre'
            : 'Verticale'}
        </span>
        <div className="ml-auto flex items-center gap-1 opacity-40 group-hover/section:opacity-100 transition">
          <button
            type="button"
            onClick={openConfig}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 shadow-xs"
            title="Configurer la section"
            data-testid={`sheet-section-edit-${section.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => duplicateElement(section.id)}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 shadow-xs"
            title="Dupliquer la section"
            data-testid={`sheet-section-duplicate-${section.id}`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              updatePage(activePageIndex, (page) => ({
                ...page,
                sections: removeSectionFrom(page.sections, section.id),
              }))
            }
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 shadow-xs"
            title="Supprimer la section"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );

    return (
      <div
        key={section.id}
        ref={(el) => registerChildRef(section.id, el)}
        className={`group/section rounded-2xl border p-3 sm:p-4 space-y-3 relative ${
          SECTION_CONTAINER_CLASSES[depth % 2]
        } ${depth === 0 ? 'shadow-xs' : ''} ${
          isDragged ? 'opacity-40' : ''
        } ${stretch ? 'flex-1 basis-72 sm:basis-96 min-w-0 self-start' : ''}`}
        style={sectionStyle}
        onDragOver={(e) => {
          if (!dragItem || isFree || (freeChild && isFreeDrag)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          setDropTarget({ kind: 'container', sectionId: section.id });
        }}
        onDrop={(e) => {
          if (isFree || (freeChild && isFreeDrag)) return;
          e.preventDefault();
          e.stopPropagation();
          performDrop();
        }}
        data-testid={`sheet-section-${section.id}`}
      >
        {isHeaderDropTarget && (
          <div
            className={`absolute left-2 right-2 h-0.5 bg-indigo-500 rounded-full ${
              dropTarget.position === 'before' ? 'top-0' : 'bottom-0'
            }`}
          />
        )}

        {/* Flux unique : composants et sous-sections partagent le layout de la section.
            En horizontal, les enfants s'étendent pour remplir l'espace disponible
            et restent sur une seule ligne (ils rétrécissent au lieu de passer dessous).
            En libre, les enfants sont positionnés en absolu dans un canevas
            redimensionnable par le drag'n'drop, couvrant toute la surface
            de la section (l'en-tête y est superposé). */}
        {isFree ? (
          <div
            ref={(el) => registerCanvasRef(section.id, el)}
            className="relative rounded-xl border border-dashed border-slate-300/80"
            style={{ height: section.height ?? FREE_SECTION_DEFAULT_HEIGHT }}
            onDragOver={(e) => {
              if (!dragItem) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              updateFreePreview(section, e.currentTarget, e.clientX, e.clientY);
            }}
            onDrop={(e) => {
              if (!dragItem) return;
              e.preventDefault();
              e.stopPropagation();
              applyFreeDrop(section, e.currentTarget, e.clientX, e.clientY);
            }}
            data-testid={`section-canvas-${section.id}`}
          >
            {sectionHeader}
            {section.children.map((child) =>
              isSheetSection(child)
                ? renderSection(child, depth + 1, false, true, section.id, 'free')
                : renderComponentPreview(child, section.id, 'free')
            )}
            <div
              ref={(el) => registerPreviewRef(section.id, el)}
              className="absolute rounded-xl border-2 border-dashed border-indigo-500 bg-indigo-500/10 pointer-events-none"
              style={{ display: 'none' }}
              data-testid={`free-drop-preview-${section.id}`}
            />
          </div>
        ) : (
          <>
            {sectionHeader}
            <div
              className={
                section.layout === 'horizontal'
                  ? 'flex flex-wrap sm:flex-nowrap gap-3 items-start'
                  : hasFlowWeights
                  ? 'flex flex-col gap-3'
                  : 'grid grid-cols-1 gap-3'
              }
              style={
                section.layout === 'horizontal'
                  ? section.height
                    ? { minHeight: section.height }
                    : undefined
                  : hasFlowWeights
                  ? { height: section.height }
                  : section.height
                  ? { minHeight: section.height }
                  : undefined
              }
              data-testid={`section-children-${section.id}`}
            >
              {section.children.map((child) =>
                isSheetSection(child)
                  ? renderSection(
                      child,
                      depth + 1,
                      section.layout === 'horizontal',
                      false,
                      section.id,
                      section.layout
                    )
                  : renderComponentPreview(child, section.id, section.layout)
              )}
            </div>
          </>
        )}

        {/* Indicateur de dépôt en fin de section */}
        {isContainerDropTarget && (
          <div className="h-1 rounded-full bg-indigo-500/70" />
        )}

        {/* Poignée de redimensionnement (enfants libres uniquement) */}
        {freeChild && (
          <div
            onPointerDown={(e) =>
              startResize(
                e,
                section,
                childRefs.current.get(section.id) ??
                  (e.currentTarget.parentElement as HTMLElement)
              )
            }
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize rounded-tl-md bg-indigo-500/80 border border-white opacity-0 group-hover/section:opacity-100 transition z-10"
            title="Redimensionner (largeur et hauteur)"
            data-testid={`resize-section-${section.id}`}
          />
        )}

        {/* Poignée d'étirement de répartition (enfants de section en flux) */}
        {(parentLayout === 'horizontal' || parentLayout === 'vertical') && parentSectionId && (
          <div
            onPointerDown={(e) =>
              startFlowStretch(
                e,
                parentSectionId,
                section.id,
                parentLayout === 'horizontal' ? 'x' : 'y'
              )
            }
            className={`absolute bg-indigo-500/80 border border-white rounded-full opacity-0 group-hover/section:opacity-100 transition z-20 ${
              parentLayout === 'horizontal'
                ? 'top-1/2 -right-2 -translate-y-1/2 w-1.5 h-10 cursor-ew-resize'
                : 'left-1/2 -bottom-2 -translate-x-1/2 h-1.5 w-10 cursor-ns-resize'
            }`}
            title={
              parentLayout === 'horizontal'
                ? 'Étirer (répartir les largeurs des frères)'
                : 'Étirer (répartir les hauteurs des frères)'
            }
            data-testid={`stretch-section-${section.id}`}
          />
        )}

        {/* Ajout dans la section */}
        <div>{renderAddControl(section.id)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="programmed-sheet-builder">
      {/* Pages */}
      <div className="flex flex-wrap items-center gap-2">
        {definition.pages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setActivePageIndex(index)}
            className={`group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-semibold transition ${
              index === activePageIndex
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            data-testid={`sheet-page-tab-${page.id}`}
          >
            <span>{page.title || `Page ${index + 1}`}</span>
            {definition.pages.length > 1 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePage(index);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    handleDeletePage(index);
                  }
                }}
                className={`ml-1 rounded-full p-0.5 transition ${
                  index === activePageIndex
                    ? 'hover:bg-indigo-500'
                    : 'text-slate-400 hover:bg-slate-200'
                }`}
                title="Supprimer la page"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={handleAddPage}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 transition"
          data-testid="add-sheet-page"
        >
          <Plus className="w-4 h-4" />
          <span>Page</span>
        </button>
      </div>

      {/* Page active : rendu WYSIWYG */}
      {activePage && (
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Titre de la page
            </span>
            <input
              type="text"
              value={activePage.title}
              onChange={(e) =>
                updatePage(activePageIndex, (page) => ({ ...page, title: e.target.value }))
              }
              placeholder="Ex: Identité, Compétences, Inventaire..."
              className="w-full sm:max-w-md text-sm text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
          </label>

          {/* Image de fond de la page : URL directe ou téléversement */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Image de fond de la page
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={activePage.backgroundImage || ''}
                onChange={(e) => applyPageBackground(activePageIndex, e.target.value)}
                placeholder="URL de l'image (https://... ou /files/...)"
                className="flex-1 min-w-0 sm:max-w-md text-sm text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
                data-testid={`sheet-page-background-url-${activePage.id}`}
              />
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl px-2.5 py-2 hover:bg-indigo-50 transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Téléverser</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePageBackgroundUpload(activePageIndex, file);
                    e.currentTarget.value = '';
                  }}
                  data-testid={`sheet-page-background-file-${activePage.id}`}
                />
              </label>
              {activePage.backgroundImage && (
                <button
                  type="button"
                  onClick={() => applyPageBackground(activePageIndex, '')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl px-2.5 py-2 hover:bg-slate-50 transition"
                  data-testid={`sheet-page-background-remove-${activePage.id}`}
                >
                  <X className="w-4 h-4" />
                  <span>Retirer</span>
                </button>
              )}
            </div>
            {pageImageError && (
              <p className="text-xs text-red-600" data-testid="sheet-page-background-error">
                {pageImageError}
              </p>
            )}
          </div>

          <div
            className="rounded-2xl p-3 space-y-3"
            style={{
              ...pageBackgroundStyle(activePage.backgroundImage),
              ...(activePage.width && activePage.height
                ? {
                    width: activePage.width,
                    height: activePage.height,
                    margin: '0 auto',
                  }
                : {}),
            }}
            data-testid={`sheet-page-canvas-${activePage.id}`}
            onDragOver={(e) => {
              const parent = draggedFreeParent();
              if (!dragItem || !parent) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              const canvasEl = canvasRefs.current.get(parent.id);
              if (!canvasEl) return;
              // Le pointeur est hors du canevas : agrandir la section libre
              // pour permettre de placer l'élément plus bas.
              updateFreePreview(parent, canvasEl, e.clientX, e.clientY);
            }}
            onDrop={(e) => {
              const parent = draggedFreeParent();
              if (!dragItem || !parent) return;
              e.preventDefault();
              e.stopPropagation();
              const canvasEl = canvasRefs.current.get(parent.id);
              if (!canvasEl) return;
              applyFreeDrop(parent, canvasEl, e.clientX, e.clientY);
            }}
          >
            {activePage.sections.length > 0 && (
              <div className="space-y-3">
                {activePage.sections.map((section) => renderSection(section, 0))}
              </div>
            )}

            {activePage.sections.length === 0 && (
              <p className="text-xs text-slate-500 italic">
                Ajoutez une première section pour composer la fiche.
              </p>
            )}
          </div>

          {/* Zone de dépôt au premier niveau (uniquement pendant le déplacement d'une section) */}
          {dragItem?.kind === 'section' && (
            <div
              className={`rounded-2xl p-4 text-center text-xs font-semibold transition ${
                dropTarget?.kind === 'container' && dropTarget.sectionId === null
                  ? 'border-2 border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-2 border-dashed border-indigo-300 bg-indigo-50/40 text-indigo-500'
              }`}
              onDragOver={(e) => {
                if (!dragItem || dragItem.kind !== 'section') return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                setDropTarget({ kind: 'container', sectionId: null });
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                performDrop();
              }}
              data-testid="page-drop-zone"
            >
              Déposer ici pour placer la section au premier niveau
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => addToPage(activePageIndex, null, 'section')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs"
              data-testid="add-sheet-section"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une section</span>
            </button>
          </div>
        </div>
      )}

      {renderConfigModal()}
    </div>
  );
};
