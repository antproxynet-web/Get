/* ============================================================
   APP.JS — Inicialização da aplicação
   Vanilla JS · ES6+ · Ponto de entrada (carregado como módulo)
   ============================================================ */

'use strict';

import { carregarGradeDoStorage } from './storage.js';
import { getBrasiliaDate, pad } from './utils.js';
import { initAnotacoes, initEditorGrade } from './ui.js';
import { carregarTema, initSeletorTemas } from './themes.js';
import { initRouter } from './router.js';
import {
  atualizarStatusBanner, atualizarAulasAtivas, renderizarAulasHoje,
  renderizarMateriaisCard, renderizarStatusGeral, renderizarTabela,
} from './views/inicio.js';
import { renderizarMateriaisSecao } from './views/material.js';

/* ============================================================
   RELÓGIO EM TEMPO REAL (header, global)
   ============================================================ */

function atualizarRelogio() {
  const agora = getBrasiliaDate();

  const hh = pad(agora.getHours());
  const mm = pad(agora.getMinutes());
  const ss = pad(agora.getSeconds());

  const dia = pad(agora.getDate());
  const mes = pad(agora.getMonth() + 1);
  const ano = agora.getFullYear();

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const nomeDia = diasSemana[agora.getDay()];

  const elTime = document.getElementById('realtimeTime');
  const elDate = document.getElementById('realtimeDate');

  if (elTime) elTime.textContent = `${hh}:${mm}:${ss}`;
  if (elDate) elDate.textContent = `${nomeDia}, ${dia}/${mes}/${ano}`;
}

/** Atualiza apenas os elementos dinâmicos (a cada segundo) */
function atualizarDinamico() {
  atualizarRelogio();
  atualizarStatusBanner();
  atualizarAulasAtivas();
}

/* ============================================================
   PWA — Registro do Service Worker + UX de Atualização
   ============================================================ */

function initPWA() {
  if (!('serviceWorker' in navigator)) return;

  injetarEstilosPWA();

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', {
        scope: '.',
        updateViaCache: 'none', // Nunca serve o SW do cache do browser
      });

      console.log('[PWA] Service Worker registrado:', reg.scope);

      // Detecta nova versão disponível (waiting)
      if (reg.waiting) mostrarBannerUpdate(reg.waiting);

      // Detecta update que chega depois do registro
      reg.addEventListener('updatefound', () => {
        const novaSW = reg.installing;
        novaSW?.addEventListener('statechange', () => {
          if (novaSW.state === 'installed' && navigator.serviceWorker.controller) {
            mostrarBannerUpdate(novaSW);
          }
        });
      });

      // Verifica por updates periodicamente (a cada 60min)
      setInterval(() => reg.update(), 60 * 60 * 1000);

      // Quando um novo SW assume, recarrega para aplicar
      let atualizando = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (atualizando) return;
        atualizando = true;
        window.location.reload();
      });
    } catch (err) {
      console.warn('[PWA] Falha ao registrar Service Worker:', err);
    }
  });

  // Monitora status de conexão
  monitorarConexao();
}

/** Exibe banner não-intrusivo na parte inferior avisando sobre update disponível */
function mostrarBannerUpdate(sw) {
  if (document.getElementById('pwa-update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'polite');
  banner.innerHTML = `
    <span>✦ Nova versão disponível!</span>
    <div class="pwa-banner-actions">
      <button id="pwa-btn-update">Atualizar agora</button>
      <button id="pwa-btn-dismiss" aria-label="Fechar">✕</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('pwa-btn-update').addEventListener('click', () => {
    sw.postMessage({ type: 'SKIP_WAITING' });
    banner.remove();
  });

  document.getElementById('pwa-btn-dismiss').addEventListener('click', () => {
    banner.classList.add('pwa-banner-hide');
    setTimeout(() => banner.remove(), 400);
  });

  setTimeout(() => {
    if (document.getElementById('pwa-update-banner')) {
      banner.classList.add('pwa-banner-hide');
      setTimeout(() => banner.remove(), 400);
    }
  }, 15000);
}

/** Detecta mudanças de conectividade e exibe toast */
function monitorarConexao() {
  let toastOffline = null;

  function mostrarToastOffline() {
    if (toastOffline) return;
    toastOffline = document.createElement('div');
    toastOffline.id = 'pwa-toast-offline';
    toastOffline.setAttribute('role', 'status');
    toastOffline.textContent = '📡 Sem conexão — modo offline ativo';
    document.body.appendChild(toastOffline);
  }

  function removerToastOffline() {
    if (!toastOffline) return;
    toastOffline.classList.add('pwa-toast-hide');
    setTimeout(() => {
      toastOffline?.remove();
      toastOffline = null;
    }, 400);

    const back = document.createElement('div');
    back.id = 'pwa-toast-online';
    back.setAttribute('role', 'status');
    back.textContent = '✓ Conexão restaurada';
    document.body.appendChild(back);
    setTimeout(() => {
      back.classList.add('pwa-toast-hide');
      setTimeout(() => back.remove(), 400);
    }, 3000);
  }

  if (!navigator.onLine) mostrarToastOffline();
  window.addEventListener('offline', mostrarToastOffline);
  window.addEventListener('online', removerToastOffline);
}

/** Injeta os estilos dos componentes PWA (banner + toasts) — uma única vez */
function injetarEstilosPWA() {
  if (document.getElementById('pwa-styles')) return;
  const style = document.createElement('style');
  style.id = 'pwa-styles';
  style.textContent = `
    #pwa-update-banner {
      position: fixed;
      bottom: calc(var(--bottom-nav-height, 64px) + 1rem);
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: .75rem 1.25rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-medium);
      border-radius: 14px;
      box-shadow: var(--shadow-lg);
      color: var(--text-primary);
      font-size: .875rem;
      font-family: inherit;
      white-space: nowrap;
      animation: pwa-slide-up .35s cubic-bezier(.22,1,.36,1) both;
      backdrop-filter: blur(12px);
    }
    #pwa-update-banner.pwa-banner-hide {
      animation: pwa-slide-down .35s cubic-bezier(.22,1,.36,1) both;
    }
    .pwa-banner-actions { display: flex; gap: .5rem; }
    #pwa-btn-update {
      padding: .35rem .9rem;
      background: var(--accent-primary);
      color: var(--text_btn);
      border: none;
      border-radius: 8px;
      font-size: .8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: filter .15s;
    }
    #pwa-btn-update:hover { filter: brightness(1.1); }
    #pwa-btn-dismiss {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: .875rem;
      cursor: pointer;
      padding: .25rem .4rem;
      border-radius: 6px;
      transition: color .15s;
    }
    #pwa-btn-dismiss:hover { color: var(--text-primary); }

    #pwa-toast-offline,
    #pwa-toast-online {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      padding: .6rem 1.1rem;
      border-radius: 10px;
      font-size: .8125rem;
      font-family: inherit;
      animation: pwa-fade-in .3s ease both;
      pointer-events: none;
    }
    #pwa-toast-offline {
      background: color-mix(in srgb, var(--accent-warning) 16%, var(--bg-elevated));
      border: 1px solid color-mix(in srgb, var(--accent-warning) 45%, transparent);
      color: var(--accent-warning);
    }
    #pwa-toast-online {
      background: color-mix(in srgb, var(--accent-success) 16%, var(--bg-elevated));
      border: 1px solid color-mix(in srgb, var(--accent-success) 45%, transparent);
      color: var(--accent-success);
    }
    .pwa-toast-hide {
      animation: pwa-fade-out .3s ease both !important;
    }

    @keyframes pwa-slide-up {
      from { opacity: 0; transform: translateX(-50%) translateY(1.5rem); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes pwa-slide-down {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to   { opacity: 0; transform: translateX(-50%) translateY(1.5rem); }
    }
    @keyframes pwa-fade-in {
      from { opacity: 0; transform: translateY(-.5rem); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pwa-fade-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */

function init() {
  // PWA: Service Worker
  initPWA();

  // Tema (o mais cedo possível para evitar flash — o <head> já aplicou
  // o tema salvo antes do primeiro paint; aqui apenas confirmamos o
  // estado e ligamos os gatilhos do seletor de Style Themes)
  carregarTema();
  initSeletorTemas();

  // Grade horária: carrega do storage + liga o editor/importação global
  carregarGradeDoStorage();
  initEditorGrade();

  // Anotações (overlay global)
  initAnotacoes();

  // Relógio
  atualizarRelogio();

  // Roteamento — carrega a view inicial (Início, por padrão)
  initRouter();

  // Atualização a cada segundo (relógio + status + destaque da aula atual)
  setInterval(atualizarDinamico, 999);

  // Atualização a cada minuto (cards da view Início)
  setInterval(() => {
    renderizarAulasHoje();
    renderizarMateriaisCard();
    renderizarStatusGeral();
    atualizarAulasAtivas();
  }, 60000);

  // Atualização a cada hora (rerender completo das tabelas/grades)
  setInterval(() => {
    renderizarTabela();
    renderizarMateriaisSecao();
  }, 3600000);

  console.log('[AgendaEscolar] Inicializado com sucesso — Horário de Brasília (UTC-3)');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
