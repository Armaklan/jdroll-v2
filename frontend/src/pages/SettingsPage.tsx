import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { User, UpdateProfileData, NotificationSettings } from '../types/auth';
import { 
  User as UserIcon, 
  Mail, 
  Image as ImageIcon, 
  Type, 
  Calendar, 
  Check, 
  ChevronLeft, 
  Loader2, 
  AlertCircle, 
  Bell,
  Key,
  Settings
} from 'lucide-react';

// Types pour les onglets
type TabType = 'profile' | 'notifications' | 'password';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'profile', label: 'Profil', icon: <UserIcon className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'password', label: 'Mot de passe', icon: <Key className="w-4 h-4" /> },
];

// Interface pour les paramètres de notification
interface NotificationSetting {
  key: keyof NotificationSettings;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'notification' | 'email';
}

const notificationCategories: NotificationSetting[] = [
  {
    key: 'notif_mp',
    label: 'Messages privés',
    description: 'Notifications pour les nouveaux messages privés sur le site',
    icon: <Mail className="w-4 h-4" />,
    category: 'notification',
  },
  {
    key: 'notif_inscription',
    label: 'Nouveaux participants',
    description: 'Notifications quand un joueur rejoint votre campagne',
    icon: <UserIcon className="w-4 h-4" />,
    category: 'notification',
  },
  {
    key: 'notif_perso',
    label: 'Personnages',
    description: 'Notifications liées à vos personnages',
    icon: <UserIcon className="w-4 h-4" />,
    category: 'notification',
  },
  {
    key: 'notif_message',
    label: 'Messages de campagne',
    description: 'Notifications pour les nouveaux messages dans vos campagnes',
    icon: <Mail className="w-4 h-4" />,
    category: 'notification',
  },
];

const emailCategories: NotificationSetting[] = [
  {
    key: 'mail_mp',
    label: 'Messages privés',
    description: 'Emails pour les nouveaux messages privés',
    icon: <Mail className="w-4 h-4" />,
    category: 'email',
  },
  {
    key: 'mail_inscription',
    label: 'Nouveaux participants',
    description: 'Emails quand un joueur rejoint votre campagne',
    icon: <UserIcon className="w-4 h-4" />,
    category: 'email',
  },
  {
    key: 'mail_perso',
    label: 'Personnages',
    description: 'Emails liés à vos personnages',
    icon: <UserIcon className="w-4 h-4" />,
    category: 'email',
  },
  {
    key: 'mail_message',
    label: 'Messages de campagne',
    description: 'Emails pour les nouveaux messages dans vos campagnes',
    icon: <Mail className="w-4 h-4" />,
    category: 'email',
  },
];

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile form state
  const [formData, setFormData] = useState<UpdateProfileData>({
    mail: '',
    avatar: '',
    description: '',
    titre: '',
    birthDate: null,
  });

  // Notification settings state
  const [settings, setSettings] = useState<NotificationSettings>({
    notif_mp: 1,
    notif_inscription: 1,
    notif_perso: 1,
    notif_message: 1,
    mail_mp: 1,
    mail_inscription: 0,
    mail_perso: 0,
    mail_message: 0,
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    setFormData({
      mail: currentUser.mail,
      avatar: currentUser.avatar,
      description: currentUser.description,
      titre: currentUser.titre,
      birthDate: currentUser.birthDate || null,
    });
    setSettings({
      notif_mp: currentUser.notif_mp ?? 1,
      notif_inscription: currentUser.notif_inscription ?? 1,
      notif_perso: currentUser.notif_perso ?? 1,
      notif_message: currentUser.notif_message ?? 1,
      mail_mp: currentUser.mail_mp ?? 1,
      mail_inscription: currentUser.mail_inscription ?? 0,
      mail_perso: currentUser.mail_perso ?? 0,
      mail_message: currentUser.mail_message ?? 0,
    });
    setIsLoading(false);
  }, [currentUser, navigate]);

  // Synchroniser formData avec user quand on est sur l'onglet profile
  // Se déclenche quand activeTab change OU quand user change (après refreshUser)
  useEffect(() => {
    if (activeTab === 'profile' && user) {
      // console.log('Updating formData, user.birthDate:', user.birthDate);
      setFormData({
        mail: user.mail,
        avatar: user.avatar,
        description: user.description,
        titre: user.titre,
        birthDate: user.birthDate ?? null,
      });
    }
  }, [activeTab, user]);

  // Profile handlers
  const handleProfileChange = (field: keyof UpdateProfileData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const dataToSend: UpdateProfileData = {};
      if (formData.mail !== user?.mail) dataToSend.mail = formData.mail;
      if (formData.avatar !== user?.avatar) dataToSend.avatar = formData.avatar;
      if (formData.description !== user?.description) dataToSend.description = formData.description;
      if (formData.titre !== user?.titre) dataToSend.titre = formData.titre;
      if (formData.birthDate !== user?.birthDate) dataToSend.birthDate = formData.birthDate;

      if (Object.keys(dataToSend).length === 0) {
        setSuccess('Aucune modification détectée');
        setIsSubmitting(false);
        return;
      }

      await authApi.updateProfile(dataToSend);
      await refreshUser();
      setSuccess('Profil mis à jour avec succès !');
      setUser(currentUser!);
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Notification settings handlers
  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key] === 1 ? 0 : 1,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await authApi.updateNotificationSettings(settings);
      await refreshUser();
      setUser(result.user);
      setSuccess('Paramètres de notification mis à jour avec succès !');
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la mise à jour des paramètres');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password handlers
  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setIsSubmitting(false);
      return;
    }

    try {
      await authApi.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setSuccess('Mot de passe mis à jour avec succès !');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Veuillez vous connecter pour accéder à cette page</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 px-6">
            <nav className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <ProfileTab
                user={user}
                formData={formData}
                isSubmitting={isSubmitting}
                onChange={handleProfileChange}
                onSubmit={handleProfileSubmit}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab
                settings={settings}
                isSubmitting={isSubmitting}
                onToggle={toggleSetting}
                onSubmit={handleNotificationSubmit}
              />
            )}

            {activeTab === 'password' && (
              <PasswordTab
                passwordData={passwordData}
                isSubmitting={isSubmitting}
                onChange={handlePasswordChange}
                onSubmit={handlePasswordSubmit}
              />
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-4 py-2 text-red-600 hover:text-red-700 font-medium transition"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component
interface ProfileTabProps {
  user: User;
  formData: UpdateProfileData;
  isSubmitting: boolean;
  onChange: (field: keyof UpdateProfileData, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, formData, isSubmitting, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    {/* Profile Header */}
    <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 mb-6">
      <div className="flex items-center gap-4">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-indigo-600" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-slate-900">{user.username}</h2>
          <p className="text-sm text-slate-500">{user.titre}</p>
        </div>
      </div>
    </div>

    {/* Email */}
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <Mail className="w-4 h-4" />
        Adresse email
      </label>
      <input
        type="email"
        value={formData.mail}
        onChange={(e) => onChange('mail', e.target.value)}
        placeholder="Entrez votre adresse email"
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>

    {/* Avatar */}
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Avatar (URL)
      </label>
      <input
        type="url"
        value={formData.avatar}
        onChange={(e) => onChange('avatar', e.target.value)}
        placeholder="https://exemple.com/avatar.png"
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
      />
      {formData.avatar && (
        <div className="mt-2">
          <img
            src={formData.avatar}
            alt="Aperçu"
            className="w-24 h-24 rounded-xl object-cover border border-slate-200"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>

    {/* Titre */}
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <Type className="w-4 h-4" />
        Titre
      </label>
      <input
        type="text"
        value={formData.titre}
        onChange={(e) => onChange('titre', e.target.value)}
        placeholder="Votre titre (ex: Maître du Jeu)"
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>

    {/* Description */}
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <UserIcon className="w-4 h-4" />
        Description
      </label>
      <textarea
        value={formData.description}
        onChange={(e) => onChange('description', e.target.value)}
        placeholder="Décrivez-vous en quelques mots..."
        rows={4}
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition resize-none"
      />
    </div>

    {/* Birth Date */}
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Date de naissance
      </label>
      <input
        type="date"
        value={formData.birthDate ? formData.birthDate : ''}
        onChange={(e) => onChange('birthDate', e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>

    {/* Submit Button */}
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Mise à jour en cours...</span>
        </>
      ) : (
        <>
          <Check className="w-5 h-5" />
          <span>Enregistrer les modifications</span>
        </>
      )}
    </button>
  </form>
);

// Notifications Tab Component
interface NotificationsTabProps {
  settings: NotificationSettings;
  isSubmitting: boolean;
  onToggle: (key: keyof NotificationSettings) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({ settings, isSubmitting, onToggle, onSubmit }) => (
  <form onSubmit={onSubmit} className="space-y-8">
    {/* Notifications Section */}
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-900">Notifications sur le site</h2>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Activez ou désactivez les notifications qui apparaissent dans votre barre de notifications sur le site.
      </p>
      
      <div className="space-y-4">
        {notificationCategories.map((setting) => (
          <div
            key={`notif-${setting.key}`}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                {setting.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{setting.label}</h3>
                <p className="text-sm text-slate-500">{setting.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggle(setting.key as keyof NotificationSettings)}
              className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                settings[setting.key as keyof NotificationSettings] === 1
                  ? 'bg-indigo-600'
                  : 'bg-slate-200'
              }`}
              role="switch"
              aria-checked={settings[setting.key as keyof NotificationSettings] === 1}
            >
              <span
                className={`inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings[setting.key as keyof NotificationSettings] === 1
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* Email Section */}
    <div className="pt-4 border-t border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-900">Notifications par email</h2>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Activez ou désactivez les notifications envoyées par email.
      </p>
      
      <div className="space-y-4">
        {emailCategories.map((setting) => (
          <div
            key={`mail-${setting.key}`}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                {setting.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{setting.label}</h3>
                <p className="text-sm text-slate-500">{setting.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggle(setting.key as keyof NotificationSettings)}
              className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                settings[setting.key as keyof NotificationSettings] === 1
                  ? 'bg-indigo-600'
                  : 'bg-slate-200'
              }`}
              role="switch"
              aria-checked={settings[setting.key as keyof NotificationSettings] === 1}
            >
              <span
                className={`inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings[setting.key as keyof NotificationSettings] === 1
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* Submit Button */}
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Sauvegarde en cours...</span>
        </>
      ) : (
        <>
          <Check className="w-5 h-5" />
          <span>Enregistrer les paramètres</span>
        </>
      )}
    </button>
  </form>
);

// Password Tab Component
interface PasswordTabProps {
  passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  isSubmitting: boolean;
  onChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const PasswordTab: React.FC<PasswordTabProps> = ({ passwordData, isSubmitting, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 mb-6">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-slate-900">Changer le mot de passe</h2>
      </div>
      <p className="text-sm text-slate-500 mt-1">
        Pour des raisons de sécurité, vous devrez vous reconnecter après avoir changé votre mot de passe.
      </p>
    </div>

    {/* Current Password */}
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <Key className="w-4 h-4" />
        Mot de passe actuel
      </label>
      <input
        type="password"
        value={passwordData.currentPassword}
        onChange={(e) => onChange('currentPassword', e.target.value)}
        placeholder="Entrez votre mot de passe actuel"
        required
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>

    {/* New Password */}
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <Key className="w-4 h-4" />
        Nouveau mot de passe
      </label>
      <input
        type="password"
        value={passwordData.newPassword}
        onChange={(e) => onChange('newPassword', e.target.value)}
        placeholder="Entrez votre nouveau mot de passe (min 3 caractères)"
        minLength={3}
        required
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>

    {/* Confirm Password */}
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <Key className="w-4 h-4" />
        Confirmer le nouveau mot de passe
      </label>
      <input
        type="password"
        value={passwordData.confirmPassword}
        onChange={(e) => onChange('confirmPassword', e.target.value)}
        placeholder="Confirmez votre nouveau mot de passe"
        required
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
      />
    </div>

    {/* Submit Button */}
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Changement en cours...</span>
        </>
      ) : (
        <>
          <Check className="w-5 h-5" />
          <span>Changer le mot de passe</span>
        </>
      )}
    </button>
  </form>
);
