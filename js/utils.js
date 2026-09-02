/* ============================================================
   UTILS.JS — Funções utilitárias puras
   Vanilla JS · ES6+ · Sem dependências externas
   ============================================================ */

'use strict';

/**
 * Retorna a data/hora atual no fuso de Brasília (UTC-3)
 * @returns {Date}
 */
export function getBrasiliaDate() {
  const now = new Date();
  // Converte para UTC-3
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc - 3 * 3600000);
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
  const d = new Date(ts);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const local = new Date(utc - 3 * 3600000);
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
