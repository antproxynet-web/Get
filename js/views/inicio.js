/* ============================================================
   VIEW: INÍCIO — status do dia, grade horária, cards
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

import {
  HORARIOS, MATERIAIS, DIA_MAP, DIAS_SEMANA, DIAS_HEADER, CHIP_CLASS, AVISOS, getGrade,
  ICONE_MATERIA, ICONE_MATERIA_PADRAO, ICONE_AVISO, ROTULO_AVISO,
} from '../storage.js';
import {
  getBrasiliaDate, toMinutes, getAulaAtualIndex, getProximaAulaIndex, getChipClass, unique, escapeHTML,
} from '../utils.js';
import { abrirEditorGrade, abrirImportacaoBanco, abrirTelaAnotacoes } from '../ui.js';
import { navigateTo } from '../router.js';

/** Formata uma duração em minutos como "em X min" / "em Xh Ymin" */
function formatarDuracao(min) {
  if (min <= 0) return 'agora';
  if (min < 60) return `em ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `em ${h}h${String(m).padStart(2, '0')}` : `em ${h}h`;
}

/** Estado vazio no padrão visual do app */
function estadoVazio(icone, titulo, texto) {
  return `
    <div class="ui-empty">
      <div class="ui-empty__icon" aria-hidden="true"><i class="fa-solid ${icone}"></i></div>
      <strong class="ui-empty__title">${titulo}</strong>
      <span>${texto}</span>
    </div>`;
}

/**
 * Constrói a tabela de horários semanais
 */
export function renderizarTabela() {
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  if (!thead || !tbody) return;

  const GRADE = getGrade();

  // ---- Estado vazio: nenhuma grade preenchida ----
  if (!GRADE) {
    while (thead.children.length > 1) thead.removeChild(thead.lastChild);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="grade-vazia">
          ${estadoVazio('fa-table-cells', 'Grade horária vazia', 'Toque no lápis para preencher as matérias ou no ícone de importação para carregar um JSON.')}
        </td>
      </tr>`;
    return;
  }

  const dias = Object.keys(GRADE);

  // ---- Cabeçalho ----
  const hoje = getBrasiliaDate();
  const diaSemanaIndex = hoje.getDay();
  const diaChaveHoje = DIA_MAP[diaSemanaIndex] || null;

  while (thead.children.length > 1) {
    thead.removeChild(thead.lastChild);
  }

  dias.forEach(dia => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = DIAS_HEADER[dia];
    th.dataset.dia = dia;
    if (dia === diaChaveHoje) {
      th.classList.add('today-col');
      th.setAttribute('aria-current', 'true');
      th.setAttribute('title', 'Hoje');
    }
    thead.appendChild(th);
  });

  // ---- Corpo ----
  tbody.innerHTML = '';

  const agora = getBrasiliaDate();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const aulaAtualIdx = getAulaAtualIndex(HORARIOS, minutosAgora);

  HORARIOS.forEach((horario, rowIdx) => {
    const tr = document.createElement('tr');

    const tdHorario = document.createElement('td');
    tdHorario.className = 'col-horario';
    tdHorario.innerHTML = `
      <span class="slot-name">${horario.slot}</span><br>
      <span class="slot-time">${horario.inicio}–${horario.fim}</span>
    `;
    tr.appendChild(tdHorario);

    dias.forEach(dia => {
      const materia = GRADE[dia][rowIdx] || '—';
      const td = document.createElement('td');
      td.dataset.dia = dia;
      td.dataset.slot = rowIdx;

      if (dia === diaChaveHoje) {
        td.classList.add('today-col');

        if (rowIdx === aulaAtualIdx) {
          td.classList.add('current-aula');
        } else if (aulaAtualIdx >= 0 && rowIdx < aulaAtualIdx) {
          td.classList.add('past-aula');
        } else if (aulaAtualIdx === -1) {
          const fimUltimaAula = toMinutes(HORARIOS[HORARIOS.length - 1].fim);
          if (minutosAgora >= fimUltimaAula) {
            td.classList.add('past-aula');
          }
        }
      }

      if (materia !== '—') {
        const chip = document.createElement('span');
        chip.className = `materia-chip ${getChipClass(CHIP_CLASS, materia)}`;
        chip.textContent = materia;
        td.appendChild(chip);
      } else {
        td.textContent = '—';
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

/**
 * Atualiza o banner de status superior
 */
export function atualizarStatusBanner() {
  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaSemanaIndex = agora.getDay();
  const diaChave = DIA_MAP[diaSemanaIndex] || null;
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  const elDayName = document.getElementById('currentDayName');
  if (elDayName) elDayName.textContent = DIAS_SEMANA[diaSemanaIndex] || '—';

  const elAulaName = document.getElementById('currentAulaName');
  const aulaAtualIdx = getAulaAtualIndex(HORARIOS, minutosAgora);

  if (elAulaName) {
    if (diaChave && aulaAtualIdx >= 0 && GRADE && GRADE[diaChave]) {
      elAulaName.textContent = GRADE[diaChave][aulaAtualIdx] || '—';
    } else if (!diaChave) {
      elAulaName.textContent = 'Sem aula';
    } else if (!GRADE) {
      elAulaName.textContent = '—';
    } else {
      const fimUltimaAula = toMinutes(HORARIOS[HORARIOS.length - 1].fim);
      const inicioAulas = toMinutes(HORARIOS[0].inicio);
      if (minutosAgora < inicioAulas) {
        elAulaName.textContent = 'Nenhuma';
      } else if (minutosAgora >= fimUltimaAula) {
        elAulaName.textContent = 'Aulas encerradas';
      } else {
        elAulaName.textContent = 'Intervalo';
      }
    }
  }

  const elProxima = document.getElementById('nextAulaName');
  const proximaIdx = getProximaAulaIndex(HORARIOS, minutosAgora);

  if (elProxima) {
    if (diaChave && proximaIdx >= 0 && GRADE && GRADE[diaChave]) {
      elProxima.textContent = GRADE[diaChave][proximaIdx] || '—';
    } else {
      elProxima.textContent = 'Nenhuma';
    }
  }

  const elStatusText = document.getElementById('statusText');
  const elStatusDot = document.getElementById('statusDot');
  const elStatusBadge = document.getElementById('statusBadge');

  if (elStatusText && elStatusDot) {
    if (!diaChave) {
      elStatusText.textContent = 'Fim de semana';
      elStatusDot.className = 'status-dot off';
      elStatusBadge.style.color = 'var(--text-muted)';
    } else if (aulaAtualIdx >= 0) {
      elStatusText.textContent = 'Em aula';
      elStatusDot.className = 'status-dot';
      elStatusBadge.style.color = 'var(--accent-success)';
    } else {
      const fimUltimaAula = toMinutes(HORARIOS[HORARIOS.length - 1].fim);
      const inicioAulas = toMinutes(HORARIOS[0].inicio);
      if (minutosAgora >= fimUltimaAula) {
        elStatusText.textContent = 'Encerrado';
        elStatusDot.className = 'status-dot off';
        elStatusBadge.style.color = 'var(--text-muted)';
      } else if (minutosAgora < inicioAulas) {
        elStatusText.textContent = 'Aguardando';
        elStatusDot.className = 'status-dot warning';
        elStatusBadge.style.color = 'var(--accent-warning)';
      } else {
        elStatusText.textContent = 'Intervalo';
        elStatusDot.className = 'status-dot warning';
        elStatusBadge.style.color = 'var(--accent-warning)';
      }
    }
  }
}

/** Monta uma linha da lista "Aulas de hoje" */
function linhaAula(materia, idx, aulaAtualIdx, minutosAgora) {
  const fimUltimaAula = toMinutes(HORARIOS[HORARIOS.length - 1].fim);
  const classes = ['lesson'];
  if (idx === aulaAtualIdx) classes.push('is-now');
  else if (aulaAtualIdx >= 0 && idx < aulaAtualIdx) classes.push('is-past');
  else if (aulaAtualIdx === -1 && minutosAgora >= fimUltimaAula) classes.push('is-past');
  if (!materia) classes.push('is-free');

  const li = document.createElement('li');
  li.className = classes.join(' ');
  li.innerHTML = `
    <span class="lesson__time">${HORARIOS[idx].inicio}</span>
    <span class="lesson__name">${materia ? escapeHTML(materia) : 'Livre'}</span>
    ${idx === aulaAtualIdx ? '<span class="ui-tag ui-tag--solid">Agora</span>' : ''}`;
  return li;
}

/** Preenche a lista "Aulas de hoje" */
export function renderizarAulasHoje() {
  const el = document.getElementById('aulasHoje');
  if (!el) return;

  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaSemanaIndex = agora.getDay();
  const diaChave = DIA_MAP[diaSemanaIndex] || null;
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const aulaAtualIdx = getAulaAtualIndex(HORARIOS, minutosAgora);

  el.innerHTML = '';

  if (!diaChave) {
    el.innerHTML = '<li>' + estadoVazio('fa-mug-hot', 'Sem aulas', 'Fim de semana. Aproveite para descansar.') + '</li>';
    return;
  }

  if (!GRADE || !GRADE[diaChave]) {
    el.innerHTML = '<li>' + estadoVazio('fa-table-cells', 'Grade vazia', 'Preencha a grade horária para ver as aulas aqui.') + '</li>';
    return;
  }

  GRADE[diaChave].slice(0, HORARIOS.length).forEach((materia, idx) => {
    el.appendChild(linhaAula(materia, idx, aulaAtualIdx, minutosAgora));
  });
}

/** Preenche o card "Próxima Aula" */
export function renderizarProximaAula() {
  const elSlot = document.getElementById('proximaSlot');
  const elMateria = document.getElementById('proximaMateria');
  const elHorario = document.getElementById('proximaHorario');
  if (!elSlot || !elMateria || !elHorario) return;

  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaSemanaIndex = agora.getDay();
  const diaChave = DIA_MAP[diaSemanaIndex] || null;
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const proximaIdx = getProximaAulaIndex(HORARIOS, minutosAgora);

  if (!diaChave || proximaIdx < 0) {
    elSlot.textContent = '—';
    elMateria.textContent = diaChave ? 'Aulas encerradas' : 'Fim de semana';
    elHorario.textContent = '—';
    return;
  }

  if (!GRADE || !GRADE[diaChave]) {
    elSlot.textContent = '—';
    elMateria.textContent = 'Grade vazia';
    elHorario.textContent = '—';
    return;
  }

  const materia = GRADE[diaChave][proximaIdx];
  const horario = HORARIOS[proximaIdx];

  elSlot.textContent = `${proximaIdx + 1}ª Aula`;
  elMateria.textContent = materia || '—';
  elHorario.textContent = `${horario.inicio} – ${horario.fim}`;
}

/** Preenche a lista "Materiais" (livros do dia) */
export function renderizarMateriaisCard() {
  const el = document.getElementById('materiaisCard');
  if (!el) return;

  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaChave = DIA_MAP[agora.getDay()] || null;

  el.innerHTML = '';

  if (!diaChave) {
    el.innerHTML = '<li>' + estadoVazio('fa-mug-hot', 'Sem aulas', 'Nada para levar hoje.') + '</li>';
    return;
  }

  if (!GRADE || !GRADE[diaChave]) {
    el.innerHTML = '<li>' + estadoVazio('fa-table-cells', 'Grade vazia', 'Preencha a grade para ver os materiais.') + '</li>';
    return;
  }

  const materiasUnicas = unique(GRADE[diaChave]).filter(m => m && m !== '—');
  if (!materiasUnicas.length) {
    el.innerHTML = '<li>' + estadoVazio('fa-book', 'Nenhuma matéria', 'Não há matérias cadastradas para hoje.') + '</li>';
    return;
  }

  materiasUnicas.forEach(materia => {
    const mat = MATERIAIS[materia];
    const icone = ICONE_MATERIA[materia] || ICONE_MATERIA_PADRAO;
    const li = document.createElement('li');
    li.className = 'lesson';
    li.innerHTML = `
      <span class="lesson__ico" aria-hidden="true"><i class="fa-solid ${icone}"></i></span>
      <span class="lesson__name lesson__name--soft">${escapeHTML(mat && mat.livro ? mat.livro : materia)}</span>`;
    el.appendChild(li);
  });
}

/** Preenche o card "Status Geral" */
export function renderizarStatusGeral() {
  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaSemanaIndex = agora.getDay();
  const diaChave = DIA_MAP[diaSemanaIndex] || null;
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const aulaAtualIdx = getAulaAtualIndex(HORARIOS, minutosAgora);
  const fimUltimaAula = toMinutes(HORARIOS[HORARIOS.length - 1].fim);

  const total = diaChave ? HORARIOS.length : 0;
  let concluidas = 0;

  if (diaChave) {
    if (aulaAtualIdx >= 0) {
      concluidas = aulaAtualIdx;
    } else if (minutosAgora >= fimUltimaAula) {
      concluidas = total;
    }
  }

  const restantes = total - concluidas - (aulaAtualIdx >= 0 ? 1 : 0);
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  const elTotal = document.getElementById('totalAulas');
  const elConcluidas = document.getElementById('aulasConcluidas');
  const elRestantes = document.getElementById('aulasRestantes');
  const elProgressBar = document.getElementById('progressBar');
  const elProgressLabel = document.getElementById('progressLabel');
  const elProgressWrapper = document.getElementById('progressWrapper');

  if (elTotal) elTotal.textContent = total || '—';
  if (elConcluidas) elConcluidas.textContent = concluidas;
  if (elRestantes) elRestantes.textContent = Math.max(0, restantes);

  if (elProgressBar) elProgressBar.style.width = `${progresso}%`;
  if (elProgressLabel) elProgressLabel.textContent = `${progresso}%`;
  if (elProgressWrapper) elProgressWrapper.setAttribute('aria-valuenow', progresso);
}

/** Atualiza o highlight da aula ativa na tabela (chamado a cada segundo pelo app) */
export function atualizarAulasAtivas() {
  const agora = getBrasiliaDate();
  const diaSemanaIndex = agora.getDay();
  const diaChave = DIA_MAP[diaSemanaIndex] || null;
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const aulaAtualIdx = getAulaAtualIndex(HORARIOS, minutosAgora);
  const fimUltimaAula = toMinutes(HORARIOS[HORARIOS.length - 1].fim);

  const cells = document.querySelectorAll('.schedule-table td.today-col');
  cells.forEach(td => {
    const slotIdx = parseInt(td.dataset.slot, 10);
    td.classList.remove('current-aula', 'past-aula');

    if (aulaAtualIdx >= 0 && slotIdx === aulaAtualIdx) {
      td.classList.add('current-aula');
    } else if (aulaAtualIdx >= 0 && slotIdx < aulaAtualIdx) {
      td.classList.add('past-aula');
    } else if (aulaAtualIdx === -1 && minutosAgora >= fimUltimaAula) {
      td.classList.add('past-aula');
    }
  });

  // Mantém "Agora" e as aulas passadas da lista lateral em dia
  if (document.getElementById('aulasHoje') && diaChave && getGrade() && getGrade()[diaChave]) {
    renderizarAulasHoje();
  }

  renderizarProximaAula();
  renderizarStatusGeral();
  renderizarHeroExtra();
  renderizarResumoTexto();
}

/** Preenche os detalhes extras do card hero (horários, barra de progresso, contagem regressiva) */
export function renderizarHeroExtra() {
  const elCurrentHorario = document.getElementById('heroCurrentHorario');
  const elProgressBar = document.getElementById('heroProgressBar');
  const elProgressWrapper = document.getElementById('heroProgressWrapper');
  const elRemaining = document.getElementById('heroRemaining');
  const elNextHorario = document.getElementById('heroNextHorario');
  const elCountdown = document.getElementById('heroCountdown');
  if (!elCurrentHorario && !elNextHorario) return;

  const agora = getBrasiliaDate();
  const diaChave = DIA_MAP[agora.getDay()] || null;
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const aulaAtualIdx = getAulaAtualIndex(HORARIOS, minutosAgora);
  const proximaIdx = getProximaAulaIndex(HORARIOS, minutosAgora);

  // ---- Painel: aula atual ----
  if (diaChave && aulaAtualIdx >= 0) {
    const h = HORARIOS[aulaAtualIdx];
    const ini = toMinutes(h.inicio);
    const fim = toMinutes(h.fim);
    const total = fim - ini;
    const decorridos = Math.max(0, minutosAgora - ini);
    const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((decorridos / total) * 100))) : 0;
    const restam = Math.max(0, fim - minutosAgora);

    if (elCurrentHorario) elCurrentHorario.textContent = `${h.inicio} – ${h.fim}`;
    if (elProgressBar) elProgressBar.style.width = `${pct}%`;
    if (elProgressWrapper) elProgressWrapper.setAttribute('aria-valuenow', pct);
    if (elRemaining) elRemaining.textContent = `${restam} min restantes`;
  } else {
    if (elCurrentHorario) elCurrentHorario.textContent = '—';
    if (elProgressBar) elProgressBar.style.width = '0%';
    if (elProgressWrapper) elProgressWrapper.setAttribute('aria-valuenow', 0);
    if (elRemaining) elRemaining.textContent = '';
  }

  // ---- Painel: próxima aula ----
  if (diaChave && proximaIdx >= 0) {
    const h = HORARIOS[proximaIdx];
    const faltam = Math.max(0, toMinutes(h.inicio) - minutosAgora);
    if (elNextHorario) elNextHorario.textContent = `${h.inicio} – ${h.fim}`;
    if (elCountdown) elCountdown.textContent = formatarDuracao(faltam);
  } else {
    if (elNextHorario) elNextHorario.textContent = '—';
    if (elCountdown) elCountdown.textContent = diaChave ? 'Aulas encerradas' : 'Fim de semana';
  }
}

/** Preenche a frase-resumo do card "Resumo do dia" */
export function renderizarResumoTexto() {
  const el = document.getElementById('summaryText');
  if (!el) return;

  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaChave = DIA_MAP[agora.getDay()] || null;

  if (!diaChave) {
    el.textContent = 'Fim de semana — nenhuma aula hoje. Aproveite para descansar ou revisar o conteúdo.';
    return;
  }
  if (!GRADE || !GRADE[diaChave]) {
    el.textContent = 'Sua grade de hoje ainda está vazia — toque no ícone de edição para preenchê-la.';
    return;
  }

  const total = HORARIOS.length;
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const aulaAtualIdx = getAulaAtualIndex(HORARIOS, minutosAgora);
  const fimUltimaAula = toMinutes(HORARIOS[HORARIOS.length - 1].fim);

  let concluidas = 0;
  if (aulaAtualIdx >= 0) concluidas = aulaAtualIdx;
  else if (minutosAgora >= fimUltimaAula) concluidas = total;

  const restantes = Math.max(0, total - concluidas - (aulaAtualIdx >= 0 ? 1 : 0));

  el.textContent = `Você tem ${total} aula${total === 1 ? '' : 's'} hoje — ${concluidas} concluída${concluidas === 1 ? '' : 's'} e ${restantes} restante${restantes === 1 ? '' : 's'}.`;
}

/** Preenche a lista "Próximos compromissos" a partir dos avisos cadastrados */
export function renderizarCompromissos() {
  const el = document.getElementById('compromissosList');
  if (!el) return;

  el.innerHTML = '';

  const pendentes = AVISOS.filter(a => a.tipo !== 'ok').slice(0, 3);
  const lista = pendentes.length ? pendentes : AVISOS.slice(0, 3);

  if (!lista.length) {
    el.innerHTML = estadoVazio('fa-calendar-check', 'Nada por aqui', 'Nenhum compromisso cadastrado no momento.');
    return;
  }

  lista.forEach(aviso => {
    const tipo = ROTULO_AVISO[aviso.tipo] ? aviso.tipo : 'info';
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `ui-row compromisso-item tone-${tipo}`;
    item.innerHTML = `
      <span class="ui-tile ui-tile--tone" aria-hidden="true"><i class="fa-solid ${ICONE_AVISO[tipo]}"></i></span>
      <span class="ui-row__body">
        <span class="ui-row__title">${escapeHTML(aviso.titulo)}</span>
        <span class="compromisso-item__date">${escapeHTML(aviso.data)}</span>
      </span>
      <span class="ui-tag tone-${tipo}">${ROTULO_AVISO[tipo]}</span>`;
    item.addEventListener('click', () => navigateTo('agenda'));
    el.appendChild(item);
  });
}

/** Preenche a faixa "Sua semana" com a contagem de aulas de cada dia útil */
export function renderizarSemana() {
  const el = document.getElementById('weekStrip');
  if (!el) return;

  el.innerHTML = '';

  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaChaveHoje = DIA_MAP[agora.getDay()] || null;

  const diaAtualNum = agora.getDay();
  const diffSegunda = diaAtualNum === 0 ? -6 : 1 - diaAtualNum;
  const segunda = new Date(agora);
  segunda.setDate(agora.getDate() + diffSegunda);

  const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  const maxCount = HORARIOS.length || 1;

  dias.forEach((dia, idx) => {
    const dataDia = new Date(segunda);
    dataDia.setDate(segunda.getDate() + idx);
    const count = GRADE && GRADE[dia] ? GRADE[dia].filter(m => m && m !== '—').length : 0;
    const pct = Math.round((count / maxCount) * 100);

    const card = document.createElement('div');
    card.className = 'week-day';
    if (dia === diaChaveHoje) card.classList.add('is-today');

    card.innerHTML = `
      <span class="week-day__label">${DIAS_HEADER[dia].slice(0, 3).toUpperCase()}</span>
      <span class="week-day__num">${dataDia.getDate()}</span>
      <span class="week-day__bar"><span class="week-day__bar-fill" style="height:${count ? Math.max(pct, 10) : 4}%"></span></span>
      <span class="week-day__count">${count ? `${count} aula${count === 1 ? '' : 's'}` : 'Livre'}</span>
    `;
    el.appendChild(card);
  });
}

/** Liga os atalhos rápidos da tela inicial (botões de navegação e ações globais) */
function ligarAtalhosRapidos() {
  const atalhos = {
    qaGrade: () => abrirEditorGrade(),
    qaAgenda: () => navigateTo('agenda'),
    qaNotas: () => abrirTelaAnotacoes(),
    qaMaterial: () => navigateTo('material'),
    qaAjustes: () => navigateTo('configuracoes'),
  };

  Object.entries(atalhos).forEach(([id, fn]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', fn);
  });

  const btnVerAgenda = document.getElementById('btnVerAgenda');
  if (btnVerAgenda) btnVerAgenda.addEventListener('click', () => navigateTo('agenda'));
}

/** Renderiza tudo que esta view mostra (chamado ao montar a view e após import/edição de grade) */
export function renderizarTudo() {
  renderizarTabela();
  atualizarStatusBanner();
  renderizarAulasHoje();
  renderizarProximaAula();
  renderizarMateriaisCard();
  renderizarStatusGeral();
  renderizarHeroExtra();
  renderizarResumoTexto();
  renderizarCompromissos();
  renderizarSemana();
}

/**
 * Inicializa a view Início: primeira renderização + listeners dos
 * botões de editar/importar grade (existem apenas enquanto esta view
 * está montada, então são religados a cada navegação).
 */
export function init() {
  renderizarTudo();

  const btnEditar = document.getElementById('btnEditarGrade');
  const btnImportar = document.getElementById('btnImportarGrade');
  if (btnEditar) btnEditar.addEventListener('click', abrirEditorGrade);
  if (btnImportar) btnImportar.addEventListener('click', () => abrirImportacaoBanco());

  ligarAtalhosRapidos();
}

/** Nenhum recurso persistente (intervalos) é criado por esta view — nada para limpar. */
export function destroy() {}
