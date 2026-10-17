import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Calendar, Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { sounds } from '../services/soundEffects';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setError(error.includes('Invalid login') ? 'Email ou senha incorretos.' : error);
      }
      setLoading(false);
    } else {
      const { error } = await signUp(email.trim(), password, name.trim());
      if (error) {
        setError(error);
      } else {
        sounds.playSyncSuccess();
        setError('Conta criada! Verifique se o cadastro foi confirmado e faça login.');
        setMode('login');
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-950 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] bg-cyan-600/8 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] bg-indigo-600/8 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md mx-auto px-6">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-blue-400 shadow-lg shadow-blue-500/30 ring-1 ring-white/20 mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            CHRONOS
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Agenda & Calendário Inteligente
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 shadow-2xl p-7">
          {/* Mode tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-800/60 border border-slate-700/50 mb-6">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
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
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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

            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Entrar no Chronos' : 'Criar Minha Conta'}
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-700/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Seus dados são protegidos com autenticação segura e criptografia de ponta a ponta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
