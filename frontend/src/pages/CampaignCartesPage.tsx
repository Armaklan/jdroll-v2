import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignsApi } from '../api/campaigns';
import { CampaignHeader } from '../components/CampaignHeader';
import { DiceTowerModal } from '../components/DiceTowerModal';
import { CampaignSummary, CarteSummary } from '../types/campaign';
import {
  Map,
  Plus,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Upload,
  Link as LinkIcon,
  X,
  FileImage,
  SlidersHorizontal,
} from 'lucide-react';

export const CampaignCartesPage: React.FC = () => {
  const params = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const campaignId = params.campaignId ? Number(params.campaignId) : 0;

  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [cartes, setCartes] = useState<CarteSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal création de carte
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createImageMode, setCreateImageMode] = useState<'url' | 'upload'>('url');
  const [createImageUrl, setCreateImageUrl] = useState<string>('');
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createPublished, setCreatePublished] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal suppression de carte
  const [carteToDelete, setCarteToDelete] = useState<CarteSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Tour à dés
  const [isDiceTowerOpen, setIsDiceTowerOpen] = useState<boolean>(false);

  const isMj = Boolean(
    user && campaign && (user.id === campaign.mjId || campaign.userRole === 'mj')
  );

  const loadData = useCallback(async () => {
    if (!campaignId) {
      setError('Identifiant de campagne manquant');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [campaignRes, cartesRes] = await Promise.all([
        campaignsApi.getCampaign(campaignId),
        campaignsApi.getCampaignCartes(campaignId),
      ]);
      setCampaign(campaignRes);
      setCartes(cartesRes);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des cartes de la campagne');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setCreateName('');
    setCreateDescription('');
    setCreateImageMode('url');
    setCreateImageUrl('');
    setCreateImageFile(null);
    setCreatePublished(true);
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateCarte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Le nom de la carte est requis');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      let finalImageUrl = createImageUrl.trim();

      if (createImageMode === 'upload') {
        if (!createImageFile) {
          throw new Error('Veuillez sélectionner une image à téléverser');
        }
        const uploadRes = await campaignsApi.uploadCarteImage(campaignId, createImageFile);
        finalImageUrl = uploadRes.url;
      }

      if (!finalImageUrl) {
        throw new Error("L'image de fond est requise");
      }

      const res = await campaignsApi.createCarte(campaignId, {
        name: createName.trim(),
        description: createDescription.trim(),
        image: finalImageUrl,
        published: createPublished,
        config: { markers: [], tabReduce: false },
      });

      setIsCreateModalOpen(false);
      navigate(`/campaigns/${campaignId}/cartes/${res.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la création de la carte');
      setIsSubmitting(false);
    }
  };

  const handleDeleteCarte = async () => {
    if (!carteToDelete) return;

    setIsDeleting(true);
    try {
      await campaignsApi.deleteCarte(campaignId, carteToDelete.id);
      setCartes((prev) => prev.filter((c) => c.id !== carteToDelete.id));
      setCarteToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de la carte');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {campaign && (
        <>
          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 max-w-7xl w-full mx-auto px-4">
            <div className="flex items-center gap-2 text-sm text-slate-500"></div>
            <div className="flex flex-wrap items-center gap-2.5">
              {isMj && (
                <>
                  <button
                    onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
                    title="Modifier la configuration générale de la campagne"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span>Configurer</span>
                  </button>
                  <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Créer une carte</span>
                  </button>
                </>
              )}
            </div>
          </div>
          
          <CampaignHeader
            campaign={campaign}
            activeTab="cartes"
            onOpenDiceTower={() => setIsDiceTowerOpen(true)}
          />
        </>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Titre */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Map className="w-6 h-6 text-indigo-600" />
            <span>Cartes tactiques & géographiques</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualisez le monde, explorez les zones de jeu et déplacez vos personnages.
          </p>
        </div>

        {/* Chargement */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Chargement des cartes...</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 my-4">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Erreur</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Liste des cartes */}
        {!isLoading && !error && cartes.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Map className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Aucune carte disponible</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              {isMj
                ? "Vous n'avez pas encore créé de carte pour cette partie. Ajoutez une image de donjon, de région ou de ville pour commencer !"
                : "Le meneur de jeu n'a pas encore mis de carte à disposition pour cette partie."}
            </p>
            {isMj && (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer la première carte</span>
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && cartes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cartes.map((carte) => (
              <div
                key={carte.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
              >
                {/* Aperçu Image */}
                <div
                  onClick={() => navigate(`/campaigns/${campaignId}/cartes/${carte.id}`)}
                  className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                >
                  {carte.image ? (
                    <img
                      src={carte.image}
                      alt={carte.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <FileImage className="w-12 h-12" />
                    </div>
                  )}

                  {/* Badge Statut */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {carte.published ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/90 text-white backdrop-blur-xs shadow-xs">
                        <Eye className="w-3 h-3" />
                        <span>Visible aux joueurs</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/90 text-white backdrop-blur-xs shadow-xs">
                        <EyeOff className="w-3 h-3" />
                        <span>Brouillon MJ</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Contenu */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3
                    onClick={() => navigate(`/campaigns/${campaignId}/cartes/${carte.id}`)}
                    className="font-bold text-slate-800 text-base group-hover:text-indigo-600 transition cursor-pointer line-clamp-1"
                  >
                    {carte.name}
                  </h3>

                  {carte.description ? (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex-1">
                      {carte.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-1 flex-1">
                      Aucune description
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/campaigns/${campaignId}/cartes/${carte.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ouvrir la carte</span>
                    </button>

                    {isMj && (
                      <button
                        onClick={() => setCarteToDelete(carte)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Supprimer la carte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Création de Carte */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Map className="w-5 h-5 text-indigo-600" />
                <span>Créer une nouvelle carte</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCarte} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nom de la carte <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Donjon de la crypte oubliée, Région du Val..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes ou contexte pour les joueurs..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Image de fond <span className="text-red-500">*</span>
                </label>

                {/* Switch Mode URL / Fichier */}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setCreateImageMode('url')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      createImageMode === 'url'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Lien direct (URL)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateImageMode('upload')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      createImageMode === 'upload'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Téléverser un fichier</span>
                  </button>
                </div>

                {createImageMode === 'url' ? (
                  <input
                    type="text"
                    placeholder="https://example.com/carte.jpg"
                    value={createImageUrl}
                    onChange={(e) => setCreateImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCreateImageFile(e.target.files[0]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                )}
              </div>

              {/* Toggle Publié */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Rendre visible aux joueurs</label>
                  <p className="text-xs text-slate-500">
                    Si désactivé, seuls le MJ pourra voir et modifier la carte.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={createPublished}
                  onChange={(e) => setCreatePublished(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Boutons validation */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Création en cours...</span>
                    </>
                  ) : (
                    <span>Créer et configurer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {carteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Supprimer cette carte ?</h3>
            <p className="text-xs text-slate-500 mb-6">
              Êtes-vous sûr de vouloir supprimer la carte <strong>« {carteToDelete.name} »</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCarteToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCarte}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tour à dés */}
      <DiceTowerModal
        isOpen={isDiceTowerOpen}
        campaignId={campaign?.id || 0}
        campaignName={campaign?.name}
        isMj={isMj}
        onClose={() => setIsDiceTowerOpen(false)}
      />
    </div>
  );
};
