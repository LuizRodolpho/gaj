import React, { useEffect, useState } from 'react';
const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// PainelAdmin.jsx
// - Mostra duas seções: Pendentes (approved=0) e Aprovados (approved=1)
// - Busca dados via GET /users/pending e GET /users/approved
// - Permite Aprovar (PUT /users/approve), Rejeitar (DELETE /users/reject) e alternar admin (PUT /users/admin)
// - Atualiza as listas após cada ação

export default function PainelAdmin() {
  // Removemos a aba "Pendentes" — agora o cadastro é feito pelo admin diretamente.
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado para o formulário de criação de usuário pelo admin
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [isAdminCreate, setIsAdminCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState('');

  // Função para obter listas pendentes e aprovadas do backend
  const fetchLists = async () => {
    setLoading(true);
    setError('');
    try {
  const aRes = await fetch(`${API}/users/approved`);
      const aData = await aRes.json().catch(() => ({}));
      setApproved(Array.isArray(aData.users) ? aData.users : []);
    } catch (err) {
      console.error('Erro ao buscar lista de usuários aprovados:', err);
      setError('Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  // Rejeitar usuário (remove do banco)
  const handleReject = async (id) => {
    if (!id) return;
    if (!window.confirm('Tem certeza que deseja rejeitar/remover este usuário?')) return;
    setActionLoading(true);
    setError('');
    try {
  const res = await fetch(`${API}/users/reject`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Erro ao remover usuário');
      await fetchLists();
    } catch (err) {
      console.error('Erro removendo usuário:', err);
      setError('Não foi possível remover o usuário');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle admin flag (is_admin)
  const handleToggleAdmin = async (id) => {
    if (!id) return;
    setActionLoading(true);
    setError('');
    try {
  const res = await fetch(`${API}/users/admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Erro ao alternar admin');
      await fetchLists();
    } catch (err) {
      console.error('Erro alternando admin:', err);
      setError('Não foi possível alterar permissão de admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Cria usuário pelo admin (aprovado diretamente)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateMessage('');
    setError('');
    if (!name || !email || !password) {
      setError('Nome, email e senha são obrigatórios');
      return;
    }
    setCreating(true);
    try {
      const payload = { name, email, password, cpf, approved: 1, is_admin: isAdminCreate ? 1 : 0 };
  const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data && data.success) {
        setCreateMessage('Usuário criado com sucesso');
        // limpa formulário
        setName(''); setEmail(''); setPassword(''); setCpf(''); setIsAdminCreate(false);
        await fetchLists();
        return;
      }
      const msg = (data && (data.error || data.message)) || 'Erro ao criar usuário';
      setError(String(msg));
    } catch (err) {
      console.error('Erro criando usuário pelo admin:', err);
      setError('Erro de conexão ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  // Renderiza uma tabela simples com as colunas pedidas
  const renderTable = (rows, actions = {}) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
          <th style={{ padding: '8px' }}>Nome</th>
          <th style={{ padding: '8px' }}>Email</th>
          <th style={{ padding: '8px' }}>CPF</th>
          <th style={{ padding: '8px' }}>Admin</th>
          <th style={{ padding: '8px' }}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
            <td style={{ padding: '8px' }}>{r.name}</td>
            <td style={{ padding: '8px' }}>{r.email}</td>
            <td style={{ padding: '8px' }}>{r.cpf}</td>
            <td style={{ padding: '8px' }}>
              <input
                type="checkbox"
                checked={r.is_admin === 1}
                onChange={() => handleToggleAdmin(r.id)}
                aria-label={`Toggle admin for ${r.email}`}
                disabled={actionLoading}
              />
            </td>
            <td style={{ padding: '8px' }}>
              {/* Se área de ações foi passada, chamamos as funções apropriadas */}
              {actions.approve && (
                <button onClick={() => actions.approve(r.id)} disabled={actionLoading} style={{ marginRight: 8 }}>
                  Aprovar
                </button>
              )}
              {actions.reject && (
                <button onClick={() => actions.reject(r.id)} disabled={actionLoading} style={{ background: '#f44336', color: '#fff' }}>
                  Rejeitar
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ padding: 16 }}>
      <h3>Painel Administrativo</h3>
      {error && <div style={{ color: '#b00020', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div>Carregando usuários...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <section>
            <h4>Criar usuário</h4>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="input" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <input className="input" placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={isAdminCreate} onChange={(e) => setIsAdminCreate(e.target.checked)} /> Dar admin
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn" disabled={creating} style={{ background: '#2d7bf6', color: '#fff', border: 'none' }}>
                  {creating ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
              {createMessage && <div className="success">{createMessage}</div>}
            </form>
          </section>

          <section>
            <h4>Aprovados</h4>
            {approved.length === 0 ? <div>Nenhum usuário aprovado.</div> : renderTable(approved, { reject: handleReject })}
          </section>
        </div>
      )}
    </div>
  );
}
