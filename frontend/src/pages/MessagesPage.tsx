import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { messagesApi } from '../api/messages';
import {
  InboxMessageSummary,
  SentMessageSummary,
  MessageDetail,
  UserSearchResult,
} from '../types/message';
import { getUserColorClass } from '../utils/user';
import { WysiwygEditor } from '../components/WysiwygEditor';
import { parseMessageContent } from '../utils/bbcode-parser';
import { formatMessageDate as formatDate } from '../utils/date';
import {
  Inbox,
  Send,
  PenSquare,
  Mail,
  MailOpen,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  X,
  ArrowLeft,
  Reply,
  Users,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

type TabType = 'inbox' | 'sent' | 'compose';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as TabType) || 'inbox';
  const selectedMessageId = searchParams.get('id')
    ? parseInt(searchParams.get('id')!, 10)
    : null;

  // Data states
  const [inboxMessages, setInboxMessages] = useState<InboxMessageSummary[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessageSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);

  // Message Detail state
  const [currentMessage, setCurrentMessage] = useState<MessageDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Compose state
  const [composeRecipients, setComposeRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [userSuggestions, setUserSuggestions] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [composeTitle, setComposeTitle] = useState<string>('');
  const [composeContent, setComposeContent] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);

  // Filter state
  const [searchFilter, setSearchFilter] = useState<string>('');

  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch lists
  const fetchInbox = useCallback(async () => {
    try {
      const data = await messagesApi.getInbox();
      setInboxMessages(data.messages);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, []);

  const fetchSent = useCallback(async () => {
    try {
      const data = await messagesApi.getSent();
      setSentMessages(data.messages);
    } catch {
      // ignore
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoadingList(true);
    await Promise.all([fetchInbox(), fetchSent()]);
    setIsLoadingList(false);
  }, [fetchInbox, fetchSent]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Handle URL query parameters for Compose (e.g. ?tab=compose&to=Username&subject=...)
  useEffect(() => {
    const toParam = searchParams.get('to');
    const subjectParam = searchParams.get('subject');
    if (activeTab === 'compose' && toParam) {
      setComposeRecipients(toParam.split(',').map((u) => u.trim()).filter(Boolean));
    }
    if (activeTab === 'compose' && subjectParam) {
      setComposeTitle(subjectParam);
    }
  }, [activeTab, searchParams]);

  // Fetch Message Detail
  useEffect(() => {
    if (selectedMessageId) {
      setIsLoadingDetail(true);
      setDetailError(null);
      messagesApi
        .getMessageDetail(selectedMessageId)
        .then((res) => {
          setCurrentMessage(res.message);
          // Refresh inbox list and unread count since message might have been marked as read
          fetchInbox();
        })
        .catch((err) => {
          setDetailError(err.message || 'Impossible de charger le message');
          setCurrentMessage(null);
        })
        .finally(() => {
          setIsLoadingDetail(false);
        });
    } else {
      setCurrentMessage(null);
    }
  }, [selectedMessageId, fetchInbox]);

  // Recipient Autocomplete
  useEffect(() => {
    if (!recipientInput.trim()) {
      setUserSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingUsers(true);
        const res = await messagesApi.searchUsers(recipientInput.trim());
        // Filter out already selected recipients and self
        const filtered = res.users.filter(
          (u) =>
            !composeRecipients.some((r) => r.toLowerCase() === u.username.toLowerCase()) &&
            u.username.toLowerCase() !== (user?.username || '').toLowerCase()
        );
        setUserSuggestions(filtered);
        setShowSuggestions(true);
      } catch {
        setUserSuggestions([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [recipientInput, composeRecipients, user?.username]);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabChange = (tab: TabType) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    newParams.delete('id');
    setSearchParams(newParams);
    setComposeError(null);
    setComposeSuccess(null);
  };

  const handleSelectMessage = (id: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('id', id.toString());
    setSearchParams(newParams);
  };

  const handleBackToList = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('id');
    setSearchParams(newParams);
  };

  // Add recipient chip
  const handleAddRecipient = (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    if (!composeRecipients.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setComposeRecipients([...composeRecipients, trimmed]);
    }
    setRecipientInput('');
    setShowSuggestions(false);
  };

  const handleRemoveRecipient = (username: string) => {
    setComposeRecipients(composeRecipients.filter((r) => r !== username));
  };

  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (userSuggestions.length > 0 && showSuggestions) {
        handleAddRecipient(userSuggestions[0].username);
      } else if (recipientInput.trim()) {
        handleAddRecipient(recipientInput);
      }
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError(null);
    setComposeSuccess(null);

    if (composeRecipients.length === 0) {
      setComposeError('Veuillez ajouter au moins un destinataire');
      return;
    }
    if (!composeTitle.trim()) {
      setComposeError('Veuillez renseigner le sujet du message');
      return;
    }
    if (!composeContent.trim()) {
      setComposeError('Veuillez rédiger le contenu de votre message');
      return;
    }

    try {
      setIsSending(true);
      await messagesApi.sendMessage({
        title: composeTitle.trim(),
        content: composeContent.trim(),
        recipients: composeRecipients,
      });

      setComposeSuccess('Message envoyé avec succès !');
      setComposeTitle('');
      setComposeContent('');
      setComposeRecipients([]);
      setRecipientInput('');
      fetchSent();

      setTimeout(() => {
        handleTabChange('sent');
      }, 1000);
    } catch (err: any) {
      setComposeError(err.message || "Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
    }
  };

  // Delete message from Inbox
  const handleDeleteInboxMessage = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Voulez-vous supprimer ce message de votre boîte de réception ?')) {
      return;
    }
    try {
      await messagesApi.deleteFromInbox(id);
      setInboxMessages((prev) => prev.filter((m) => m.id !== id));
      fetchInbox();
      if (selectedMessageId === id) {
        handleBackToList();
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  // Delete message from Sent
  const handleDeleteSentMessage = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Voulez-vous supprimer ce message de votre boîte d'envoi ?")) {
      return;
    }
    try {
      await messagesApi.deleteFromSent(id);
      setSentMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessageId === id) {
        handleBackToList();
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  // Reply
  const handleReply = (message: MessageDetail, replyAll = false) => {
    let recipients: string[] = [];
    if (replyAll) {
      const allUsers = [
        message.fromUsername,
        ...message.recipients.map((r) => r.username),
      ];
      recipients = Array.from(
        new Set(
          allUsers.filter(
            (u) => u.toLowerCase() !== (user?.username || '').toLowerCase()
          )
        )
      );
    } else {
      if (message.fromId === user?.id) {
        recipients = message.recipients.map((r) => r.username);
      } else {
        recipients = [message.fromUsername];
      }
    }

    const titlePrefix = message.title.toLowerCase().startsWith('re:') ? '' : 'Re: ';
    setComposeRecipients(recipients);
    setComposeTitle(`${titlePrefix}${message.title}`);
    setComposeContent(
      `<br><br><blockquote style="border-left: 3px solid #cbd5e1; padding-left: 12px; color: #64748b; margin: 12px 0;">` +
      `<strong>${message.fromUsername} a écrit :</strong><br>${message.content}</blockquote>`
    );
    handleTabChange('compose');
  };

  // Filtered lists
  const filteredInbox = inboxMessages.filter(
    (m) =>
      m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.fromUsername.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredSent = sentMessages.filter(
    (m) =>
      m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.recipients.some((r) => r.username.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Mail className="w-5 h-5" />
            </div>
            Messagerie Privée
          </h1>
        </div>

        {/* Action Button: Nouveau message */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('compose')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition shadow-indigo-600/20 cursor-pointer"
          >
            <PenSquare className="w-4 h-4" />
            <span>Nouveau message</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Navigation Sidebar / Tabs */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 p-4 space-y-2">
          {/* Inbox Tab */}
          <button
            onClick={() => handleTabChange('inbox')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'inbox' && !selectedMessageId
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Inbox className="w-4 h-4" />
              <span>Boîte de réception</span>
            </div>
            {unreadCount > 0 && (
              <span
                className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  activeTab === 'inbox' && !selectedMessageId
                    ? 'bg-white text-indigo-700'
                    : 'bg-red-500 text-white'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Sent Tab */}
          <button
            onClick={() => handleTabChange('sent')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'sent' && !selectedMessageId
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className="w-4 h-4" />
              <span>Messages envoyés</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'sent' && !selectedMessageId
                  ? 'bg-indigo-500/50 text-white'
                  : 'text-slate-400 bg-slate-200/60'
              }`}
            >
              {sentMessages.length}
            </span>
          </button>

          {/* Compose Tab */}
          <button
            onClick={() => handleTabChange('compose')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'compose'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <PenSquare className="w-4 h-4" />
            <span>Rédiger un message</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col">
          {/* DETAIL VIEW */}
          {selectedMessageId ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour à la liste</span>
                </button>

                {currentMessage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReply(currentMessage, false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Répondre</span>
                    </button>
                    {currentMessage.recipients.length > 1 && (
                      <button
                        onClick={() => handleReply(currentMessage, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Répondre à tous</span>
                      </button>
                    )}
                    <button
                      onClick={() =>
                        currentMessage.isSender
                          ? handleDeleteSentMessage(currentMessage.id)
                          : handleDeleteInboxMessage(currentMessage.id)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>

              {isLoadingDetail ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                  <p className="text-sm font-medium">Chargement du message...</p>
                </div>
              ) : detailError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{detailError}</span>
                </div>
              ) : currentMessage ? (
                <div className="space-y-6">
                  {/* Header info */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {currentMessage.title}
                    </h2>

                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Sender / Recipients */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="font-semibold text-slate-500 w-16">De :</span>
                          <span className={`font-bold ${getUserColorClass(currentMessage.fromProfil, 'text-slate-900')}`}>
                            {currentMessage.fromUsername}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                          <span className="font-semibold text-slate-500 w-16">À :</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {currentMessage.recipients.map((rec) => (
                              <span
                                key={rec.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  currentMessage.isSender
                                    ? rec.isRead
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-200 text-slate-800'
                                }`}
                              >
                                <span className={getUserColorClass(rec.profil)}>
                                  {rec.username}
                                </span>
                                {currentMessage.isSender && (
                                  <span className="text-[10px] ml-0.5">
                                    {rec.isRead ? '(Lu)' : '(Non lu)'}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Date & Status */}
                      <div className="text-xs text-slate-500 sm:text-right space-y-1">
                        <div>{formatDate(currentMessage.time)}</div>
                        {currentMessage.isSender && (
                          <div>
                            {currentMessage.isRead ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Lu par tous les destinataires
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                En attente de lecture
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div
                    className="wysiwyg-content prose prose-slate max-w-none p-6 rounded-xl border border-slate-200/80 bg-white min-h-[200px]"
                    dangerouslySetInnerHTML={{
                      __html: parseMessageContent(currentMessage.content, {
                        currentUser: user,
                        authorUserId: currentMessage.fromId,
                      }),
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : activeTab === 'compose' ? (
            /* COMPOSE TAB */
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Nouveau message privé</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Envoyez un message privé à un ou plusieurs utilisateurs.
                </p>
              </div>

              {composeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{composeError}</span>
                </div>
              )}

              {composeSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{composeSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="space-y-4">
                {/* Recipients input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Destinataire(s) *
                  </label>
                  <div className="relative" ref={suggestionsRef}>
                    <div className="min-h-[44px] p-1.5 bg-white border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 rounded-xl flex flex-wrap items-center gap-1.5 transition">
                      {composeRecipients.map((username) => (
                        <span
                          key={username}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold"
                        >
                          {username}
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(username)}
                            className="hover:text-red-500 transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        value={recipientInput}
                        onChange={(e) => setRecipientInput(e.target.value)}
                        onKeyDown={handleRecipientKeyDown}
                        placeholder={
                          composeRecipients.length === 0
                            ? 'Tapez un pseudo (ex: Bob, Alice)...'
                            : 'Ajouter un autre destinataire...'
                        }
                        className="flex-1 min-w-[180px] px-2 py-1 text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Suggestions list */}
                    {showSuggestions && userSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto py-1">
                        {userSuggestions.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleAddRecipient(u.username)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 flex items-center justify-between transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.username}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className={`font-medium ${getUserColorClass(u.profil, 'text-slate-800')}`}>{u.username}</span>
                            </div>
                            <span className="text-xs text-indigo-600 font-semibold">+ Ajouter</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {isSearchingUsers && (
                      <div className="absolute right-3 top-3 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Title input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sujet *
                  </label>
                  <input
                    type="text"
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value)}
                    placeholder="Sujet de votre message..."
                    maxLength={200}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-slate-800 transition"
                  />
                </div>

                {/* Content Editor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Message *
                  </label>
                  <WysiwygEditor
                    value={composeContent}
                    onChange={setComposeContent}
                    placeholder="Rédigez votre message privé ici..."
                    minHeight="220px"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleTabChange('inbox')}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{isSending ? 'Envoi en cours...' : 'Envoyer le message'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* INBOX OR SENT LIST */
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder={
                      activeTab === 'inbox'
                        ? 'Rechercher par expéditeur ou sujet...'
                        : 'Rechercher par destinataire ou sujet...'
                    }
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-400 rounded-lg outline-none transition"
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400 font-medium">
                  {activeTab === 'inbox'
                    ? `${filteredInbox.length} message(s)`
                    : `${filteredSent.length} message(s)`}
                </div>
              </div>

              {/* List rendering */}
              {isLoadingList ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                  <p className="text-sm font-medium">Chargement de vos messages...</p>
                </div>
              ) : activeTab === 'inbox' ? (
                /* INBOX LIST */
                filteredInbox.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-3">
                    <Inbox className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-600">
                      {searchFilter
                        ? 'Aucun message ne correspond à votre recherche.'
                        : 'Votre boîte de réception est vide.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredInbox.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg.id)}
                        className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-xl transition cursor-pointer ${
                          !msg.isRead
                            ? 'bg-indigo-50/50 hover:bg-indigo-50/80 font-semibold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Left: icon + sender + title */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                          <div className="flex-shrink-0">
                            {msg.isRead ? (
                              <MailOpen className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                            ) : (
                              <div className="relative">
                                <Mail className="w-5 h-5 text-indigo-600" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm truncate ${
                                  getUserColorClass(
                                    msg.fromProfil,
                                    !msg.isRead ? 'text-indigo-950 font-bold' : 'text-slate-900 font-semibold'
                                  )
                                }`}
                              >
                                {msg.fromUsername}
                              </span>
                              {!msg.isRead && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded">
                                  Nouveau
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs truncate mt-0.5 ${
                                !msg.isRead ? 'text-slate-800' : 'text-slate-500'
                              }`}
                            >
                              {msg.title}
                            </p>
                          </div>
                        </div>

                        {/* Right: Date & Delete button */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-400 font-medium">
                            {formatDate(msg.time)}
                          </span>
                          <button
                            onClick={(e) => handleDeleteInboxMessage(msg.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Supprimer de la boîte de réception"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* SENT LIST */
                filteredSent.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-3">
                    <Send className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-600">
                      {searchFilter
                        ? 'Aucun message ne correspond à votre recherche.'
                        : "Vous n'avez envoyé aucun message."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSent.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg.id)}
                        className="group flex items-center justify-between p-3.5 sm:p-4 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                      >
                        {/* Left: icon + recipients + title */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                          <div className="flex-shrink-0">
                            <Send className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 truncate">
                              <span>À :</span>
                              {msg.recipients.map((r, i) => (
                                <span key={r.id}>
                                  <span className={getUserColorClass(r.profil)}>{r.username}</span>
                                  {i < msg.recipients.length - 1 && ', '}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {msg.title}
                            </p>
                          </div>
                        </div>

                        {/* Middle/Right: Read status */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {msg.isRead ? (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Lu par tous
                            </span>
                          ) : (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Non lu
                            </span>
                          )}

                          <span className="text-xs text-slate-400 font-medium">
                            {formatDate(msg.time)}
                          </span>

                          <button
                            onClick={(e) => handleDeleteSentMessage(msg.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Supprimer de la boîte d'envoi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
