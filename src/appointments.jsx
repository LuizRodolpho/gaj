import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Página de detalhes de um agendamento
// - Exibe os campos do agendamento
// - Permite alternar 'online' (faz PUT /schedules/:id)
// - Permite excluir o agendamento (DELETE /schedules/:id) e volta para /home

export default function Appointments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [schedule, setSchedule] = useState(location.state && location.state.schedule ? location.state.schedule : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Se já recebemos o schedule via location.state, não precisamos buscar
    if (schedule) return;
    setLoading(true);
    fetch('http://localhost:5000/schedules')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.schedules) ? data.schedules : [];
        const found = list.find((s) => String(s.id) === String(id));
        if (!found) {
          setError('Agendamento não encontrado');
        } else {
          setSchedule(found);
        }
      })
      .catch((err) => {
        console.error('Erro buscando agendamentos:', err);
        setError('Falha ao buscar agendamento');
      })
      .finally(() => setLoading(false));
  }, [id, schedule]);

  const toggleOnline = () => {
    if (!schedule) return;
    const newOnline = schedule.online === 1 || schedule.online === true ? 0 : 1;
    setSaving(true);
    fetch(`http://localhost:5000/schedules/${schedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: newOnline })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setSchedule((s) => ({ ...s, online: newOnline }));
        } else {
          setError((data && data.error) || 'Falha ao atualizar');
        }
      })
      .catch((err) => {
        console.error('Erro atualizando agendamento:', err);
        setError('Falha ao atualizar');
      })
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!schedule) return;
    if (!confirm('Confirmar exclusão deste agendamento?')) return;
    setSaving(true);
    fetch(`http://localhost:5000/schedules/${schedule.id}`, {
      method: 'DELETE'
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          // Volta para home após exclusão
          navigate('/home');
        } else {
          setError((data && data.error) || 'Falha ao excluir');
        }
      })
      .catch((err) => {
        console.error('Erro excluindo agendamento:', err);
        setError('Falha ao excluir');
      })
      .finally(() => setSaving(false));
  };

  if (loading) return <div style={{ padding: 16 }}>Carregando...</div>;
  if (error) return <div style={{ padding: 16, color: '#b00020' }}>{error}</div>;
  if (!schedule) return <div style={{ padding: 16 }}>Agendamento não encontrado.</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3>Detalhes do Agendamento</h3>

      <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 8 }}><strong>Advogado:</strong> {schedule.lawyer}</div>
        <div style={{ marginBottom: 8 }}><strong>Cliente:</strong> {schedule.client}</div>
        <div style={{ marginBottom: 8 }}><strong>Processo:</strong> {schedule.process_number || '—'}</div>
        <div style={{ marginBottom: 8 }}><strong>Data:</strong> {schedule.date}</div>
        <div style={{ marginBottom: 8 }}><strong>Horário:</strong> {schedule.time}</div>
        <div style={{ marginBottom: 8 }}><strong>Observações:</strong> {schedule.notes || '—'}</div>
        <div style={{ marginBottom: 8 }}>
          <strong>Online:</strong> {schedule.online === 1 || schedule.online === true ? 'Sim' : 'Não'}
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <button onClick={toggleOnline} disabled={saving} style={{ padding: '8px 12px', borderRadius: 6 }}>
          {saving ? 'Salvando...' : (schedule.online === 1 || schedule.online === true ? 'Marcar como presencial' : 'Marcar como online')}
        </button>
        <button onClick={handleDelete} disabled={saving} style={{ padding: '8px 12px', borderRadius: 6, background: '#e74c3c', color: '#fff' }}>
          {saving ? 'Processando...' : 'Excluir agendamento'}
        </button>
        <button onClick={() => navigate('/home')} style={{ padding: '8px 12px', borderRadius: 6 }}>
          Voltar
        </button>
      </div>

      {error && <div style={{ marginTop: 12, color: '#b00020' }}>{error}</div>}
    </div>
  );
}
