import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { featuresApi } from '../api/features';
import { FeatureFlip } from '../types/feature';

interface FeatureContextType {
  features: FeatureFlip[];
  isLoading: boolean;
  isFeatureEnabled: (name: string) => boolean;
  refreshFeatures: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [features, setFeatures] = useState<FeatureFlip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshFeatures = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await featuresApi.getFeatures();
      setFeatures(res.features || []);
    } catch {
      // Liste indisponible : toutes les features restent considérées comme désactivées
      setFeatures([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshFeatures();
    } else {
      setFeatures([]);
    }
  }, [isAuthenticated, refreshFeatures]);

  const isFeatureEnabled = useCallback(
    (name: string): boolean => {
      const feature = features.find((f) => f.name === name);
      return Boolean(feature?.enabled);
    },
    [features]
  );

  return (
    <FeatureContext.Provider
      value={{
        features,
        isLoading,
        isFeatureEnabled,
        refreshFeatures,
      }}
    >
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};
