import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../api/chat';
import {
  ChatMessage,
  ChatConnectedUser,
  ChatUserSearchResult,
  ChatActiveChannel,
} from '../types/chat';
import { getUserColorClass } from '../utils/user';
import { SmileyPicker } from '../components/SmileyPicker';
import { replaceEmoticons, convertEmoticonsOnType } from '../utils/emoticons';
import {
  MessagesSquare,
  MessageSquare,
  Users,
  Send,
  Search,
  Plus,
  X,
  Globe,
  Lock,
  MessageCircle,
  Smile,
} from 'lucide-react';

export function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<ChatConnectedUser[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatActiveChannel>({ type: 'general' });
  const [messageInput, setMessageInput] = useState('');
  const [isSmileyPickerOpen, setIsSmileyPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);

  // Private conversations list tracked locally
  const [openPrivateChats, setOpenPrivateChats] = useState<
    Array<{ id?: number; username: string; avatar?: string; profil?: number }>
  >([]);

  // Search modal / dropdown
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mobile drawer views
  const [mobileTab, setMobileTab] = useState<'chat' | 'channels' | 'users'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const currentUsername = user?.username || '';
  const currentUserId = user?.id;

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Initial load of 200 last messages & online users
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [messagesRes, usersRes] = await Promise.all([
        chatApi.getRecentMessages(200),
        chatApi.getOnlineUsers().catch(() => ({ users: [] })),
      ]);

      setMessages(messagesRes.messages || []);
      setOnlineUsers(usersRes.users || []);

      // Extract existing private chat interlocutors from history
      const interlocutors = new Map<string, { id?: number; username: string; avatar?: string; profil?: number }>();
      (messagesRes.messages || []).forEach((m) => {
        if (m.to || m.to_username) {
          const isSender = m.username.toLowerCase() === currentUsername.toLowerCase();
          const otherUsername = isSender ? m.to_username : m.username;
          const otherId = isSender ? (m.to ? Number(m.to) : undefined) : undefined;
          const otherAvatar = !isSender ? m.userAvatar || undefined : undefined;
          const otherProfil = !isSender ? m.userProfil : undefined;

          if (otherUsername && otherUsername.toLowerCase() !== currentUsername.toLowerCase()) {
            if (!interlocutors.has(otherUsername.toLowerCase())) {
              interlocutors.set(otherUsername.toLowerCase(), {
                id: otherId,
                username: otherUsername,
                avatar: otherAvatar,
                profil: otherProfil,
              });
            }
          }
        }
      });

      setOpenPrivateChats((prev) => {
        const merged = new Map<string, { id?: number; username: string; avatar?: string; profil?: number }>();
        prev.forEach((p) => merged.set(p.username.toLowerCase(), p));
        interlocutors.forEach((val, key) => {
          if (!merged.has(key)) {
            merged.set(key, val);
          }
        });
        return Array.from(merged.values());
      });
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les messages du tchat');
    } finally {
      setIsLoading(false);
    }
  }, [currentUsername]);

  // Connect WebSocket
  useEffect(() => {
    loadInitialData();

    let isMounted = true;

    function connectWs() {
      if (!isMounted) return;
      setWsStatus('connecting');

      try {
        const wsUrl = chatApi.getWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsStatus('connected');
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'presence') {
              setOnlineUsers(data.users || []);
            } else if (data.type === 'chat_message' && data.message) {
              const newMsg: ChatMessage = data.message;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) {
                  return prev;
                }
                return [...prev, newMsg];
              });

              // If it's a private message involving me, make sure interlocutor is in openPrivateChats
              if (newMsg.to || newMsg.to_username) {
                const isSender = newMsg.username.toLowerCase() === currentUsername.toLowerCase();
                const otherUsername = isSender ? newMsg.to_username : newMsg.username;
                const otherId = isSender ? (newMsg.to ? Number(newMsg.to) : undefined) : undefined;
                const otherAvatar = !isSender ? newMsg.userAvatar || undefined : undefined;
                const otherProfil = !isSender ? newMsg.userProfil : undefined;

                if (otherUsername && otherUsername.toLowerCase() !== currentUsername.toLowerCase()) {
                  setOpenPrivateChats((prev) => {
                    if (prev.some((p) => p.username.toLowerCase() === otherUsername.toLowerCase())) {
                      return prev;
                    }
                    return [
                      ...prev,
                      {
                        id: otherId,
                        username: otherUsername,
                        avatar: otherAvatar,
                        profil: otherProfil,
                      },
                    ];
                  });
                }
              }
            }
          } catch {
            // ignore non-json
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsStatus('disconnected');
          reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          ws.close();
        };
      } catch {
        if (!isMounted) return;
        setWsStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
      }
    }

    connectWs();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [loadInitialData, currentUsername]);

  // Scroll to bottom when channel changes or new message in active channel arrives
  useEffect(() => {
    scrollToBottom('auto');
  }, [activeChannel]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length]);

  // Filter messages for currently selected channel
  const currentChannelMessages = useMemo(() => {
    if (activeChannel.type === 'general') {
      return messages.filter((m) => !m.to && !m.to_username);
    }

    const targetUsername = activeChannel.user.username.toLowerCase();
    const currentName = currentUsername.toLowerCase();

    return messages.filter((m) => {
      if (!m.to && !m.to_username) return false;
      const sender = m.username.toLowerCase();
      const recipientUser = m.to_username.toLowerCase();

      // Sent by me to other, or sent by other to me
      const isSentByMeToOther =
        sender === currentName && recipientUser === targetUsername;
      const isSentByOtherToMe =
        sender === targetUsername && (recipientUser === currentName || (currentUserId && m.to === String(currentUserId)));

      return isSentByMeToOther || isSentByOtherToMe;
    });
  }, [messages, activeChannel, currentUsername, currentUserId]);

  // Smiley selection handler (inserts at cursor)
  const handleSelectSmiley = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessageInput((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = messageInput.substring(0, start);
    const after = messageInput.substring(end);
    const newText = before + emoji + after;
    setMessageInput(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Auto-convert text emoticons on type
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawValue = e.target.value;
    const { text, hasChanged } = convertEmoticonsOnType(rawValue);
    if (hasChanged) {
      const cursor = e.target.selectionStart;
      setMessageInput(text);
      const diff = text.length - rawValue.length;
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursor = Math.max(0, cursor + diff);
          textareaRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    } else {
      setMessageInput(rawValue);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = replaceEmoticons(messageInput.trim());
    if (!text || isSending) return;

    setIsSmileyPickerOpen(false);

    try {
      setIsSending(true);
      const isPrivate = activeChannel.type === 'private';
      const to = isPrivate && activeChannel.user.id ? String(activeChannel.user.id) : undefined;
      const to_username = isPrivate ? activeChannel.user.username : undefined;

      // Send via WS if open, otherwise REST fallback
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'send_message',
            message: text,
            to,
            to_username,
          })
        );
      } else {
        const res = await chatApi.sendMessage({
          message: text,
          to,
          to_username,
        });
        if (res.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === res.message.id)) return prev;
            return [...prev, res.message];
          });
        }
      }

      setMessageInput('');
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
    }
  };

  // Search users for starting private discussion
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await chatApi.searchUsers(searchQuery.trim());
        setSearchResults(res.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Start private chat with user
  const startPrivateChatWith = (target: { id?: number; username: string; avatar?: string; profil?: number }) => {
    if (target.username.toLowerCase() === currentUsername.toLowerCase()) return;

    setOpenPrivateChats((prev) => {
      if (!prev.some((p) => p.username.toLowerCase() === target.username.toLowerCase())) {
        return [...prev, target];
      }
      return prev;
    });

    setActiveChannel({
      type: 'private',
      user: target,
    });
    setIsSearchOpen(false);
    setSearchQuery('');
    setMobileTab('chat');
  };

  // Close private chat tab
  const closePrivateChat = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenPrivateChats((prev) => prev.filter((p) => p.username.toLowerCase() !== username.toLowerCase()));
    if (activeChannel.type === 'private' && activeChannel.user.username.toLowerCase() === username.toLowerCase()) {
      setActiveChannel({ type: 'general' });
    }
  };

  // Check if a user is online
  const isUserOnline = (username: string) => {
    return onlineUsers.some((u) => u.username.toLowerCase() === username.toLowerCase());
  };

  // Format date / time helper
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  const formatDateLabel = (timeStr: string) => {
    try {
      const d = new Date(timeStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return '';
      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

      if (isToday) return "Aujourd'hui";
      return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const renderAvatar = (avatarUrl?: string | null, username?: string, size = 'w-9 h-9 text-sm') => {
    const initial = (username || '?').charAt(0).toUpperCase();
    if (avatarUrl) {
      const fullUrl = avatarUrl.startsWith('http') ? avatarUrl : `/files/${avatarUrl}`;
      return (
        <img
          src={fullUrl}
          alt={username || 'Avatar'}
          className={`${size} rounded-full object-cover border border-slate-200 bg-white flex-shrink-0 shadow-sm`}
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    return (
      <div
        className={`${size} rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm`}
      >
        {initial}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[550px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Top Bar / Header */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/30 rounded-xl text-indigo-400 ring-1 ring-indigo-500/30">
            <MessagesSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 flex items-center gap-2">
              Tchat Communautaire
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal border border-indigo-500/30">
                Temps Réel
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Échangez en direct avec les membres ou en privé
            </p>
          </div>
        </div>

        {/* Status indicator & Mobile navigation toggle */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-slate-800/80 rounded-full text-xs border border-slate-700">
            {wsStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium">Connecté</span>
              </>
            ) : wsStatus === 'connecting' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-300">Connexion...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400">Déconnecté</span>
              </>
            )}
          </div>

          {/* Mobile Tab switcher */}
          <div className="flex sm:hidden bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setMobileTab('channels')}
              className={`px-2.5 py-1 rounded-md transition ${
                mobileTab === 'channels' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Salons
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={`px-2.5 py-1 rounded-md transition ${
                mobileTab === 'chat' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Discussion
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('users')}
              className={`px-2.5 py-1 rounded-md transition ${
                mobileTab === 'users' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              En ligne ({onlineUsers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid / Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Channels & Private Chats */}
        <aside
          className={`w-full sm:w-72 md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col flex-shrink-0 ${
            mobileTab === 'channels' ? 'flex' : 'hidden sm:flex'
          }`}
        >
          {/* Header & New discussion button */}
          <div className="p-3.5 border-b border-slate-200 bg-white/50 backdrop-blur flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Salons & Privés
            </span>
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition border border-indigo-200 shadow-sm"
              title="Nouvelle discussion privée"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau privé
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
            {/* General Room */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 px-2 mb-1 uppercase tracking-wider">
                Public
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveChannel({ type: 'general' });
                  setMobileTab('chat');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  activeChannel.type === 'general'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/60 font-medium'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    activeChannel.type === 'general'
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">Salon Général</div>
                  <div
                    className={`text-xs truncate ${
                      activeChannel.type === 'general' ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    Ouvert à toute la communauté
                  </div>
                </div>
              </button>
            </div>

            {/* Private Chats */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Discussions privées
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {openPrivateChats.length}
                </span>
              </div>

              {openPrivateChats.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400 bg-slate-100/70 rounded-xl border border-dashed border-slate-200">
                  <Lock className="w-4 h-4 mx-auto mb-1 text-slate-400 opacity-60" />
                  Aucun message privé récent. Cliquez sur "Nouveau privé" pour contacter un membre.
                </div>
              ) : (
                <div className="space-y-1">
                  {openPrivateChats.map((chatUser) => {
                    const isSelected =
                      activeChannel.type === 'private' &&
                      activeChannel.user.username.toLowerCase() === chatUser.username.toLowerCase();
                    const online = isUserOnline(chatUser.username);

                    return (
                      <div
                        key={chatUser.username}
                        onClick={() => {
                          setActiveChannel({
                            type: 'private',
                            user: chatUser,
                          });
                          setMobileTab('chat');
                        }}
                        className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-medium shadow-sm'
                            : 'text-slate-700 hover:bg-slate-200/60'
                        }`}
                      >
                        <div className="relative">
                          {renderAvatar(chatUser.avatar, chatUser.username, 'w-8 h-8 text-xs')}
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                              isSelected ? 'border-indigo-600' : 'border-slate-50'
                            } ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            title={online ? 'En ligne' : 'Hors ligne'}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium flex items-center justify-between">
                            <span className={isSelected ? 'text-white' : getUserColorClass(chatUser.profil)}>
                              {chatUser.username}
                            </span>
                          </div>
                          <div
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-indigo-100' : online ? 'text-emerald-600 font-medium' : 'text-slate-400'
                            }`}
                          >
                            {online ? 'En ligne' : 'Hors ligne'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => closePrivateChat(chatUser.username, e)}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition ${
                            isSelected ? 'text-indigo-200 hover:bg-white/20 hover:text-white' : 'text-slate-400 hover:bg-slate-300 hover:text-slate-700'
                          }`}
                          title="Fermer cette discussion"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Center: Active Chat Room */}
        <main
          className={`flex-1 flex flex-col bg-slate-50/50 min-w-0 ${
            mobileTab === 'chat' ? 'flex' : 'hidden sm:flex'
          }`}
        >
          {/* Active Channel Header */}
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3 min-w-0">
              {activeChannel.type === 'general' ? (
                <>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-800 text-sm sm:text-base truncate flex items-center gap-2">
                      Salon Général
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                        Public
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 truncate">
                      Historique des 200 derniers messages de la taverne
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    {renderAvatar(activeChannel.user.avatar, activeChannel.user.username, 'w-10 h-10')}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isUserOnline(activeChannel.user.username) ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-800 text-sm sm:text-base truncate flex items-center gap-2">
                      <span className={getUserColorClass(activeChannel.user.profil)}>
                        {activeChannel.user.username}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                        Discussion Privée
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                      {isUserOnline(activeChannel.user.username) ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-emerald-700 font-medium">Actuellement connecté au tchat</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Hors ligne &bull; Recevra le message à sa connexion</span>
                        </>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                Chercher un joueur
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium">Chargement des 200 derniers messages...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={loadInitialData}
                  className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded-lg font-medium text-red-800 transition"
                >
                  Réessayer
                </button>
              </div>
            ) : currentChannelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 px-4 text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400 mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">Aucun message pour le moment</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {activeChannel.type === 'general'
                    ? 'Soyez le premier à lancer la conversation dans le salon général !'
                    : `Envoyez un message privé à ${activeChannel.user.username}.`}
                </p>
              </div>
            ) : (
              currentChannelMessages.map((msg, index) => {
                const isMe = msg.username.toLowerCase() === currentUsername.toLowerCase();
                const prevMsg = index > 0 ? currentChannelMessages[index - 1] : null;
                const showDate =
                  !prevMsg ||
                  formatDateLabel(msg.time) !== formatDateLabel(prevMsg.time);

                return (
                  <React.Fragment key={msg.id || index}>
                    {showDate && (
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 bg-slate-200/80 text-slate-600 text-[11px] font-medium rounded-full shadow-2xs">
                          {formatDateLabel(msg.time)}
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex items-start gap-3 group ${
                        isMe ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        onClick={() => {
                          if (!isMe) {
                            startPrivateChatWith({
                              username: msg.username,
                              avatar: msg.userAvatar || undefined,
                              profil: msg.userProfil,
                            });
                          }
                        }}
                        className={`cursor-pointer transition hover:opacity-80`}
                        title={!isMe ? `Discuter en privé avec ${msg.username}` : ''}
                      >
                        {renderAvatar(msg.userAvatar, msg.username, 'w-8 h-8 sm:w-9 sm:h-9 text-xs')}
                      </div>

                      {/* Content Bubble */}
                      <div className={`max-w-[80%] sm:max-w-[70%] space-y-1 ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                        {/* Sender info */}
                        <div className={`flex items-center gap-2 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span
                            onClick={() => {
                              if (!isMe) {
                                startPrivateChatWith({
                                  username: msg.username,
                                  avatar: msg.userAvatar || undefined,
                                  profil: msg.userProfil,
                                });
                              }
                            }}
                            className={`font-semibold cursor-pointer hover:underline ${
                              isMe ? 'text-indigo-900' : getUserColorClass(msg.userProfil)
                            }`}
                          >
                            {msg.username}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {formatTime(msg.time)}
                          </span>
                          {msg.to_username && activeChannel.type === 'general' && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-medium rounded">
                              privé pour {msg.to_username}
                            </span>
                          )}
                        </div>

                        {/* Message text */}
                        <div
                          className={`p-3 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-tr-xs'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                          }`}
                        >
                          {replaceEmoticons(msg.message)}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shadow-sm relative">
            {isSmileyPickerOpen && (
              <div className="absolute bottom-full right-4 mb-2 z-50">
                <SmileyPicker
                  onSelect={handleSelectSmiley}
                  onClose={() => setIsSmileyPickerOpen(false)}
                />
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1 relative bg-slate-50 border border-slate-300 rounded-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition flex items-end">
                <textarea
                  ref={textareaRef}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={
                    activeChannel.type === 'general'
                      ? 'Écrire un message dans le salon général... (Entrée pour envoyer)'
                      : `Message privé pour ${activeChannel.user.username}... (Entrée pour envoyer)`
                  }
                  className="w-full px-3.5 py-2.5 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-slate-800 resize-none max-h-32 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setIsSmileyPickerOpen((prev) => !prev)}
                  className={`p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 rounded-xl transition mr-1 mb-0.5 flex-shrink-0 ${
                    isSmileyPickerOpen ? 'text-indigo-600 bg-indigo-50' : ''
                  }`}
                  title="Ajouter un smiley ou emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!messageInput.trim() || isSending}
                className="p-2.5 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium rounded-2xl transition shadow-sm flex items-center gap-1.5 flex-shrink-0"
                title="Envoyer le message"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Envoyer</span>
              </button>
            </form>
          </div>
        </main>

        {/* Right Sidebar: Connected Users */}
        <aside
          className={`w-full sm:w-64 md:w-72 border-l border-slate-200 bg-slate-50 flex flex-col flex-shrink-0 ${
            mobileTab === 'users' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3.5 border-b border-slate-200 bg-white/50 backdrop-blur flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              Membres connectés
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
              {onlineUsers.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {onlineUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Aucun autre membre connecté actuellement.
              </div>
            ) : (
              onlineUsers.map((u) => {
                const isMe = u.username.toLowerCase() === currentUsername.toLowerCase();
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (!isMe) {
                        startPrivateChatWith(u);
                      }
                    }}
                    className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                      isMe
                        ? 'bg-indigo-50/70 text-indigo-900 cursor-default'
                        : 'cursor-pointer text-slate-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <div className="relative">
                      {renderAvatar(u.avatar, u.username, 'w-8 h-8 text-xs')}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium flex items-center justify-between">
                        <span className={getUserColorClass(u.profil)}>
                          {u.username}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded font-normal">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {isMe ? 'Connecté' : 'Cliquer pour message privé'}
                      </div>
                    </div>

                    {!isMe && (
                      <MessageCircle className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* User Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm">Nouvelle discussion privée</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  placeholder="Rechercher un membre par pseudonyme..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                {isSearching ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Recherche des utilisateurs...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((sr) => {
                    const online = isUserOnline(sr.username);
                    return (
                      <div
                        key={sr.id}
                        onClick={() => startPrivateChatWith(sr)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer transition"
                      >
                        <div className="relative">
                          {renderAvatar(sr.avatar, sr.username, 'w-8 h-8 text-xs')}
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              online ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">
                            {sr.username}
                          </div>
                          <div className="text-xs text-slate-400">
                            {online ? 'En ligne' : 'Hors ligne'}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          Discuter
                        </span>
                      </div>
                    );
                  })
                ) : searchQuery.trim() ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Aucun membre trouvé pour « {searchQuery} »
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Tapez au moins une lettre pour rechercher parmi tous les membres du site.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
