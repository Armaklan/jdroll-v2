import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { CampaignCharacter, CampaignSummary } from '../types/campaign';
import { CharacterWidgetsRenderer } from './CharacterWidgetsRenderer';
import { CharacterSheetRenderer } from './CharacterSheetRenderer';
import { mergeCharacterWidgets, changeWidgetValue, serializeWidgets } from '../utils/widgets';
import { getUserColorClass } from '../utils/user';
import {
  X,
  User,
  Sparkles,
  Eye,
  Lock,
  FileText,
  Activity,
  LayoutTemplate,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface CharacterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId: number | null;
  campaignId?: number | null;
  initialCharacter?: CampaignCharacter | null;
  initialCampaign?: CampaignSummary | null;
  onUpdateCharacterWidget?: (widgetId: string, delta: number) => Promise<void> | void;
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  isOpen,
  onClose,
  characterId,
  campaignId,
  initialCharacter,
  initialCampaign,
  onUpdateCharacterWidget,
}) => {
  const { user } = useAuth();
  const [character, setCharacter] = useState<CampaignCharacter | null>(initialCharacter || null);
  const [campaign, setCampaign] = useState<CampaignSummary | null>(initialCampaign || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !characterId) {
      if (!isOpen) {
        setCharacter(null);
        setError(null);
      }
      return;
    }

    // Si initialCharacter est fourni et correspond à l'id demandé
    if (initialCharacter && initialCharacter.id === characterId) {
      setCharacter(initialCharacter);
      if (initialCampaign) {
        setCampaign(initialCampaign);
      }
    }

    // Récupérer la fiche complète depuis le backend
    let isCancelled = false;
    const fetchCharacter = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await campaignsApi.getCharacter(characterId, campaignId || undefined);
        if (!isCancelled) {
          setCharacter(data.character);
          setCampaign(data.campaign);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Erreur lors du chargement du personnage:', err);
          setError(err.message || 'Impossible de charger les détails du personnage.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchCharacter();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, characterId, campaignId, initialCharacter, initialCampaign]);

  if (!isOpen || !characterId) {
    return null;
  }

  const isMj = Boolean(
    user && (campaign?.mjId === user.id || campaign?.userRole === 'mj')
  );
  const isOwner = Boolean(user && character?.userId === user.id);
  const canSeePrivate = isMj || isOwner;

  const handleUpdateWidget = async (widgetId: string, delta: number) => {
    if (!character) return;
    const campaignWidgetsRaw = campaign?.widgets;
    const currentWidgets = mergeCharacterWidgets(campaignWidgetsRaw, character.widgets);
    const updatedWidgets = changeWidgetValue(currentWidgets, widgetId, delta);
    const serialized = serializeWidgets(updatedWidgets);

    setCharacter((prev) => (prev ? { ...prev, widgets: serialized } : null));

    try {
      await campaignsApi.updateCharacter(
        character.id,
        { widgets: serialized },
        campaignId || character.campagneId || undefined
      );
      if (onUpdateCharacterWidget) {
        await onUpdateCharacterWidget(widgetId, delta);
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour des widgets du personnage:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative my-auto flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2">
            {character && (
              <>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {character.isPlayer ? 'Personnage Joueur' : 'Personnage Non-Joueur'}
                </span>
                {character.categoryName && (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                    {character.categoryName}
                  </span>
                )}
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Fermer la fiche"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {isLoading && !character && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Chargement de la fiche du personnage...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold text-sm">Erreur de chargement</p>
                <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {character && (
            <>
              {/* Character Header Info */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-xs flex items-center justify-center">
                  {character.avatar ? (
                    <img
                      src={character.avatar}
                      alt={character.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const fb = parent.querySelector('.modal-avatar-fallback');
                          if (fb) (fb as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`modal-avatar-fallback w-full h-full flex flex-col items-center justify-center text-slate-300 ${
                      character.avatar ? 'hidden' : 'flex'
                    }`}
                  >
                    <User className="w-12 h-12" />
                  </div>
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {character.name}
                  </h2>

                  {character.concept && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{character.concept}</span>
                    </div>
                  )}

                  {character.isPlayer && character.userName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Joueur assigné :</span>
                      <strong className={getUserColorClass(character.userProfil, 'text-slate-800 font-semibold')}>
                        {character.userName}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Public Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-500" />
                  <span>Description publique</span>
                </h3>
                {character.publicDescription ? (
                  <div
                    className="wysiwyg-content p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed max-w-none"
                    dangerouslySetInnerHTML={{ __html: character.publicDescription }}
                  />
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    Aucune description publique disponible pour ce personnage.
                  </p>
                )}
              </div>

              {/* Private Description (Visible MJ & propriétaire) */}
              {canSeePrivate && character.privateDescription !== undefined && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Notes privées / Secrets (Visible MJ & propriétaire)</span>
                  </h3>
                  {character.privateDescription ? (
                    <div
                      className="wysiwyg-content p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-sm text-amber-950 leading-relaxed max-w-none"
                      dangerouslySetInnerHTML={{ __html: character.privateDescription }}
                    />
                  ) : (
                    <p className="text-xs text-amber-700/70 italic bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                      Aucune note privée renseignée.
                    </p>
                  )}
                </div>
              )}

              {/* Technical Details */}
              {character.technical !== undefined && character.technical && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Fiche technique / Statistiques</span>
                  </h3>
                  <div
                    className="wysiwyg-content p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed max-w-none"
                    dangerouslySetInnerHTML={{ __html: character.technical }}
                  />
                </div>
              )}

              {/* Widgets Section (Visible MJ & propriétaire) */}
              {(() => {
                if (!canSeePrivate) return null;
                const charWidgets = mergeCharacterWidgets(campaign?.widgets, character.widgets);
                if (charWidgets.length === 0) return null;

                return (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      <span>Widgets & Compteurs</span>
                    </h3>
                    <CharacterWidgetsRenderer
                      widgets={charWidgets}
                      isEditable={canSeePrivate}
                      onUpdateWidget={handleUpdateWidget}
                      variant="full"
                    />
                  </div>
                );
              })()}

              {/* Character Sheet (Graphique / Interactif) */}
              {Boolean(
                character.templateImg ||
                character.templateHtml ||
                campaign?.templateImg ||
                campaign?.templateHtml ||
                campaign?.templateFields ||
                character.templateFields
              ) && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutTemplate className="w-4 h-4 text-indigo-600" />
                    <span>Feuille de personnage</span>
                  </h3>
                  <CharacterSheetRenderer
                    mode="read-only"
                    canvasWidth={campaign?.width || '800px'}
                    bgType={
                      (character.templateImg || campaign?.templateImg) ? 'image' : 'html'
                    }
                    templateImg={character.templateImg || campaign?.templateImg}
                    templateHtml={character.templateHtml || campaign?.templateHtml}
                    templateFields={character.templateFields || campaign?.templateFields}
                    persoFields={character.persoFields}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end items-center shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-medium text-xs shadow-2xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
