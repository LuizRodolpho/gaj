import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Agendamento.jsx
// - Formulário para criar um novo agendamento
// - Busca advogados (usuários aprovados) via GET /users/approved e mostra no dropdown
// - Valida horário (entre 06:00 e 18:00)
// - Envia POST para http://localhost:5000/schedules com os campos esperados pela API
// - Mostra mensagens de sucesso/erro

function validateHour(time) {
  if (typeof time !== 'string') return false;
  const m = time.match(/^([0-2]?\d):([0-5]\d)$/);
  if (!m) return false;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const minutes = hh * 60 + mm;
  const start = 6 * 60;
  const end = 18 * 60;
  return minutes >= start && minutes <= end;
}

export default function Agendamento() {
  const navigate = useNavigate();

  // Form state
  const [lawyer, setLawyer] = useState('');
  const [client, setClient] = useState('');
  const [processNumber, setProcessNumber] = useState('');
  const [online, setOnline] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const [users, setUsers] = useState([]); // advogados aprovados
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Ao montar, buscamos usuários aprovados para popular o dropdown de advogado
  useEffect(() => {
    setLoadingUsers(true);
    fetch('http://localhost:5000/users/approved')
      .then((res) => res.json())
      .then((data) => {
        // API retorna { users: [...] }
        const list = Array.isArray(data.users) ? data.users : [];
        setUsers(list);
        // Preseleciona o primeiro advogado, se houver
        if (list.length > 0) setLawyer(list[0].name || list[0].email || String(list[0].id));
      })
      .catch((err) => {
        console.error('Erro ao buscar usuários aprovados:', err);
        setError('Não foi possível carregar lista de advogados.');
      })
      .finally(() => setLoadingUsers(false));
  }, []);

  // Envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // Validações simples
    if (!lawyer) return setError('Selecione um advogado');
    if (!client) return setError('Informe o nome do cliente');
    if (!date) return setError('Informe a data');
    if (!time) return setError('Informe a hora');
    if (!validateHour(time)) return setError('Horário fora do intervalo permitido');

    const payload = {
      lawyer,
      client,
      process_number: processNumber,
      online: online ? 1 : 0,
      date,
      time,
      notes
    };

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage('Agendamento criado com sucesso');
        // opcional: limpar formulário
        setClient('');
        setProcessNumber('');
        setOnline(false);
        setDate('');
        setTime('');
        setNotes('');
        // manter advogado selecionado
        // navegar de volta para a home após 1.5s (opcional)
        setTimeout(() => navigate('/home'), 1500);
      } else {
        const msg = (data && (data.error || data.message)) || 'Erro ao criar agendamento';
        setError(String(msg));
      }
    } catch (err) {
      console.error('Erro ao enviar agendamento:', err);
      setError('Erro de conexão com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 700 }}>
      <h3>Agendar reunião</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Dropdown de advogados (buscados da API). Se não houver, mostrar aviso. */}
        <label>
          Advogado
          <br />
          {loadingUsers ? (
            <div>Carregando advogados...</div>
          ) : users.length === 0 ? (
            <div>Nenhum advogado disponível.</div>
          ) : (
            <select value={lawyer} onChange={(e) => setLawyer(e.target.value)} style={{ width: '100%', padding: 8 }}>
              {users.map((u) => (
                // usamos o nome ao mostrar mas guardamos o nome no payload para o backend
                <option key={u.id} value={u.name || u.email || u.id}>{u.name || u.email}</option>
              ))}
            </select>
          )}
        </label>

        <label>
          Nome do cliente
          <br />
          <input type="text" value={client} onChange={(e) => setClient(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Número do processo
          <br />
          <input type="text" value={processNumber} onChange={(e) => setProcessNumber(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
          Online
        </label>

        <label>
          Data
          <br />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 8 }} />
        </label>

        <label>
          Hora (entre 06:00 e 18:00)
          <br />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ padding: 8 }} />
        </label>

        <label>
          Observações
          <br />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', minHeight: 80, padding: 8 }} />
        </label>

        <div>
          <button type="submit" disabled={submitting} className="btn" style={{ padding: '10px 14px', background: '#2d7bf6', color: '#fff', border: 'none', borderRadius: 6 }}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {/* Mensagens de sucesso / erro */}
        {message && <div style={{ color: '#0a8a00' }}>{message}</div>}
        {error && <div style={{ color: '#b00020' }}>{error}</div>}
      </form>
    </div>
  );
}
