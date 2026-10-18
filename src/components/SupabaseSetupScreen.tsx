import React, { useState } from 'react';
import { Database, Key, ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Play, Copy, Check } from 'lucide-react';
import { saveCustomSupabaseConfig, enableLocalMode } from '../lib/supabase';

export function SupabaseSetupScreen() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl) {
      setError('Por favor, informe a URL do seu projeto Supabase.');
      return;
    }

    if (!cleanUrl.startsWith('https://')) {
      setError('A URL deve começar com https://');
      return;
    }

    if (cleanUrl.includes('supabase.com/dashboard')) {
      setError('Atenção: Você colou a URL do painel administrativo. Você deve colar a URL da API do projeto (ex: https://seu-id.supabase.co), disponível em Project Settings → API.');
      return;
    }

    if (!cleanKey) {
      setError('Por favor, informe a chave pública anon do Supabase.');
      return;
    }

    if (!cleanKey.startsWith('eyJ')) {
      setError('A chave Anon do Supabase geralmente começa com "eyJ...". Verifique se copiou a chave correta em Project Settings → API.');
      return;
    }

    try {
      saveCustomSupabaseConfig(cleanUrl, cleanKey);
    } catch (_err) {
      setError('Não foi possível salvar as configurações no navegador.');
    }
  };

  return (
    <div className="w-screen min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 my-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Database className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Configuração do Supabase
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                Guia Rápido
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              O Chronos necessita das variáveis <code className="text-emerald-400 font-mono text-xs">VITE_SUPABASE_URL</code> e <code className="text-emerald-400 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        </div>

        {/* Step-by-step instructions card */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 sm:p-5 mb-6 text-xs sm:text-sm text-slate-300 space-y-3">
          <p className="font-semibold text-white flex items-center gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">1</span>
            Como encontrar suas chaves no Supabase:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-400 leading-relaxed text-xs sm:text-sm">
            <li>
              Acesse o painel em{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1 font-medium"
              >
                supabase.com/dashboard <ExternalLink className="w-3 h-3" />
              </a>{' '}
              e entre no seu projeto.
            </li>
            <li>No menu lateral esquerdo, clique no ícone de engrenagem <strong>Project Settings</strong>.</li>
            <li>Selecione <strong>API</strong> (ou <strong>Data API</strong>).</li>
            <li>
              Copie o <strong>Project URL</strong> (termina em <span className="text-slate-200 font-mono">.supabase.co</span>) e a chave <strong>Project API Keys → anon / public</strong>.
            </li>
          </ol>
        </div>

        {/* Interactive connection form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                VITE_SUPABASE_URL (Project URL)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Ex: https://xyzcompany.supabase.co</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seu-projeto.supabase.co"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-emerald-500 text-white text-xs sm:text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                VITE_SUPABASE_ANON_KEY (Chave Pública / Anon Key)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Começa com eyJ...</span>
            </label>
            <input
              type="text"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-emerald-500 text-white text-xs sm:text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition font-mono"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar e Conectar Agora
            </button>

            <button
              type="button"
              onClick={enableLocalMode}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs sm:text-sm border border-slate-700 transition cursor-pointer"
            >
              <Play className="w-4 h-4 text-cyan-400" />
              Modo Local (Sem Supabase)
            </button>
          </div>
        </form>

        {/* Deploy on Vercel/Netlify reference */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Configurando no Deploy da Vercel ou Netlify
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-emerald-300 font-semibold">VITE_SUPABASE_URL</span>
                <button
                  onClick={() => handleCopy('VITE_SUPABASE_URL', 'url')}
                  className="text-slate-400 hover:text-white transition"
                  title="Copiar nome da variável"
                >
                  {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Vercel → Project Settings → Environment Variables.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-emerald-300 font-semibold">VITE_SUPABASE_ANON_KEY</span>
                <button
                  onClick={() => handleCopy('VITE_SUPABASE_ANON_KEY', 'key')}
                  className="text-slate-400 hover:text-white transition"
                  title="Copiar nome da variável"
                >
                  {copiedKey === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Cole a chave anon (pública) e marque Production e Preview.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-slate-600" />
            Após salvar as variáveis na Vercel, clique em <strong>Deployments → Redeploy</strong> para que as variáveis sejam embutidas no build.
          </p>
        </div>
      </div>
    </div>
  );
}
