/* ============================================================
   VIEW: MATERIAL — materiais escolares do dia
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

import { MATERIAIS, DIA_MAP, DIAS_SEMANA, getGrade } from '../storage.js';
import { getBrasiliaDate, unique } from '../utils.js';


/**
 * Renderiza os materiais necessários para o dia atual
 * (lógica original preservada integralmente)
 */
export function renderizarMateriaisSecao() {
  const el = document.getElementById('materiaisGrid');
  const elLabel = document.getElementById('materiaisDayLabel');

  if (!el) return;

  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaSemanaIndex = agora.getDay();
  const diaChave = DIA_MAP[diaSemanaIndex] || null;

  if (elLabel) {
    elLabel.textContent = DIAS_SEMANA[diaSemanaIndex] || '—';
  }

  el.innerHTML = '';

  if (!diaChave) {
    el.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--space-xl);color:var(--text-muted)">
        <div style="font-size:2rem;margin-bottom:var(--space-sm)">🎉</div>
        <div>Hoje é fim de semana — aproveite para descansar e revisar!</div>
      </div>
    `;
    return;
  }

  if (!GRADE || !GRADE[diaChave]) {
    el.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--space-xl);color:var(--text-muted)">
        <div style="font-size:2rem;margin-bottom:var(--space-sm)">📂</div>
        <div>Preencha a grade horária pelo <i class="fa-solid fa-pen"></i>️ para ver os materiais do dia.</div>
      </div>
    `;
    return;
  }

  // Coletar todos os materiais únicos do dia (livros + extras)
  const materiasUnicas = unique(GRADE[diaChave]);
  const todosItens = new Set();

  materiasUnicas.forEach(materia => {
    const mat = MATERIAIS[materia];
    if (mat) {
      if (mat.livro) todosItens.add(JSON.stringify({ icone: mat.icone, nome: mat.livro, sub: materia }));
      mat.extras.forEach(extra => {
        todosItens.add(JSON.stringify({ icone: '📌', nome: extra, sub: 'Material' }));
      });
    }
  });

  // Itens sempre necessários
  const sempreNecessarios = [
    { icone: '📓', nome: 'Agenda Escolar', sub: 'Organização' },
    { icone: '🖊️', nome: 'Caneta e Lápis', sub: 'Escrita' },
    { icone: '💧', nome: "Garrafa d'água", sub: 'Saúde' },
  ];

  sempreNecessarios.forEach(item => {
    todosItens.add(JSON.stringify(item));
  });

  todosItens.forEach(itemStr => {
    const item = JSON.parse(itemStr);
    const div = document.createElement('div');
    div.className = 'material-card';
    div.innerHTML = `
      <span class="material-card__icon">${item.icone}</span>
      <span class="material-card__name">${item.nome}</span>
      <span class="material-card__sub">${item.sub}</span>
    `;
    el.appendChild(div);
  });
}

/** Inicializa a view Material */
export function init() {
  renderizarMateriaisSecao();
}

/** Nenhum recurso persistente é criado por esta view — nada para limpar. */
export function destroy() {}
