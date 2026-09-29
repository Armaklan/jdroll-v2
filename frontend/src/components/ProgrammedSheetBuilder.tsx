import React, { useState } from 'react';
import {
  SheetComponent,
  SheetComponentType,
  SheetDefinition,
  SheetPage,
  SheetSection,
  SheetSectionLayout,
} from '../types/campaign';
import {
  SHEET_COMPONENT_TYPE_LABELS,
  createComponent,
  createEmptyPage,
  createEmptySection,
  isSheetSection,
} from '../utils/programmed-sheet';
import {
  Plus,
  Trash2,
  Columns3,
  Rows3,
  Pencil,
  X,
  GripVertical,
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
 * Élément en cours de glisser-déposer.
 */
type DragItem = { kind: 'component' | 'section'; id: string };

/**
 * Cible de dépôt : avant/après un enfant quelconque (composant ou section),
 * ou en fin de conteneur (section ou premier niveau).
 */
type DropTarget =
  | { kind: 'child'; id: string; position: 'before' | 'after' }
  | { kind: 'container'; sectionId: string | null };

const SECTION_CONTAINER_CLASSES = ['border-slate-200 bg-slate-50/60', 'border-slate-100 bg-white'];

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

  const activePage: SheetPage | undefined = definition.pages[activePageIndex];

  const updatePage = (pageIndex: number, updater: (page: SheetPage) => SheetPage) => {
    onChange({
      ...definition,
      pages: definition.pages.map((page, index) =>
        index === pageIndex ? updater(page) : page
      ),
    });
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
    onChange(next);
    clearDrag();
  };

  // --- Ajouts (palette : section = composant comme un autre) ---

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
            children: [...parent.children, section],
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
          children: [...parent.children, component],
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
                  updateTargetSection((s) => ({ ...s, layout: 'horizontal' as SheetSectionLayout }))
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
                  updateTargetSection((s) => ({ ...s, layout: 'vertical' as SheetSectionLayout }))
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
                />
              </label>
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
        className={`group relative space-y-1 rounded-xl p-2 -m-1 cursor-grab active:cursor-grabbing transition ${
          isDragged ? 'opacity-40' : ''
        } ${
          layout === 'horizontal' ? 'flex-1 basis-52 sm:basis-64 min-w-0 ' : ''
        }${isDropTarget ? 'ring-1 ring-indigo-300' : ''} hover:ring-2 hover:ring-indigo-300`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', component.id);
          setDragItem({ kind: 'component', id: component.id });
          setDropTarget(null);
        }}
        onDragEnd={clearDrag}
        onDragOver={(e) => {
          if (!dragItem) return;
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
    stretch = false
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

    const isDragged = dragItem?.kind === 'section' && dragItem.id === section.id;
    const isHeaderDropTarget =
      dropTarget?.kind === 'child' && dropTarget.id === section.id;
    const isContainerDropTarget =
      dropTarget?.kind === 'container' && dropTarget.sectionId === section.id;

    return (
      <div
        key={section.id}
        className={`group/section rounded-2xl border p-3 sm:p-4 space-y-3 relative ${
          SECTION_CONTAINER_CLASSES[depth % 2]
        } ${depth === 0 ? 'shadow-xs' : ''} ${
          isDragged ? 'opacity-40' : ''
        } ${stretch ? 'flex-1 basis-72 sm:basis-96 min-w-0 self-start' : ''}`}
        style={borderStyle}
        onDragOver={(e) => {
          if (!dragItem) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          setDropTarget({ kind: 'container', sectionId: section.id });
        }}
        onDrop={(e) => {
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

        {/* En-tête : titre + actions (poignée de déplacement) */}
        <div
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', section.id);
            setDragItem({ kind: 'section', id: section.id });
            setDropTarget(null);
          }}
          onDragEnd={clearDrag}
          onDragOver={(e) => {
            if (!dragItem) return;
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
            title={`Disposition : ${section.layout === 'horizontal' ? 'horizontale' : 'verticale'}`}
          >
            {section.layout === 'horizontal' ? (
              <Columns3 className="w-3 h-3" />
            ) : (
              <Rows3 className="w-3 h-3" />
            )}
            {section.layout === 'horizontal' ? 'Horizontale' : 'Verticale'}
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

        {/* Flux unique : composants et sous-sections partagent le layout de la section.
            En horizontal, les enfants s'étendent pour remplir l'espace disponible
            et restent sur une seule ligne (ils rétrécissent au lieu de passer dessous). */}
        <div
          className={
            section.layout === 'horizontal'
              ? 'flex flex-wrap sm:flex-nowrap gap-3 items-start'
              : 'grid grid-cols-1 gap-3'
          }
          data-testid={`section-children-${section.id}`}
        >
          {section.children.map((child) =>
            isSheetSection(child)
              ? renderSection(child, depth + 1, section.layout === 'horizontal')
              : renderComponentPreview(child, section.id, section.layout)
          )}
        </div>

        {/* Indicateur de dépôt en fin de section */}
        {isContainerDropTarget && (
          <div className="h-1 rounded-full bg-indigo-500/70" />
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
