import React from 'react';
import { CampaignWidget } from '../types/campaign';
import { Coins, Activity, Type } from 'lucide-react';

interface CharacterWidgetsEditorProps {
  widgets: CampaignWidget[];
  onChange: (widgets: CampaignWidget[]) => void;
}

export const CharacterWidgetsEditor: React.FC<CharacterWidgetsEditorProps> = ({
  widgets,
  onChange,
}) => {
  if (!widgets || widgets.length === 0) {
    return null;
  }

  const handleWidgetFieldChange = (
    widgetId: string,
    field: 'value' | 'low' | 'up',
    val: string | number
  ) => {
    const updated = widgets.map((w) => {
      if (w.id !== widgetId) return w;
      return { ...w, [field]: val };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <span>Widgets du personnage</span>
        </label>
        <span className="text-xs text-slate-500 font-medium">
          Personnalisez les valeurs et les bornes des jauges du personnage
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {widgets.map((widget) => {
          if (widget.type === 'jauge') {
            const min = widget.low !== undefined && widget.low !== '' ? Number(widget.low) : 0;
            const max = widget.up !== undefined && widget.up !== '' ? Number(widget.up) : 100;
            const val = widget.value !== undefined ? widget.value : min;

            return (
              <div
                key={widget.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs sm:col-span-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 text-sm">{widget.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Jauge (Min: {min} | Max: {max})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Minimum
                    </label>
                    <input
                      type="number"
                      value={widget.low !== undefined ? widget.low : 0}
                      onChange={(e) =>
                        handleWidgetFieldChange(
                          widget.id,
                          'low',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Maximum
                    </label>
                    <input
                      type="number"
                      value={widget.up !== undefined ? widget.up : 100}
                      onChange={(e) =>
                        handleWidgetFieldChange(
                          widget.id,
                          'up',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Valeur actuelle
                    </label>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) =>
                        handleWidgetFieldChange(
                          widget.id,
                          'value',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Valeur"
                    />
                  </div>
                </div>
              </div>
            );
          }

          if (widget.type === 'token') {
            return (
              <div
                key={widget.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-slate-800 text-sm">{widget.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Jeton
                  </span>
                </div>

                <input
                  type="number"
                  value={widget.value !== undefined ? widget.value : 0}
                  onChange={(e) =>
                    handleWidgetFieldChange(
                      widget.id,
                      'value',
                      e.target.value === '' ? '' : Math.max(0, Number(e.target.value))
                    )
                  }
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre de jetons"
                />
              </div>
            );
          }

          // Type Text
          return (
            <div
              key={widget.id}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs sm:col-span-2"
            >
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-slate-800 text-sm">{widget.name}</span>
                <span className="text-xs font-semibold text-slate-500">(Texte)</span>
              </div>

              <input
                type="text"
                value={typeof widget.value === 'string' ? widget.value : String(widget.value ?? '')}
                onChange={(e) => handleWidgetFieldChange(widget.id, 'value', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`Valeur pour ${widget.name}...`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
