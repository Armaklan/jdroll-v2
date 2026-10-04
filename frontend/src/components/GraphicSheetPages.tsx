import React, { useState } from 'react';
import { CharacterSheetRenderer } from './CharacterSheetRenderer';
import { parseGraphicSheetPages } from '../utils/graphic-sheet-pages';
import { Layers } from 'lucide-react';

export interface GraphicSheetPagesProps {
  mode: 'fill' | 'read-only';
  /** Document JSON multi-pages de la campagne (campagne_config.sheet_pages) */
  sheetPages?: string | null;
  /** Colonnes historiques mono-page (éventuellement surchargées par le personnage) */
  legacyImg?: string | null;
  legacyHtml?: string | null;
  legacyFields?: string | null;
  canvasWidth?: string | number;
  textColor?: string | null;
  /** Valeurs des champs (mode fill) */
  values?: Record<string, string>;
  onValuesChange?: (values: Record<string, string>) => void;
  /** Valeurs des champs (mode read-only, HTML perso_fields) */
  persoFields?: string | null;
}

/**
 * Rendu d'une fiche graphique, potentiellement multi-pages.
 * Les fiches mono-pages existantes (colonnes historiques) sont rendues
 * sans onglets ; les fiches multi-pages affichent un onglet par page,
 * chaque page ayant son propre fond et ses propres champs.
 */
export const GraphicSheetPages: React.FC<GraphicSheetPagesProps> = ({
  mode,
  sheetPages,
  legacyImg,
  legacyHtml,
  legacyFields,
  canvasWidth,
  textColor,
  values,
  onValuesChange,
  persoFields,
}) => {
  const pages = parseGraphicSheetPages(sheetPages, {
    templateImg: legacyImg,
    templateHtml: legacyHtml,
    templateFields: legacyFields,
  });
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const active = pages[Math.min(activeIndex, pages.length - 1)];
  if (!active) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pages.length > 1 && (
        <div
          className="flex items-center gap-2 flex-wrap"
          data-testid="graphic-sheet-pages-tabs"
        >
          <Layers className="w-4 h-4 text-slate-400" />
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                index === activeIndex
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {page.title || `Page ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      <CharacterSheetRenderer
        mode={mode}
        canvasWidth={canvasWidth}
        bgType={active.bgType}
        templateImg={active.bgType === 'image' ? active.image : undefined}
        templateHtml={active.bgType === 'html' ? active.html : undefined}
        templateFields={active.templateFields}
        values={values}
        onValuesChange={onValuesChange}
        persoFields={persoFields}
        textColor={textColor}
      />
    </div>
  );
};
