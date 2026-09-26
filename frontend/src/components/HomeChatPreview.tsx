import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api/chat';
import { ChatMessage } from '../types/chat';
import { getUserColorClass } from '../utils/user';
import { Lock, MessageCircle, Users } from 'lucide-react';

function formatTime(time: string): string {
  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) return time;
  return parsed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export const HomeChatPreview: React.FC = () => {
  const navigate = useNavigate();
  const messagesListRef = useRef<HTMLUListElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !messagesListRef.current) return;
    messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
  }, [isLoading, messages]);

  useEffect(() => {
    let cancelled = false;

    chatApi
      .getRecentMessages(20)
      .then((result) => {
        if (cancelled) return;
        setMessages(result.messages.slice(-20));
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le tchat.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return null;
  }

  return (
    <section
      data-testid="home-chat-preview"
      className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 flex flex-col h-full"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-sky-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Le tchat de la communauté</h3>
        </div>
        <button
          type="button"
          data-testid="home-chat-open-button"
          onClick={() => navigate('/chat')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
        >
          <Users className="w-4 h-4" />
          <span>Ouvrir le tchat</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-400 py-6 text-center">Chargement des messages...</div>
      ) : messages.length === 0 ? (
        <div className="text-sm text-slate-400 py-6 text-center">
          Aucun message pour le moment. Lancez la conversation !
        </div>
      ) : (
        <ul
          ref={messagesListRef}
          className="space-y-1.5 flex-1 min-h-0 overflow-y-auto max-h-80 lg:max-h-none pr-1"
        >
          {messages.map((message) => {
            const isPrivate = Boolean(message.to_username && message.to_username !== '');
            return (
              <li
                key={message.id}
                data-testid="home-chat-preview-message"
                className="flex items-baseline gap-2 text-sm"
              >
                <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                  {formatTime(message.time)}
                </span>
                <span className={`font-semibold shrink-0 ${getUserColorClass(message.userProfil)}`}>
                  {message.username}
                </span>
                {isPrivate && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 shrink-0"
                    title={`Message privé pour ${message.to_username}`}
                  >
                    <Lock className="w-2.5 h-2.5" />
                    {message.to_username}
                  </span>
                )}
                <span className="text-slate-700 break-words min-w-0">{message.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
