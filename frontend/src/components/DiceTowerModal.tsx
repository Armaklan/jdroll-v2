import React, { useState, useEffect, useCallback } from 'react';
import {
  Dices,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { campaignsApi } from '../api/campaigns';
import { CampaignDiceRoll } from '../types/campaign';
import { parseDiceInText } from '../utils/dice-parser';
import { getUserColorClass } from '../utils/user';
import { formatFullDateTime as formatDate } from '../utils/date';

interface DiceTowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  campaignName?: string;
  isMj?: boolean;
}

export const DiceTowerModal: React.FC<DiceTowerModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  isMj = false,
}) => {
  const [rolls, setRolls] = useState<CampaignDiceRoll[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [formula, setFormula] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState<boolean>(false);

  const fetchRolls = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await campaignsApi.getCampaignDiceRolls(campaignId);
      setRolls(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer les jets de dés.');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchRolls();
      setFormula('');
      setDescription('');
      setError(null);
    }
  }, [isOpen, campaignId, fetchRolls]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFormula = formula.trim();
    if (!cleanFormula) {
      setError('Veuillez saisir une formule de dé.');
      return;
    }

    setIsRolling(true);
    setError(null);

    try {
      const result = await campaignsApi.rollCampaignDice(campaignId, {
        formula: cleanFormula,
        description: description.trim() || undefined,
      });

      // Insérer en tête de liste et limiter à 20
      setRolls((prev) => [result.roll, ...prev.slice(0, 19)]);
      setFormula('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors du lancer de dé.');
    } finally {
      setIsRolling(false);
    }
  };

  const setFormulaShortcut = (val: string) => {
    setFormula(val);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de la modale */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:px-6 flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Dices className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Tour à dés
                {campaignName && (
                  <span className="text-xs font-normal text-indigo-200 px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-700/50">
                    {campaignName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                Effectuez un jet instantané et consultez les 20 derniers tirages de la partie
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Fermer la tour à dés"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la modale (scrollable) */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* Section 1 : Boîte de jet de dé */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm sm:text-base">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Effectuer un jet de dé</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSyntaxHelp(!showSyntaxHelp)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showSyntaxHelp ? 'Masquer l’aide' : 'Syntaxes de dés'}</span>
              </button>
            </div>

            {/* Syntaxe d'aide dépliable */}
            {showSyntaxHelp && (
              <div className="mb-4 p-3 bg-white border border-indigo-200 rounded-xl text-xs text-slate-700 shadow-2xs animate-in fade-in space-y-2">
                <p className="font-bold text-indigo-900">Syntaxes supportées :</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div><code className="font-bold text-indigo-700">3d6</code> : 3 dés à 6 faces</div>
                  <div><code className="font-bold text-indigo-700">3du</code> : 3 dés Ubiquity (0 ou 1)</div>
                  <div><code className="font-bold text-indigo-700">4df</code> : 4 dés Fudge (-1, 0, +1)</div>
                  <div><code className="font-bold text-indigo-700">3d6 + 3</code> : 3d6 avec bonus +3</div>
                  <div><code className="font-bold text-indigo-700">1d8 + 2d10</code> : combinaisons</div>
                  <div><code className="font-bold text-indigo-700">3d8g2</code> : 2 meilleurs dés (great)</div>
                  <div><code className="font-bold text-indigo-700">3d8l2</code> : 2 moins bons dés (less)</div>
                  <div><code className="font-bold text-indigo-700">(1d8 + 2d6)g1</code> : groupe avec meilleur</div>
                  <div><code className="font-bold text-indigo-700">3d10&gt;7</code> : succès strictement &gt; 7</div>
                  <div><code className="font-bold text-indigo-700">3d10&lt;7</code> : succès strictement &lt; 7</div>
                </div>
              </div>
            )}

            <form onSubmit={handleRollSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Formule de dés <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    placeholder="Ex: 3d6, 1d20, 3d8g2, 4df..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-2xs"
                    disabled={isRolling}
                  />
                </div>

                <div className="sm:col-span-7">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Contexte <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Jet de perception, Attaque à l'épée, Esquive..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-2xs"
                    disabled={isRolling}
                  />
                </div>
              </div>

              {/* Raccourcis rapides de formules */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-slate-500 mr-1">Raccourcis :</span>
                {['1d6', '2d6', '3d6', '1d20', '1d100', '1d8 + 2d6', '3d8g2', '3du', '4df'].map((shortcut) => (
                  <button
                    key={shortcut}
                    type="button"
                    onClick={() => setFormulaShortcut(shortcut)}
                    className="px-2 py-0.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-mono font-medium transition shadow-2xs cursor-pointer"
                  >
                    {shortcut}
                  </button>
                ))}
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Bouton de lancer */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isRolling || !formula.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-md cursor-pointer"
                >
                  {isRolling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Lancement en cours...</span>
                    </>
                  ) : (
                    <>
                      <Dices className="w-4 h-4" />
                      <span>Lancer les dés</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2 : 20 derniers jets de dés */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>{isMj ? '20 derniers jets de la campagne' : 'Mes 20 derniers jets'}</span>
                {rolls.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {rolls.length}
                  </span>
                )}
              </div>
            </div>

            {isLoading && rolls.length === 0 ? (
              <div className="py-10 text-center text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <p className="text-xs font-medium">Chargement des jets de dés...</p>
              </div>
            ) : rolls.length === 0 ? (
              <div className="py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-500">
                <Dices className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Aucun jet de dés pour le moment</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isMj
                    ? 'Aucun jet de dés n’a encore été effectué dans cette campagne.'
                    : 'Vous n’avez effectué aucun jet de dés dans cette campagne pour le moment.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {rolls.map((roll) => (
                  <div
                    key={roll.id}
                    className="bg-white border border-slate-200 hover:border-indigo-200 rounded-xl p-3.5 transition shadow-2xs hover:shadow-xs space-y-2"
                  >
                    {/* Ligne utilisateur, date et description */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        {roll.userAvatar ? (
                          <img
                            src={roll.userAvatar}
                            alt={roll.username}
                            className="w-5 h-5 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                            {roll.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-bold ${getUserColorClass(roll.userProfil, 'text-slate-800')}`}>
                          {roll.username}
                        </span>
                        {roll.description && (
                          <>
                            <span className="text-slate-300">&bull;</span>
                            <span className="font-medium text-indigo-900 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-[11px]">
                              {roll.description}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(roll.createDate)}</span>
                      </div>
                    </div>

                    {/* Résultat visuel avec dés vectoriels */}
                    <div
                      className="text-xs sm:text-sm font-medium text-slate-800 bg-slate-50/70 border border-slate-100 rounded-lg p-2.5 leading-relaxed break-words"
                      dangerouslySetInnerHTML={{
                        __html: parseDiceInText(roll.result),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pied de la modale */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition shadow-2xs cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
