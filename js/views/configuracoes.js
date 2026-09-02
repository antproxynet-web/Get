/* ============================================================
   VIEW: CONFIGURAÇÕES — aparência, dados da grade e sobre
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

import { exportarBanco } from '../storage.js';
import { getBrasiliaDate } from '../utils.js';
import { abrirEditorGrade, abrirImportacaoBanco } from '../ui.js';
import { abrirTelaTemas } from '../themes.js';

/** Atualiza o ano exibido na seção "Sobre" */
function atualizarAno() {
  const el = document.getElementById('configFooterYear');
  if (el) el.textContent = getBrasiliaDate().getFullYear();
}

/** Inicializa a view Configurações */
export function init() {
  atualizarAno();

  const btnStyleThemes = document.getElementById('btnStyleThemes');
  if (btnStyleThemes) btnStyleThemes.addEventListener('click', abrirTelaTemas);

  const btnEditar = document.getElementById('btnConfigEditarGrade');
  const btnImportar = document.getElementById('btnConfigImportarGrade');
  const btnExportar = document.getElementById('btnConfigExportarGrade');

  if (btnEditar) btnEditar.addEventListener('click', abrirEditorGrade);
  if (btnImportar) btnImportar.addEventListener('click', () => abrirImportacaoBanco());
  if (btnExportar) btnExportar.addEventListener('click', exportarBanco);
}

/** Nenhum recurso persistente é criado por esta view — nada para limpar. */
export function destroy() {}
