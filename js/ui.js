/* ============================================================
   UI.JS — Componentes visuais reutilizáveis
   Tema, toasts, overlay de Anotações, overlay do Editor de Grade
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

import {
  HORARIOS, getGrade, setGrade, atualizarDB,
  obterAnotacoes, salvarAnotacoes, importarBanco, exportarBanco,
} from './storage.js';
import { aplicarTema } from './themes.js';
import { formatarDataNota, gerarIdNota } from './utils.js';
import {
  renderizarTabela, atualizarStatusBanner, renderizarAulasHoje,
  renderizarProximaAula, renderizarMateriaisCard, renderizarStatusGeral,
} from './views/inicio.js';
import { renderizarMateriaisSecao } from './views/material.js';
import { renderizarAnotacoesHome } from './views/agenda.js';

/* ============================================================
   TEMA — ver js/themes.js (Style Themes)
   ============================================================ */

/* ============================================================
   TOAST DE FEEDBACK
   ============================================================ */

/** Toast de feedback genérico */
export function mostrarToast(msg, erro = false) {
  let toast = document.getElementById('gradeToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'gradeToast';
    toast.style.cssText = `
      position: fixed;
      bottom: calc(var(--bottom-nav-height, 64px) + 1rem);
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      padding: .75rem 1.5rem;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      font-size: .875rem;
      font-family: var(--font-sans);
      z-index: 9999;
      opacity: 0;
      transition: opacity .3s ease, transform .3s ease;
      pointer-events: none;
      max-width: 90vw;
      text-align: center;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.borderColor = erro ? 'var(--accent-danger)' : 'var(--accent-success)';
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3000);
}

/* ============================================================
   IMPORTAÇÃO DE BACKUP (JSON) — genérico
   ============================================================ */

/** Abre o seletor de arquivo e importa o banco completo */
export function abrirImportacaoBanco(onSuccess) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      const resultado = importarBanco(obj, aplicarTema);
      if (resultado.ok) {
        atualizarTodaGrade();
        renderizarAnotacoes();
        renderizarAnotacoesHome();
        mostrarToast('Dados importados com sucesso! ✅');
        if (onSuccess) onSuccess(obj);
      } else {
        mostrarToast('Erro: ' + resultado.erro, true);
      }
    } catch (err) {
      mostrarToast('Arquivo JSON inválido. Verifique o formato.', true);
    }
  });
  input.click();
}

/* ============================================================
   ORQUESTRAÇÃO: re-renderizar tudo que depende da GRADE
   ============================================================
   As views só existem no DOM quando estão ativas — as próprias
   funções de renderização já verificam se os elementos existem,
   então é seguro chamá-las mesmo com outra view em tela.
   ============================================================ */

/**
 * Re-renderiza todos os componentes que dependem de GRADE.
 * As views só existem no DOM quando estão ativas, mas cada função de
 * renderização já verifica se seus elementos existem antes de agir,
 * então é seguro chamar todas mesmo com outra view em tela.
 */
export function atualizarTodaGrade() {
  renderizarTabela();
  renderizarAulasHoje();
  renderizarProximaAula();
  renderizarMateriaisCard();
  renderizarStatusGeral();
  renderizarMateriaisSecao();
  atualizarStatusBanner();
}

/* ============================================================
   ANOTAÇÕES — tela cheia + modais (overlay global)
   ============================================================ */

let notaEmEdicaoId = null;
let notaVisualizandoId = null;

/** Renderiza os cards de anotações na grade (tela cheia de Anotações) */
export function renderizarAnotacoes() {
  const grid = document.getElementById('notesGrid');
  const empty = document.getElementById('notesEmpty');
  if (!grid || !empty) return;

  const notas = obterAnotacoes().sort((a, b) => b.atualizadoEm - a.atualizadoEm);

  grid.innerHTML = '';

  if (notas.length === 0) {
    empty.classList.add('is-visible');
    grid.style.display = 'none';
    return;
  }

  empty.classList.remove('is-visible');
  grid.style.display = '';

  notas.forEach(nota => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'note-card';
    btn.dataset.id = nota.id;
    btn.setAttribute('aria-label', `Abrir anotação: ${nota.titulo || 'Sem título'}`);

    const titulo = document.createElement('div');
    titulo.className = 'note-card__title';
    titulo.textContent = nota.titulo || 'Sem título';

    const preview = document.createElement('div');
    preview.className = 'note-card__preview';
    preview.textContent = nota.conteudo || '';

    const data = document.createElement('div');
    data.className = 'note-card__date';
    data.textContent = formatarDataNota(nota.atualizadoEm);

    btn.appendChild(titulo);
    btn.appendChild(preview);
    btn.appendChild(data);

    btn.addEventListener('click', () => abrirVisualizacaoNota(nota.id));

    grid.appendChild(btn);
  });
}

export function abrirTelaAnotacoes() {
  const tela = document.getElementById('notesScreen');
  if (!tela) return;
  renderizarAnotacoes();
  tela.classList.add('is-open');
  tela.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function fecharTelaAnotacoes() {
  const tela = document.getElementById('notesScreen');
  if (!tela) return;
  tela.classList.remove('is-open');
  tela.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

export function abrirModalEdicao(notaId) {
  const modal = document.getElementById('notesEditModal');
  const titleInput = document.getElementById('noteTitleInput');
  const contentInput = document.getElementById('noteContentInput');
  const modalTitle = document.getElementById('notesEditTitle');
  const deleteBtn = document.getElementById('noteDeleteBtn');
  if (!modal || !titleInput || !contentInput) return;

  notaEmEdicaoId = notaId || null;

  if (notaId) {
    const nota = obterAnotacoes().find(n => n.id === notaId);
    titleInput.value = nota ? (nota.titulo || '') : '';
    contentInput.value = nota ? (nota.conteudo || '') : '';
    if (modalTitle) modalTitle.textContent = 'Editar anotação';
    if (deleteBtn) deleteBtn.hidden = false;
  } else {
    titleInput.value = '';
    contentInput.value = '';
    if (modalTitle) modalTitle.textContent = 'Nova anotação';
    if (deleteBtn) deleteBtn.hidden = true;
  }

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  setTimeout(() => contentInput.focus(), 150);
}

export function fecharModalEdicao() {
  const modal = document.getElementById('notesEditModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  notaEmEdicaoId = null;
}

export function salvarNota() {
  const titleInput = document.getElementById('noteTitleInput');
  const contentInput = document.getElementById('noteContentInput');
  if (!titleInput || !contentInput) return;

  const titulo = titleInput.value.trim();
  const conteudo = contentInput.value.trim();

  // Não salva nota completamente vazia
  if (!titulo && !conteudo) {
    fecharModalEdicao();
    return;
  }

  const notas = obterAnotacoes();
  const agora = Date.now();

  if (notaEmEdicaoId) {
    const idx = notas.findIndex(n => n.id === notaEmEdicaoId);
    if (idx >= 0) {
      notas[idx].titulo = titulo;
      notas[idx].conteudo = conteudo;
      notas[idx].atualizadoEm = agora;
    }
  } else {
    notas.push({ id: gerarIdNota(), titulo, conteudo, criadoEm: agora, atualizadoEm: agora });
  }

  salvarAnotacoes(notas);
  fecharModalEdicao();
  renderizarAnotacoes();
  renderizarAnotacoesHome();
}

export function excluirNota() {
  if (!notaEmEdicaoId) return;
  const notas = obterAnotacoes().filter(n => n.id !== notaEmEdicaoId);
  salvarAnotacoes(notas);
  fecharModalEdicao();
  renderizarAnotacoes();
  renderizarAnotacoesHome();
}

export function abrirVisualizacaoNota(notaId) {
  const nota = obterAnotacoes().find(n => n.id === notaId);
  if (!nota) return;

  notaVisualizandoId = notaId;

  const modal = document.getElementById('notesViewModal');
  const titleEl = document.getElementById('notesViewTitle');
  const dateEl = document.getElementById('noteViewDate');
  const contentEl = document.getElementById('noteViewContent');
  if (!modal || !titleEl || !dateEl || !contentEl) return;

  titleEl.textContent = nota.titulo || 'Sem título';
  dateEl.textContent = `Atualizado em ${formatarDataNota(nota.atualizadoEm)}`;
  contentEl.textContent = nota.conteudo || '';

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

export function fecharVisualizacaoNota() {
  const modal = document.getElementById('notesViewModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  notaVisualizandoId = null;
}

/** Inicializa todos os listeners da funcionalidade de anotações (chamar uma vez, no boot) */
export function initAnotacoes() {
  const notesButton = document.getElementById('notesButton');
  const notesBack = document.getElementById('notesBack');
  const notesFab = document.getElementById('notesFab');

  const editModal = document.getElementById('notesEditModal');
  const editBackdrop = document.getElementById('notesEditBackdrop');
  const editClose = document.getElementById('notesEditClose');
  const cancelBtn = document.getElementById('noteCancelBtn');
  const saveBtn = document.getElementById('noteSaveBtn');
  const deleteBtn = document.getElementById('noteDeleteBtn');

  const viewModal = document.getElementById('notesViewModal');
  const viewBackdrop = document.getElementById('notesViewBackdrop');
  const viewClose = document.getElementById('notesViewClose');
  const viewEditBtn = document.getElementById('noteViewEditBtn');

  if (notesButton) notesButton.addEventListener('click', abrirTelaAnotacoes);
  if (notesBack) notesBack.addEventListener('click', fecharTelaAnotacoes);
  if (notesFab) notesFab.addEventListener('click', () => abrirModalEdicao(null));

  if (editBackdrop) editBackdrop.addEventListener('click', fecharModalEdicao);
  if (editClose) editClose.addEventListener('click', fecharModalEdicao);
  if (cancelBtn) cancelBtn.addEventListener('click', fecharModalEdicao);
  if (saveBtn) saveBtn.addEventListener('click', salvarNota);
  if (deleteBtn) deleteBtn.addEventListener('click', excluirNota);

  if (viewBackdrop) viewBackdrop.addEventListener('click', fecharVisualizacaoNota);
  if (viewClose) viewClose.addEventListener('click', fecharVisualizacaoNota);
  if (viewEditBtn) {
    viewEditBtn.addEventListener('click', () => {
      const id = notaVisualizandoId;
      fecharVisualizacaoNota();
      abrirModalEdicao(id);
    });
  }

  // Tecla ESC fecha modais/tela abertos
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (editModal && editModal.classList.contains('is-open')) {
      fecharModalEdicao();
    } else if (viewModal && viewModal.classList.contains('is-open')) {
      fecharVisualizacaoNota();
    } else {
      const tela = document.getElementById('notesScreen');
      if (tela && tela.classList.contains('is-open')) fecharTelaAnotacoes();
    }
  });
}

/* ============================================================
   EDITOR VISUAL DA GRADE (overlay global)
   ============================================================ */

const DIAS_EDITOR = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

export function abrirEditorGrade() {
  const tela = document.getElementById('gradeEditorScreen');
  if (!tela) return;
  preencherEditorGrade();
  tela.classList.add('is-open');
  tela.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function fecharEditorGrade() {
  const tela = document.getElementById('gradeEditorScreen');
  if (!tela) return;
  tela.classList.remove('is-open');
  tela.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function preencherEditorGrade() {
  const tbody = document.getElementById('gradeEditorBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const GRADE = getGrade();

  HORARIOS.forEach((horario, rowIdx) => {
    const tr = document.createElement('tr');
    const tdH = document.createElement('td');
    tdH.innerHTML = `<div class="ge-horario-cell"><strong>${horario.slot}</strong>${horario.inicio}–${horario.fim}</div>`;
    tr.appendChild(tdH);

    DIAS_EDITOR.forEach(dia => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'ge-input';
      input.placeholder = '—';
      input.dataset.dia = dia;
      input.dataset.slot = rowIdx;
      input.maxLength = 40;
      if (GRADE && GRADE[dia] && GRADE[dia][rowIdx]) {
        input.value = GRADE[dia][rowIdx];
      }
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const next = tbody.querySelector(`input[data-dia="${dia}"][data-slot="${rowIdx + 1}"]`);
          if (next) next.focus();
        }
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function lerEditorGrade() {
  const tbody = document.getElementById('gradeEditorBody');
  if (!tbody) return null;
  const grade = {};
  DIAS_EDITOR.forEach(dia => { grade[dia] = []; });
  HORARIOS.forEach((_, rowIdx) => {
    DIAS_EDITOR.forEach(dia => {
      const input = tbody.querySelector(`input[data-dia="${dia}"][data-slot="${rowIdx}"]`);
      grade[dia].push(input ? input.value.trim() : '');
    });
  });
  return grade;
}

function salvarEditorGrade() {
  const grade = lerEditorGrade();
  if (!grade) return;
  setGrade(grade);
  atualizarTodaGrade();
  fecharEditorGrade();
  mostrarToast('Grade salva com sucesso! ✅');
}

function limparEditorGrade() {
  if (!confirm('Apagar todas as matérias da grade?')) return;
  document.querySelectorAll('#gradeEditorBody .ge-input').forEach(i => { i.value = ''; });
}

/**
 * Inicializa toda a lógica do editor de grade e dos botões globais de
 * importação/exportação do banco (overlay independente da view ativa).
 * Chamar uma vez, no boot.
 */
export function initEditorGrade() {
  const btnVoltar         = document.getElementById('gradeEditorBack');
  const btnSalvar         = document.getElementById('gradeEditorSalvar');
  const btnExportar       = document.getElementById('gradeEditorExportar');
  const btnImportarEditor = document.getElementById('gradeEditorImportar');
  const btnLimpar         = document.getElementById('gradeEditorLimpar');

  if (btnVoltar)   btnVoltar.addEventListener('click', fecharEditorGrade);
  if (btnSalvar)   btnSalvar.addEventListener('click', salvarEditorGrade);
  if (btnExportar) btnExportar.addEventListener('click', exportarBanco);
  if (btnImportarEditor) btnImportarEditor.addEventListener('click', () => {
    abrirImportacaoBanco(() => {
      const tela = document.getElementById('gradeEditorScreen');
      if (tela && tela.classList.contains('is-open')) preencherEditorGrade();
    });
  });
  if (btnLimpar) btnLimpar.addEventListener('click', limparEditorGrade);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const tela = document.getElementById('gradeEditorScreen');
      if (tela && tela.classList.contains('is-open')) fecharEditorGrade();
    }
  });
}
