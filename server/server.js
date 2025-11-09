// Clean single-file server implementation
// Servidor HTTP simples usando Node.js puro
// - Usa módulos nativos: http, url e fs
// - Escuta na porta 5000
// - Rota '/' responde JSON { message: 'Servidor GAJ rodando' }
// - Adiciona cabeçalhos CORS (Access-Control-Allow-Origin: *)
// - Todas as respostas são retornadas em JSON

const http = require('http'); // servidor HTTP
const url = require('url'); // para parsear a URL e extrair pathname/queries
const fs = require('fs'); // usado para demonstração (leitura de arquivos como package.json)
const path = require('path'); // utilitário para caminhos de arquivos
// SQLite3: usamos o driver nativo sqlite3 em modo verbose para debug mais claro
const sqlite3 = require('sqlite3').verbose();
// bcryptjs para hashear/verificar senhas de forma simples
const bcrypt = require('bcryptjs');

// Porta onde o servidor vai escutar (no Render o PORT vem em env var)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// --- Configuração do banco SQLite3 ---
// Caminho do arquivo de banco (será criado automaticamente se não existir)
const DB_PATH = path.join(__dirname, 'database.db');

// Abre (ou cria) o arquivo de banco de dados SQLite
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Erro ao abrir/criar o banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco SQLite em', DB_PATH);
  }
});

// Cria as tabelas necessárias se não existirem e garante usuário admin padrão
db.serialize(() => {
  // Cria tabela users com campos básicos e constraints
  db.run(
    `CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      cpf TEXT,
      is_admin INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 0
    )`,
    (err) => {
      if (err) console.error('Erro criando/verificando tabela users:', err.message);
      else console.log('Tabela users pronta.');
    }
  );

  // Cria tabela schedules para armazenar agendamentos
  db.run(
    `CREATE TABLE IF NOT EXISTS schedules(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lawyer TEXT,
      client TEXT,
      process_number TEXT,
      online INTEGER,
      date TEXT,
      time TEXT,
      notes TEXT
    )`,
    (err) => {
      if (err) console.error('Erro criando/verificando tabela schedules:', err.message);
      else console.log('Tabela schedules pronta.');
    }
  );

  // Verifica se existe um admin padrão; se não, insere um
  const adminEmail = 'admin@admin.com';
  const adminPassword = 'admin'; // senha simples por padrão conforme requisitado (pode ser alterada/hasheada depois)
  db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (err, row) => {
    if (err) {
      console.error('Erro ao checar admin no banco:', err.message);
      return;
    }
    if (!row) {
      // Se não existir, hash da senha e inserção segura
      hashPassword(adminPassword)
        .then((hash) => {
          db.run(
            'INSERT INTO users (name, email, password, is_admin, approved) VALUES (?, ?, ?, ?, ?)',
            ['Admin', adminEmail, hash, 1, 1],
            function (err) {
              if (err) console.error('Erro ao inserir admin padrão:', err.message);
              else console.log('Admin padrão criado (email: admin@admin.com, senha: <hashed>)');
            }
          );
        })
        .catch((e) => console.error('Erro ao hashear senha do admin:', e.message));
    } else {
      // Se já existe, vamos garantir que a senha esteja hasheada.
      // Caso a senha esteja em texto plano (não começa com $2), substituímos por um hash.
      db.get('SELECT id, password FROM users WHERE id = ?', [row.id], (err2, existing) => {
        if (err2) return console.error('Erro checando senha do admin existente:', err2.message);
        const pwd = existing && existing.password ? existing.password : '';
        if (pwd && !pwd.startsWith('$2')) {
          // senha em texto -> atualizar para hash
          hashPassword(pwd)
            .then((hash) => {
              db.run('UPDATE users SET password = ? WHERE id = ?', [hash, existing.id], function (err3) {
                if (err3) console.error('Erro ao atualizar senha do admin para hash:', err3.message);
                else console.log('Senha do admin existente convertida para hash.');
              });
            })
            .catch((e) => console.error('Erro ao hashear senha existente do admin:', e.message));
        } else {
          console.log('Admin padrão já existe no banco.');
        }
      });
    }
  });
});

// Fecha o banco quando o processo estiver saindo (boa prática)
process.on('exit', () => {
  db.close((err) => {
    if (err) console.error('Erro fechando o banco SQLite:', err.message);
    else console.log('Conexão com SQLite fechada.');
  });
});

// --- Funções auxiliares reutilizáveis ---

// Envia resposta JSON com cabeçalhos CORS e status HTTP
// Parâmetros: res - objeto resposta; data - payload (objeto); statusCode - código HTTP (padrão 200)
// Lista de origens permitidas (frontend no Vercel e o dev server do Vite)
const ALLOWED_ORIGINS = [
  'https://gaj-xi.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

function sendJSON(res, data, statusCode = 200, reqOrigin = '*') {
  const body = JSON.stringify(data);
  // se reqOrigin não foi passado, tentamos extrair de res._reqOrigin (definido por request handler)
  const origin = reqOrigin === '*' ? res._reqOrigin : reqOrigin;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept'
  };
  // Se a origem for permitida, ecoamos ela; caso contrário não setamos (bloqueio ao frontend)
  if (origin && ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  res.writeHead(statusCode, headers);
  res.end(body);
}

// Lê o corpo da requisição e tenta parsear como JSON
// Retorna uma Promise que resolve com o objeto parseado ou null se vazio
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      // Proteção simples contra payloads enormes (opcional)
      if (body.length > 1e6) {
          // Se o corpo for muito grande, destrói a conexão
          // uso de req.socket.destroy() é mais moderno do que req.connection
          if (req.socket && typeof req.socket.destroy === 'function') req.socket.destroy();
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve(null);
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (e) {
        // Falha no parse -> retorna erro para quem chamou
        reject(new Error('JSON inválido no corpo da requisição'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

// Envia 404 com mensagem padronizada
function notFound(res) {
  return sendJSON(res, { error: 'Rota não encontrada' }, 404);
}

// (static file serving removed - frontend will be hosted separately on Vercel)

// Valida se um horário (string 'HH:MM') está entre 06:00 e 18:00 (inclusive)
function validateHour(time) {
  if (typeof time !== 'string') return false;
  const match = time.match(/^([0-2]\d):([0-5]\d)$/);
  if (!match) return false;
  const hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const minutes = hh * 60 + mm;
  const start = 6 * 60; // 06:00
  const end = 18 * 60; // 18:00
  return minutes >= start && minutes <= end;
}

// Hash de senha usando bcryptjs (retorna Promise)
function hashPassword(password) {
  const saltRounds = 10;
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) return reject(err);
      resolve(hash);
    });
  });
}

// Verifica se senha bate com hash armazenado (retorna Promise<boolean>)
function checkPassword(password, hash) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, same) => {
      if (err) return reject(err);
      resolve(same);
    });
  });
}

// Cria o servidor HTTP
const server = http.createServer((req, res) => {
  // Parseia a URL para obter o pathname e querystring
  const parsedUrl = url.parse(req.url, true);
  // Guarda a origem da requisição no objeto res para uso posterior em sendJSON
  res._reqOrigin = req.headers && req.headers.origin ? req.headers.origin : '';
  // Normaliza o pathname removendo barras finais (ex: '/foo/' -> '/foo')
  const pathname = (parsedUrl.pathname || '').replace(/\/+$/g, '') || '/';

  // Tratamento para requisições OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    // Preflight: aceitaremos apenas origens permitidas
    const origin = req.headers.origin;
    const headers = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    };
    if (origin && ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    res.writeHead(204, headers);
    return res.end();
  }

  // Rota raiz '/' -> retorna mensagem de status
  if (pathname === '/' && req.method === 'GET') {
    return sendJSON(res, { message: 'Servidor GAJ rodando' }, 200);
  }

  // Rota de login: autenticação de usuário
  // POST /login { email, password }
  if (pathname === '/login' && req.method === 'POST') {
    // Lê o corpo da requisição (JSON esperado)
    return parseBody(req)
      .then((body) => {
        if (!body || !body.email || !body.password) {
          return sendJSON(res, { error: 'Email e password são requeridos' }, 400);
        }

        const { email, password } = body;

        // Busca usuário no banco pelo email
        db.get('SELECT id, name, email, password, is_admin, approved FROM users WHERE email = ?', [email], (err, row) => {
          if (err) {
            console.error('Erro consultando usuário para login:', err.message);
            return sendJSON(res, { error: 'Erro interno' }, 500);
          }

          if (!row) {
            // Usuário não encontrado
            return sendJSON(res, { error: 'Usuário não encontrado' }, 404);
          }

          if (row.approved === 0) {
            // Usuário existe, mas ainda não foi aprovado
            return sendJSON(res, { error: 'Aguardando aprovação' }, 403);
          }

          // Função auxiliar local para verificar senha
          // Suporta tanto senhas em texto (legado) quanto hashes bcrypt
          const verifyPassword = (stored, provided) => {
            return new Promise((resolve) => {
              if (stored === provided) return resolve(true); // senha em texto
              // tenta comparar com bcrypt (hash)
              checkPassword(provided, stored)
                .then((ok) => resolve(!!ok))
                .catch(() => resolve(false));
            });
          };

          // Verifica a senha fornecida
          verifyPassword(row.password, password).then((match) => {
            if (!match) return sendJSON(res, { error: 'Senha incorreta' }, 401);

            // Autenticação bem-sucedida: retorna dados públicos do usuário
            const user = {
              id: row.id,
              name: row.name,
              email: row.email,
              is_admin: row.is_admin === 1 ? 1 : 0
            };

            return sendJSON(res, { success: true, user }, 200);
          });
        });
      })
      .catch((err) => {
        // Erro no parse do corpo ou leitura do stream
        return sendJSON(res, { error: err.message || 'JSON inválido' }, 400);
      });
  }

  // --------------------
  // Rotas de administração de usuários (painel admin)
  // --------------------

  // GET /users/pending -> lista usuários com approved = 0
  if (pathname === '/users/pending' && req.method === 'GET') {
    db.all('SELECT id, name, email, cpf, is_admin, approved FROM users WHERE approved = 0', [], (err, rows) => {
      if (err) {
        console.error('Erro listando usuários pendentes:', err.message);
        return sendJSON(res, { error: 'Erro interno' }, 500);
      }
      return sendJSON(res, { users: rows }, 200);
    });
    return;
  }

  // GET /users/approved -> lista usuários com approved = 1
  if (pathname === '/users/approved' && req.method === 'GET') {
    db.all('SELECT id, name, email, cpf, is_admin, approved FROM users WHERE approved = 1', [], (err, rows) => {
      if (err) {
        console.error('Erro listando usuários aprovados:', err.message);
        return sendJSON(res, { error: 'Erro interno' }, 500);
      }
      return sendJSON(res, { users: rows }, 200);
    });
    return;
  }

  // PUT /users/approve -> recebe { id } e define approved = 1
  if (pathname === '/users/approve' && req.method === 'PUT') {
    return parseBody(req)
      .then((body) => {
        if (!body || typeof body.id === 'undefined') return sendJSON(res, { error: 'Campo id é requerido' }, 400);
        const id = body.id;
        db.run('UPDATE users SET approved = 1 WHERE id = ?', [id], function (err) {
          if (err) {
            console.error('Erro aprovando usuário:', err.message);
            return sendJSON(res, { error: 'Erro interno' }, 500);
          }
          if (this.changes === 0) return sendJSON(res, { error: 'Usuário não encontrado' }, 404);
          return sendJSON(res, { success: true, message: 'Usuário aprovado' }, 200);
        });
      })
      .catch((err) => sendJSON(res, { error: err.message || 'JSON inválido' }, 400));
  }

  // DELETE /users/reject -> recebe { id } e remove o usuário
  if (pathname === '/users/reject' && req.method === 'DELETE') {
    return parseBody(req)
      .then((body) => {
        if (!body || typeof body.id === 'undefined') return sendJSON(res, { error: 'Campo id é requerido' }, 400);
        const id = body.id;
        db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
          if (err) {
            console.error('Erro removendo usuário:', err.message);
            return sendJSON(res, { error: 'Erro interno' }, 500);
          }
          if (this.changes === 0) return sendJSON(res, { error: 'Usuário não encontrado' }, 404);
          return sendJSON(res, { success: true, message: 'Usuário removido' }, 200);
        });
      })
      .catch((err) => sendJSON(res, { error: err.message || 'JSON inválido' }, 400));
  }

  // PUT /users/admin -> alterna is_admin entre 0 e 1 (recebe { id })
  if (pathname === '/users/admin' && req.method === 'PUT') {
    return parseBody(req)
      .then((body) => {
        if (!body || typeof body.id === 'undefined') return sendJSON(res, { error: 'Campo id é requerido' }, 400);
        const id = body.id;

        // Busca valor atual e alterna
        db.get('SELECT is_admin FROM users WHERE id = ?', [id], (err, row) => {
          if (err) {
            console.error('Erro buscando usuário para toggle admin:', err.message);
            return sendJSON(res, { error: 'Erro interno' }, 500);
          }
          if (!row) return sendJSON(res, { error: 'Usuário não encontrado' }, 404);
          const newVal = row.is_admin === 1 ? 0 : 1;
          db.run('UPDATE users SET is_admin = ? WHERE id = ?', [newVal, id], function (err2) {
            if (err2) {
              console.error('Erro atualizando is_admin:', err2.message);
              return sendJSON(res, { error: 'Erro interno' }, 500);
            }
            return sendJSON(res, { success: true, id, is_admin: newVal }, 200);
          });
        });
      })
      .catch((err) => sendJSON(res, { error: err.message || 'JSON inválido' }, 400));
  }

  // POST /users -> cria novo usuário (registro público)
  // Body esperado: { name, email, password, cpf }
  if (pathname === '/users' && req.method === 'POST') {
    return parseBody(req)
      .then((body) => {
        if (!body || !body.name || !body.email || !body.password) {
          return sendJSON(res, { error: 'Campos name, email e password são requeridos' }, 400);
        }

        const { name, email, password, cpf } = body;

        // Verifica se o email já está cadastrado
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
          if (err) {
            console.error('Erro verificando email existente:', err.message);
            return sendJSON(res, { error: 'Erro interno' }, 500);
          }
          if (row) {
            return sendJSON(res, { error: 'Email já cadastrado' }, 409);
          }

          // Hashea a senha e insere o usuário. Se o corpo contém campos opcionais
          // 'approved' e 'is_admin' (enviados pelo painel admin), usamos esses valores;
          // caso contrário, por padrão o cadastro público permanece pendente (approved = 0, is_admin = 0).
          const approvedFlag = body.approved === 1 || body.approved === '1' ? 1 : 0;
          const adminFlag = body.is_admin === 1 || body.is_admin === '1' ? 1 : 0;

          hashPassword(password)
            .then((hash) => {
              db.run(
                'INSERT INTO users (name, email, password, cpf, approved, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
                [name, email, hash, cpf || '', approvedFlag, adminFlag],
                function (err2) {
                  if (err2) {
                    console.error('Erro ao inserir usuário:', err2.message);
                    return sendJSON(res, { error: 'Erro interno' }, 500);
                  }
                  const msg = approvedFlag === 1 ? 'Usuário criado e aprovado' : 'Cadastro enviado, aguarde aprovação';
                  return sendJSON(res, { success: true, id: this.lastID, message: msg }, 201);
                }
              );
            })
            .catch((e) => {
              console.error('Erro ao hashear senha no registro:', e.message);
              return sendJSON(res, { error: 'Erro interno' }, 500);
            });
        });
      })
      .catch((err) => sendJSON(res, { error: err.message || 'JSON inválido' }, 400));
  }

  // --------------------
  // Rotas de agendamentos
  // --------------------

  // GET /schedules -> lista todos os agendamentos
  if (pathname === '/schedules' && req.method === 'GET') {
    db.all('SELECT * FROM schedules', [], (err, rows) => {
      if (err) {
        console.error('Erro listando agendamentos:', err.message);
        return sendJSON(res, { error: 'Erro interno' }, 500);
      }
      return sendJSON(res, { schedules: rows }, 200);
    });
    return;
  }

  // GET /schedules/:id -> busca um agendamento por id (numérico)
  // GET /schedules/:date -> lista agendamentos de uma data específica (YYYY-MM-DD)
  // Ex: /schedules/2025-10-28
  if (pathname.startsWith('/schedules/') && req.method === 'GET') {
    const parts = pathname.split('/').filter(Boolean); // ['schedules', '...']
    const param = parts[1];
    if (!param) return sendJSON(res, { error: 'Parâmetro não informado' }, 400);

    // Se for numérico, tratamos como id
    if (/^\d+$/.test(param)) {
      const id = param;
      db.get('SELECT * FROM schedules WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('Erro buscando agendamento por id:', err.message);
          return sendJSON(res, { error: 'Erro interno' }, 500);
        }
        if (!row) return sendJSON(res, { error: 'Agendamento não encontrado' }, 404);
        return sendJSON(res, { schedule: row }, 200);
      });
      return;
    }

    // Caso contrário, tratamos como data (YYYY-MM-DD)
    const date = param;
    db.all('SELECT * FROM schedules WHERE date = ?', [date], (err, rows) => {
      if (err) {
        console.error('Erro listando agendamentos por data:', err.message);
        return sendJSON(res, { error: 'Erro interno' }, 500);
      }
      return sendJSON(res, { date, schedules: rows }, 200);
    });
    return;
  }

  // POST /schedules -> cria novo agendamento
  // Campos esperados no body: lawyer, client, process_number, online (0/1), date (YYYY-MM-DD), time (HH:MM), notes
  if (pathname === '/schedules' && req.method === 'POST') {
    return parseBody(req)
      .then((body) => {
        if (!body) return sendJSON(res, { error: 'Body requerido' }, 400);
        const { lawyer, client, process_number, online, date, time, notes } = body;
        // Validação básica
        if (!lawyer || !client || !date || !time) return sendJSON(res, { error: 'Campos obrigatórios ausentes' }, 400);
        if (!validateHour(time)) return sendJSON(res, { error: 'Horário inválido (deve ser entre 06:00 e 18:00)' }, 400);

        db.run(
          'INSERT INTO schedules (lawyer, client, process_number, online, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [lawyer, client, process_number || '', online ? 1 : 0, date, time, notes || ''],
          function (err) {
            if (err) {
              console.error('Erro criando agendamento:', err.message);
              return sendJSON(res, { error: 'Erro interno' }, 500);
            }
            return sendJSON(res, { success: true, message: 'Agendamento criado', id: this.lastID }, 201);
          }
        );
      })
      .catch((err) => sendJSON(res, { error: err.message || 'JSON inválido' }, 400));
  }

  // DELETE /schedules/:id -> exclui agendamento pelo id
  if (pathname.startsWith('/schedules/') && req.method === 'DELETE') {
    const parts = pathname.split('/').filter(Boolean); // ['schedules', '123']
    const id = parts[1];
    if (!id) return sendJSON(res, { error: 'ID não informado' }, 400);
    db.run('DELETE FROM schedules WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Erro removendo agendamento:', err.message);
        return sendJSON(res, { error: 'Erro interno' }, 500);
      }
      if (this.changes === 0) return sendJSON(res, { error: 'Agendamento não encontrado' }, 404);
      return sendJSON(res, { success: true, message: 'Agendamento removido' }, 200);
    });
    return;
  }

  // PUT /schedules/:id -> atualiza campos do agendamento (ex: online)
  if (pathname.startsWith('/schedules/') && req.method === 'PUT') {
    const parts = pathname.split('/').filter(Boolean);
    const id = parts[1];
    if (!id) return sendJSON(res, { error: 'ID não informado' }, 400);
    return parseBody(req)
      .then((body) => {
        if (!body) return sendJSON(res, { error: 'Body requerido' }, 400);
        // Permitimos atualização apenas do campo 'online' por enquanto
        const online = typeof body.online !== 'undefined' ? (body.online ? 1 : 0) : null;
        if (online === null) return sendJSON(res, { error: 'Campo online requerido' }, 400);
        db.run('UPDATE schedules SET online = ? WHERE id = ?', [online, id], function (err) {
          if (err) {
            console.error('Erro atualizando agendamento:', err.message);
            return sendJSON(res, { error: 'Erro interno' }, 500);
          }
          if (this.changes === 0) return sendJSON(res, { error: 'Agendamento não encontrado' }, 404);
          return sendJSON(res, { success: true, id: id, online }, 200);
        });
      })
      .catch((err) => sendJSON(res, { error: err.message || 'JSON inválido' }, 400));
  }

  // Rota '/info' -> exemplo de uso do módulo fs (tenta ler package.json e retornar nome/versão)
  if (pathname === '/info' && req.method === 'GET') {
    const pkgPath = __dirname + '/package.json';
    fs.readFile(pkgPath, 'utf8', (err, data) => {
      if (err) {
          // Se não houver package.json, ainda assim retornamos status do servidor
          return sendJSON(res, { message: 'Servidor GAJ rodando', note: 'package.json não encontrada' }, 200);
        }
        try {
          const pkg = JSON.parse(data);
          return sendJSON(res, { message: 'Servidor GAJ rodando', name: pkg.name, version: pkg.version }, 200);
        } catch (e) {
          return sendJSON(res, { message: 'Servidor GAJ rodando', note: 'package.json inválido' }, 200);
        }
    });
    return; // saímos porque a resposta é enviada assincronamente no callback
  }

  // Para qualquer outra rota, retornamos 404 em JSON e logamos a tentativa
  // Isto garante que requisições desconhecidas fiquem visíveis nos logs
  console.log(`[${new Date().toISOString()}] Rota não encontrada: ${req.method} ${req.url}`);
  return notFound(res);
});

// Inicia o servidor apenas quando este arquivo for executado diretamente.
// Isso evita que `require('./server.js')` em testes inicie o listener automaticamente.
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

// Exporta o servidor e a instância do banco para uso em testes/imports
module.exports = { server, db };
