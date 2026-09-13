import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar, AppView } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MyCampaignsPage } from './pages/MyCampaignsPage';
import { AllCampaignsPage } from './pages/AllCampaignsPage';
import { CampaignForumPage } from './pages/CampaignForumPage';
import { TopicViewPage } from './pages/TopicViewPage';
import { SectionPlaceholderPage } from './pages/SectionPlaceholderPage';
import {
  Mail,
  MessagesSquare,
  Sparkles,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';

export function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [previousCampaignView, setPreviousCampaignView] = useState<AppView>('my-campaigns');

  const handleOpenCampaignForum = (campaignId: number, fromView: AppView = 'my-campaigns') => {
    setSelectedCampaignId(campaignId);
    setPreviousCampaignView(fromView);
    setCurrentView('campaign-forum');
  };

  const handleOpenTopic = (topicId: number) => {
    setSelectedTopicId(topicId);
    setCurrentView('topic-view');
  };

  const handleBackToForum = () => {
    setCurrentView('campaign-forum');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {currentView === 'home' && (
          <HomePage
            onNavigateLogin={() => setCurrentView('login')}
            onNavigateRegister={() => setCurrentView('register')}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}

        {currentView === 'login' && (
          <LoginPage
            onSuccess={() => setCurrentView('home')}
            onSwitchToRegister={() => setCurrentView('register')}
          />
        )}

        {currentView === 'register' && (
          <RegisterPage
            onSuccess={() => setCurrentView('home')}
            onSwitchToLogin={() => setCurrentView('login')}
          />
        )}

        {/* Communiquer Sub-items */}
        {currentView === 'messages' && (
          <SectionPlaceholderPage
            title="Messagerie Privée"
            category="Communiquer"
            description="Consultez vos messages privés, vos notifications de jeu et échangez avec d'autres joueurs ou maîtres du jeu."
            icon={Mail}
            onNavigateHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'chat' && (
          <SectionPlaceholderPage
            title="Tchat en Direct"
            category="Communiquer"
            description="Salon de discussion instantané pour échanger en direct avec la communauté et les membres connectés."
            icon={MessagesSquare}
            onNavigateHome={() => setCurrentView('home')}
          />
        )}

        {/* Jouer Sub-items */}
        {currentView === 'my-campaigns' && (
          <MyCampaignsPage
            onNavigate={(view) => setCurrentView(view)}
            onSelectCampaign={(id) => handleOpenCampaignForum(id, 'my-campaigns')}
          />
        )}

        {currentView === 'join-campaign' && (
          <SectionPlaceholderPage
            title="Rejoindre une Campagne"
            category="Jouer"
            description="Explorez les campagnes avec recrutements ouverts et postulez avec vos fiches de personnages."
            icon={Sparkles}
            onNavigateHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'all-campaigns' && (
          <AllCampaignsPage
            onNavigate={(view) => setCurrentView(view)}
            onSelectCampaign={(id) => handleOpenCampaignForum(id, 'all-campaigns')}
          />
        )}

        {/* Campaign Forum View */}
        {currentView === 'campaign-forum' && selectedCampaignId && (
          <CampaignForumPage
            campaignId={selectedCampaignId}
            onNavigate={(view) => setCurrentView(view)}
            onSelectTopic={handleOpenTopic}
            onBack={() => setCurrentView(previousCampaignView)}
          />
        )}

        {/* Topic View */}
        {currentView === 'topic-view' && selectedTopicId && (
          <TopicViewPage
            topicId={selectedTopicId}
            onNavigate={(view) => setCurrentView(view)}
            onBackToForum={handleBackToForum}
          />
        )}

        {/* Forum */}
        {currentView === 'forum' && (
          <SectionPlaceholderPage
            title="Forum Général"
            category="Forum"
            description="Sections de discussions générales, auberge des joueurs, annonces et débats rôlistes."
            icon={MessageCircle}
            onNavigateHome={() => setCurrentView('home')}
          />
        )}

        {/* Aide */}
        {currentView === 'help' && (
          <SectionPlaceholderPage
            title="Centre d'Aide & Documentation"
            category="Aide"
            description="Guides d'utilisation de la plateforme, syntaxe de mise en page, fonctionnement des dés et règles communautaires."
            icon={HelpCircle}
            onNavigateHome={() => setCurrentView('home')}
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
