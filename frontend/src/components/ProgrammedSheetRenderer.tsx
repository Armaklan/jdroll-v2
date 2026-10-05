import React, { useState } from 'react';
import { SheetDefinition, SheetSection, SheetComponent } from '../types/campaign';
import {
  FREE_SECTION_DEFAULT_HEIGHT,
  SheetValues,
  flowChildStyle,
  freeChildStyle,
  isSheetSection,
  pageBackgroundStyle,
  sectionBackgroundStyle,
} from '../utils/programmed-sheet';

interface ProgrammedSheetRendererProps {
  definition: SheetDefinition | null;
  values: SheetValues;
  mode?: 'read-only' | 'fill';
  onValuesChange?: (values: SheetValues) => void;
}

const EMPTY_VALUES: SheetValues = {};

export const ProgrammedSheetRenderer: React.FC<ProgrammedSheetRendererProps> = ({
  definition,
  values = EMPTY_VALUES,
  mode = 'read-only',
  onValuesChange,
}) => {
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const isReadOnly = mode === 'read-only';

  if (!definition || definition.pages.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic">
        Aucune fiche programmée définie pour cette campagne.
      </p>
    );
  }

  const activePage = definition.pages[activePageIndex] || definition.pages[0];

  const setValue = (component: SheetComponent, value: string | number) => {
    if (!onValuesChange) return;
    onValuesChange({ ...values, [component.id]: value });
  };

  const getValue = (component: SheetComponent): string | number => {
    if (values[component.id] !== undefined && values[component.id] !== null) {
      return values[component.id];
    }
    if (component.defaultValue !== undefined && component.defaultValue !== null) {
      return component.defaultValue;
    }
    return component.type === 'scoring' || component.type === 'number' ? 0 : '';
  };

  const renderScoring = (component: SheetComponent) => {
    const max = component.max ?? 5;
    const current = Number(getValue(component)) || 0;

    if (isReadOnly) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: max }, (_, i) => (
              <span
                key={i}
                data-testid={`scoring-dot-${component.id}-${i + 1}`}
                className={`w-3 h-3 rounded-full ${
                  i < current ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => {
            const value = i + 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setValue(component, current === value ? i : value)}
                data-testid={`scoring-dot-${component.id}-${value}`}
                className={`w-3 h-3 rounded-full transition ${
                  i < current
                    ? 'bg-indigo-600 hover:bg-indigo-500'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={`${value} point${value > 1 ? 's' : ''}`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderComponent = (
    component: SheetComponent,
    stretch = false,
    freeChild = false
  ): React.ReactNode => {
    if (component.type === 'label' && !freeChild) {
      return (
        <p className="text-sm font-semibold text-slate-700">{component.label}</p>
      );
    }

    const value = getValue(component);
    const inputClasses =
      'w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-400 disabled:bg-slate-50';

    let input: React.ReactNode;
    switch (component.type) {
      case 'textarea':
        input = isReadOnly ? (
          <p className="text-sm text-slate-800 whitespace-pre-wrap min-h-[1.5rem]">
            {String(value) || '—'}
          </p>
        ) : (
          <textarea
            value={String(value)}
            onChange={(e) => setValue(component, e.target.value)}
            rows={3}
            className={inputClasses}
          />
        );
        break;
      case 'number':
        input = isReadOnly ? (
          <span className="text-sm font-semibold text-slate-800">{String(value) || '—'}</span>
        ) : (
          <input
            type="number"
            value={String(value)}
            onChange={(e) => setValue(component, e.target.value === '' ? '' : Number(e.target.value))}
            className={inputClasses}
          />
        );
        break;
      case 'select':
        input = isReadOnly ? (
          <span className="text-sm text-slate-800">{String(value) || '—'}</span>
        ) : (
          <select
            value={String(value)}
            onChange={(e) => setValue(component, e.target.value)}
            className={inputClasses}
          >
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
        input = (
          <div className="flex flex-wrap gap-3">
            {(component.options || []).map((option) =>
              isReadOnly ? (
                <span
                  key={option}
                  className={`text-sm ${String(value) === option ? 'font-bold text-indigo-700' : 'text-slate-600'}`}
                >
                  {String(value) === option ? '◉' : '○'} {option}
                </span>
              ) : (
                <label key={option} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`radio-${component.id}`}
                    checked={String(value) === option}
                    onChange={() => setValue(component, option)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700">{option}</span>
                </label>
              )
            )}
          </div>
        );
        break;
      case 'scoring':
        input = renderScoring(component);
        break;
      case 'label':
        input = (
          <p className="text-sm font-semibold text-slate-700">{component.label}</p>
        );
        break;
      default:
        input = isReadOnly ? (
          <span className="text-sm text-slate-800">{String(value) || '—'}</span>
        ) : (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => setValue(component, e.target.value)}
            className={inputClasses}
          />
        );
    }

    const isLabelLeft = component.labelPosition === 'left';
    const showLabel = Boolean(component.label);

    return (
      <div
        className={`${
          stretch && !freeChild ? 'flex-1 basis-52 sm:basis-64 min-w-0 ' : ''
        }${
          freeChild ? 'w-56' : ''
        }${isLabelLeft ? 'flex items-center gap-2' : 'space-y-1'}`}
        style={
          freeChild
            ? freeChildStyle(component.position, component.width)
            : component.sizeWeight !== undefined
            ? flowChildStyle(component.sizeWeight)
            : undefined
        }
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
          {input}
          {component.helpText && (
            <p className="text-[10px] text-slate-400 italic">{component.helpText}</p>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (
    section: SheetSection,
    depth: number,
    stretch = false,
    freeChild = false
  ): React.ReactNode => {
    const horizontal = section.layout === 'horizontal';
    const isFree = section.layout === 'free';

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
      ...(freeChild ? freeChildStyle(section.position, section.width) : {}),
      ...(!freeChild && section.sizeWeight !== undefined
        ? flowChildStyle(section.sizeWeight)
        : {}),
    };
    // En flux vertical pondéré, les enfants se répartissent une hauteur figée
    const hasFlowWeights =
      !isFree && section.children.some((child) => child.sizeWeight !== undefined);

    return (
      <div
        className={`rounded-2xl border p-3 sm:p-4 space-y-3 ${
          depth % 2 === 0 ? 'border-slate-200 bg-slate-50/60' : 'border-slate-100 bg-white'
        } ${stretch && !freeChild ? 'flex-1 basis-72 sm:basis-96 min-w-0 self-start' : ''}`}
        style={sectionStyle}
        data-testid={`sheet-view-section-${section.id}`}
      >
        {isFree ? (
          <div
            className="relative rounded-xl border border-dashed border-slate-200"
            style={{ height: section.height ?? FREE_SECTION_DEFAULT_HEIGHT }}
            data-testid={`sheet-view-canvas-${section.id}`}
          >
            {/* Le titre est superposé en haut du canevas : toute la surface
                de la section (bande de titre comprise) est positionnable,
                comme dans le constructeur. */}
            {section.title && (
              <h4 className="absolute top-1 left-1 right-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                {section.title}
              </h4>
            )}
            {section.children.map((child) =>
              isSheetSection(child)
                ? renderSection(child, depth + 1, false, true)
                : renderComponent(child, false, true)
            )}
          </div>
        ) : (
          <>
            {section.title && (
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {section.title}
              </h4>
            )}
            <div
              className={
                horizontal
                  ? 'flex flex-wrap sm:flex-nowrap gap-3 items-start'
                  : hasFlowWeights
                  ? 'flex flex-col gap-3'
                  : 'grid grid-cols-1 gap-3'
              }
              style={
                horizontal
                  ? section.height
                    ? { minHeight: section.height }
                    : undefined
                  : hasFlowWeights
                  ? { height: section.height }
                  : section.height
                  ? { minHeight: section.height }
                  : undefined
              }
              data-testid={`sheet-view-children-${section.id}`}
            >
              {section.children.map((child) =>
                isSheetSection(child)
                  ? renderSection(child, depth + 1, horizontal)
                  : renderComponent(child, horizontal)
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="no-swipe space-y-4" data-testid="programmed-sheet-renderer">
      {definition.pages.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-2">
          {definition.pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setActivePageIndex(index)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                index === activePageIndex
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {page.title || `Page ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      <div
        className="space-y-3"
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
        data-testid={`sheet-view-page-${activePage.id}`}
      >
        {activePage.sections.map((section) => renderSection(section, 0))}
      </div>
    </div>
  );
};
