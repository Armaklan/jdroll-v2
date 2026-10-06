import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';
import { GrammarMatch } from '../api/grammar';
import { buildTextIndex, resolveMatchRange } from '../utils/grammar-text-index';

/**
 * Couche de surlignage du correcteur grammatical pour le WysiwygEditor.
 *
 * Dessine par-dessus la zone d'édition (contentEditable) un rectangle
 * translucide + soulignement pour chaque erreur détectée. Les offsets du
 * correcteur (texte brut) sont traduits en coordonnées DOM via
 * grammar-text-index, puis positionnés en coordonnées "contenu" pour rester
 * alignés pendant le défilement (transform: translateY(-scrollTop)).
 */
interface GrammarBox {
  key: string;
  match: GrammarMatch;
  rects: Array<{ top: number; left: number; width: number; height: number }>;
}

interface WysiwygGrammarOverlayProps {
  /** Élément contentEditable édité (null en mode source) */
  editor: HTMLDivElement | null;
  /** Erreurs détectées par le correcteur */
  matches: GrammarMatch[];
  /** Applique un remplacement dans l'éditeur */
  onApply: (match: GrammarMatch, replacement: string) => void;
}

export const WysiwygGrammarOverlay: React.FC<WysiwygGrammarOverlayProps> = ({
  editor,
  matches,
  onApply,
}) => {
  const [boxes, setBoxes] = useState<GrammarBox[]>([]);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [viewportTick, setViewportTick] = useState<number>(0);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const computeBoxes = useCallback(() => {
    if (!editor || matches.length === 0) {
      setBoxes([]);
      return;
    }
    const index = buildTextIndex(editor);
    const editorRect = editor.getBoundingClientRect();
    const next: GrammarBox[] = [];
    for (const match of matches) {
      const dom = resolveMatchRange(index, match.offset, match.length);
      if (!dom) continue;
      const range = document.createRange();
      try {
        range.setStart(dom.startNode as unknown as Node, dom.startOffset);
        range.setEnd(dom.endNode as unknown as Node, dom.endOffset);
      } catch {
        continue;
      }
      const rects = Array.from(range.getClientRects())
        .map((r) => ({
          top: r.top - editorRect.top + editor.scrollTop,
          left: r.left - editorRect.left + editor.scrollLeft,
          width: r.width,
          height: r.height,
        }))
        .filter((r) => r.width > 1 && r.height > 1);
      if (rects.length > 0) {
        next.push({
          key: `${match.ruleId}-${match.offset}-${match.length}`,
          match,
          rects,
        });
      }
    }
    setBoxes(next);
  }, [editor, matches]);

  // Recalcul des surlignages quand les résultats ou l'élément édité changent
  useEffect(() => {
    computeBoxes();
  }, [computeBoxes]);

  // Recalcul au redimensionnement de la fenêtre (reflow du texte)
  useEffect(() => {
    if (!editor) return;
    const onResize = () => computeBoxes();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [editor, computeBoxes]);

  // Synchronisation du défilement : les boîtes sont en coordonnées contenu,
  // la couche entière est translatée de -scrollTop
  useEffect(() => {
    if (!editor) return;
    const onScroll = () => setScrollTop(editor.scrollTop);
    editor.addEventListener('scroll', onScroll);
    return () => editor.removeEventListener('scroll', onScroll);
  }, [editor]);

  // Fermeture du popover au clic en dehors
  useEffect(() => {
    if (!activeKey) return;
    const onPointerDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveKey(null);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [activeKey]);

  // Repositionnement du popover (fixed, viewport) quand la page défile
  useEffect(() => {
    if (!activeKey) return;
    const onPageScroll = () => setViewportTick((tick) => tick + 1);
    window.addEventListener('scroll', onPageScroll, true);
    return () => window.removeEventListener('scroll', onPageScroll, true);
  }, [activeKey]);

  if (!editor || boxes.length === 0) {
    return null;
  }

  const activeBox = boxes.find((b) => b.key === activeKey) ?? null;
  const activeRect = activeBox?.rects[0] ?? null;

  // Le popover est rendu en portail vers <body> en position fixed : il peut
  // sortir de la zone de texte (aucun clipping par l'éditeur scrollable) et
  // se repositionne au-dessus du surlignage si nécessaire.
  // data-viewport-tick force le recalcul du rendu quand la page défile.
  let popover: React.ReactNode = null;
  if (activeBox && activeRect) {
    const editorRect = editor.getBoundingClientRect();
    const rectTop = activeRect.top - scrollTop + editorRect.top;
    const rectLeft = activeRect.left - editor.scrollLeft + editorRect.left;

    // Sous le surlignage par défaut ; au-dessus si ça déborderait de la fenêtre
    const POPOVER_HEIGHT = 150;
    const belowTop = rectTop + activeRect.height + 6;
    const placeAbove = belowTop + POPOVER_HEIGHT > window.innerHeight && rectTop > POPOVER_HEIGHT + 16;

    const top = placeAbove ? rectTop - 6 : belowTop;
    const left = Math.min(
      Math.max(8, rectLeft - 8),
      Math.max(8, window.innerWidth - 296)
    );

    popover = createPortal(
      <div
        ref={popoverRef}
        className="wysiwyg-grammar-popover"
        data-viewport-tick={viewportTick}
        style={{
          top: `${top}px`,
          left: `${left}px`,
          ...(placeAbove ? { transform: 'translateY(-100%)' } : {}),
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[11px] font-bold text-amber-700 truncate">
              {activeBox.match.category || activeBox.match.shortMessage || 'Correction'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveKey(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[11px] text-slate-600 leading-snug mb-2 max-w-[240px]">
          {activeBox.match.message}
        </p>
        {activeBox.match.replacements.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeBox.match.replacements.map((replacement) => (
              <button
                key={replacement}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveKey(null);
                  onApply(activeBox.match, replacement);
                }}
                className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-semibold border border-amber-200 transition cursor-pointer max-w-[180px] truncate"
              >
                {replacement}
              </button>
            ))}
          </div>
        )}
      </div>,
      document.body
    );
  }

  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
      style={{ transform: `translateY(-${scrollTop}px)` }}
    >
      {boxes.map((box) => (
        <button
          key={box.key}
          type="button"
          className="wysiwyg-grammar-box"
          style={{
            top: `${box.rects[0].top}px`,
            left: `${box.rects[0].left}px`,
            width: `${box.rects[0].width}px`,
            height: `${box.rects[0].height}px`,
          }}
          title={box.match.message}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveKey(activeKey === box.key ? null : box.key);
          }}
        />
      ))}

      {popover}
    </div>
  );
};
