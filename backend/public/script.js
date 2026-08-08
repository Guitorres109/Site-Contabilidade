// ==========================================================
// CONFIGURAÇÃO DA API
// Ajuste API_BASE para o endereço/prefixo onde as rotas do
// arquivo de rotas (auth/login, usuarios, comentarios,
// orcamentos) estão montadas no servidor Express.
// Ex.: se o server.js tiver app.use('/api', router),
// troque para 'http://localhost:3000/api'.
// ==========================================================
const API_BASE = 'http://localhost:3000';

// ---------- GUARDA DE AUTENTICAÇÃO ----------
const TOKEN = localStorage.getItem('token');
const USUARIO_LOGADO = JSON.parse(localStorage.getItem('usuario') || 'null');

if (!TOKEN) {
  window.location.href = 'login.html';
}

// ---------- ESTADO ----------
const state = {
  usuarios: [],
  comentarios: [],
  orcamentos: [],
  filtroComentario: 'todos',
  filtroOrcamento: 'todos',
  editandoUsuarioId: null,
  pendingDelete: null // { tipo: 'usuario'|'comentario'|'orcamento', id }
};

// ---------- HELPER DE REQUISIÇÃO ----------
async function apiFetch(path, options = {}) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {}
  );
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // token inválido/expirado -> volta pro login
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
    return null;
  }

  let data = null;
  try { data = await res.json(); } catch (_) { /* corpo vazio */ }

  if (!res.ok) {
    const erro = (data && data.erro) || `Erro na requisição (${res.status})`;
    throw new Error(erro);
  }
  return data;
}

// ---------- UTILITÁRIOS ----------
function formatarData(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function iniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[partes.length - 1]?.[0] || '')).toUpperCase();
}

function soDigitos(v) { return (v || '').replace(/\D/g, ''); }

function toast(msg) {
  const el = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function fecharModal(id) { document.getElementById(id).classList.remove('open'); }

// ---------- NAVEGAÇÃO ENTRE ABAS ----------
const titulos = {
  dashboard: 'Visão geral',
  usuarios: 'Usuários',
  comentarios: 'Comentários',
  orcamentos: 'Orçamentos'
};

function irParaAba(tab) {
  document.querySelectorAll('.side-link[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  document.getElementById('pageTitle').textContent = titulos[tab] || tab;
  document.getElementById('globalSearch').value = '';
  aplicarBusca('');
}

document.getElementById('sideNav').addEventListener('click', e => {
  const link = e.target.closest('.side-link[data-tab]');
  if (!link) return;
  e.preventDefault();
  irParaAba(link.dataset.tab);
});

document.querySelectorAll('a.btn[data-tab]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); irParaAba(a.dataset.tab); });
});

document.getElementById('pageDate').textContent = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
});

// ---------- CARREGAMENTO GERAL ----------
async function carregarTudo() {
  try {
    const [usuarios, comentarios, orcamentos] = await Promise.all([
      apiFetch('/usuarios'),
      apiFetch('/comentarios'),
      apiFetch('/orcamentos')
    ]);
    state.usuarios = usuarios || [];
    state.comentarios = comentarios || [];
    state.orcamentos = orcamentos || [];

    renderContadores();
    renderDashboard();
    renderUsuarios();
    renderComentarios();
    renderOrcamentos();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Erro ao carregar dados do painel');
  }
}

function renderContadores() {
  document.getElementById('countUsuarios').textContent = state.usuarios.length;
  document.getElementById('countComentarios').textContent = state.comentarios.length;
  document.getElementById('countOrcamentos').textContent = state.orcamentos.length;
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const ativos = state.usuarios.filter(u => Number(u.ativo) === 1 || u.ativo === true).length;
  const pendentes = state.comentarios.filter(c => (c.status || 'Pendente') === 'Pendente').length;
  const novos = state.orcamentos.filter(o => o.status === 'Novo').length;
  const respondidos = state.orcamentos.filter(o => o.status === 'Respondido').length;
  const taxa = state.orcamentos.length ? Math.round((respondidos / state.orcamentos.length) * 100) : 0;

  document.getElementById('statUsuarios').textContent = ativos;
  document.getElementById('statComentarios').textContent = pendentes;
  document.getElementById('statOrcamentosNovos').textContent = novos;
  document.getElementById('statTaxa').textContent = `${taxa}%`;

  const recentes = [...state.orcamentos]
    .sort((a, b) => new Date(b.criadoEm || b.createdAt || 0) - new Date(a.criadoEm || a.createdAt || 0))
    .slice(0, 5);

  const container = document.getElementById('dashboardRecent');
  if (!recentes.length) {
    container.innerHTML = `<div class="empty"><p>Nenhuma solicitação recebida ainda.</p></div>`;
    return;
  }

  container.innerHTML = recentes.map(o => `
    <div class="recent-row">
      <div class="recent-avatar">${iniciais(o.nome)}</div>
      <div class="recent-info">
        <div class="recent-name">${escapeHtml(o.nome || 'Sem nome')}</div>
        <div class="recent-sub">${escapeHtml(o.assunto || 'Sem assunto')}</div>
      </div>
      <span class="badge badge-${badgeClasseOrcamento(o.status)}">${escapeHtml(o.status || 'Novo')}</span>
      <div class="recent-date">${formatarData(o.criadoEm || o.createdAt)}</div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- USUÁRIOS ----------
function renderUsuarios(filtro = '') {
  const termo = filtro.trim().toLowerCase();
  const lista = state.usuarios.filter(u =>
    !termo || (u.nome || '').toLowerCase().includes(termo) || (u.email || '').toLowerCase().includes(termo)
  );

  const body = document.getElementById('usuariosBody');
  document.getElementById('usuariosEmpty').style.display = lista.length ? 'none' : 'flex';

  body.innerHTML = lista.map(u => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="recent-avatar" style="width:32px;height:32px;font-size:0.75rem;">${iniciais(u.nome)}</div>
          <div>
            <div style="font-weight:600;">${escapeHtml(u.nome)}</div>
            <div style="font-size:0.8rem; color:var(--ink-black-50);">${escapeHtml(u.email)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(u.perfil || '—')}</td>
      <td><span class="badge badge-${(Number(u.ativo) === 1 || u.ativo === true) ? 'ok' : 'off'}">${(Number(u.ativo) === 1 || u.ativo === true) ? 'Ativo' : 'Inativo'}</span></td>
      <td>${formatarData(u.criadoEm || u.createdAt)}</td>
      <td class="row-actions">
        <button class="icon-btn" data-editar-usuario="${u.id}" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button class="icon-btn danger" data-excluir-usuario="${u.id}" title="Excluir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('btnNovoUsuario').addEventListener('click', () => {
  state.editandoUsuarioId = null;
  document.getElementById('modalUsuarioTitle').textContent = 'Novo usuário';
  document.getElementById('fNome').value = '';
  document.getElementById('fEmail').value = '';
  document.getElementById('fSenha').value = '';
  document.getElementById('fSenha').placeholder = 'Senha de acesso';
  document.getElementById('fCargo').value = 'Contador';
  document.getElementById('fStatus').value = '1';
  abrirModal('modalUsuario');
});

document.getElementById('usuariosBody').addEventListener('click', e => {
  const editar = e.target.closest('[data-editar-usuario]');
  const excluir = e.target.closest('[data-excluir-usuario]');

  if (editar) {
    const id = editar.dataset.editarUsuario;
    const u = state.usuarios.find(x => String(x.id) === String(id));
    if (!u) return;
    state.editandoUsuarioId = id;
    document.getElementById('modalUsuarioTitle').textContent = 'Editar usuário';
    document.getElementById('fNome').value = u.nome || '';
    document.getElementById('fEmail').value = u.email || '';
    document.getElementById('fSenha').value = '';
    document.getElementById('fSenha').placeholder = 'Deixe em branco para manter a atual';
    document.getElementById('fCargo').value = u.perfil || 'Contador';
    document.getElementById('fStatus').value = (Number(u.ativo) === 1 || u.ativo === true) ? '1' : '0';
    abrirModal('modalUsuario');
  }

  if (excluir) {
    state.pendingDelete = { tipo: 'usuario', id: excluir.dataset.excluirUsuario };
    document.getElementById('confirmText').textContent = 'Tem certeza que deseja excluir este usuário? Essa ação não pode ser desfeita.';
    abrirModal('modalConfirm');
  }
});

document.getElementById('btnSalvarUsuario').addEventListener('click', async () => {
  const nome = document.getElementById('fNome').value.trim();
  const email = document.getElementById('fEmail').value.trim();
  const senha = document.getElementById('fSenha').value;
  const perfil = document.getElementById('fCargo').value;
  const ativo = document.getElementById('fStatus').value;

  if (!nome || !email || (!state.editandoUsuarioId && !senha)) {
    toast('Preencha nome, e-mail e senha.');
    return;
  }

  const payload = { nome, email, perfil, ativo: Number(ativo) };
  if (senha) payload.senha = senha;

  try {
    if (state.editandoUsuarioId) {
      await apiFetch(`/usuarios/${state.editandoUsuarioId}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Usuário atualizado com sucesso.');
    } else {
      await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(payload) });
      toast('Usuário criado com sucesso.');
    }
    fecharModal('modalUsuario');
    await carregarTudo();
  } catch (err) {
    toast(err.message);
  }
});

// ---------- COMENTÁRIOS ----------
function badgeClasseComentario(status) {
  if (status === 'Aprovado') return 'ok';
  if (status === 'Reprovado') return 'off';
  return 'warn';
}

document.getElementById('filtroComentarios').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#filtroComentarios .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  state.filtroComentario = chip.dataset.status;
  renderComentarios();
});

function renderComentarios(filtroBusca = '') {
  const termo = filtroBusca.trim().toLowerCase();
  let lista = state.comentarios.filter(c => {
    const statusOk = state.filtroComentario === 'todos' || (c.status || 'Pendente') === state.filtroComentario;
    const buscaOk = !termo || (c.autor || '').toLowerCase().includes(termo) || (c.conteudo || '').toLowerCase().includes(termo);
    return statusOk && buscaOk;
  });

  const container = document.getElementById('comentariosList');
  document.getElementById('comentariosEmpty').style.display = lista.length ? 'none' : 'flex';

  container.innerHTML = lista.map(c => `
    <div class="comment-card">
      <div class="comment-head">
        <div class="recent-avatar">${iniciais(c.autor)}</div>
        <div style="flex:1;">
          <div style="font-weight:600;">${escapeHtml(c.autor || 'Anônimo')}</div>
          <div style="font-size:0.8rem; color:var(--ink-black-50);">${escapeHtml(c.desc_autor || '')}</div>
        </div>
        <span class="badge badge-${badgeClasseComentario(c.status)}">${escapeHtml(c.status || 'Pendente')}</span>
      </div>
      <p class="comment-text">${escapeHtml(c.conteudo)}</p>
      <div class="comment-actions">
        <button class="btn btn-ghost btn-sm" data-comentario-status="Aprovado" data-id="${c.id}">Aprovar</button>
        <button class="btn btn-ghost btn-sm" data-comentario-status="Reprovado" data-id="${c.id}">Reprovar</button>
        <button class="icon-btn danger" data-excluir-comentario="${c.id}" title="Excluir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

document.getElementById('comentariosList').addEventListener('click', async e => {
  const statusBtn = e.target.closest('[data-comentario-status]');
  const excluirBtn = e.target.closest('[data-excluir-comentario]');

  if (statusBtn) {
    const id = statusBtn.dataset.id;
    const status = statusBtn.dataset.comentarioStatus;
    const c = state.comentarios.find(x => String(x.id) === String(id));
    if (!c) return;
    try {
      // Observação: a rota atual de PUT /comentarios/:id só aceita
      // conteudo, autor e desc_autor. É necessário incluir "status"
      // no backend para que a moderação seja persistida.
      await apiFetch(`/comentarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ conteudo: c.conteudo, autor: c.autor, desc_autor: c.desc_autor, status })
      });
      toast(`Comentário marcado como ${status.toLowerCase()}.`);
      await carregarTudo();
    } catch (err) {
      toast(err.message);
    }
  }

  if (excluirBtn) {
    state.pendingDelete = { tipo: 'comentario', id: excluirBtn.dataset.excluirComentario };
    document.getElementById('confirmText').textContent = 'Tem certeza que deseja excluir este comentário?';
    abrirModal('modalConfirm');
  }
});

// ---------- ORÇAMENTOS ----------
function badgeClasseOrcamento(status) {
  if (status === 'Respondido') return 'ok';
  if (status === 'Arquivado') return 'off';
  if (status === 'Em contato') return 'info';
  return 'warn';
}

document.getElementById('filtroOrcamentos').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#filtroOrcamentos .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  state.filtroOrcamento = chip.dataset.status;
  renderOrcamentos();
});

function renderOrcamentos(filtroBusca = '') {
  const termo = filtroBusca.trim().toLowerCase();
  let lista = state.orcamentos.filter(o => {
    const statusOk = state.filtroOrcamento === 'todos' || o.status === state.filtroOrcamento;
    const buscaOk = !termo || (o.nome || '').toLowerCase().includes(termo) || (o.email || '').toLowerCase().includes(termo) || (o.assunto || '').toLowerCase().includes(termo);
    return statusOk && buscaOk;
  });

  lista = [...lista].sort((a, b) => new Date(b.criadoEm || b.createdAt || 0) - new Date(a.criadoEm || a.createdAt || 0));

  const body = document.getElementById('orcamentosBody');
  document.getElementById('orcamentosEmpty').style.display = lista.length ? 'none' : 'flex';

  body.innerHTML = lista.map(o => `
    <tr>
      <td>
        <div style="font-weight:600;">${escapeHtml(o.nome)}</div>
        <div style="font-size:0.8rem; color:var(--ink-black-50);">${escapeHtml(o.email || '')}</div>
      </td>
      <td>${escapeHtml(o.assunto || '—')}</td>
      <td>${formatarData(o.criadoEm || o.createdAt)}</td>
      <td><span class="badge badge-${badgeClasseOrcamento(o.status)}">${escapeHtml(o.status || 'Novo')}</span></td>
      <td class="row-actions">
        <button class="icon-btn" data-ver-orcamento="${o.id}" title="Ver detalhes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="icon-btn danger" data-excluir-orcamento="${o.id}" title="Excluir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('orcamentosBody').addEventListener('click', e => {
  const ver = e.target.closest('[data-ver-orcamento]');
  const excluir = e.target.closest('[data-excluir-orcamento]');

  if (ver) abrirDetalheOrcamento(ver.dataset.verOrcamento);

  if (excluir) {
    state.pendingDelete = { tipo: 'orcamento', id: excluir.dataset.excluirOrcamento };
    document.getElementById('confirmText').textContent = 'Tem certeza que deseja excluir esta solicitação de orçamento?';
    abrirModal('modalConfirm');
  }
});

function abrirDetalheOrcamento(id) {
  const o = state.orcamentos.find(x => String(x.id) === String(id));
  if (!o) return;

  const opcoesStatus = ['Novo', 'Em contato', 'Respondido', 'Arquivado'];

  document.getElementById('orcamentoDetalheBody').innerHTML = `
    <div class="form-row"><label>Solicitante</label><div>${escapeHtml(o.nome)}</div></div>
    <div class="form-row"><label>E-mail</label><div>${escapeHtml(o.email || '—')}</div></div>
    <div class="form-row"><label>Telefone</label><div>${escapeHtml(o.telefone || '—')}</div></div>
    <div class="form-row"><label>Interesse</label><div>${escapeHtml(o.assunto || '—')}</div></div>
    <div class="form-row"><label>Recebido em</label><div>${formatarData(o.criadoEm || o.createdAt)}</div></div>
    <div class="form-row">
      <label>Status</label>
      <select id="fOrcamentoStatus">
        ${opcoesStatus.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
  `;

  const btnWhats = document.getElementById('btnResponderWhatsapp');
  const numero = soDigitos(o.telefone);
  btnWhats.href = numero ? `https://wa.me/55${numero}` : '#';
  btnWhats.style.pointerEvents = numero ? 'auto' : 'none';
  btnWhats.style.opacity = numero ? '1' : '0.5';

  document.getElementById('fOrcamentoStatus').addEventListener('change', async ev => {
    try {
      await apiFetch(`/orcamentos/${o.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: o.nome, email: o.email, telefone: o.telefone, assunto: o.assunto, status: ev.target.value })
      });
      toast('Status atualizado.');
      await carregarTudo();
    } catch (err) {
      toast(err.message);
    }
  });

  abrirModal('modalOrcamento');
}

// ---------- EXCLUSÃO (compartilhada entre as 3 abas) ----------
document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
  if (!state.pendingDelete) return;
  const { tipo, id } = state.pendingDelete;
  const rotas = { usuario: '/usuarios', comentario: '/comentarios', orcamento: '/orcamentos' };

  try {
    await apiFetch(`${rotas[tipo]}/${id}`, { method: 'DELETE' });
    toast('Excluído com sucesso.');
    fecharModal('modalConfirm');
    state.pendingDelete = null;
    await carregarTudo();
  } catch (err) {
    toast(err.message);
  }
});

// ---------- MODAIS: fechar ----------
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => btn.closest('.modal-backdrop').classList.remove('open'));
});
document.querySelectorAll('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', e => { if (e.target === bd) bd.classList.remove('open'); });
});

// ---------- BUSCA GLOBAL ----------
function aplicarBusca(termo) {
  const abaAtiva = document.querySelector('.side-link.active')?.dataset.tab;
  if (abaAtiva === 'usuarios') renderUsuarios(termo);
  if (abaAtiva === 'comentarios') renderComentarios(termo);
  if (abaAtiva === 'orcamentos') renderOrcamentos(termo);
}

document.getElementById('globalSearch').addEventListener('input', e => aplicarBusca(e.target.value));

// ---------- LOGOUT ----------
const opBadge = document.getElementById('opBadge');
if (opBadge) {
  if (USUARIO_LOGADO) {
    document.getElementById('opName').textContent = USUARIO_LOGADO.nome || 'Usuário';
    document.getElementById('opRole').textContent = USUARIO_LOGADO.perfil || '';
    document.getElementById('opAvatar').textContent = iniciais(USUARIO_LOGADO.nome);
  }
  opBadge.addEventListener('click', () => {
    if (confirm('Deseja sair do painel?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = 'login.html';
    }
  });
}

// ---------- INÍCIO ----------
carregarTudo();