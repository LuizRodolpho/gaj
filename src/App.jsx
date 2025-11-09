// src/App.jsx
// Configura as rotas principais da aplicação usando react-router-dom.
// - Rotas públicas de autenticação (Login/Register) não exibem a Navbar.
// - As demais rotas usam um layout comum que inclui a Navbar.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './styles.css';

// Ajustes de import: os componentes estão no diretório `src/` (raízes),
// então usamos imports relativos direto para evitar erros quando o arquivo
// original não existe em subpastas. Mantemos a estrutura de rotas.
import Navbar from './Navbar';
import Login from './Login';
import Register from './Register';
import Home from './Home';
import Agendamento from './Agendamento';
import PainelAdmin from './PainelAdmin';
import Appointments from './appointments';

// MainLayout: componente de layout usado nas rotas que devem mostrar a Navbar.
// Ele renderiza a Navbar e um <Outlet /> onde a rota filha será exibida.
function MainLayout() {
  return (
    <>
      {/* Navbar aparece em todas as páginas dentro deste layout */}
      <Navbar />
      <main>
        {/* Outlet renderiza a rota filha (Home, Agendamento, PainelAdmin) */}
        <Outlet />
      </main>
    </>
  );
}

// App: configura as rotas da aplicação
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota raiz: página de Login. Não renderiza Navbar. */}
        <Route path="/" element={<Login />} />

        {/* Rota de registro: página de cadastro (sem Navbar). */}
        <Route path="/register" element={<Register />} />

        {/* Rotas dentro do MainLayout renderizam a Navbar automaticamente */}
        <Route element={<MainLayout />}>
          {/* Página inicial após login */}
          <Route path="/home" element={<Home />} />

          {/* Página de detalhes do agendamento */}
          <Route path="/appointments/:id" element={<Appointments />} />

          {/* Página para criar agendamentos */}
          <Route path="/agendar" element={<Agendamento />} />

          {/* Painel administrativo */}
          <Route path="/painel" element={<PainelAdmin />} />
        </Route>

        {/* Qualquer rota desconhecida redireciona para a raiz (login) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
