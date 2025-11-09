import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Home.jsx
// - Renderiza um calendário mensal simples para o mês atual (grade 7 colunas)
// - Busca agendamentos do backend (GET /schedules) e marca dias que possuem agendamentos
// - Ao clicar em um dia válido, lista os agendamentos daquele dia abaixo do calendário
// - Não usa bibliotecas externas de data, apenas Date() nativo

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

// Formata uma Date para 'YYYY-MM-DD' (o formato usado pelo backend)
function formatDateYYYYMMDD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Home() {
  const [schedules, setSchedules] = useState([]); // todos os agendamentos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // data real (hoje) usada apenas para destacar o dia atual
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth(); // 0-indexed (0 = janeiro)

  // Estado que controla o mês/ano exibidos no calendário (permite navegar entre meses/anos)
  const [displayYear, setDisplayYear] = useState(todayYear);
  const [displayMonth, setDisplayMonth] = useState(todayMonth);

  // Estado para dia selecionado (string YYYY-MM-DD) para exibir detalhes abaixo
  const [selectedDate, setSelectedDate] = useState(null);

  // Busca agendamentos do backend ao montar o componente
  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('http://localhost:5000/schedules')
      .then((res) => res.json())
      .then((data) => {
        // A API retorna { schedules: [...] }
        setSchedules(Array.isArray(data.schedules) ? data.schedules : []);
      })
      .catch((err) => {
        console.error('Erro ao buscar agendamentos:', err);
        setError('Falha ao carregar agendamentos');
      })
      .finally(() => setLoading(false));
  }, []);

  // --- Geração do calendário para o mês atual ---
  // 1) First day index: dia da semana em que o mês exibido começa (0=Domingo .. 6=Sábado)
  const firstOfMonth = new Date(displayYear, displayMonth, 1);
  const startDayIndex = firstOfMonth.getDay();

  // 2) Quantidade de dias no mês exibido -> criando uma date com dia 0 do próximo mês
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

  // 3) Número de células necessárias: start offset + daysInMonth, arredondado para múltiplo de 7
  const totalCells = startDayIndex + daysInMonth;
  const weeks = Math.ceil(totalCells / 7);
  const cells = weeks * 7; // quantidade total de quadrados na grade

  // 4) Cria array de células com informação sobre o dia (ou null se vazio da grade)
  const calendarCells = Array.from({ length: cells }).map((_, idx) => {
    const dayNumber = idx - startDayIndex + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    const d = new Date(displayYear, displayMonth, dayNumber);
    const dateStr = formatDateYYYYMMDD(d);
    // Verifica se há agendamentos para este dia (match exato por campo date)
    const hasEvents = schedules.some((s) => s.date === dateStr);
    return { dayNumber, dateStr, hasEvents };
  });

  // Pega agendamentos do dia selecionado
  const selectedSchedules = selectedDate ? schedules.filter((s) => s.date === selectedDate) : [];
  const navigate = useNavigate();

  // Navegação entre meses: ajusta mês/ano exibidos
  const gotoPrevMonth = () => {
    setSelectedDate(null);
    setDisplayMonth((m) => {
      if (m === 0) {
        setDisplayYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const gotoNextMonth = () => {
    setSelectedDate(null);
    setDisplayMonth((m) => {
      if (m === 11) {
        setDisplayYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const gotoToday = () => {
    setDisplayYear(todayYear);
    setDisplayMonth(todayMonth);
    setSelectedDate(null);
  };

  const displayMonthName = new Date(displayYear, displayMonth, 1).toLocaleString(undefined, { month: 'long' });

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={gotoPrevMonth} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>◀</button>
          <button onClick={gotoToday} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Hoje</button>
          <button onClick={gotoNextMonth} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>▶</button>
          <h3 style={{ margin: '0 0 0 12px', textTransform: 'capitalize' }}>
            {displayMonthName} {displayYear}
          </h3>
        </div>
        <div style={{ fontSize: 14, color: '#666' }}>{loading ? 'Carregando...' : ''}</div>
      </header>

      {/* Grid do calendário: 7 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignItems: 'start' }}>
        {/* Cabeçalhos dos dias da semana (domingo -> sábado) */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div key={d} style={{ textAlign: 'center', fontWeight: '600', paddingBottom: 6 }}>
            {d}
          </div>
        ))}

        {/* Células do mês */}
        {calendarCells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} style={{ minHeight: 64 }} />;
          const isToday = cell.dateStr === formatDateYYYYMMDD(new Date());
          const isSelected = cell.dateStr === selectedDate;
          return (
            <button
              key={cell.dateStr}
              onClick={() => setSelectedDate(cell.dateStr)}
              className="calendarCell"
              style={{
                minHeight: 64,
                border: '1px solid #eee',
                borderRadius: 8,
                background: isSelected ? '#e6f7ff' : isToday ? '#f0f8ff' : '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>{cell.dayNumber}</div>
              {/* Bolinha verde indicadora de evento (aparece abaixo do número) */}
              {cell.hasEvents && (
                <div
                  aria-hidden
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ecc71', marginTop: 6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Se um dia foi selecionado, mostramos os agendamentos desse dia */}
      <section style={{ marginTop: 18 }}>
        {selectedDate ? (
          <>
            <h4 style={{ margin: '8px 0' }}>Agendamentos para {selectedDate}</h4>
            {selectedSchedules.length === 0 ? (
              <div>Nenhum agendamento para este dia.</div>
            ) : (
              <ul style={{ paddingLeft: 16 }}>
                {selectedSchedules.map((s) => (
                  <li key={s.id} style={{ marginBottom: 8 }}>
                    <button
                      onClick={() => navigate(`/appointments/${s.id}`, { state: { schedule: s } })}
                      style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 600 }}>{s.time} — {s.lawyer}</div>
                      <div style={{ fontSize: 13, color: '#333' }}>{s.client} {s.process_number ? `• ${s.process_number}` : ''}</div>
                      {s.notes && <div style={{ fontSize: 13, color: '#666' }}>{s.notes}</div>}
                      <div style={{ marginTop: 6, fontSize: 12, color: '#0366d6' }}>
                        {s.online === 1 || s.online === true ? 'Online' : 'Presencial'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div style={{ color: '#666' }}>Clique em um dia para ver os agendamentos.</div>
        )}
      </section>

      {/* Mensagem de erro global */}
      {error && (
        <div style={{ marginTop: 12, color: '#b00020' }}>{error}</div>
      )}
    </div>
  );
}
