import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Navbar lateral simples (comentada em português)
// - Mostra a marca clicável no topo (leva para /home)
// - Mostra botões: Home, +Agendamento, +Acessos (apenas se for admin) e Sair
// - Usa classes CSS simples: container, brand, navList, btn, ativo
// - O botão Sair limpa o localStorage e redireciona para '/'

export default function Navbar({ isAdmin: isAdminProp }) {
  // Hooks do react-router para navegação e rota ativa
  const navigate = useNavigate();
  const location = useLocation();

  // Determina se o usuário é admin: prop (se passado) ou valor em localStorage
  // Aceitamos '1' ou 'true' em localStorage como sinal de admin.
  const isAdmin =
    typeof isAdminProp !== 'undefined'
      ? Boolean(isAdminProp)
      : (localStorage.getItem('is_admin') === '1' || localStorage.getItem('is_admin') === 'true');

  // Função utilitária para marcar o botão ativo conforme a rota atual
  const isActive = (path) => (location.pathname === path ? 'ativo' : '');

  // Sair: limpa o localStorage e redireciona para a página pública '/'
  // Usamos navigate para manter a navegação SPA correta.
  const handleLogout = (e) => {
    e.preventDefault();
    try {
      localStorage.clear();
    } catch (err) {
      // Se localStorage falhar por algum motivo, seguimos em frente
      console.warn('Falha ao limpar localStorage:', err);
    }
    navigate('/');
  };

  return (
    // Container lateral fixo (implemente o CSS conforme preferir)
    <aside className="container" style={{ display: 'flex', flexDirection: 'row', width: 220, padding: 16 }}>
      {/* Marca/branding no topo: Link para /home */}
      <div className="brand" style={{ marginBottom: 24 }}>
        <Link to="/home" style={{ textDecoration: 'none', color: 'inherit', fontWeight: '700', fontSize: 20 }}>
          GAJ
        </Link>
      </div>

      {/* Lista de navegação vertical */}
      <nav className="navList" style={{ display: 'flex', flexDirection: 'row', gap: 8, flexGrow: 1 }}>
        {/* Botão Home - acesso público */}
        <Link className={`btn ${isActive('/home')}`} to="/home" style={{ padding: '8px 12px', borderRadius: 6 }}>
          Home
        </Link>

        {/* Botão +Agendamento - cria novo agendamento */}
        <Link className={`btn ${isActive('/agendar')}`} to="/agendar" style={{ padding: '8px 12px', borderRadius: 6 }}>
          Agendamento
        </Link>

        {/* Botão +Acessos - visível apenas para admins */}
        {isAdmin && (
          <Link className={`btn ${isActive('/painel')}`} to="/painel" style={{ padding: '8px 12px', borderRadius: 6 }}>
            Acessos
          </Link>
        )}
      </nav>

      {/* Espaço inferior com botão Sair */}
      <div style={{ marginTop: 16 }}>
        {/* Botão Sair: limpa localStorage e manda para rota pública '/' */}
        <button className="btn" onClick={handleLogout} style={{ padding: '8px 12px', width: '100%', borderRadius: 6 }}>
          Sair
        </button>
      </div>
    </aside>
  );
}
