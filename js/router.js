/* ============================================================
   ROUTER.JS — Navegação entre views (SPA)
   Carrega o HTML de cada view via fetch() e o JS correspondente
   via import() dinâmico, sem recarregar a aplicação inteira.
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

/** Configuração de cada view: caminho do HTML e do módulo JS */
const VIEWS = {
  inicio: { html: 'views/view-inicio.html', module: './views/inicio.js' },
  agenda: { html: 'views/view-agenda.html', module: './views/agenda.js' },
  material: { html: 'views/view-material.html', module: './views/material.js' },
  configuracoes: { html: 'views/view-configuracoes.html', module: './views/configuracoes.js' },
};

const DEFAULT_VIEW = 'inicio';

/** Títulos de aba/leitor de tela por view */
const TITULOS = {
  inicio: 'Início',
  agenda: 'Agenda',
  material: 'Material',
  configuracoes: 'Ajustes',
};
const TITULO_BASE = 'Agenda Escolar Inteligente';

let viewAtiva = null;
let moduloAtivo = null;
let tokenNavegacao = 0; // evita corrida entre navegações rápidas
const cacheHtml = new Map();

/** Lê o nome da view a partir do hash da URL (#agenda -> "agenda") */
function lerViewDoHash() {
  const hash = (window.location.hash || '').replace('#', '').trim();
  return VIEWS[hash] ? hash : DEFAULT_VIEW;
}

/** Atualiza o estado visual (aria/classe) do item ativo na navegação inferior */
function atualizarNavAtiva(nome) {
  document.querySelectorAll('.app-nav__item').forEach((item) => {
    const ativo = item.dataset.view === nome;
    item.classList.toggle('is-active', ativo);
    if (ativo) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

/**
 * Navega para a view informada: busca o HTML (com cache em memória),
 * injeta em #app, importa e inicializa o módulo JS correspondente.
 * @param {string} nome
 */
export async function navigateTo(nome) {
  const view = VIEWS[nome] ? nome : DEFAULT_VIEW;
  if (view === viewAtiva) return;

  const config = VIEWS[view];
  const app = document.getElementById('app');
  if (!app) return;

  const meuToken = ++tokenNavegacao;

  // Encerra a view anterior (limpa listeners/intervalos específicos, se houver)
  if (moduloAtivo && typeof moduloAtivo.destroy === 'function') {
    try { moduloAtivo.destroy(); } catch (e) { console.warn('[router] erro ao destruir view anterior:', e); }
  }

  try {
    let html = cacheHtml.get(view);
    if (!html) {
      const resp = await fetch(config.html);
      if (!resp.ok) throw new Error(`Falha ao carregar ${config.html} (HTTP ${resp.status})`);
      html = await resp.text();
      cacheHtml.set(view, html);
    }

    // Outra navegação começou enquanto esta carregava: descarta esta.
    if (meuToken !== tokenNavegacao) return;

    app.innerHTML = html;
    app.classList.remove('view-fade-in');
    // Força reflow para reiniciar a animação a cada navegação
    void app.offsetWidth;
    app.classList.add('view-fade-in');

    const mod = await import(config.module);
    if (meuToken !== tokenNavegacao) return;

    moduloAtivo = mod;
    if (typeof mod.init === 'function') mod.init();

    viewAtiva = view;
    atualizarNavAtiva(view);
    document.title = `${TITULOS[view]} · ${TITULO_BASE}`;

    if (window.location.hash !== `#${view}`) {
      history.pushState({ view }, '', `#${view}`);
    }

    // Leva o usuário ao topo do conteúdo a cada troca de view
    window.scrollTo(0, 0);
  } catch (err) {
    if (meuToken !== tokenNavegacao) return;
    console.error('[router] Erro ao carregar view:', view, err);
    app.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
        <p>Não foi possível carregar esta seção agora.</p>
      </div>`;
  }
}

/** Inicializa o roteador: liga a navegação inferior e o histórico do navegador */
export function initRouter() {
  document.querySelectorAll('.app-nav__item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const nome = item.dataset.view;
      navigateTo(nome);
    });
  });

  window.addEventListener('popstate', () => {
    navigateTo(lerViewDoHash());
  });

  window.addEventListener('hashchange', () => {
    navigateTo(lerViewDoHash());
  });

  navigateTo(lerViewDoHash());
}
