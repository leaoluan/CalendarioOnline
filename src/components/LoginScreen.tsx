import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Calendar,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  User,
  CheckCircle2,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

export function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (mode === 'login') {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        sounds.playWarningNotification();
        setError(signInError);
      } else {
        sounds.playSyncSuccess();
      }
      setLoading(false);
    } else if (mode === 'register') {
      if (password.length < 6) {
        setError('A senha deve conter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await signUp(email.trim(), password, name.trim());
      if (signUpError) {
        sounds.playWarningNotification();
        setError(signUpError);
      } else {
        sounds.playSyncSuccess();
        setSuccessMsg('Conta criada com sucesso! Você já pode entrar.');
        setMode('login');
      }
      setLoading(false);
    } else if (mode === 'recovery') {
      if (recoveryPassword.length < 6) {
        setError('A nova senha deve conter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }

      if (recoveryPassword !== recoveryConfirmPassword) {
        setError('As senhas digitadas não coincidem.');
        setLoading(false);
        return;
      }

      const { error: recoveryError } = await resetPassword(email.trim(), recoveryPassword);
      if (recoveryError) {
        sounds.playWarningNotification();
        setError(recoveryError);
        setLoading(false);
      } else {
        sounds.playSyncSuccess();
        // Automatically attempt to sign in with the new credentials
        const { error: signErr } = await signIn(email.trim(), recoveryPassword);
        if (signErr) {
          setSuccessMsg('Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.');
          setPassword(recoveryPassword);
          setMode('login');
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-slate-950 overflow-y-auto relative py-10 px-4">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] bg-cyan-600/8 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] bg-indigo-600/8 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md mx-auto">
        {/* Logo and branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-blue-400 shadow-lg shadow-blue-500/30 ring-1 ring-white/20 mb-3">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            CHRONOS
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Agenda & Calendário Inteligente
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-3xl bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 shadow-2xl p-6 sm:p-7">
          {mode !== 'recovery' ? (
            /* Mode tabs (Entrar / Criar Conta) */
            <div className="flex items-center p-1 rounded-xl bg-slate-800/60 border border-slate-700/50 mb-5">
              <button
                type="button"
                onClick={() => {
                  sounds.playTactileClick();
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                  mode === 'login'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playTactileClick();
                  setMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>
          ) : (
            /* Recovery Header */
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Recuperação de Senha</h2>
                  <p className="text-[11px] text-slate-400">Defina uma nova senha de acesso</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playTactileClick();
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Seu Nome
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo ou apelido"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {mode !== 'recovery' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Senha {mode === 'register' && <span className="text-slate-500 font-normal">(mínimo 6 dígitos)</span>}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playTactileClick();
                        setMode('recovery');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 transition hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Nova Senha <span className="text-slate-500 font-normal">(mínimo 6 dígitos)</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium leading-relaxed">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium leading-relaxed flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition disabled:opacity-50 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aguarde...</span>
                </>
              ) : (
                <span>
                  {mode === 'login' && 'Entrar'}
                  {mode === 'register' && 'Cadastrar Conta'}
                  {mode === 'recovery' && 'Redefinir Senha e Entrar'}
                </span>
              )}
            </button>
          </form>

          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Seus eventos e lembretes são salvos e preservados com segurança.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
