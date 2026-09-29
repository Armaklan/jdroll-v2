import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatures } from '../contexts/FeatureContext';
import { featuresApi } from '../api/features';
import { isUserAdmin } from '../utils/user';
import { FeatureFlip } from '../types/feature';
import { Shield, RefreshCw } from 'lucide-react';

export const AdministrationPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isFeaturesLoading, refreshFeatures } = useFeatures();
  const [features, setFeatures] = useState<FeatureFlip[]>([]);
  const [updatingName, setUpdatingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
};
