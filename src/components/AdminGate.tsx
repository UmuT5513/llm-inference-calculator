import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminPanelContent } from './AdminPanel';
import { Panel } from './ui/Panel';
import { Field } from './ui/Field';

type AuthState = 'loading' | 'anon' | 'authed';

export const AdminGate: React.FC = () => {
  const { t } = useTranslation();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me');
      setAuthState(res.ok ? 'authed' : 'anon');
    } catch {
      setAuthState('anon');
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `HTTP ${res.status}`);
        return;
      }
      setUsername('');
      setPassword('');
      setAuthState('authed');
    } catch {
      setError(t('admin.loginError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setAuthState('anon');
    }
  };

  const noopRefresh = useCallback(async () => {}, []);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted text-sm">
          <Lock className="w-4 h-4 animate-pulse" />
          {t('admin.checking')}
        </div>
      </div>
    );
  }

  if (authState === 'anon') {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4">
        <Panel className="w-full max-w-sm">
          <div className="flex items-center gap-2 border-b border-border px-3.5 py-2">
            <Lock className="w-4 h-4 text-accent shrink-0" />
            <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">{t('admin.loginTitle')}</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <Field label={t('admin.username')}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
              />
            </Field>
            <Field label={t('admin.password')}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 text-xs font-mono text-text placeholder-muted focus:outline-none focus:border-accent"
              />
            </Field>
            {error && <p className="text-[11px] font-mono font-medium text-danger">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-bg bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {submitting ? t('admin.signingIn') : t('admin.signIn')}
            </button>
          </form>
        </Panel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-accent selection:text-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <h1 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">{t('admin.panelTitle')}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-text hover:bg-surface-2 rounded-md transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('admin.home')}
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-danger hover:bg-surface-2 rounded-md transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('admin.logout')}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-muted mb-4">
          {t('admin.intro')}
        </p>

        <div className="space-y-4">
          <AdminPanelContent onModelsRefreshed={noopRefresh} onPricesRefreshed={noopRefresh} />
        </div>
      </div>
    </div>
  );
};