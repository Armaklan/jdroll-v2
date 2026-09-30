import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatures } from '../contexts/FeatureContext';
import { featuresApi } from '../api/features';
import { annoncesApi } from '../api/annonces';
import { isUserAdmin } from '../utils/user';
import { FeatureFlip } from '../types/feature';
import { Annonce } from '../types/annonce';
import { WysiwygEditor } from '../components/WysiwygEditor';
import { parseDbDate } from '../utils/date';
import { Shield, RefreshCw, Megaphone, Plus, Pencil, X, Loader2 } from 'lucide-react';

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Date "YYYY-MM-DD HH:mm[:ss]" -> valeur pour un input datetime-local */
function dbDateToDatetimeLocal(value: string): string {
  return value.replace(' ', 'T').slice(0, 16);
}

function formatAnnonceDate(value: string): string {
  const date = parseDbDate(value);
  if (!date) {
    return '—';
  }
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export const AdministrationPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isFeaturesLoading, refreshFeatures } = useFeatures();
  const [features, setFeatures] = useState<FeatureFlip[]>([]);
  const [updatingName, setUpdatingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Annonces éditoriales
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [annoncesError, setAnnoncesError] = useState<string | null>(null);
  const [isAnnonceFormOpen, setIsAnnonceFormOpen] = useState<boolean>(false);
  const [editingAnnonce, setEditingAnnonce] = useState<Annonce | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [isSavingAnnonce, setIsSavingAnnonce] = useState<boolean>(false);

  const isAdmin = isUserAdmin(user);

  const loadFeatures = useCallback(async () => {
    setError(null);
    try {
      const res = await featuresApi.getFeatures();
      setFeatures(res.features || []);
    } catch (err) {
      setError((err as Error).message || 'Erreur lors du chargement des features');
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadFeatures();
    }
  }, [isAdmin, loadFeatures]);

  const loadAnnonces = useCallback(async () => {
    setAnnoncesError(null);
    try {
      const res = await annoncesApi.getAnnonces();
      setAnnonces(res.annonces || []);
    } catch (err) {
      setAnnoncesError((err as Error).message || 'Erreur lors du chargement des annonces');
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAnnonces();
    }
  }, [isAdmin, loadAnnonces]);

  const openCreateAnnonceForm = () => {
    setEditingAnnonce(null);
    setFormTitle('');
    setFormContent('');
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 7);
    setFormEndDate(toDatetimeLocalValue(defaultEnd));
    setAnnoncesError(null);
    setIsAnnonceFormOpen(true);
  };

  const openEditAnnonceForm = (annonce: Annonce) => {
    setEditingAnnonce(annonce);
    setFormTitle(annonce.title);
    setFormContent(annonce.content);
    setFormEndDate(dbDateToDatetimeLocal(annonce.endDate));
    setAnnoncesError(null);
    setIsAnnonceFormOpen(true);
  };

  const closeAnnonceForm = () => {
    setIsAnnonceFormOpen(false);
    setEditingAnnonce(null);
  };

  const saveAnnonce = async () => {
    setIsSavingAnnonce(true);
    setAnnoncesError(null);
    try {
      if (editingAnnonce) {
        await annoncesApi.updateAnnonce(editingAnnonce.id, formTitle, formContent, formEndDate);
      } else {
        await annoncesApi.createAnnonce(formTitle, formContent, formEndDate);
      }
      setIsAnnonceFormOpen(false);
      setEditingAnnonce(null);
      await loadAnnonces();
    } catch (err) {
      setAnnoncesError((err as Error).message || 'Erreur lors de l\'enregistrement de l\'annonce');
    } finally {
      setIsSavingAnnonce(false);
    }
  };

  const getAnnonceStatus = (annonce: Annonce): { label: string; className: string } => {
    const now = Date.now();
    const end = parseDbDate(annonce.endDate)?.getTime();
    if (end !== undefined && end < now) {
      return { label: 'Expirée', className: 'bg-slate-100 text-slate-500' };
    }
    return { label: 'Visible', className: 'bg-green-100 text-green-700' };
  };

  const toggleFeature = async (feature: FeatureFlip) => {
    setUpdatingName(feature.name);
    setError(null);
    try {
      const res = await featuresApi.setFeatureEnabled(feature.name, !feature.enabled);
      setFeatures((prev) =>
        prev.map((f) => (f.name === res.feature.name ? { ...f, enabled: Boolean(res.feature.enabled) } : f))
      );
      // Rafraîchit le contexte pour propager l'état aux composants abonnés
      await refreshFeatures();
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la mise à jour de la feature');
    } finally {
      setUpdatingName(null);
    }
  };

  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const isLoading = isAuthLoading || (isAdmin && isFeaturesLoading && features.length === 0 && !error);

  return (
    <div className="max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
            <p className="text-sm text-slate-500">Gestion des fonctionnalités (feature flipping)</p>
          </div>
        </div>
        <button
          onClick={loadFeatures}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
          title="Rafraîchir"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Rafraîchir</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Liste des features */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : features.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Aucune feature enregistrée pour le moment.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {features.map((feature) => (
              <li
                key={feature.name}
                className="flex items-center justify-between gap-4 px-5 py-4"
                data-testid={`feature-${feature.name}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 font-mono text-sm">{feature.name}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        feature.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {feature.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {feature.description && (
                    <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
                  )}
                </div>

                <button
                  onClick={() => toggleFeature(feature)}
                  disabled={updatingName === feature.name}
                  aria-label={`${feature.enabled ? 'Désactiver' : 'Activer'} ${feature.name}`}
                  title={`${feature.enabled ? 'Désactiver' : 'Activer'} ${feature.name}`}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    feature.enabled ? 'bg-indigo-600' : 'bg-slate-200'
                  } ${updatingName === feature.name ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      feature.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Les features désactivées restent déployées mais inaccessibles : elles permettent de développer
        sans bloquer les mises en production.
      </p>

      {/* Annonces éditoriales */}
      <div className="flex items-center justify-between mt-10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Annonces</h2>
            <p className="text-sm text-slate-500">
              Affichées en haut de l'accueil et du forum général, entre leur date de création et leur date de fin.
            </p>
          </div>
        </div>
        {!isAnnonceFormOpen && (
          <button
            onClick={openCreateAnnonceForm}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 border border-amber-600 transition cursor-pointer"
            data-testid="new-annonce-button"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle annonce</span>
          </button>
        )}
      </div>

      {annoncesError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" data-testid="annonces-error">
          {annoncesError}
        </div>
      )}

      {isAnnonceFormOpen && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">
              {editingAnnonce ? `Modifier « ${editingAnnonce.title} »` : 'Nouvelle annonce'}
            </h3>
            <button
              onClick={closeAnnonceForm}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Annuler"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="annonce-title" className="block text-sm font-semibold text-slate-700 mb-1">
                Titre
              </label>
              <input
                id="annonce-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={500}
                placeholder="Ex: Maintenance du serveur samedi soir"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                data-testid="annonce-title-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contenu</label>
              <WysiwygEditor
                value={formContent}
                onChange={setFormContent}
                placeholder="Contenu de l'annonce (mise en forme riche possible)..."
                minHeight="160px"
              />
            </div>

            <div>
              <label htmlFor="annonce-end-date" className="block text-sm font-semibold text-slate-700 mb-1">
                Date de fin d'affichage
              </label>
              <input
                id="annonce-end-date"
                type="datetime-local"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                data-testid="annonce-end-date-input"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={closeAnnonceForm}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={saveAnnonce}
                disabled={isSavingAnnonce || !formTitle.trim() || !formContent.trim() || !formEndDate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                data-testid="annonce-save-button"
              >
                {isSavingAnnonce && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingAnnonce ? 'Enregistrer' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {annonces.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm" data-testid="annonces-empty">
            Aucune annonce pour le moment.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {annonces.map((annonce) => {
              const status = getAnnonceStatus(annonce);
              return (
                <li
                  key={annonce.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                  data-testid={`annonce-row-${annonce.id}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm truncate">{annonce.title}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Créée le {formatAnnonceDate(annonce.createDate)} · Jusqu'au {formatAnnonceDate(annonce.endDate)}
                    </p>
                  </div>

                  <button
                    onClick={() => openEditAnnonceForm(annonce)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer shrink-0"
                    aria-label={`Modifier ${annonce.title}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Modifier</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
