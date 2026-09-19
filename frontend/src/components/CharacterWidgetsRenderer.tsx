import React, { useState } from 'react';
import { CampaignWidget } from '../types/campaign';
import {
  Coins,
  Activity,
  Type,
  Plus,
  Minus,
  Loader2,
} from 'lucide-react';

interface CharacterWidgetsRendererProps {
  widgets: CampaignWidget[];
  isEditable?: boolean;
  onUpdateWidget?: (widgetId: string, delta: number) => Promise<void> | void;
  variant?: 'sidebar' | 'full' | 'card';
  textColor?: string | null;
}

export const CharacterWidgetsRenderer: React.FC<CharacterWidgetsRendererProps> = ({
  widgets,
  isEditable = false,
  onUpdateWidget,
  variant = 'sidebar',
  textColor,
}) => {
  const [loadingWidgetId, setLoadingWidgetId] = useState<string | null>(null);

  if (!widgets || widgets.length === 0) {
    return null;
  }

  const handleDelta = async (widgetId: string, delta: number) => {
    if (!onUpdateWidget || loadingWidgetId) return;
    try {
      setLoadingWidgetId(widgetId);
      await onUpdateWidget(widgetId, delta);
    } catch (err) {
      console.error('Error updating widget:', err);
    } finally {
      setLoadingWidgetId(null);
    }
  };

  if (variant === 'sidebar' || variant === 'card') {
    return (
      <div className="mt-2 space-y-1.5 w-full min-w-0">
        {widgets.map((widget) => {
          const isLoading = loadingWidgetId === widget.id;
          const currentVal = Number(widget.value) || 0;
          const lowVal = widget.low !== undefined && widget.low !== '' ? Number(widget.low) : 0;
          const upVal = widget.up !== undefined && widget.up !== '' ? Number(widget.up) : 0;

          if (widget.type === 'jauge') {
            const min = !isNaN(lowVal) ? lowVal : 0;
            const max = !isNaN(upVal) && upVal > min ? upVal : 100;
            const percentage = Math.max(0, Math.min(100, Math.round(((currentVal - min) / (max - min)) * 100)));
            const barColor =
              percentage <= 25
                ? 'bg-red-500'
                : percentage <= 50
                ? 'bg-amber-500'
                : 'bg-emerald-500';

            return (
              <div
                key={widget.id}
                className="bg-black/10 dark:bg-white/10 rounded-lg p-1.5 border border-black/5 dark:border-white/5 text-xs shadow-2xs min-w-0"
              >
                <div className="flex items-center justify-between gap-1 mb-1 min-w-0">
                  <span className="font-semibold truncate text-[11px] min-w-0" title={widget.name} style={{ color: textColor || undefined }}>
                    {widget.name}
                  </span>
                  <span className="font-mono text-[10px] font-bold shrink-0 opacity-90" style={{ color: textColor || undefined }}>
                    {currentVal} / {max}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-black/20 dark:bg-white/20 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full ${barColor} transition-all duration-200 rounded-full`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Controls */}
                {isEditable && onUpdateWidget && (
                  <div className="flex items-center justify-end gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelta(widget.id, -1);
                      }}
                      disabled={isLoading || currentVal <= min}
                      className="w-5 h-5 flex items-center justify-center rounded bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="-1"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin opacity-70" />
                    ) : (
                      <span className="text-[10px] font-mono px-0.5">{currentVal}</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelta(widget.id, 1);
                      }}
                      disabled={isLoading || currentVal >= max}
                      className="w-5 h-5 flex items-center justify-center rounded bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="+1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          }

          if (widget.type === 'token') {
            const isMinReached = currentVal <= 0;

            return (
              <div
                key={widget.id}
                className="flex items-center justify-between gap-1.5 bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1 border border-black/5 dark:border-white/5 text-xs shadow-2xs min-w-0"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-semibold truncate text-[11px] min-w-0" title={widget.name} style={{ color: textColor || undefined }}>
                    {widget.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isEditable && onUpdateWidget && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelta(widget.id, -1);
                      }}
                      disabled={isLoading || isMinReached}
                      className="w-4 h-4 flex items-center justify-center rounded bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="-1"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                  )}

                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin opacity-70" />
                  ) : (
                    <span className="font-bold font-mono text-[11px] px-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                      {currentVal}
                    </span>
                  )}

                  {isEditable && onUpdateWidget && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelta(widget.id, 1);
                      }}
                      disabled={isLoading}
                      className="w-4 h-4 flex items-center justify-center rounded bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="+1"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Type Text
          return (
            <div
              key={widget.id}
              className="bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1 border border-black/5 dark:border-white/5 text-xs shadow-2xs min-w-0"
            >
              <div className="text-[11px] leading-snug break-words min-w-0" style={{ color: textColor || undefined }}>
                <span className="font-semibold opacity-85">
                  {widget.name} :{' '}
                </span>
                <span className="font-medium [overflow-wrap:anywhere]">
                  {widget.value || '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Variant Full (pour fiche de perso / modal détail)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {widgets.map((widget) => {
        const isLoading = loadingWidgetId === widget.id;
        const currentVal = Number(widget.value) || 0;
        const lowVal = widget.low !== undefined && widget.low !== '' ? Number(widget.low) : 0;
        const upVal = widget.up !== undefined && widget.up !== '' ? Number(widget.up) : 0;

        if (widget.type === 'jauge') {
          const min = !isNaN(lowVal) ? lowVal : 0;
          const max = !isNaN(upVal) && upVal > min ? upVal : 100;
          const percentage = Math.max(0, Math.min(100, Math.round(((currentVal - min) / (max - min)) * 100)));
          const barColor =
            percentage <= 25
              ? 'bg-red-500'
              : percentage <= 50
              ? 'bg-amber-500'
              : 'bg-emerald-500';

          return (
            <div
              key={widget.id}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-sm">{widget.name}</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {currentVal} / {max}
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-300 rounded-full`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {isEditable && onUpdateWidget && (
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelta(widget.id, -5);
                    }}
                    disabled={isLoading || currentVal <= min}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelta(widget.id, -1);
                    }}
                    disabled={isLoading || currentVal <= min}
                    className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  ) : (
                    <span className="font-mono font-bold text-xs px-2 text-slate-800">{currentVal}</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelta(widget.id, 1);
                    }}
                    disabled={isLoading || currentVal >= max}
                    className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelta(widget.id, 5);
                    }}
                    disabled={isLoading || currentVal >= max}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              )}
            </div>
          );
        }

        if (widget.type === 'token') {
          const isMinReached = currentVal <= 0;

          return (
            <div
              key={widget.id}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-sm leading-tight">{widget.name}</h5>
                  <p className="text-[11px] text-slate-500 font-medium">Jeton / Compteur</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isEditable && onUpdateWidget && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelta(widget.id, -1);
                    }}
                    disabled={isLoading || isMinReached}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                )}

                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                  <div className="px-3 py-1 bg-amber-500 text-white rounded-xl font-bold font-mono text-sm shadow-2xs">
                    {currentVal}
                  </div>
                )}

                {isEditable && onUpdateWidget && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelta(widget.id, 1);
                    }}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        }

        // Text
        return (
          <div
            key={widget.id}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-1 min-w-0"
          >
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider min-w-0">
              <Type className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{widget.name}</span>
            </div>
            <p className="text-sm font-medium text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 min-h-[38px] flex items-center break-words [overflow-wrap:anywhere] min-w-0 whitespace-pre-wrap">
              {widget.value || <span className="text-slate-400 italic">Non renseigné</span>}
            </p>
          </div>
        );
      })}
    </div>
  );
};
