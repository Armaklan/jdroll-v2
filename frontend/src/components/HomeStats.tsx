import React, { useEffect, useState } from 'react';
import { homeApi } from '../api/home';
import { usePresence } from '../contexts/PresenceContext';
import { HomeCommunityStats } from '../types/home';
import { getUserColorClass } from '../utils/user';
import { Cake, UserPlus, Users } from 'lucide-react';

function formatSubscribeDate(date: string | null | undefined): string {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function UserListItem({ user, meta }: { user: { id: number; username: string; avatar?: string | null; profil?: number | null }; meta?: string }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <span className={`text-sm font-medium truncate ${getUserColorClass(user.profil)}`}>
        {user.username}
      </span>
      {meta && <span className="text-xs text-slate-400 shrink-0">{meta}</span>}
    </li>
  );
}

export const HomeStats: React.FC = () => {
  const { onlineUsers } = usePresence();
  const [stats, setStats] = useState<HomeCommunityStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const communityStats = await homeApi.getCommunityStats();
        if (cancelled) return;
        setStats(communityStats);
      } catch {
        if (!cancelled) setError('Impossible de charger les statistiques.');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return null;
  }

  return (
    <section
      data-testid="home-stats"
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {/* Currently online users */}
      <div
        data-testid="home-stats-online"
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Actuellement en ligne</h3>
        </div>
        {onlineUsers.length > 0 ? (
          <ul>
            {onlineUsers.slice(0, 8).map((user) => (
              <UserListItem key={user.id} user={user} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Personne d'autre en ligne pour le moment.</p>
        )}
      </div>

      {/* Latest registrations */}
      <div
        data-testid="home-stats-registrations"
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Derniers inscrits</h3>
        </div>
        {stats && stats.latestRegistrations.length > 0 ? (
          <ul>
            {stats.latestRegistrations.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                meta={formatSubscribeDate(user.subscribeDate)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Aucune inscription récente.</p>
        )}
      </div>

      {/* Today's birthdays */}
      <div
        data-testid="home-stats-birthdays"
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
            <Cake className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Anniversaires du jour</h3>
        </div>
        {stats && stats.todayBirthdays.length > 0 ? (
          <ul>
            {stats.todayBirthdays.map((user) => (
              <UserListItem key={user.id} user={user} meta="Joyeux anniversaire !" />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Aucun anniversaire aujourd'hui.</p>
        )}
      </div>
    </section>
  );
};
