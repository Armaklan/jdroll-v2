import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TemplateField,
  TemplateFieldType,
  parseTemplateFields,
  parsePersoFields,
} from '../utils/character-sheet';
import {
  Type,
  List,
  AlignLeft,
  Copy,
  Trash2,
  Move,
  Settings2,
  X,
  Sparkles,
} from 'lucide-react';

export interface CharacterSheetRendererProps {
  mode: 'edit-sheet' | 'fill' | 'read-only';
  // Background configuration
  bgType?: 'image' | 'html';
  templateImg?: string | null;
  templateHtml?: string | null;
  // Fields configuration
  templateFields?: string | null;
  fields?: TemplateField[];
  maxCount?: number;
  onFieldsChange?: (fields: TemplateField[], maxCount: number) => void;
  // Values (for fill & read-only modes)
  persoFields?: string | null;
  values?: Record<string, string>;
  onValuesChange?: (values: Record<string, string>) => void;
  // Optional width
  canvasWidth?: string | number;
}

export const CharacterSheetRenderer: React.FC<CharacterSheetRendererProps> = ({
  mode,
  bgType: initialBgType,
  templateImg,
  templateHtml,
  templateFields: templateFieldsProp,
  fields: controlledFields,
  maxCount: controlledMaxCount,
  onFieldsChange,
  persoFields: persoFieldsProp,
  values: controlledValues,
  onValuesChange,
  canvasWidth,
}) => {
  // Determine actual background type if not explicitly set
  const bgType = initialBgType ?? (templateImg && templateImg.trim() ? 'image' : 'html');

  // Canvas width (default 800px to match standard campaign configuration and old site)
  const effectiveCanvasWidth = canvasWidth
    ? (typeof canvasWidth === 'number' ? `${canvasWidth}px` : canvasWidth)
    : '800px';

  // Fields & MaxCount internal state
  const [internalFields, setInternalFields] = useState<TemplateField[]>(() => {
    if (controlledFields) return controlledFields;
    return parseTemplateFields(templateFieldsProp).fields;
  });
  const [internalMaxCount, setInternalMaxCount] = useState<number>(() => {
    if (controlledMaxCount !== undefined) return controlledMaxCount;
    return parseTemplateFields(templateFieldsProp).maxCount;
  });

  const fields = controlledFields ?? internalFields;
  const maxCount = controlledMaxCount ?? internalMaxCount;

  // Refs to avoid stale closures in window event listeners
  const fieldsRef = useRef<TemplateField[]>(fields);
  fieldsRef.current = fields;
  const maxCountRef = useRef<number>(maxCount);
  maxCountRef.current = maxCount;
  const onFieldsChangeRef = useRef(onFieldsChange);
  onFieldsChangeRef.current = onFieldsChange;

  // Selected field in editor mode
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);

  // Raw options text for smooth editing in dropdown properties
  const [optionsRawText, setOptionsRawText] = useState<string>('');
  const lastSelectedFieldIdRef = useRef<number | null>(null);

  // Flag to prevent trailing click from deselecting field after drag/resize
  const wasDraggingOrResizingRef = useRef<boolean>(false);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Values state (for fill/read-only mode)
  const [internalValues, setInternalValues] = useState<Record<string, string>>(() =>
    parsePersoFields(persoFieldsProp)
  );

  const values = controlledValues ?? internalValues;

  // Sync internal fields if props change
  useEffect(() => {
    if (controlledFields !== undefined) {
      setInternalFields(controlledFields);
    } else if (templateFieldsProp !== undefined) {
      const parsed = parseTemplateFields(templateFieldsProp);
      setInternalFields(parsed.fields);
      setInternalMaxCount(parsed.maxCount);
    }
  }, [controlledFields, templateFieldsProp]);

  useEffect(() => {
    if (controlledMaxCount !== undefined) {
      setInternalMaxCount(controlledMaxCount);
    }
  }, [controlledMaxCount]);

  // Sync options raw text when selected field changes
  useEffect(() => {
    if (selectedFieldId !== lastSelectedFieldIdRef.current) {
      lastSelectedFieldIdRef.current = selectedFieldId;
      const target = fieldsRef.current.find((f) => f.id === selectedFieldId);
      if (target && target.type === 'JDRollEditableSelect') {
        setOptionsRawText(target.options.join(', '));
      } else {
        setOptionsRawText('');
      }
    }
  }, [selectedFieldId, fields]);

  // Sync internal values if prop changes
  useEffect(() => {
    if (persoFieldsProp !== undefined && !controlledValues) {
      setInternalValues(parsePersoFields(persoFieldsProp));
    }
  }, [persoFieldsProp, controlledValues]);

  // Canvas DOM reference
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging & Resizing State for Editor Mode
  const [dragState, setDragState] = useState<{
    fieldId: number;
    startX: number;
    startY: number;
    initialLeft: number;
    initialTop: number;
    currentLeft: number;
    currentTop: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    fieldId: number;
    direction: 'e' | 's' | 'se';
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
    currentWidth: number;
    currentHeight: number;
  } | null>(null);

  // Helper to notify changes in fields
  const updateFields = useCallback(
    (newFields: TemplateField[], newMaxCount?: number) => {
      const updatedMax = newMaxCount !== undefined ? newMaxCount : maxCountRef.current;
      fieldsRef.current = newFields;
      maxCountRef.current = updatedMax;
      if (onFieldsChangeRef.current) {
        onFieldsChangeRef.current(newFields, updatedMax);
      } else {
        setInternalFields(newFields);
        setInternalMaxCount(updatedMax);
      }
    },
    []
  );

  // Helper to update field values (for fill mode)
  const handleValueChange = (linkId: string, val: string) => {
    const nextValues = { ...values, [linkId]: val };
    if (onValuesChange) {
      onValuesChange(nextValues);
    } else {
      setInternalValues(nextValues);
    }
  };

  // Field manipulation in edit-sheet mode
  const handleAddField = (type: TemplateFieldType, dropPosition?: { x: number; y: number }) => {
    const nextId = maxCountRef.current + 1;
    const defaultWidth = type === 'textarea' ? 260 : type === 'JDRollEditableSelect' ? 160 : 160;
    const defaultHeight = type === 'textarea' ? 100 : 36;

    let left = 40;
    let top = 40 + (fieldsRef.current.length % 8) * 45;

    if (dropPosition) {
      left = Math.max(0, Math.round(dropPosition.x - defaultWidth / 2));
      top = Math.max(0, Math.round(dropPosition.y - defaultHeight / 2));
    }

    const newField: TemplateField = {
      id: nextId,
      linkId: `JDRollUserControlLink${nextId}_child`,
      type,
      left,
      top,
      width: defaultWidth,
      height: defaultHeight,
      defaultValue: type === 'JDRollEditableSelect' ? 'Option 1' : '',
      options: type === 'JDRollEditableSelect' ? ['Option 1', 'Option 2', 'Option 3'] : [],
    };

    const newFields = [...fieldsRef.current, newField];
    updateFields(newFields, nextId);
    setSelectedFieldId(nextId);
  };

  const handleDeleteField = (id: number) => {
    const newFields = fieldsRef.current.filter((f) => f.id !== id);
    updateFields(newFields);
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  const handleDuplicateField = (id: number) => {
    const target = fieldsRef.current.find((f) => f.id === id);
    if (!target) return;

    const nextId = maxCountRef.current + 1;
    const duplicated: TemplateField = {
      ...target,
      id: nextId,
      linkId: `JDRollUserControlLink${nextId}_child`,
      left: target.left + 15,
      top: target.top + 15,
      options: [...target.options],
    };

    const newFields = [...fieldsRef.current, duplicated];
    updateFields(newFields, nextId);
    setSelectedFieldId(nextId);
  };

  const handleUpdateFieldProperty = (id: number, patch: Partial<TemplateField>) => {
    const newFields = fieldsRef.current.map((f) => (f.id === id ? { ...f, ...patch } : f));
    updateFields(newFields);
  };

  // Drag on Canvas handler
  const handleCanvasDragOver = (e: React.DragEvent) => {
    if (mode !== 'edit-sheet') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    if (mode !== 'edit-sheet' || !canvasRef.current) return;
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain') as TemplateFieldType;
    if (!type) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    handleAddField(type, { x, y });
  };

  // Mouse Move & Up Listeners for Dragging / Resizing
  useEffect(() => {
    if (mode !== 'edit-sheet') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;

        const newLeft = Math.max(0, Math.round(dragState.initialLeft + deltaX));
        const newTop = Math.max(0, Math.round(dragState.initialTop + deltaY));

        setDragState((prev) => (prev ? { ...prev, currentLeft: newLeft, currentTop: newTop } : null));
      } else if (resizeState) {
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;

        let newWidth = resizeState.initialWidth;
        let newHeight = resizeState.initialHeight;

        if (resizeState.direction === 'e' || resizeState.direction === 'se') {
          newWidth = Math.max(30, Math.round(resizeState.initialWidth + deltaX));
        }
        if (resizeState.direction === 's' || resizeState.direction === 'se') {
          newHeight = Math.max(20, Math.round(resizeState.initialHeight + deltaY));
        }

        setResizeState((prev) =>
          prev ? { ...prev, currentWidth: newWidth, currentHeight: newHeight } : null
        );
      }
    };

    const handleMouseUp = () => {
      if (dragState) {
        const finalLeft = dragState.currentLeft;
        const finalTop = dragState.currentTop;
        const targetId = dragState.fieldId;
        const updatedFields = fieldsRef.current.map((f) =>
          f.id === targetId ? { ...f, left: finalLeft, top: finalTop } : f
        );
        updateFields(updatedFields);
        setSelectedFieldId(targetId);
        setDragState(null);
        wasDraggingOrResizingRef.current = true;
        if (interactionTimeoutRef.current) {
          clearTimeout(interactionTimeoutRef.current);
        }
        interactionTimeoutRef.current = setTimeout(() => {
          wasDraggingOrResizingRef.current = false;
        }, 200);
      } else if (resizeState) {
        const finalWidth = resizeState.currentWidth;
        const finalHeight = resizeState.currentHeight;
        const targetId = resizeState.fieldId;
        const updatedFields = fieldsRef.current.map((f) =>
          f.id === targetId ? { ...f, width: finalWidth, height: finalHeight } : f
        );
        updateFields(updatedFields);
        setSelectedFieldId(targetId);
        setResizeState(null);
        wasDraggingOrResizingRef.current = true;
        if (interactionTimeoutRef.current) {
          clearTimeout(interactionTimeoutRef.current);
        }
        interactionTimeoutRef.current = setTimeout(() => {
          wasDraggingOrResizingRef.current = false;
        }, 200);
      }
    };

    if (dragState || resizeState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [mode, dragState, resizeState, updateFields]);

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;
  const currentSelectedLeft =
    selectedField && dragState && dragState.fieldId === selectedField.id
      ? dragState.currentLeft
      : selectedField?.left || 0;
  const currentSelectedTop =
    selectedField && dragState && dragState.fieldId === selectedField.id
      ? dragState.currentTop
      : selectedField?.top || 0;
  const currentSelectedWidth =
    selectedField && resizeState && resizeState.fieldId === selectedField.id
      ? resizeState.currentWidth
      : selectedField?.width || 0;
  const currentSelectedHeight =
    selectedField && resizeState && resizeState.fieldId === selectedField.id
      ? resizeState.currentHeight
      : selectedField?.height || 0;

  return (
    <div className="space-y-4">
      {/* 1. Control Palette & Active Field Toolbar (Only in edit-sheet mode) */}
      {mode === 'edit-sheet' && (
        <div className="character-sheet-toolbar bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Glisser un champ sur la fiche :
              </span>
              <div className="flex items-center gap-2">
                <div
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', 'text')}
                  onClick={() => handleAddField('text')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-grab active:cursor-grabbing transition shadow-xs select-none"
                  title="Cliquer ou glisser pour ajouter un champ texte"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Champ texte</span>
                </div>

                <div
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', 'JDRollEditableSelect')}
                  onClick={() => handleAddField('JDRollEditableSelect')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-grab active:cursor-grabbing transition shadow-xs select-none"
                  title="Cliquer ou glisser pour ajouter une liste déroulante"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Liste déroulante</span>
                </div>

                <div
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', 'textarea')}
                  onClick={() => handleAddField('textarea')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white cursor-grab active:cursor-grabbing transition shadow-xs select-none"
                  title="Cliquer ou glisser pour ajouter une zone de texte multiligne"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Zone de texte</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              {fields.length} {fields.length > 1 ? 'contrôles positionnés' : 'contrôle positionné'}
            </div>
          </div>

          {/* Selected Field Quick Properties Panel */}
          {selectedField && (
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 text-xs space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <Settings2 className="w-4 h-4 text-indigo-400" />
                  <span>
                    Propriétés du champ #{selectedField.id} ({selectedField.type === 'textarea' ? 'Zone de texte' : selectedField.type === 'JDRollEditableSelect' ? 'Liste déroulante' : 'Champ texte'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateField(selectedField.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                    title="Dupliquer ce contrôle"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Dupliquer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteField(selectedField.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 transition cursor-pointer"
                    title="Supprimer ce contrôle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFieldId(null)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                    title="Fermer le panneau de propriétés"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                {/* Default value */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-300 font-medium">Contenu par défaut :</label>
                  <input
                    type="text"
                    value={selectedField.defaultValue}
                    onChange={(e) => handleUpdateFieldProperty(selectedField.id, { defaultValue: e.target.value })}
                    placeholder="Valeur initiale / par défaut..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Left (X) */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Position X (px) :</label>
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    value={currentSelectedLeft}
                    onChange={(e) => handleUpdateFieldProperty(selectedField.id, { left: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Top (Y) */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Position Y (px) :</label>
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    value={currentSelectedTop}
                    onChange={(e) => handleUpdateFieldProperty(selectedField.id, { top: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Width */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Largeur (px) :</label>
                  <input
                    type="number"
                    min={20}
                    max={2000}
                    value={currentSelectedWidth}
                    onChange={(e) => handleUpdateFieldProperty(selectedField.id, { width: Math.max(20, parseInt(e.target.value) || 20) })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Height */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Hauteur (px) :</label>
                  <input
                    type="number"
                    min={20}
                    max={2000}
                    value={currentSelectedHeight}
                    onChange={(e) => handleUpdateFieldProperty(selectedField.id, { height: Math.max(20, parseInt(e.target.value) || 20) })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Options for JDRollEditableSelect */}
              {selectedField.type === 'JDRollEditableSelect' && (
                <div className="space-y-1.5 pt-1 border-t border-slate-700/60">
                  <label className="text-slate-300 font-medium flex items-center justify-between">
                    <span>Options de la liste (séparées par des virgules) :</span>
                    <span className="text-[11px] text-slate-400">ex: Guerrier, Voleur, Magicien</span>
                  </label>
                  <input
                    type="text"
                    value={optionsRawText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOptionsRawText(val);
                      const opts = val
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0);
                      handleUpdateFieldProperty(selectedField.id, { options: opts });
                    }}
                    placeholder="Option 1, Option 2, Option 3..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Main Sheet Canvas Container */}
      <div className="w-full overflow-x-auto bg-slate-100 rounded-2xl border border-slate-300 shadow-inner p-2 sm:p-4">
        <div
          ref={canvasRef}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onClick={(e) => {
            if (wasDraggingOrResizingRef.current) return;
            const target = e.target as HTMLElement;
            if (
              target.closest('.character-sheet-field') ||
              target.closest('.resize-handle') ||
              target.closest('.character-sheet-toolbar')
            ) {
              return;
            }
            setSelectedFieldId(null);
          }}
          style={{
            position: 'relative',
            width: effectiveCanvasWidth,
            minHeight: '600px',
          }}
          className="bg-white rounded-xl shadow-xs overflow-hidden mx-auto select-none"
        >
          {/* Background Layer */}
          {bgType === 'image' ? (
            templateImg && templateImg.trim() ? (
              <img
                src={templateImg}
                alt="Fond de la fiche de personnage"
                className="w-full h-auto block pointer-events-none"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
                <Sparkles className="w-10 h-10 mb-2 text-slate-300" />
                <p className="text-sm font-medium">Aucune image de fond spécifiée</p>
                <p className="text-xs text-slate-400 mt-1">Définissez l'URL d'une image ou uploadez-en une.</p>
              </div>
            )
          ) : templateHtml && templateHtml.trim() ? (
            <div
              className="p-4 wysiwyg-content min-h-[500px]"
              dangerouslySetInnerHTML={{ __html: templateHtml }}
            />
          ) : (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
              <Sparkles className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm font-medium">Aucun gabarit HTML spécifié</p>
              <p className="text-xs text-slate-400 mt-1">Configurez le contenu HTML WYSIWYG de votre fiche.</p>
            </div>
          )}

          {/* Fields Layer */}
          {fields.map((field) => {
            const isSelected = selectedFieldId === field.id && mode === 'edit-sheet';
            const fieldValue = values[field.linkId] !== undefined ? values[field.linkId] : field.defaultValue;

            if (mode === 'edit-sheet') {
              // MODE: EDIT SHEET (Campaign Configuration)
              const isDraggingThis = dragState !== null && dragState.fieldId === field.id;
              const isResizingThis = resizeState !== null && resizeState.fieldId === field.id;

              const renderLeft = isDraggingThis ? dragState.currentLeft : field.left;
              const renderTop = isDraggingThis ? dragState.currentTop : field.top;
              const renderWidth = isResizingThis ? resizeState.currentWidth : field.width;
              const renderHeight = isResizingThis ? resizeState.currentHeight : field.height;

              return (
                <div
                  key={field.id}
                  id={`JDRollUserControl_${field.id}`}
                  style={{
                    position: 'absolute',
                    top: `${renderTop}px`,
                    left: `${renderLeft}px`,
                    width: `${renderWidth}px`,
                    height: `${renderHeight}px`,
                    zIndex: isSelected ? 50 : 20,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFieldId(field.id);
                  }}
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedFieldId(field.id);
                    setDragState({
                      fieldId: field.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialLeft: field.left,
                      initialTop: field.top,
                      currentLeft: field.left,
                      currentTop: field.top,
                    });
                  }}
                  className={`character-sheet-field group rounded border transition-shadow cursor-move flex items-center justify-center select-none ${
                    isSelected
                      ? 'border-2 border-indigo-600 bg-indigo-50/80 shadow-lg ring-2 ring-indigo-300'
                      : 'border border-dashed border-slate-700 bg-white/85 hover:bg-white hover:border-slate-900 shadow-xs'
                  }`}
                >
                  <div className="w-full h-full p-1 flex items-center justify-center text-center overflow-hidden pointer-events-none select-none">
                    {field.type === 'textarea' ? (
                      <span className="text-xs text-slate-800 line-clamp-3 whitespace-pre-wrap font-sans">
                        {field.defaultValue || <span className="text-slate-400 italic">Zone de texte</span>}
                      </span>
                    ) : field.type === 'JDRollEditableSelect' ? (
                      <span className="text-xs font-semibold text-emerald-800 truncate px-1">
                        {field.defaultValue || <span className="text-slate-400 italic">Liste déroulante</span>}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-800 truncate px-1">
                        {field.defaultValue || <span className="text-slate-400 italic">Champ texte</span>}
                      </span>
                    )}
                  </div>

                  {/* Move tag handle */}
                  {isSelected && (
                    <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 pointer-events-none select-none">
                      <Move className="w-2.5 h-2.5" />
                      <span>#{field.id}</span>
                    </div>
                  )}

                  {/* Resize Handles (e, s, se) */}
                  {isSelected && (
                    <>
                      {/* East (Right) Handle */}
                      <div
                        className="resize-handle absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-6 bg-indigo-600 hover:bg-indigo-700 rounded-xs cursor-ew-resize shadow-md z-30 border border-white"
                        title="Redimensionner la largeur"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizeState({
                            fieldId: field.id,
                            direction: 'e',
                            startX: e.clientX,
                            startY: e.clientY,
                            initialWidth: field.width,
                            initialHeight: field.height,
                            currentWidth: field.width,
                            currentHeight: field.height,
                          });
                        }}
                      />
                      {/* South (Bottom) Handle */}
                      <div
                        className="resize-handle absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-indigo-600 hover:bg-indigo-700 rounded-xs cursor-ns-resize shadow-md z-30 border border-white"
                        title="Redimensionner la hauteur"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizeState({
                            fieldId: field.id,
                            direction: 's',
                            startX: e.clientX,
                            startY: e.clientY,
                            initialWidth: field.width,
                            initialHeight: field.height,
                            currentWidth: field.width,
                            currentHeight: field.height,
                          });
                        }}
                      />
                      {/* South-East (Corner) Handle */}
                      <div
                        className="resize-handle absolute -right-2 -bottom-2 w-4 h-4 bg-indigo-700 hover:bg-indigo-800 rounded-xs cursor-nwse-resize shadow-md z-30 border-2 border-white flex items-center justify-center"
                        title="Redimensionner largeur et hauteur"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizeState({
                            fieldId: field.id,
                            direction: 'se',
                            startX: e.clientX,
                            startY: e.clientY,
                            initialWidth: field.width,
                            initialHeight: field.height,
                            currentWidth: field.width,
                            currentHeight: field.height,
                          });
                        }}
                      />
                    </>
                  )}
                </div>
              );
            }

            if (mode === 'fill') {
              // MODE: FILL (Character Form / Player Edition)
              return (
                <div
                  key={field.id}
                  id={`JDRollUserControl_${field.id}`}
                  style={{
                    position: 'absolute',
                    top: `${field.top}px`,
                    left: `${field.left}px`,
                    width: `${field.width}px`,
                    height: `${field.height}px`,
                    zIndex: 20,
                  }}
                  className="overflow-hidden"
                >
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.linkId}
                      value={fieldValue}
                      onChange={(e) => handleValueChange(field.linkId, e.target.value)}
                      placeholder={field.defaultValue || 'Saisir du texte...'}
                      className="w-full h-full p-1.5 bg-white/95 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 rounded text-xs text-slate-900 leading-tight resize-none shadow-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  ) : field.type === 'JDRollEditableSelect' ? (
                    <select
                      id={field.linkId}
                      value={fieldValue}
                      onChange={(e) => handleValueChange(field.linkId, e.target.value)}
                      className="w-full h-full px-2 bg-white/95 hover:bg-white focus:bg-white border border-slate-300 focus:border-emerald-500 rounded text-xs text-slate-900 font-medium shadow-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      <option value="">-- Choisir --</option>
                      {field.options.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      id={field.linkId}
                      value={fieldValue}
                      onChange={(e) => handleValueChange(field.linkId, e.target.value)}
                      placeholder={field.defaultValue || ''}
                      className="w-full h-full px-2 bg-white/95 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 rounded text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  )}
                </div>
              );
            }

            // MODE: READ-ONLY (Character View for MJ / Player)
            return (
              <div
                key={field.id}
                id={`JDRollUserControl_${field.id}`}
                style={{
                  position: 'absolute',
                  top: `${field.top}px`,
                  left: `${field.left}px`,
                  width: `${field.width}px`,
                  height: `${field.height}px`,
                  zIndex: 20,
                }}
                className="overflow-hidden p-1 flex items-center bg-white/80 backdrop-blur-xs rounded border border-slate-200/60 shadow-xs"
              >
                {field.type === 'textarea' ? (
                  <div className="w-full h-full text-xs text-slate-800 whitespace-pre-wrap leading-tight overflow-y-auto">
                    {fieldValue || <span className="text-slate-300 italic">-</span>}
                  </div>
                ) : field.type === 'JDRollEditableSelect' ? (
                  <span className="text-xs font-semibold text-emerald-950 truncate px-1">
                    {fieldValue || <span className="text-slate-300 italic">-</span>}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-900 truncate px-1">
                    {fieldValue || <span className="text-slate-300 italic">-</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
