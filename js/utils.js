/* ============================================================
   UTILS.JS — Funções utilitárias puras
   Vanilla JS · ES6+ · Sem dependências externas
   ============================================================ */

'use strict';

const FUSO_BRASILIA = 'America/Sao_Paulo';

const fmtBrasilia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_BRASILIA,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Converte um instante (timestamp) em um Date cujos getters locais
 * (getHours, getDay...) refletem o horário de Brasília, independente
 * do fuso configurado no aparelho.
 * @param {number} [ts=Date.now()]
 * @returns {Date}
 */
export function getBrasiliaDate(ts = Date.now()) {
  const p = {};
  for (const { type, value } of fmtBrasilia.formatToParts(new Date(ts))) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/**
 * Escapa texto para uso seguro dentro de HTML (innerHTML).
 * Use sempre que inserir dados do usuário/importados em templates.
 * @param {unknown} valor
 * @returns {string}
 */
export function escapeHTML(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Formata número com zero à esquerda
 * @param {number} n
 * @returns {string}
 */
export function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Converte "HH:MM" em minutos desde meia-noite
 * @param {string} hhmm
 * @returns {number}
 */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Retorna o índice do horário atual (-1 se fora do período escolar)
 * @param {Array} HORARIOS
 * @param {number} minutosAgora
 * @returns {number}
 */
export function getAulaAtualIndex(HORARIOS, minutosAgora) {
  for (let i = 0; i < HORARIOS.length; i++) {
    const ini = toMinutes(HORARIOS[i].inicio);
    const fim = toMinutes(HORARIOS[i].fim);
    if (minutosAgora >= ini && minutosAgora < fim) return i;
  }
  return -1;
}

/**
 * Retorna o índice da próxima aula (-1 se não houver)
 * @param {Array} HORARIOS
 * @param {number} minutosAgora
 * @returns {number}
 */
export function getProximaAulaIndex(HORARIOS, minutosAgora) {
  for (let i = 0; i < HORARIOS.length; i++) {
    const ini = toMinutes(HORARIOS[i].inicio);
    if (minutosAgora < ini) return i;
  }
  return -1;
}

/**
 * Obtém o chip CSS class para uma matéria
 * @param {Object} CHIP_CLASS
 * @param {string} materia
 * @returns {string}
 */
export function getChipClass(CHIP_CLASS, materia) {
  return CHIP_CLASS[materia] || 'chip-default';
}

/**
 * Remove duplicatas de um array
 * @param {Array} arr
 * @returns {Array}
 */
export function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Formata um timestamp para exibição (data + hora, Brasília)
 * @param {number} ts
 * @returns {string}
 */
export function formatarDataNota(ts) {
  const local = getBrasiliaDate(Number(ts) || Date.now());
  const dia = pad(local.getDate());
  const mes = pad(local.getMonth() + 1);
  const ano = local.getFullYear();
  const hh = pad(local.getHours());
  const mm = pad(local.getMinutes());
  return `${dia}/${mes}/${ano} às ${hh}:${mm}`;
}

/**
 * Gera um ID único simples
 * @returns {string}
 */
export function gerarIdNota() {
  return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
