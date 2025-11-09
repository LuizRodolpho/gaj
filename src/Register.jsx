import React, { useState } from 'react';
const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
import { Link, useNavigate } from 'react-router-dom';

// Register.jsx
// - Formulário de registro completo que envia POST /users
// - Campos: name, email, password, cpf
// - Em caso de sucesso: mostra mensagem e redireciona para login

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name || !email || !password) {
      setError('Nome, email e senha são obrigatórios');
      return;
    }

    setLoading(true);
    try {
  const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, cpf })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data && data.success) {
        setMessage('Cadastro enviado com sucesso. Aguarde aprovação do administrador.');
        // redireciona para login após 2s
        setTimeout(() => navigate('/'), 2000);
        return;
      }
      // trata erros retornados pela API
      const msg = (data && (data.error || data.message)) || 'Erro no cadastro';
      setError(String(msg));
    } catch (err) {
      console.error('Erro ao cadastrar:', err);
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <form onSubmit={handleSubmit} className="formCard" style={{ width: 420 }}>
        <h3 style={{ marginTop: 0 }}>Cadastro</h3>

        <label style={{ display: 'block', marginBottom: 8 }}>
          Nome
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required style={{ marginTop: 6 }} />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          Email
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ marginTop: 6 }} />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          Senha
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginTop: 6 }} />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          CPF
          <input className="input" value={cpf} onChange={(e) => setCpf(e.target.value)} style={{ marginTop: 6 }} />
        </label>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <button type="submit" className="btn" disabled={loading} style={{ background: '#2d7bf6', color: '#fff', border: 'none' }}>
            {loading ? 'Enviando...' : 'Registrar'}
          </button>
          <Link to="/" className="muted small" style={{ alignSelf: 'center' }}>Voltar ao login</Link>
        </div>

        {message && <div className="success" style={{ marginTop: 10 }}>{message}</div>}
        {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
      </form>
    </div>
  );
}
