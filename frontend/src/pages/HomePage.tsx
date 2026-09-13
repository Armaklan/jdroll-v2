import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { Server, CheckCircle2, XCircle, User as UserIcon, Shield, Database, Lock, ArrowRight } from 'lucide-react';
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
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');

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
    authApi
      .checkHealth()
      .then(() => setApiStatus('connected'))
      .catch(() => setApiStatus('error'));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Squelette technique & Thème Blanc
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Bienvenue sur <span className="text-indigo-600">JdRoll 2.0</span>
            </h1>
            <p className="text-slate-600 mt-2 max-w-xl text-sm sm:text-base leading-relaxed">
              Plateforme de jeu de rôle textuel par forum. Refonte moderne propulsée par Fastify (Node.js) et React (Vite).
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
          onClick={() => handleNavigate('all-campaigns')}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md p-5 rounded-2xl text-left transition group"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            Annuaire
          </div>
          <div className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Toutes les Campagnes</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Explorez les parties actives, archives et univers
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

      {/* Status & Diagnostic cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API Backend Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-600" /> Backend API
            </span>
            {apiStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-emerald-700 text-xs font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> En ligne
              </span>
            ) : apiStatus === 'error' ? (
              <span className="flex items-center gap-1 text-red-700 text-xs font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                <XCircle className="w-3.5 h-3.5" /> Déconnecté
              </span>
            ) : (
              <span className="text-slate-400 text-xs">Vérification...</span>
            )}
          </div>
          <p className="text-sm text-slate-700 font-medium">Fastify avec architecture en couches</p>
          <div className="text-xs text-slate-500 mt-2 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
            Controllers / UseCases / Queries / Repositories
          </div>
        </div>

        {/* Database Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-600" /> Base de Données
            </span>
            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">MySQL</span>
          </div>
          <p className="text-sm text-slate-700 font-medium">Schéma MySQL existant</p>
          <div className="text-xs text-slate-500 mt-2 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
            data/create.sql (mots de passe MD5)
          </div>
        </div>

        {/* Auth status Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600" /> Authentification
            </span>
            {isAuthenticated ? (
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                Session Active
              </span>
            ) : (
              <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">Non connecté</span>
            )}
          </div>
          <p className="text-sm text-slate-700 font-medium">Jetons JWT sécurisés et stockage local</p>
          <div className="text-xs text-slate-500 mt-2 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
            {isAuthenticated ? `Utilisateur ID: ${user?.id}` : 'Connexion requise'}
          </div>
        </div>
      </div>

      {/* Authenticated User info details */}
      {isAuthenticated && user && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" /> Informations du compte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">ID Utilisateur</div>
              <div className="text-base font-semibold text-slate-900 mt-1">{user.id}</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Identifiant</div>
              <div className="text-base font-semibold text-slate-900 mt-1">{user.username}</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Email</div>
              <div className="text-base font-semibold text-slate-900 mt-1">{user.mail}</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Profil / Droits</div>
              <div className="text-base font-semibold text-slate-900 mt-1">
                {user.profil === 1 ? 'Administrateur (1)' : 'Joueur Standard (0)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
