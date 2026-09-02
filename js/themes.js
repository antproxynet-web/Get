/* ============================================================
   THEMES.JS — Sistema de Style Themes
   Vanilla JS · ES6+
   ------------------------------------------------------------
   Responsável por:
   - Definir o catálogo de temas disponíveis (id, nome, descrição)
   - Aplicar/trocar o tema instantaneamente (sem recarregar a página)
   - Persistir a escolha no localStorage (via storage.js)
   - Renderizar os cards de seleção (tela "Style Themes")
   ============================================================ */

'use strict';

import { lerDB, atualizarDB } from './storage.js';

/* ============================================================
   1. CATÁLOGO DE TEMAS
   ============================================================
   Cada tema aqui corresponde a um bloco `[data-theme="id"]`
   definido em css/themes.css. Adicionar um tema novo = adicionar
   uma entrada aqui + o bloco de variáveis correspondente no CSS.
   ============================================================ */
export const TEMAS = [
  { id: 'dark', nome: 'Dark', descricao: 'Grafite premium minimalista (padrão)' },
  { id: 'minimal-black', nome: 'Preto Minimalista', descricao: 'Visual limpo e elegante' },
  { id: 'cyberpunk', nome: 'Cyberpunk', descricao: 'Neon azul e roxo' },
  { id: 'space', nome: 'Espacial', descricao: 'Atmosfera cósmica em índigo profundo' },
  { id: 'space-pink', nome: 'Space Pink', descricao: 'Nebulosa em rosa e violeta' },
  { id: 'ocean', nome: 'Ocean', descricao: 'Azul-petróleo calmo e fluido' },
  { id: 'forest', nome: 'Forest', descricao: 'Verde-floresta natural' },
  { id: 'sunset', nome: 'Sunset', descricao: 'Âmbar e coral sobre marrom profundo' },
];

const TEMA_PADRAO = 'dark';
const IDS_VALIDOS = TEMAS.map((t) => t.id);

/* ============================================================
   2. NÚCLEO — carregar / aplicar / salvar / obter
   ============================================================ */

/** Retorna o id do tema atualmente aplicado ao documento */
export function obterTemaAtual() {
  return document.documentElement.getAttribute('data-theme') || TEMA_PADRAO;
}

/** Persiste o tema escolhido no banco (localStorage) */
export function salvarTema(temaId) {
  atualizarDB({ tema: temaId });
}

/**
 * Aplica um tema ao documento imediatamente (sem reload) e persiste.
 * Ids desconhecidos caem para o tema padrão, por segurança.
 * @param {string} temaId
 */
export function aplicarTema(temaId) {
  const id = IDS_VALIDOS.includes(temaId) ? temaId : TEMA_PADRAO;
  document.documentElement.setAttribute('data-theme', id);
  salvarTema(id);
  sincronizarCardsSelecionados(id);
  return id;
}

/**
 * Lê o tema salvo no boot da aplicação e o aplica.
 * Deve ser chamada uma única vez, na inicialização (app.js).
 * Migra silenciosamente qualquer valor legado/inválido para o padrão.
 */
export function carregarTema() {
  const db = lerDB();
  const salvo = IDS_VALIDOS.includes(db.tema) ? db.tema : TEMA_PADRAO;
  document.documentElement.setAttribute('data-theme', salvo);
  if (db.tema !== salvo) salvarTema(salvo);
  return salvo;
}

/* ============================================================
   3. RENDERIZAÇÃO DA LISTA DE TEMAS (cards)
   ============================================================ */

/** Monta o HTML de um único card de tema */
function construirCardTema(tema, ativo) {
  return `
    <button type="button" class="theme-card${ativo ? ' theme-card--active' : ''}" data-tema-id="${tema.id}" aria-pressed="${ativo}">
      <span class="theme-card__preview" data-theme="${tema.id}" aria-hidden="true">
        <span class="theme-card__swatch" data-swatch="1"></span>
        <span class="theme-card__swatch" data-swatch="2"></span>
        <span class="theme-card__swatch" data-swatch="3"></span>
      </span>
      <span class="theme-card__info">
        <span class="theme-card__name">${tema.nome}</span>
        <span class="theme-card__desc">${tema.descricao}</span>
      </span>
      <span class="theme-card__check" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></span>
    </button>
  `;
}

/**
 * Renderiza a grade completa de cards de tema dentro de um container
 * e liga o clique de cada card para aplicar o tema correspondente.
 * @param {HTMLElement} container
 */
export function renderizarListaTemas(container) {
  if (!container) return;
  const atual = obterTemaAtual();

  container.innerHTML = TEMAS.map((tema) => construirCardTema(tema, tema.id === atual)).join('');

  container.querySelectorAll('.theme-card').forEach((card) => {
    card.addEventListener('click', () => {
      aplicarTema(card.dataset.temaId);
    });
  });
}

/** Atualiza apenas o estado visual (classe + aria-pressed) dos cards já renderizados */
function sincronizarCardsSelecionados(temaId) {
  document.querySelectorAll('.theme-card').forEach((card) => {
    const selecionado = card.dataset.temaId === temaId;
    card.classList.toggle('theme-card--active', selecionado);
    card.setAttribute('aria-pressed', String(selecionado));
  });
}

/* ============================================================
   4. TELA DE SELEÇÃO (abrir / fechar / inicializar)
   ============================================================ */

/** Abre a tela de seleção de Style Themes, renderizando os cards */
export function abrirTelaTemas() {
  const tela = document.getElementById('themeScreen');
  if (!tela) return;
  renderizarListaTemas(document.getElementById('themeGrid'));
  tela.classList.add('is-open');
  tela.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

/** Fecha a tela de seleção de Style Themes */
export function fecharTelaTemas() {
  const tela = document.getElementById('themeScreen');
  if (!tela) return;
  tela.classList.remove('is-open');
  tela.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Liga os gatilhos globais da tela de seleção de temas:
 * botão do header, botão "voltar", clique fora (backdrop) e tecla ESC.
 * Deve ser chamada uma única vez, no boot da aplicação (app.js).
 */
export function initSeletorTemas() {
  const btnHeader = document.getElementById('themeToggle');
  const btnBack = document.getElementById('themeScreenBack');

  if (btnHeader) btnHeader.addEventListener('click', abrirTelaTemas);
  if (btnBack) btnBack.addEventListener('click', fecharTelaTemas);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const tela = document.getElementById('themeScreen');
    if (tela && tela.classList.contains('is-open')) fecharTelaTemas();
  });
}
