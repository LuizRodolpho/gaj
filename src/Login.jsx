import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Tela de login
// - Mostra um formulário centralizado com campos email e senha
// - Ao submeter, faz POST para http://localhost:5000/login com JSON
// - Em caso de sucesso: salva o usuário no localStorage e redireciona para /home
// - Em caso de erro: exibe uma mensagem abaixo do botão
// - Também mostra link para /register

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handler do submit do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json().catch(() => ({}));

      // Se a resposta for de sucesso conforme API (ex: { success: true, user })
      if (res.ok && data && data.success) {
        // Salva dados públicos do usuário em localStorage para manter sessão
        try {
          localStorage.setItem('user', JSON.stringify(data.user));
          // Gravamos também uma flag simples de admin para o Navbar usar
          if (typeof data.user.is_admin !== 'undefined') {
            localStorage.setItem('is_admin', String(data.user.is_admin));
          }
        } catch (err) {
          console.warn('Falha ao acessar localStorage:', err);
        }

        // Redireciona para a rota principal da aplicação
        navigate('/home');
        return;
      }

      // Se não for ok, tenta extrair mensagem amigável
      const message = (data && (data.error || data.message)) || 'Erro no login';
      setError(String(message));
    } catch (err) {
      // Erro de rede ou outro inesperado
      setError('Não foi possível conectar ao servidor');
      console.error('Erro no login:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      {/* Card do formulário centralizado */}
      <form
        onSubmit={handleSubmit}
        className="formCard"
        style={{ width: 360, padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        {/* Título */}
        <h2 style={{ textAlign: 'center', marginBottom: 16 }}>GAJ</h2>

        {/* Campo Email */}
        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>Email</div>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
          />
        </label>

        {/* Campo Senha */}
        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>Senha</div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
          />
        </label>

        {/* Botão Entrar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ padding: '10px 12px', borderRadius: 6, background: '#2d7bf6', color: '#fff', border: 'none' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {/* Mensagem de erro exibida abaixo do botão */}
          {error && (
            <div className="error" style={{ color: '#b00020', fontSize: 13 }} role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Observação: registro agora é feito pelo administrador via painel de controle */}
      </form>
    </div>
  );
}
