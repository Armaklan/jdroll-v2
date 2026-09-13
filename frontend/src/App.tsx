import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MyCampaignsPage } from './pages/MyCampaignsPage';
import { AllCampaignsPage } from './pages/AllCampaignsPage';
import { CampaignForumPage } from './pages/CampaignForumPage';
import { CampaignCharactersPage } from './pages/CampaignCharactersPage';
import { GeneralForumPage } from './pages/GeneralForumPage';
import { TopicViewPage } from './pages/TopicViewPage';
import { SectionPlaceholderPage } from './pages/SectionPlaceholderPage';
import {
  Mail,
  MessagesSquare,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium text-sm">Chargement de la session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function AppContent() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Communiquer */}
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <SectionPlaceholderPage
                  title="Messagerie Privée"
                  category="Communiquer"
                  description="Consultez vos messages privés, vos notifications de jeu et échangez avec d'autres joueurs ou maîtres du jeu."
                  icon={Mail}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <SectionPlaceholderPage
                  title="Tchat en Direct"
                  category="Communiquer"
                  description="Salon de discussion instantané pour échanger en direct avec la communauté et les membres connectés."
                  icon={MessagesSquare}
                />
              </ProtectedRoute>
            }
          />

          {/* Jouer */}
          <Route path="/my-campaigns" element={<MyCampaignsPage />} />
          <Route
            path="/join-campaign"
            element={
              <SectionPlaceholderPage
                title="Rejoindre une Campagne"
                category="Jouer"
                description="Explorez les campagnes avec recrutements ouverts et postulez avec vos fiches de personnages."
                icon={Sparkles}
              />
            }
          />
          <Route path="/all-campaigns" element={<AllCampaignsPage />} />
          <Route path="/campaigns" element={<Navigate to="/all-campaigns" replace />} />
          <Route path="/campaigns/:campaignId" element={<CampaignForumPage />} />
          <Route path="/campaign-forum/:campaignId" element={<CampaignForumPage />} />
          <Route path="/campaigns/:campaignId/characters" element={<CampaignCharactersPage />} />
          <Route path="/campaigns/:campaignId/gallery" element={<CampaignCharactersPage />} />

          {/* Forum & Topics */}
          <Route path="/topics/:topicId" element={<TopicViewPage />} />
          <Route path="/campaigns/:campaignId/topics/:topicId" element={<TopicViewPage />} />
          <Route path="/forum" element={<GeneralForumPage />} />

          {/* Aide */}
          <Route
            path="/help"
            element={
              <SectionPlaceholderPage
                title="Centre d'Aide & Documentation"
                category="Aide"
                description="Guides d'utilisation de la plateforme, syntaxe de mise en page, fonctionnement des dés et règles communautaires."
                icon={HelpCircle}
              />
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        JdRoll 2.0 &bull; Refonte Fastify + Vite React &bull; Compatible Base de données MySQL
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
