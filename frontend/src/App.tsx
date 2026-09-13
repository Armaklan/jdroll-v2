import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar, AppView } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MyCampaignsPage } from './pages/MyCampaignsPage';
import { AllCampaignsPage } from './pages/AllCampaignsPage';
import { CampaignForumPage } from './pages/CampaignForumPage';
import { GeneralForumPage } from './pages/GeneralForumPage';
import { TopicViewPage } from './pages/TopicViewPage';
import { SectionPlaceholderPage } from './pages/SectionPlaceholderPage';
import {
  Mail,
  MessagesSquare,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

const PUBLIC_VIEWS: AppView[] = ['home', 'help', 'login', 'register'];

export function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [previousCampaignView, setPreviousCampaignView] = useState<AppView>('my-campaigns');
  const [previousForumView, setPreviousForumView] = useState<'campaign-forum' | 'forum'>('campaign-forum');

  // Navigation gardée : redirige vers 'login' pour toute vue protégée sans authentification
  const handleNavigate = (view: AppView) => {
    if (!isAuthenticated && !PUBLIC_VIEWS.includes(view)) {
      setCurrentView('login');
    } else {
      setCurrentView(view);
    }
  };

  // Redirection automatique vers login si la session expire ou en cas de déconnexion sur une vue protégée
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !PUBLIC_VIEWS.includes(currentView)) {
      setCurrentView('login');
    }
  }, [isAuthenticated, isLoading, currentView]);

  const handleOpenCampaignForum = (campaignId: number, fromView: AppView = 'my-campaigns') => {
    if (!isAuthenticated) {
      setCurrentView('login');
      return;
    }
    setSelectedCampaignId(campaignId);
    setPreviousCampaignView(fromView);
    setCurrentView('campaign-forum');
  };

  const handleOpenTopic = (topicId: number, source: 'campaign-forum' | 'forum' = 'campaign-forum') => {
    if (!isAuthenticated) {
      setCurrentView('login');
      return;
    }
    setSelectedTopicId(topicId);
    setPreviousForumView(source);
    setCurrentView('topic-view');
  };

  const handleBackToForum = () => {
    handleNavigate(previousForumView);
  };

  // Vue effective à afficher (si protégée et non connecté, forcer l'affichage du login)
  const isProtected = !PUBLIC_VIEWS.includes(currentView);
  const effectiveView = !isLoading && !isAuthenticated && isProtected ? 'login' : currentView;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar currentView={effectiveView} setCurrentView={handleNavigate} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {effectiveView === 'home' && (
          <HomePage
            onNavigateLogin={() => handleNavigate('login')}
            onNavigateRegister={() => handleNavigate('register')}
            onNavigate={handleNavigate}
          />
        )}

        {effectiveView === 'login' && (
          <LoginPage
            onSuccess={() => handleNavigate('home')}
            onSwitchToRegister={() => handleNavigate('register')}
          />
        )}

        {effectiveView === 'register' && (
          <RegisterPage
            onSuccess={() => handleNavigate('home')}
            onSwitchToLogin={() => handleNavigate('login')}
          />
        )}

        {/* Communiquer Sub-items */}
        {effectiveView === 'messages' && (
          <SectionPlaceholderPage
            title="Messagerie Privée"
            category="Communiquer"
            description="Consultez vos messages privés, vos notifications de jeu et échangez avec d'autres joueurs ou maîtres du jeu."
            icon={Mail}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {effectiveView === 'chat' && (
          <SectionPlaceholderPage
            title="Tchat en Direct"
            category="Communiquer"
            description="Salon de discussion instantané pour échanger en direct avec la communauté et les membres connectés."
            icon={MessagesSquare}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {/* Jouer Sub-items */}
        {effectiveView === 'my-campaigns' && (
          <MyCampaignsPage
            onNavigate={handleNavigate}
            onSelectCampaign={(id) => handleOpenCampaignForum(id, 'my-campaigns')}
          />
        )}

        {effectiveView === 'join-campaign' && (
          <SectionPlaceholderPage
            title="Rejoindre une Campagne"
            category="Jouer"
            description="Explorez les campagnes avec recrutements ouverts et postulez avec vos fiches de personnages."
            icon={Sparkles}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {effectiveView === 'all-campaigns' && (
          <AllCampaignsPage
            onNavigate={handleNavigate}
            onSelectCampaign={(id) => handleOpenCampaignForum(id, 'all-campaigns')}
          />
        )}

        {/* Campaign Forum View */}
        {effectiveView === 'campaign-forum' && selectedCampaignId && (
          <CampaignForumPage
            campaignId={selectedCampaignId}
            onNavigate={handleNavigate}
            onSelectTopic={(id) => handleOpenTopic(id, 'campaign-forum')}
            onBack={() => handleNavigate(previousCampaignView)}
          />
        )}

        {/* Topic View */}
        {effectiveView === 'topic-view' && selectedTopicId && (
          <TopicViewPage
            topicId={selectedTopicId}
            onNavigate={handleNavigate}
            onBackToForum={handleBackToForum}
          />
        )}

        {/* Forum */}
        {effectiveView === 'forum' && (
          <GeneralForumPage
            onNavigate={handleNavigate}
            onSelectTopic={(id) => handleOpenTopic(id, 'forum')}
          />
        )}

        {/* Aide */}
        {effectiveView === 'help' && (
          <SectionPlaceholderPage
            title="Centre d'Aide & Documentation"
            category="Aide"
            description="Guides d'utilisation de la plateforme, syntaxe de mise en page, fonctionnement des dés et règles communautaires."
            icon={HelpCircle}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}
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
