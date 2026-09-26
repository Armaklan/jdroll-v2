import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usersApi } from '../api/users';
import { PublicUserProfile } from '../types/user';
import { getUserColorClass } from '../utils/user';
import { formatDayDate } from '../utils/date';
import { ArrowLeft, CalendarOff } from 'lucide-react';

/**
 * Profil public d'un membre : avatar, pseudo, titre, description,
 * date d'inscription et absences en cours.
 */
export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { profile: fetched } = await usersApi.getPublicProfile(userId || '');
        if (!cancelled) setProfile(fetched);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger le profil.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium text-sm">Chargement du profil...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-slate-600 font-medium">{error || 'Membre introuvable.'}</p>
        <Link
          to="/"
          className="inline-block mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const avatarUrl = profile.avatar
    ? profile.avatar.startsWith('http') ? profile.avatar : `/files/${profile.avatar}`
    : '';

  return (
    <div className="max-w-2xl mx-auto" data-testid="user-profile">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Link>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* En-tête : avatar, pseudo, titre */}
        <div className="bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-100 p-6 flex items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Avatar de ${profile.username}`}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-3xl border-4 border-white shadow-sm">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className={`text-2xl font-extrabold ${getUserColorClass(profile.profil, 'text-slate-900')}`}>
              {profile.username}
            </h1>
            {profile.titre && (
              <p className="text-sm font-semibold text-indigo-700 mt-0.5">{profile.titre}</p>
            )}
            {profile.subscribeDate && (
              <p className="text-xs text-slate-500 mt-1">
                Membre depuis le {formatDayDate(profile.subscribeDate)}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {profile.description ? (
          <div className="p-6 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Présentation</h2>
            <div
              className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: profile.description }}
            />
          </div>
        ) : null}

        {/* Absences en cours */}
        {profile.currentAbsences.length > 0 && (
          <div
            className="p-6 border-t border-slate-100 bg-amber-50/60"
            data-testid="user-profile-current-absences"
          >
            <div className="flex items-center gap-2 mb-2">
              <CalendarOff className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-950">Absence en cours</h2>
            </div>
            <ul className="space-y-1.5">
              {profile.currentAbsences.map((absence) => (
                <li
                  key={absence.id}
                  className="text-xs sm:text-sm text-amber-900 flex flex-wrap items-baseline gap-x-1.5"
                >
                  <span>
                    Absent du {formatDayDate(absence.beginDate)} au {formatDayDate(absence.endDate)}
                  </span>
                  {absence.commentaire && <span>— {absence.commentaire}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
