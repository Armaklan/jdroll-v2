import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { User as UserIcon, ArrowRight } from 'lucide-react';
import { AppView, viewToPath } from '../components/Navbar';

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
      {/* Hero section */}
      <div className="bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Bienvenue sur <span className="text-indigo-600">JdRoll 2.0</span>
            </h1>
            <p className="text-slate-600 mt-2 max-w-xl text-sm sm:text-base leading-relaxed">
              Plateforme de jeu de rôle textuel par forum.
            </p>
            <p className="text-red-800 mt-2 max-w-xl text-sm sm:text-base leading-relaxed">
              Attention, tout usage de ce site est à vos risques et périls. Cette plateforme est mise à disposition uniquement à des fins de démonstrations. Toute utilisation est sous votre responsabilité.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            {isLoading ? (
              <div className="text-slate-500 text-sm">Chargement du profil...</div>
            ) : isAuthenticated && user ? (
              <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-2xl text-left min-w-[220px]">
                <div className="text-xs text-slate-500 font-medium">Connecté en tant que</div>
                <div className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  {user.username}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{user.mail}</div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleNavigateLogin}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition shadow-sm text-center"
                >
                  Se connecter
                </button>
                <button
                  onClick={handleNavigateRegister}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded-xl transition text-center shadow-sm"
                >
                  S'inscrire
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleNavigate('my-campaigns')}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md p-5 rounded-2xl text-left transition group"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            Mes Parties
          </div>
          <div className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Mes Campagnes</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Accédez à vos tables de jeu en tant que MJ ou joueur
          </p>
        </button>

        <button
          onClick={() => handleNavigate('create-campaign')}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md p-5 rounded-2xl text-left transition group cursor-pointer"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            Création
          </div>
          <div className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Créer une Campagne</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Lancez votre table, personnalisez l'univers et invitez des joueurs
          </p>
        </button>

        <button
          onClick={() => handleNavigate('join-campaign')}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md p-5 rounded-2xl text-left transition group"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            Recrutement
          </div>
          <div className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Rejoindre</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Découvrez les campagnes ouvertes aux nouveaux joueurs
          </p>
        </button>

        <button
          onClick={() => handleNavigate('forum')}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md p-5 rounded-2xl text-left transition group"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            Communauté
          </div>
          <div className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Forum Général</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Échangez avec la communauté et trouvez des MJ
          </p>
        </button>
      </div>
    </div>
  );
};
