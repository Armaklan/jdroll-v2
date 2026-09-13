import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Dice6,
  LogIn,
  LogOut,
  User as UserIcon,
  UserPlus,
  Shield,
  ChevronDown,
  Home,
  MessageSquare,
  Mail,
  MessagesSquare,
  Gamepad2,
  Compass,
  Sparkles,
  Layers,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';

export type AppView =
  | 'home'
  | 'login'
  | 'register'
  | 'messages'
  | 'chat'
  | 'my-campaigns'
  | 'join-campaign'
  | 'all-campaigns'
  | 'campaign-forum'
  | 'topic-view'
  | 'forum'
  | 'help';

interface NavbarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<'communicate' | 'play' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<'communicate' | 'play' | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  const isCommunicateActive = currentView === 'messages' || currentView === 'chat';
  const isPlayActive =
    currentView === 'my-campaigns' ||
    currentView === 'join-campaign' ||
    currentView === 'all-campaigns';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-8" ref={dropdownRef}>
          {/* Logo */}
          <button
            onClick={() => handleNavigate('home')}
            className="flex items-center gap-2.5 text-slate-900 font-bold text-xl hover:opacity-90 transition group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Dice6 className="w-5 h-5 text-white" />
            </div>
            <span className="tracking-tight font-extrabold text-slate-900">JdRoll</span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Accueil */}
            <button
              onClick={() => handleNavigate('home')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                currentView === 'home'
                  ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </button>

            {/* Communiquer (Dropdown) */}
            <div className="relative">
              <button
                onClick={() =>
                  setOpenDropdown(openDropdown === 'communicate' ? null : 'communicate')
                }
                onMouseEnter={() => setOpenDropdown('communicate')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isCommunicateActive || openDropdown === 'communicate'
                    ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Communiquer</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openDropdown === 'communicate' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'communicate' && (
                <div
                  onMouseLeave={() => setOpenDropdown(null)}
                  className="absolute left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <button
                    onClick={() => handleNavigate('messages')}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition ${
                      currentView === 'messages'
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="font-medium">Messagerie privée</div>
                      <div className="text-xs text-slate-500">Boîte de réception & messages</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('chat')}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition ${
                      currentView === 'chat'
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <MessagesSquare className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="font-medium">Tchat</div>
                      <div className="text-xs text-slate-500">Discussions en direct</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Jouer (Dropdown) */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'play' ? null : 'play')}
                onMouseEnter={() => setOpenDropdown('play')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isPlayActive || openDropdown === 'play'
                    ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Jouer</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openDropdown === 'play' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'play' && (
                <div
                  onMouseLeave={() => setOpenDropdown(null)}
                  className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <button
                    onClick={() => handleNavigate('my-campaigns')}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition ${
                      currentView === 'my-campaigns'
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="font-medium">Mes campagnes</div>
                      <div className="text-xs text-slate-500">Parties en cours et personnages</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('join-campaign')}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition ${
                      currentView === 'join-campaign'
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="font-medium">Rejoindre une campagne</div>
                      <div className="text-xs text-slate-500">Recrutements ouverts</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate('all-campaigns')}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition ${
                      currentView === 'all-campaigns'
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="font-medium">Voir toutes les campagnes</div>
                      <div className="text-xs text-slate-500">Annuaire complet des tables</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Forum */}
            <button
              onClick={() => handleNavigate('forum')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                currentView === 'forum'
                  ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <MessagesSquare className="w-4 h-4" />
              <span>Forum</span>
            </button>

            {/* Aide */}
            <button
              onClick={() => handleNavigate('help')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                currentView === 'help'
                  ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Aide</span>
            </button>
          </nav>
        </div>

        {/* Right side: Auth State & Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-800">{user.username}</span>
                {user.profil === 1 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigate('login')}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition ${
                  currentView === 'login'
                    ? 'bg-slate-100 text-slate-900 border border-slate-300 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Connexion</span>
              </button>
              <button
                onClick={() => handleNavigate('register')}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition shadow-sm ${
                  currentView === 'register'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Inscription</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl">
          <div className="space-y-1">
            {/* Accueil */}
            <button
              onClick={() => handleNavigate('home')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                currentView === 'home'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Home className="w-4 h-4 text-indigo-600" />
              <span>Accueil</span>
            </button>

            {/* Communiquer Submenu Accordion */}
            <div>
              <button
                onClick={() =>
                  setMobileSubmenu(mobileSubmenu === 'communicate' ? null : 'communicate')
                }
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Communiquer</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    mobileSubmenu === 'communicate' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {mobileSubmenu === 'communicate' && (
                <div className="pl-6 space-y-1 mt-1 border-l-2 border-indigo-100 ml-3">
                  <button
                    onClick={() => handleNavigate('messages')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      currentView === 'messages'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Messagerie privée</span>
                  </button>
                  <button
                    onClick={() => handleNavigate('chat')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      currentView === 'chat'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessagesSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Tchat</span>
                  </button>
                </div>
              )}
            </div>

            {/* Jouer Submenu Accordion */}
            <div>
              <button
                onClick={() => setMobileSubmenu(mobileSubmenu === 'play' ? null : 'play')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  <Gamepad2 className="w-4 h-4 text-indigo-600" />
                  <span>Jouer</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    mobileSubmenu === 'play' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {mobileSubmenu === 'play' && (
                <div className="pl-6 space-y-1 mt-1 border-l-2 border-indigo-100 ml-3">
                  <button
                    onClick={() => handleNavigate('my-campaigns')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      currentView === 'my-campaigns'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Mes campagnes</span>
                  </button>
                  <button
                    onClick={() => handleNavigate('join-campaign')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      currentView === 'join-campaign'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Rejoindre une campagne</span>
                  </button>
                  <button
                    onClick={() => handleNavigate('all-campaigns')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      currentView === 'all-campaigns'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Voir toutes les campagnes</span>
                  </button>
                </div>
              )}
            </div>

            {/* Forum */}
            <button
              onClick={() => handleNavigate('forum')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                currentView === 'forum'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MessagesSquare className="w-4 h-4 text-indigo-600" />
              <span>Forum</span>
            </button>

            {/* Aide */}
            <button
              onClick={() => handleNavigate('help')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                currentView === 'help'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Aide</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-800">{user.username}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50 hover:bg-red-100 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNavigate('login')}
                  className="w-full py-2 text-center text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Connexion
                </button>
                <button
                  onClick={() => handleNavigate('register')}
                  className="w-full py-2 text-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Inscription
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
