/* ============================================================
   VIEW: MATERIAL — materiais escolares do dia
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

import {
  MATERIAIS, DIA_MAP, DIAS_SEMANA, getGrade, ICONE_MATERIA, ICONE_MATERIA_PADRAO,
} from '../storage.js';
import { getBrasiliaDate, unique, escapeHTML } from '../utils.js';

/** Estado vazio no padrão visual do app */
function mensagemVazia(icone, titulo, texto) {
  return `
    <div class="ui-empty">
      <div class="ui-empty__icon" aria-hidden="true"><i class="fa-solid ${icone}"></i></div>
      <strong class="ui-empty__title">${titulo}</strong>
      <span>${texto}</span>
    </div>`;
}

/**
 * Renderiza os materiais necessários para o dia atual
 * (regras de coleta preservadas; só a apresentação mudou)
 */
export function renderizarMateriaisSecao() {
  const el = document.getElementById('materiaisGrid');
  const elLabel = document.getElementById('materiaisDayLabel');
  const elResumo = document.getElementById('materiaisResumo');
  const elContagem = document.getElementById('materiaisContagem');

  if (!el) return;

  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaSemanaIndex = agora.getDay();
  const diaChave = DIA_MAP[diaSemanaIndex] || null;

  if (elLabel) elLabel.textContent = DIAS_SEMANA[diaSemanaIndex] || '—';
  if (elContagem) elContagem.textContent = '';

  el.innerHTML = '';

  if (!diaChave) {
    if (elResumo) elResumo.textContent = 'Hoje não tem aula.';
    el.innerHTML = mensagemVazia('fa-mug-hot', 'Fim de semana', 'Aproveite para descansar e revisar!');
    return;
  }

  if (!GRADE || !GRADE[diaChave]) {
    if (elResumo) elResumo.textContent = 'Preencha a grade para ver os materiais.';
    el.innerHTML = mensagemVazia('fa-table-cells', 'Grade vazia', 'Preencha a grade horária pelo lápis na tela Início para ver os materiais do dia.');
    return;
  }

  // Coletar todos os materiais únicos do dia (livros + extras)
  const materiasUnicas = unique(GRADE[diaChave]);
  const itens = new Map(); // chave → item (evita duplicados)
  const adicionar = (item) => itens.set(`${item.nome}|${item.sub}`, item);

  materiasUnicas.forEach(materia => {
    const mat = MATERIAIS[materia];
    if (!mat) return;
    const icone = ICONE_MATERIA[materia] || ICONE_MATERIA_PADRAO;
    if (mat.livro) adicionar({ icone, nome: mat.livro, sub: materia });
    mat.extras.forEach(extra => adicionar({ icone: 'fa-thumbtack', nome: extra, sub: 'Material' }));
  });

  // Itens sempre necessários
  [
    { icone: 'fa-bookmark',     nome: 'Agenda Escolar',  sub: 'Organização' },
    { icone: 'fa-pen',          nome: 'Caneta e Lápis',  sub: 'Escrita' },
    { icone: 'fa-bottle-water', nome: "Garrafa d'água",  sub: 'Saúde' },
  ].forEach(adicionar);

  itens.forEach(item => {
    const div = document.createElement('div');
    div.className = 'material-card';
    div.innerHTML = `
      <span class="ui-tile material-card__icon" aria-hidden="true"><i class="fa-solid ${item.icone}"></i></span>
      <span class="material-card__name">${escapeHTML(item.nome)}</span>
      <span class="material-card__sub">${escapeHTML(item.sub)}</span>
    `;
    el.appendChild(div);
  });

  const total = itens.size;
  if (elContagem) elContagem.textContent = `${total} ${total === 1 ? 'item' : 'itens'}`;
  if (elResumo) elResumo.textContent = `${total} ${total === 1 ? 'item' : 'itens'} para levar hoje`;
}

/** Inicializa a view Material */
export function init() {
  renderizarMateriaisSecao();
}

/** Nenhum recurso persistente é criado por esta view — nada para limpar. */
export function destroy() {}
