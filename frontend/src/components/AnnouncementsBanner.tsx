import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { annoncesApi } from '../api/annonces';
import { Annonce } from '../types/annonce';
import { parseDbDate } from '../utils/date';

/**
 * Bannière des annonces éditoriales visibles (entre create_date et end_date),
 * affichée en haut de la page d'accueil et du forum général
 * pour les utilisateurs authentifiés.
 */
export const AnnouncementsBanner: React.FC = () => {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    annoncesApi
      .getVisibleAnnonces()
      .then((res) => {
        if (!cancelled) {
          setAnnonces(res.annonces || []);
        }
      })
      .catch(() => {
        // Une bannière d'annonce ne doit jamais bloquer l'affichage de la page
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || annonces.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="annonces-banner">
      {annonces.map((annonce) => (
        <section
          key={annonce.id}
          className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden"
          data-testid={`annonce-${annonce.id}`}
        >
          <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-amber-100/80 border-b border-amber-200">
            <Megaphone className="w-4 h-4 text-amber-600 shrink-0" />
            <h2 className="text-sm font-bold text-amber-900 truncate">{annonce.title}</h2>
            <span className="ml-auto text-xs text-amber-700 shrink-0">
              Jusqu'au {formatEndDate(annonce.endDate)}
            </span>
          </div>
          <div className="px-4 sm:px-6 py-3">
            <div
              className="wysiwyg-content text-sm text-amber-950 prose prose-slate max-w-none break-words [&_*]:text-inherit"
              dangerouslySetInnerHTML={{ __html: annonce.content }}
            />
          </div>
        </section>
      ))}
    </div>
  );
};

function formatEndDate(endDate: string): string {
  const date = parseDbDate(endDate);
  if (!date) {
    return '';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}h${minutes}`;
}
