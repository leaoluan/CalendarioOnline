import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Shield, Trash2, Loader2, Crown, Edit3, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sounds } from '../services/soundEffects';

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  avatar: string;
  two_factor_enabled: boolean;
  created_at: string;
};

export function UserManagementModal({
  isOpen,
  onClose,
  currentUserRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER');
  const [addingUser, setAddingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, avatar, two_factor_enabled, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
    } else if (data) {
      setUsers(data as ManagedUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen, fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAddingUser(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
        options: { data: { name: newName.trim() } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setAddingUser(false);
        return;
      }

      if (data.user) {
        await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', data.user.id);

        sounds.playSyncSuccess();
        setShowAddForm(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('VIEWER');
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    }
    setAddingUser(false);
  };

  const handleUpdateRole = async (userId: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('Error updating role:', error);
    } else {
      sounds.playTactileClick();
      setEditingRole(null);
      fetchUsers();
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'ADMIN')
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold"><Crown className="w-3 h-3" />ADMIN</span>;
    if (role === 'EDITOR')
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold"><Edit3 className="w-3 h-3" />EDITOR</span>;
    return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-300 text-[10px] font-bold">VIEWER</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Gerenciar Usuários</h3>
              <p className="text-[11px] text-slate-400">{users.length} usuário(s) cadastrado(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAddForm(!showAddForm); setError(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Usuário</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Add user form */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="mb-5 p-4 rounded-2xl bg-slate-800/60 border border-blue-500/40 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="text-sm font-bold text-white">Criar Novo Usuário</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nome completo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Senha (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="VIEWER">VIEWER — Somente visualização</option>
                  <option value="EDITOR">EDITOR — Criar e editar eventos</option>
                  <option value="ADMIN">ADMIN — Acesso total + gerenciar usuários</option>
                </select>
              </div>
              {error && <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">{error}</div>}
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 border border-slate-700 transition">Cancelar</button>
                <button type="submit" disabled={addingUser} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50">
                  {addingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Adicionar</span>
                </button>
              </div>
            </form>
          )}

          {/* User list */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Carregando usuários...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                        {roleBadge(user.role)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Role selector (admin can change roles) */}
                  {currentUserRole === 'ADMIN' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editingRole === user.id ? (
                        <select
                          defaultValue={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as any)}
                          className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="VIEWER">VIEWER</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingRole(user.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Nível</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
