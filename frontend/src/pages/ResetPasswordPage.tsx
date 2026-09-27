import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { KeyRound, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Page de renouvellement de mot de passe, accessible depuis le lien
 * reçu par mail : /reset-password?user=<id>&alea=<token>
 */
export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = Number(searchParams.get('user'));
  const alea = searchParams.get('alea') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasValidLink = Number.isInteger(userId) && userId > 0 && alea !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ userId, alea, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError((err as Error).message || 'Erreur lors du renouvellement du mot de passe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 border border-indigo-100">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h2>
        <p className="text-sm text-slate-600 mt-1">Définissez votre nouveau mot de passe JdRoll</p>
      </div>

      {success && (
        <div className="mb-4 p-3.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
          <span>Mot de passe mis à jour avec succès. Redirection vers la connexion...</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {!hasValidLink && !success && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>Ce lien de réinitialisation est incomplet ou invalide.</span>
        </div>
      )}

      {hasValidLink && !success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              required
              minLength={3}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              required
              minLength={3}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition mt-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>Définir mon nouveau mot de passe</span>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-slate-600">
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
};
