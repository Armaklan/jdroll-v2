import React, { useState } from 'react';
import { CampaignWidget, CampaignWidgetType } from '../types/campaign';
import { CharacterWidgetsRenderer } from './CharacterWidgetsRenderer';
import {
  Coins,
  Activity,
  Type,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

interface CampaignWidgetsConfigProps {
  widgets: CampaignWidget[];
  onChange: (widgets: CampaignWidget[]) => void;
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'w_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

export const CampaignWidgetsConfig: React.FC<CampaignWidgetsConfigProps> = ({
  widgets,
  onChange,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  // New / edit form state
  const [widgetName, setWidgetName] = useState<string>('');
  const [widgetType, setWidgetType] = useState<CampaignWidgetType>('token');
  const [widgetLow, setWidgetLow] = useState<number | string>(0);
  const [widgetUp, setWidgetUp] = useState<number | string>(10);
  const [widgetDefaultValue, setWidgetDefaultValue] = useState<number | string>(0);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setWidgetName('');
    setWidgetType('token');
    setWidgetLow(0);
    setWidgetUp(10);
    setWidgetDefaultValue(0);
    setError(null);
    setIsFormOpen(false);
  };

  const openAddForm = (type: CampaignWidgetType = 'token') => {
    setEditingId(null);
    setWidgetType(type);
    if (type === 'token') {
      setWidgetName('Héroïsme');
      setWidgetLow(0);
      setWidgetUp(0);
      setWidgetDefaultValue(3);
    } else if (type === 'jauge') {
      setWidgetName('Points de vie');
      setWidgetLow(0);
      setWidgetUp(20);
      setWidgetDefaultValue(20);
    } else {
      setWidgetName('Statut');
      setWidgetLow(0);
      setWidgetUp(0);
      setWidgetDefaultValue('En forme');
    }
    setError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (widget: CampaignWidget) => {
    setEditingId(widget.id);
    setWidgetName(widget.name);
    setWidgetType(widget.type);
    setWidgetLow(widget.low !== undefined ? widget.low : 0);
    setWidgetUp(widget.up !== undefined ? widget.up : 0);
    setWidgetDefaultValue(widget.value !== undefined ? widget.value : '');
    setError(null);
    setIsFormOpen(true);
  };

  const handleSaveWidget = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    const trimmedName = widgetName.trim();
    if (!trimmedName) {
      setError('Le nom du widget est obligatoire.');
      return;
    }

    let parsedLow = 0;
    let parsedUp = 0;
    let val: number | string = widgetDefaultValue;

    if (widgetType === 'jauge') {
      const pLow = Number(widgetLow);
      const pUp = Number(widgetUp);
      parsedLow = isNaN(pLow) ? 0 : pLow;
      parsedUp = isNaN(pUp) ? 0 : pUp;
      const parsedVal = Number(widgetDefaultValue);
      val = isNaN(parsedVal) ? parsedUp : parsedVal;
    } else if (widgetType === 'token') {
      parsedLow = 0;
      parsedUp = 0;
      const parsedVal = Number(widgetDefaultValue);
      val = Math.max(0, isNaN(parsedVal) ? 0 : parsedVal);
    } else {
      parsedLow = 0;
      parsedUp = 0;
      val = String(widgetDefaultValue || '');
    }

    if (editingId) {
      const updated = widgets.map((w) =>
        w.id === editingId
          ? {
              ...w,
              name: trimmedName,
              type: widgetType,
              low: parsedLow,
              up: parsedUp,
              value: val,
            }
          : w
      );
      onChange(updated);
    } else {
      const newWidget: CampaignWidget = {
        id: generateId(),
        name: trimmedName,
        type: widgetType,
        low: parsedLow,
        up: parsedUp,
        value: val,
      };
      onChange([...widgets, newWidget]);
    }

    resetForm();
  };

  const handleDeleteWidget = (id: string) => {
    onChange(widgets.filter((w) => w.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;
    const copy = [...widgets];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    onChange(copy);
  };

  return (
    <div className="space-y-8">
      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <span>Widgets des personnages</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Configurez des jauges, jetons et champs rapides qui apparaîtront sur les fiches et dans le forum.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAddForm('token')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Coins className="w-4 h-4 text-amber-600" />
              <span>+ Jeton</span>
            </button>
            <button
              type="button"
              onClick={() => openAddForm('jauge')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>+ Jauge</span>
            </button>
            <button
              type="button"
              onClick={() => openAddForm('text')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Type className="w-4 h-4 text-indigo-600" />
              <span>+ Texte</span>
            </button>
          </div>
        </div>

        {/* Modal / Inline form for Add / Edit */}
        {isFormOpen && (
          <div
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveWidget(e);
              }
            }}
            className="bg-slate-50 border border-indigo-200 rounded-2xl p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                {editingId ? 'Modifier le widget' : 'Ajouter un nouveau widget'}
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-xl font-medium">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Type de widget
                </label>
                <select
                  value={widgetType}
                  onChange={(e) => setWidgetType(e.target.value as CampaignWidgetType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="token">🪙 Token (Jeton / Compteur)</option>
                  <option value="jauge">📊 Jauge (Barre avec Max)</option>
                  <option value="text">✏️ Texte (Court statut/note)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du widget *
                </label>
                <input
                  type="text"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  placeholder="ex: Points de vie, Héroïsme, Mana..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {widgetType === 'jauge' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valeur min (Low)
                  </label>
                  <input
                    type="number"
                    value={widgetLow}
                    onChange={(e) => setWidgetLow(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valeur max (Up)
                  </label>
                  <input
                    type="number"
                    value={widgetUp}
                    onChange={(e) => setWidgetUp(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valeur par défaut
                  </label>
                  <input
                    type="number"
                    value={widgetDefaultValue}
                    onChange={(e) => setWidgetDefaultValue(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {widgetType === 'token' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valeur par défaut (min 0)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={widgetDefaultValue}
                    onChange={(e) => setWidgetDefaultValue(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {widgetType === 'text' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valeur par défaut
                </label>
                <input
                  type="text"
                  value={String(widgetDefaultValue)}
                  onChange={(e) => setWidgetDefaultValue(e.target.value)}
                  placeholder="Texte par défaut..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveWidget}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Mettre à jour' : 'Ajouter'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Widgets List */}
        {widgets.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Aucun widget configuré</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Ajoutez des jauges (Points de vie, Mana) ou des jetons (Points de destin, Héroïsme) pour permettre aux joueurs et MJ de modifier facilement leurs scores en jeu.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => openAddForm('token')}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                + Ajouter un jeton
              </button>
              <button
                type="button"
                onClick={() => openAddForm('jauge')}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                + Ajouter une jauge
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {widgets.map((widget, index) => (
              <div
                key={widget.id}
                className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 transition gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Monter"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === widgets.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Descendre"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 bg-white border border-slate-200">
                    {widget.type === 'token' && <Coins className="w-4 h-4 text-amber-500" />}
                    {widget.type === 'jauge' && <Activity className="w-4 h-4 text-emerald-500" />}
                    {widget.type === 'text' && <Type className="w-4 h-4 text-indigo-500" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm truncate">
                        {widget.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide bg-white border border-slate-200 text-slate-500">
                        {widget.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {widget.type === 'jauge' && `Min: ${widget.low ?? 0} | Max: ${widget.up ?? 100} | Défaut: ${widget.value ?? 0}`}
                      {widget.type === 'token' && `Défaut: ${widget.value ?? 0}`}
                      {widget.type === 'text' && `Valeur par défaut: "${widget.value || ''}"`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditForm(widget)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWidget(widget.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Live Preview */}
        {widgets.length > 0 && (
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Aperçu en direct (Fiche & Forum)</span>
            </h4>
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
              <CharacterWidgetsRenderer widgets={widgets} variant="full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
