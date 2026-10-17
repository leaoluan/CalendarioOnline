import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Download,
  RotateCw,
  Key,
  Database
} from 'lucide-react';
import { AuditLogItem } from '../types/calendar';
import { sounds } from '../services/soundEffects';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  status: 'ACTIVE' | 'SUSPENDED';
  storageUsed: string;
  twoFactorEnabled: boolean;
  lastLogin: string;
  googleConnected: boolean;
}

interface AdminPanelProps {
  onClose: () => void;
  offlineQueueCount: number;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, offlineQueueCount }) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'logs' | 'telemetry'>('accounts');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('ALL');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [accRes, logRes] = await Promise.all([
        fetch('/api/admin/accounts'),
        fetch('/api/admin/logs')
      ]);
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setLogs(logData.logs || []);
      }
    } catch (e) {
      console.error('Falha ao buscar dados administrativos:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRoleChange = async (accountId: string, newRole: string) => {
    sounds.playTactileClick();
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_ROLE', accountId, role: newRole })
      });
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === accountId ? { ...a, role: newRole as any } : a))
        );
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusToggle = async (accountId: string, currentStatus: string) => {
    sounds.playTactileClick();
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_STATUS', accountId, status: nextStatus })
      });
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === accountId ? { ...a, status: nextStatus as any } : a))
        );
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset2FA = async (accountId: string, userName: string) => {
    sounds.playTactileClick();
    const confirmed = window.confirm(
      `Deseja redefinir as credenciais de 2FA para o usuário "${userName}"? Ele precisará reconfigurar no próximo login.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_2FA', accountId })
      });
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === accountId ? { ...a, twoFactorEnabled: false } : a))
        );
        fetchAdminData();
      }
    } catch (e) {}
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      log.ip.includes(searchLogQuery);

    const matchesLevel = selectedLogLevel === 'ALL' || log.status === selectedLogLevel;

    return matchesSearch && matchesLevel;
  });

  const exportLogsCSV = () => {
    sounds.playTactileClick();
    const headers = ['ID', 'Data/Hora', 'Usuário', 'Ação', 'Categoria', 'Status', 'IP', 'Detalhes'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.user}"`,
      `"${l.action}"`,
      l.category,
      l.status,
      l.ip,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronos_admin_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-3 sm:p-6 flex flex-col gap-5 text-slate-200">
      
      {/* Admin Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Painel Administrativo Centralizado
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Gerenciamento de contas, políticas de 2FA, auditoria de logs e telemetria de sincronização.
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchAdminData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => { sounds.playTactileClick(); setActiveTab('accounts'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'accounts'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gerenciamento de Contas ({accounts.length})</span>
        </button>

        <button
          onClick={() => { sounds.playTactileClick(); setActiveTab('logs'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'logs'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Logs de Auditoria ({logs.length})</span>
        </button>

        <button
          onClick={() => { sounds.playTactileClick(); setActiveTab('telemetry'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'telemetry'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Telemetria & Sistema</span>
        </button>
      </div>

      {/* Tab 1: Accounts Management */}
      {activeTab === 'accounts' && (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700/80">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Função / Permissão</th>
                  <th className="py-3 px-4">2FA (Dois Fatores)</th>
                  <th className="py-3 px-4">Armazenamento</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{acc.name}</div>
                      <div className="text-[11px] text-slate-400">{acc.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={acc.role}
                        onChange={(e) => handleRoleChange(acc.id, e.target.value)}
                        className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      {acc.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> Ativado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[10px]">
                          Desativado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {acc.storageUsed}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          acc.status === 'ACTIVE'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {acc.twoFactorEnabled && (
                          <button
                            onClick={() => handleReset2FA(acc.id, acc.name)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-amber-300 transition"
                            title="Redefinir chave 2FA do usuário"
                          >
                            Reset 2FA
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusToggle(acc.id, acc.status)}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition ${
                            acc.status === 'ACTIVE'
                              ? 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10'
                              : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {acc.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="flex flex-col gap-3">
          {/* Filters & Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar logs por usuário, ação, IP ou detalhes..."
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedLogLevel}
                onChange={(e) => setSelectedLogLevel(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">Todos os Níveis</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
                <option value="INFO">INFO</option>
              </select>

              <button
                onClick={exportLogsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700/80">
                <tr>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Data / Hora</th>
                  <th className="py-2.5 px-4">Usuário</th>
                  <th className="py-2.5 px-4">Ação</th>
                  <th className="py-2.5 px-4">Categoria</th>
                  <th className="py-2.5 px-4">IP</th>
                  <th className="py-2.5 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : log.status === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : log.status === 'ERROR'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-4 text-white font-sans">{log.user}</td>
                    <td className="py-2.5 px-4 text-purple-300 font-sans font-medium">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.category}</td>
                    <td className="py-2.5 px-4 text-slate-500">{log.ip}</td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">
              Fila de Mutações Offline
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {offlineQueueCount} pendentes
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {offlineQueueCount === 0
                ? 'Nenhuma mutação represada. Sincronização 100% em dia.'
                : 'Mutações aguardando restabelecimento de conexão com Google Calendar.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">
              Status do Motor de IA Gemini
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" /> Online
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Modelo ativo: <code>gemini-3.8-flash</code> via proxy servidor seguro.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">
              Sessões Ativas
            </div>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {accounts.filter((a) => a.status === 'ACTIVE').length} contas
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Autenticação de dois fatores e isolamento de estado por inquilino ativos.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
