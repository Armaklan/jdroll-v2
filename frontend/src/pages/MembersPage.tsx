import React, { useEffect, useMemo, useState } from 'react';
import { usersApi } from '../api/users';
import { MemberSummary } from '../types/user';
import { UserPseudoLink } from '../components/UserPseudoLink';
import { GlobalFloatingSearch } from '../components/GlobalFloatingSearch';
import { formatDate } from '../utils/date';
import { Users, Search } from 'lucide-react';

/**
 * Liste des membres : uniquement les utilisateurs ayant publié au moins 1 post.
 * Page réservée aux utilisateurs authentifiés (route protégée).
 */
export const MembersPage: React.FC = () => {
  const [members, setMembers] = useState<MemberSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await usersApi.getMembers();
        if (cancelled) return;
        setMembers(result.members);
      } catch {
        if (!cancelled) setError('Impossible de charger la liste des membres.');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleMembers = useMemo(() => {
    if (!members) return [];
    if (!normalizedSearch) return members;
    return members.filter((member) => member.username.toLowerCase().includes(normalizedSearch));
  }, [members, normalizedSearch]);

  return (
    <div data-testid="members-page" className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Users className="w-5 h-5 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Membres</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Seuls les membres ayant publié au moins un message apparaissent dans cette liste.
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un membre..."
          aria-label="Rechercher un membre"
          data-testid="members-search"
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {error ? (
        <div className="bg-white border border-red-200 rounded-2xl p-5 text-sm text-red-700">
          {error}
        </div>
      ) : members === null ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visibleMembers.length === 0 ? (
        <div
          data-testid="members-empty"
          className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500"
        >
          Aucun membre à afficher.
        </div>
      ) : (
        <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {visibleMembers.map((member) => (
            <li
              key={member.id}
              data-testid="member-item"
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={`Avatar de ${member.username}`}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm border border-slate-200 shrink-0">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex items-center gap-2 min-w-0">
                  <UserPseudoLink
                    userId={member.id}
                    username={member.username}
                    profil={member.profil}
                    className="text-sm font-medium truncate"
                  />
                  {member.titre ? (
                    <span className="text-xs text-indigo-600 truncate">{member.titre}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs text-slate-500">
                  {member.lastActionDate ? `Vu le ${formatDate(member.lastActionDate)}` : 'Jamais vu'}
                </span>
                <span className="text-xs text-slate-400">
                  Inscrit le {formatDate(member.subscribeDate, 'date inconnue')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <GlobalFloatingSearch activeTab="none" />
    </div>
  );
};
