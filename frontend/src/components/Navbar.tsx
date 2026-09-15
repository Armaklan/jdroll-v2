import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../api/notifications';
import { NotificationItem } from '../types/notification';
import { NotificationPopover } from './NotificationPopover';
import {
  Dice6,
  LogIn,
  LogOut,
  User as UserIcon,
  UserPlus,
  Home,
  MessageSquare,
  Mail,
  MessagesSquare,
  Gamepad2,
  Menu,
  X,
  Bell,
} from 'lucide-react';

export type AppView =
  | 'home'
  | 'login'
  | 'register'
  | 'messages'
  | 'chat'
  | 'my-campaigns'
  | 'create-campaign'
  | 'join-campaign'
  | 'campaign-forum'
  | 'topic-view'
  | 'forum'
  | 'help';

export const viewToPath = (view: AppView): string => {
  switch (view) {
    case 'home':
      return '/';
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'messages':
      return '/messages';
    case 'chat':
      return '/chat';
    case 'my-campaigns':
      return '/my-campaigns';
    case 'create-campaign':
      return '/campaigns/new';
    case 'join-campaign':
      return '/join-campaign';
    case 'campaign-forum':
      return '/my-campaigns';
    case 'topic-view':
      return '/forum/0';
    case 'forum':
      return '/forum/0';
    case 'help':
      return '/help';
    default:
      return '/';
  }
};

interface NavbarProps {
  currentView?: AppView;
  setCurrentView?: (view: AppView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    try {
      setIsNotifLoading(true);
      const res = await notificationsApi.getNotifications();
      setNotifications(res.notifications || []);
    } catch {
      // ignore
    } finally {
      setIsNotifLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, location.pathname]);

  const handleDeleteNotification = async (id: number) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await notificationsApi.deleteAllNotifications();
      setNotifications([]);
    } catch {
      // ignore
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActiveView = (): AppView => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/messages') return 'messages';
    if (path === '/chat') return 'chat';
    if (path === '/my-campaigns') return 'my-campaigns';
    if (path === '/campaigns/new' || path === '/create-campaign') return 'create-campaign';
    if (path === '/join-campaign' || path === '/all-campaigns' || path === '/campaigns') return 'join-campaign';
    if (path === '/forum/0' || path === '/forum') return 'forum';
    if (path.startsWith('/forum/')) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 3) return 'topic-view';
      if (parts[1] === '0') return 'forum';
      return 'campaign-forum';
    }
    if (path.startsWith('/campaigns/')) return 'campaign-forum';
    if (path.startsWith('/topics/')) return 'topic-view';
    if (path === '/help') return 'help';
    return currentView || 'home';
  };

  const activeView = getActiveView();

  const handleNavigate = (view: AppView) => {
    if (setCurrentView) {
      setCurrentView(view);
    }
    navigate(viewToPath(view));
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isPlayActive =
    activeView === 'my-campaigns' ||
    activeView === 'create-campaign' ||
    activeView === 'join-campaign' ||
    activeView === 'campaign-forum';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-8">
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
                activeView === 'home'
                  ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </button>

            {/* Jouer */}
            <button
                onClick={() => handleNavigate('my-campaigns')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    isPlayActive
                        ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Jouer</span>
            </button>

            {/* Forum */}
            <button
              onClick={() => handleNavigate('forum')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                activeView === 'forum' || activeView === 'topic-view'
                  ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <MessagesSquare className="w-4 h-4" />
              <span>Forum</span>
            </button>

            {/* Tchat */}
            <button
                onClick={() => handleNavigate('chat')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    activeView === 'chat'
                        ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Tchat</span>
            </button>

            {/* Messagerie */}
            <button
                onClick={() => handleNavigate('messages')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    activeView === 'messages'
                        ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
            >
              <Mail className="w-4 h-4" />
              <span>Messagerie</span>
            </button>
          </nav>
        </div>

        {/* Right side: Auth State & Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Notifications Button & Popover */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`relative p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
                    isNotifOpen
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  }`}
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {notifications.length > 99 ? '99+' : notifications.length}
                    </span>
                  )}
                </button>

                <NotificationPopover
                  isOpen={isNotifOpen}
                  onClose={() => setIsNotifOpen(false)}
                  notifications={notifications}
                  isLoading={isNotifLoading}
                  onDelete={handleDeleteNotification}
                  onDeleteAll={handleDeleteAllNotifications}
                  onNavigateUrl={(url) => {
                    navigate(url);
                    setIsNotifOpen(false);
                  }}
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-sm font-semibold text-slate-800">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
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
                  activeView === 'login'
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
                  activeView === 'register'
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

        {/* Mobile menu and notif button */}
        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {notifications.length > 99 ? '99+' : notifications.length}
                  </span>
                )}
              </button>

              <NotificationPopover
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                notifications={notifications}
                isLoading={isNotifLoading}
                onDelete={handleDeleteNotification}
                onDeleteAll={handleDeleteAllNotifications}
                onNavigateUrl={(url) => {
                  navigate(url);
                  setIsNotifOpen(false);
                }}
              />
            </div>
          )}
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
                activeView === 'home'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Home className="w-4 h-4 text-indigo-600" />
              <span>Accueil</span>
            </button>

            {/* Jouer */}
            <button
                onClick={() => handleNavigate('my-campaigns')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    isPlayActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Gamepad2 className="w-4 h-4 text-indigo-600" />
              <span>Jouer</span>
            </button>

            {/* Forum */}
            <button
              onClick={() => handleNavigate('forum')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                activeView === 'forum' || activeView === 'topic-view'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MessagesSquare className="w-4 h-4 text-indigo-600" />
              <span>Forum</span>
            </button>

            {/* Tchat */}
            <button
                onClick={() => handleNavigate('chat')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    activeView === 'chat'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Tchat</span>
            </button>

            {/* Messagerie */}
            <button
                onClick={() => handleNavigate('messages')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    activeView === 'messages'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Messagerie</span>
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
                  onClick={handleLogout}
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
