import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '../api/campaigns';
import { ForumTopicSummary } from '../types/campaign';
import { getUserColorClass } from '../utils/user';
import { Activity, MessageSquare } from 'lucide-react';

interface TopicWithSection {
  topic: ForumTopicSummary;
  sectionTitle: string;
}

function formatActivityDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const HomeRecentTopics: React.FC = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<TopicWithSection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    campaignsApi
      .getGeneralForum()
      .then((data) => {
        if (cancelled) return;
        const flattened: TopicWithSection[] = [];
        for (const section of data.sections) {
          for (const topic of section.topics) {
            flattened.push({ topic, sectionTitle: section.title });
          }
        }
        setTopics(flattened);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le forum.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const recentTopics = useMemo(() => {
    return topics
      .filter((entry) => Boolean(entry.topic.lastPost))
      .sort((a, b) => {
        const dateA = new Date(a.topic.lastPost?.createDate ?? 0).getTime() || 0;
        const dateB = new Date(b.topic.lastPost?.createDate ?? 0).getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [topics]);

  if (error) {
    return null;
  }

  return (
    <section
      data-testid="home-recent-topics"
      className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col h-full"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-rose-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Dernière activité du forum</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate('/forum/0')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
        >
          <Activity className="w-4 h-4" />
          <span>Voir le forum</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-400 py-6 text-center">Chargement des sujets...</div>
      ) : recentTopics.length === 0 ? (
        <div className="text-sm text-slate-400 py-6 text-center">
          Aucune activité récente sur le forum général.
        </div>
      ) : (
        <ul className="space-y-2">
          {recentTopics.map(({ topic, sectionTitle }) => (
            <li
              key={topic.id}
              data-testid="home-recent-topic"
              onClick={() => navigate(`/topics/${topic.id}`)}
              className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                topic.isRead
                  ? 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                  : 'bg-indigo-50/60 border-indigo-200 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare
                  className={`w-4 h-4 shrink-0 ${
                    topic.isRead ? 'text-slate-400' : 'text-indigo-600'
                  }`}
                />
                <span
                  data-testid="home-recent-topic-title"
                  className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate"
                >
                  {topic.title}
                </span>
                {!topic.isRead && (
                  <span
                    data-testid="home-recent-topic-unread"
                    className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shrink-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Non lu
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 pl-6">
                <span className="truncate">{sectionTitle}</span>
                <span className="text-slate-300">•</span>
                <span className="shrink-0">
                  par{' '}
                  <span
                    className={`font-medium ${getUserColorClass(topic.lastPost?.userProfil)}`}
                  >
                    {topic.lastPost?.username}
                  </span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="shrink-0">{formatActivityDate(topic.lastPost?.createDate ?? '')}</span>
                <span className="text-slate-300">•</span>
                <span className="shrink-0">{topic.postsCount} message{topic.postsCount > 1 ? 's' : ''}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
