/* ============================================================
   VIEW: AGENDA — avisos, tarefas e anotações rápidas
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

import { AVISOS, obterAnotacoes } from '../storage.js';
import { formatarDataNota } from '../utils.js';
import { abrirModalEdicao, abrirVisualizacaoNota } from '../ui.js';

/**
 * Renderiza os avisos e tarefas (lógica original preservada)
 */
export function renderizarAvisos() {
  const el = document.getElementById('avisosGrid');
  if (!el) return;

  el.innerHTML = '';

  AVISOS.forEach(aviso => {
    const div = document.createElement('div');
    div.className = `aviso-card ${aviso.tipo}`;
    div.innerHTML = `
      <span class="aviso-card__icon">${aviso.icone}</span>
      <div class="aviso-card__content">
        <div class="aviso-card__title">${aviso.titulo}</div>
        <div class="aviso-card__desc">${aviso.desc}</div>
        <div class="aviso-card__date">${aviso.data}</div>
      </div>
    `;
    el.appendChild(div);
  });
}

/**
 * Renderiza um preview das anotações na Agenda (lógica original preservada)
 */
export function renderizarAnotacoesHome() {
  const grid = document.getElementById('homeNotesGrid');
  const emptyEl = document.getElementById('homeNotesEmpty');
  if (!grid) return;

  const notas = obterAnotacoes().sort((a, b) => b.atualizadoEm - a.atualizadoEm);

  grid.innerHTML = '';

  if (notas.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    grid.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  grid.style.display = '';

  notas.forEach(nota => {
    const card = document.createElement('div');
    card.className = 'home-note-card';
    card.dataset.id = nota.id;

    const header = document.createElement('div');
    header.className = 'home-note-card__header';

    const titulo = document.createElement('div');
    titulo.className = 'home-note-card__title';
    titulo.textContent = nota.titulo || 'Sem título';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'home-note-card__edit';
    editBtn.setAttribute('aria-label', `Editar anotação: ${nota.titulo || 'Sem título'}`);
    editBtn.title = 'Editar';
    editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModalEdicao(nota.id);
    });

    header.appendChild(titulo);
    header.appendChild(editBtn);

    const preview = document.createElement('div');
    preview.className = 'home-note-card__preview';
    preview.textContent = nota.conteudo || '';

    const data = document.createElement('div');
    data.className = 'home-note-card__date';
    data.textContent = formatarDataNota(nota.atualizadoEm);

    card.appendChild(header);
    card.appendChild(preview);
    card.appendChild(data);

    // Clicar no card (fora do botão de editar) abre visualização
    card.addEventListener('click', () => abrirVisualizacaoNota(nota.id));

    grid.appendChild(card);
  });
}

/** Inicializa a view Agenda */
export function init() {
  renderizarAvisos();
  renderizarAnotacoesHome();

  const btnNovaNota = document.getElementById('btnNovaNotaAgenda');
  if (btnNovaNota) btnNovaNota.addEventListener('click', () => abrirModalEdicao(null));
}

/** Nenhum recurso persistente é criado por esta view — nada para limpar. */
export function destroy() {}
