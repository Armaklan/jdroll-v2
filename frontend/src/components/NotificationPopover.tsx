import React from 'react';
import { NotificationItem } from '../types/notification';
import { Bell, Trash2, X, ExternalLink, MessageSquare, Dices, UserCheck, MessagesSquare } from 'lucide-react';
import { formatNotificationDate } from '../utils/date';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  isLoading: boolean;
  onDelete: (id: number) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onNavigateUrl: (url: string) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  isLoading,
  onDelete,
  onDeleteAll,
  onNavigateUrl,
}) => {
  if (!isOpen) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'topic':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      case 'dice':
        return <Dices className="w-4 h-4 text-amber-600" />;
      case 'perso':
      case 'character':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'chat':
      case 'tchat':
      case 'mp':
        return <MessagesSquare className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-sm text-slate-800">Notifications</span>
          {notifications.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-full">
              {notifications.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <button
              onClick={() => onDeleteAll()}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition font-medium flex items-center gap-1 cursor-pointer"
              title="Supprimer toutes les notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tout effacer</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body / List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {isLoading && notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">Chargement des notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <Bell className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Aucune notification</p>
            <p className="text-xs text-slate-400 mt-0.5">Vous êtes à jour dans vos parties et messages !</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (notif.url) {
                  onNavigateUrl(notif.url);
                  onClose();
                }
              }}
              className="p-3.5 hover:bg-slate-50 transition flex items-start justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      {notif.title || 'Notification'}
                    </span>
                    {notif.nb > 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full">
                        +{notif.nb}
                      </span>
                    )}
                  </div>

                  <div
                    className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed [&_a]:text-indigo-600 [&_a]:hover:underline"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const anchor = target.closest('a');
                      if (anchor) {
                        e.preventDefault();
                        e.stopPropagation();
                        const href = anchor.getAttribute('href') || notif.url;
                        if (href) {
                          onNavigateUrl(href);
                          onClose();
                        }
                      }
                    }}
                    dangerouslySetInnerHTML={{ __html: notif.content }}
                  />

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span>{formatNotificationDate(notif.lastUpdate)}</span>
                    {notif.url && (
                      <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 font-medium">
                        Voir <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notif.id);
                }}
                className="text-slate-300 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition shrink-0 opacity-80 group-hover:opacity-100 cursor-pointer"
                title="Supprimer cette notification"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
