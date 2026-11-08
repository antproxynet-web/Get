/* ============================================================
   VIEW: AGENDA — dia, semana, aulas, avisos e anotações rápidas
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

import { HORARIOS, DIA_MAP, DIAS_SEMANA, AVISOS, getGrade, obterAnotacoes } from '../storage.js';
import {
  getBrasiliaDate, toMinutes, getAulaAtualIndex, getProximaAulaIndex,
  formatarDataNota, escapeHTML,
} from '../utils.js';
import { abrirModalEdicao, abrirVisualizacaoNota } from '../ui.js';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Ícone de linha por tipo de aviso (a cor vem do CSS) */
const ICONES_AVISO = {
  urgente: 'fa-circle-exclamation',
  atencao: 'fa-triangle-exclamation',
  info:    'fa-circle-info',
  ok:      'fa-circle-check',
};
const ROTULO_AVISO = { urgente: 'Urgente', atencao: 'Atenção', info: 'Info', ok: 'Concluído' };
const ORDEM_AVISO  = { urgente: 0, atencao: 1, info: 2, ok: 3 };

/** Estado da view */
let semana = [];            // 7 datas (segunda → domingo)
let indiceSelecionado = 0;  // posição do dia selecionado em `semana`
let timerAulas = null;

const $ = (id) => document.getElementById(id);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/* ------------------------------------------------------------
   Cabeçalho, semana e indicadores
   ------------------------------------------------------------ */
function calcularSemana() {
  const hoje = getBrasiliaDate();
  const desdeSegunda = (hoje.getDay() + 6) % 7;
  semana = Array.from({ length: 7 }, (_, i) =>
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - desdeSegunda + i));
  indiceSelecionado = desdeSegunda;
}

function renderizarCabecalho() {
  const hoje = getBrasiliaDate();
  const eyebrow = $('agDiaSemana');
  const titulo = $('agDataTitulo');
  if (eyebrow) eyebrow.textContent = DIAS_SEMANA[hoje.getDay()];
  if (titulo) titulo.textContent = `${hoje.getDate()} de ${MESES[hoje.getMonth()]}`;
}

function renderizarSemana() {
  const nav = $('agSemana');
  if (!nav) return;
  const hoje = getBrasiliaDate();
  nav.innerHTML = '';

  semana.forEach((data, i) => {
    const ehHoje = data.toDateString() === hoje.toDateString();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ag-day' + (ehHoje ? ' is-today' : '');
    btn.dataset.indice = String(i);
    btn.setAttribute('aria-label', `${DIAS_SEMANA[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}${ehHoje ? ' (hoje)' : ''}`);
    btn.innerHTML = `
      <span class="ag-day__name">${DIAS_CURTOS[data.getDay()]}</span>
      <span class="ag-day__num">${data.getDate()}</span>`;
    btn.addEventListener('click', () => {
      indiceSelecionado = i;
      atualizarSelecaoSemana();
      renderizarAulas();
    });
    nav.appendChild(btn);
  });
  atualizarSelecaoSemana();
}

function atualizarSelecaoSemana() {
  document.querySelectorAll('#agSemana .ag-day').forEach((btn) => {
    const ativo = Number(btn.dataset.indice) === indiceSelecionado;
    btn.classList.toggle('is-selected', ativo);
    btn.setAttribute('aria-pressed', ativo ? 'true' : 'false');
  });
}

function atualizarIndicadores(totalNotas) {
  const urgentes = AVISOS.filter(a => a.tipo === 'urgente').length;
  const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v); };
  set('agStatUrgentes', urgentes);
  set('agStatAvisos', AVISOS.length);
  set('agStatNotas', totalNotas);

  const sub = $('agendaResumo');
  if (sub) {
    sub.textContent = urgentes > 0
      ? `${plural(urgentes, 'item urgente', 'itens urgentes')} para acompanhar`
      : 'Nenhum item urgente';
  }
}

/* ------------------------------------------------------------
   Aulas do dia selecionado
   ------------------------------------------------------------ */
function mensagemVazia(icone, titulo, texto) {
  return `
    <div class="ag-empty">
      <div class="ag-empty__icon" aria-hidden="true"><i class="fa-solid ${icone}"></i></div>
      <strong class="ag-empty__title">${titulo}</strong>
      <span>${texto}</span>
    </div>`;
}

export function renderizarAulas() {
  const el = $('agAulas');
  if (!el || !semana.length) return;

  const hoje = getBrasiliaDate();
  const data = semana[indiceSelecionado];
  const ehHoje = data.toDateString() === hoje.toDateString();
  const chave = DIA_MAP[data.getDay()];
  const grade = getGrade();

  const sub = $('agAulasSub');
  if (sub) sub.textContent = ehHoje ? 'Hoje' : DIAS_SEMANA[data.getDay()];

  if (!chave) {
    el.innerHTML = mensagemVazia('fa-mug-hot', 'Sem aulas', 'Dia livre. Aproveite para descansar.');
    return;
  }
  if (!grade || !grade[chave]) {
    el.innerHTML = mensagemVazia('fa-table-cells', 'Grade vazia', 'Preencha sua grade horária para ver as aulas aqui.');
    return;
  }

  const minutos = hoje.getHours() * 60 + hoje.getMinutes();
  const atual = ehHoje ? getAulaAtualIndex(HORARIOS, minutos) : -1;
  const proxima = ehHoje ? getProximaAulaIndex(HORARIOS, minutos) : -1;

  const linhas = HORARIOS.map((h, i) => {
    const materia = grade[chave][i];
    const passou = ehHoje && minutos >= toMinutes(h.fim);
    const classes = ['ag-aula'];
    let tag = '';
    if (i === atual) { classes.push('is-now'); tag = '<span class="ag-tag ag-tag--solid">Agora</span>'; }
    else if (i === proxima) { tag = '<span class="ag-tag">A seguir</span>'; }
    if (passou) classes.push('is-past');
    if (!materia) classes.push('is-free');

    return `
      <li class="${classes.join(' ')}">
        <div class="ag-aula__time"><strong>${h.inicio}</strong><span>${h.fim}</span></div>
        <div class="ag-aula__body">
          <span class="ag-aula__name">${materia ? escapeHTML(materia) : 'Livre'}</span>
          <span class="ag-aula__slot">${escapeHTML(h.slot)}</span>
        </div>
        ${tag}
      </li>`;
  }).join('');

  el.innerHTML = `<ul class="ag-aulas__list">${linhas}</ul>`;
}

/* ------------------------------------------------------------
   Avisos & tarefas (ordenados por prioridade)
   ------------------------------------------------------------ */
export function renderizarAvisos() {
  const el = $('avisosGrid');
  if (!el) return;
  el.innerHTML = '';

  const lista = [...AVISOS].sort((a, b) => (ORDEM_AVISO[a.tipo] ?? 9) - (ORDEM_AVISO[b.tipo] ?? 9));

  lista.forEach((aviso) => {
    const tipo = ROTULO_AVISO[aviso.tipo] ? aviso.tipo : 'info';
    const div = document.createElement('div');
    div.className = `aviso-card ${tipo}`;
    div.innerHTML = `
      <span class="aviso-card__icon" aria-hidden="true"><i class="fa-solid ${ICONES_AVISO[tipo]}"></i></span>
      <div class="aviso-card__content">
        <div class="aviso-card__title">${escapeHTML(aviso.titulo)}</div>
        <div class="aviso-card__desc">${escapeHTML(aviso.desc)}</div>
        <div class="aviso-card__date">${escapeHTML(aviso.data)}</div>
      </div>
      <span class="ag-tag ag-tag--${tipo}">${ROTULO_AVISO[tipo]}</span>
    `;
    el.appendChild(div);
  });
}

/* ------------------------------------------------------------
   Anotações rápidas
   ------------------------------------------------------------ */
export function renderizarAnotacoesHome() {
  const grid = $('homeNotesGrid');
  const emptyEl = $('homeNotesEmpty');
  if (!grid) return;

  const notas = obterAnotacoes().sort((a, b) => b.atualizadoEm - a.atualizadoEm);
  atualizarIndicadores(notas.length);

  grid.innerHTML = '';

  if (notas.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    grid.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  grid.style.display = '';

  notas.forEach((nota) => {
    const tituloTxt = nota.titulo || 'Sem título';

    const card = document.createElement('div');
    card.className = 'home-note-card';
    card.dataset.id = nota.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Abrir anotação: ${tituloTxt}`);

    const topo = document.createElement('div');
    topo.className = 'home-note-card__top';

    const icone = document.createElement('span');
    icone.className = 'home-note-card__icon';
    icone.setAttribute('aria-hidden', 'true');
    icone.innerHTML = '<i class="fa-regular fa-note-sticky"></i>';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'home-note-card__edit';
    editBtn.title = 'Editar';
    editBtn.setAttribute('aria-label', `Editar anotação: ${tituloTxt}`);
    editBtn.innerHTML = '<i class="fa-solid fa-pencil" aria-hidden="true"></i>';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModalEdicao(nota.id);
    });

    topo.appendChild(icone);
    topo.appendChild(editBtn);

    const titulo = document.createElement('div');
    titulo.className = 'home-note-card__title';
    titulo.textContent = tituloTxt;

    card.appendChild(topo);
    card.appendChild(titulo);

    if (nota.conteudo) {
      const preview = document.createElement('div');
      preview.className = 'home-note-card__preview';
      preview.textContent = nota.conteudo;
      card.appendChild(preview);
    }

    const data = document.createElement('div');
    data.className = 'home-note-card__date';
    data.textContent = formatarDataNota(nota.atualizadoEm);
    card.appendChild(data);

    card.addEventListener('click', () => abrirVisualizacaoNota(nota.id));
    card.addEventListener('keydown', (e) => {
      if (e.target !== card) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirVisualizacaoNota(nota.id);
      }
    });

    grid.appendChild(card);
  });
}

/* ------------------------------------------------------------
   Ciclo de vida
   ------------------------------------------------------------ */
export function init() {
  calcularSemana();
  renderizarCabecalho();
  renderizarSemana();
  renderizarAulas();
  renderizarAvisos();
  renderizarAnotacoesHome();

  const btnNovaNota = $('btnNovaNotaAgenda');
  if (btnNovaNota) btnNovaNota.addEventListener('click', () => abrirModalEdicao(null));

  // Mantém "Agora / A seguir" atualizado enquanto a tela está aberta
  clearInterval(timerAulas);
  timerAulas = setInterval(renderizarAulas, 60000);
}

export function destroy() {
  clearInterval(timerAulas);
  timerAulas = null;
}
