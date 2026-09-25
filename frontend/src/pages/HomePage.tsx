import React, {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {authApi} from '../api/auth';
import {Dices, Gamepad2, Globe2, PenTool, Sparkles,} from 'lucide-react';
import {AppView, viewToPath} from '../components/Navbar';
import {GlobalFloatingSearch} from '../components/GlobalFloatingSearch';
import {HomeCampaignCarousel} from '../components/HomeCampaignCarousel';
import {HomeStats} from '../components/HomeStats';
import {HomeChatPreview} from '../components/HomeChatPreview';
import {HomeRecentTopics} from '../components/HomeRecentTopics';

interface HomePageProps {
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  onNavigate?: (view: AppView) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateLogin,
  onNavigateRegister,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleNavigateLogin = () => {
    if (onNavigateLogin) onNavigateLogin();
    else navigate('/login');
  };

  const handleNavigateRegister = () => {
    if (onNavigateRegister) onNavigateRegister();
    else navigate('/register');
  };

  const handleNavigate = (view: AppView) => {
    if (onNavigate) onNavigate(view);
    else navigate(viewToPath(view));
  };

  useEffect(() => {
    authApi.checkHealth().catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {isAuthenticated && <GlobalFloatingSearch activeTab="none" />}

      {/* Hero section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
          <Dices className="absolute -top-6 -right-6 w-56 h-56 text-indigo-300 rotate-12" />
          <Sparkles className="absolute bottom-4 left-1/3 w-24 h-24 text-purple-300 -rotate-12" />
        </div>

        <div className="relative p-8 sm:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-xs font-semibold backdrop-blur-sm mb-4">
              <Gamepad2 className="w-3.5 h-3.5" />
              Jeu de rôle par forum
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Bienvenue sur <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">JdRoll 2.0</span>
            </h1>
            <p className="mt-3 text-lg sm:text-xl font-medium text-indigo-100">
              Du jeu, du rôle, du roll !
            </p>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Créez vos campagnes, incarnez vos personnages et laissez les dés
              décider de votre destin — à votre rythme, où que vous soyez.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
            {isLoading ? (
              <div className="text-slate-300 text-sm">Chargement du profil...</div>
            ) : isAuthenticated && user ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                    onClick={() => handleNavigate('my-campaigns')}
                    className="px-5 py-2.5 bg-white hover:bg-indigo-50 text-indigo-950 font-semibold rounded-xl transition shadow-sm text-center cursor-pointer"
                >
                  Mes campagnes
                </button>
                <button
                    onClick={() => handleNavigate('create-campaign')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-sm text-center cursor-pointer"
                >
                  Créer une campagne
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                    onClick={handleNavigateLogin}
                    className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl transition shadow-md text-center cursor-pointer"
                >
                  Se connecter
                </button>
                <button
                    onClick={handleNavigateRegister}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold rounded-xl transition text-center backdrop-blur-sm cursor-pointer"
                >
                  S'inscrire
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {isLoading ? null : isAuthenticated && user ? (
          <div data-testid="home-dashboard" className="space-y-8">
            {/* Community stats : online users, latest registrations, birthdays */}
            <HomeStats />

            {/* Chat preview and most recently active forum topics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HomeChatPreview />
              <HomeRecentTopics />
            </div>
          </div>
      ) : (
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <li className="p-4">
          <article className="h-full bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl p-6 transition-all">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                Une communauté
              </div>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              <p className="mb-3">
                La barrière des distances n'existant pas, vous rencontrerez ici des
                joueurs et joueuses venus de tous horizons.
              </p>
              <p>
                Une grande communauté francophone est prête à vous accueillir autour
                du jeu de rôle pour partager de bons moments, à toute heure du jour,
                voire de la nuit. Ouvert même les jours fériés !
              </p>
            </div>
          </article>
        </li>

        <li className="p-4">
          <article className="h-full bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl p-6 transition-all">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                <Dices className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                Du choix
              </div>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              <p className="mb-3">
                Fan de science-fiction ? Plutôt épée et bouclier contre un vil félon ?
                Vous préférez cramer du zombie entre copains ? Ou découvrir la
                dernière sortie indé ?
              </p>
              <p className="mb-3">JdRoll est fait pour vous !</p>
              <p>
                Tout ce qu'on vous demande, c'est de prendre plaisir à jouer. Et grâce
                au PbF, rien ne vous empêche de suivre plusieurs parties à la fois !
              </p>
            </div>
          </article>
        </li>

        <li className="p-4">
          <article className="h-full bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl p-6 transition-all">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <PenTool className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                Une plateforme dédiée
              </div>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              <p className="mb-3">
                jdRoll a été conçu spécialement pour le jeu de rôle par forum :
                bloc-notes, lanceur de dés, fiches de personnage... tout le matériel
                nécessaire pour organiser une partie ou la jouer.
              </p>
              <p>
                Tout ici a été pensé pour le confort des MJ et des joueurs. Et
                l'endroit est en perpétuelle évolution !
              </p>
            </div>
          </article>
        </li>
      </ul>
      )}

      {/* Campaign carousel : recruiting tables, or random active ones */}
      <HomeCampaignCarousel />
    </div>
  );
};
