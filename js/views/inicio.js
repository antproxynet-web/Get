/* ============================================================
   VIEW: INÍCIO — status do dia, grade horária, cards
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

import { HORARIOS, MATERIAIS, DIA_MAP, DIAS_SEMANA, DIAS_HEADER, CHIP_CLASS, AVISOS, getGrade } from '../storage.js';
import {
  getBrasiliaDate, toMinutes, getAulaAtualIndex, getProximaAulaIndex, getChipClass, unique,
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
        <td colspan="6" style="
          text-align:center;
          padding: 2.5rem 1rem;
          color: var(--text-muted);
          font-size: 0.9rem;
          line-height: 1.8;
        ">
          <div style="font-size:2rem;margin-bottom:.5rem">📋</div>
          <strong style="color:var(--text-secondary);display:block;margin-bottom:.25rem">Grade horária vazia</strong>
          Toque no <strong><i class="fa-solid fa-pen"></i> lápis</strong> para preencher as matérias, ou no <strong>📥</strong> para importar um JSON.
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
      <span style="font-size:0.65rem;color:var(--text-muted)">${horario.inicio}–${horario.fim}</span>
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
        elStatusBadge.style.color = 'var(--accent-amber)';
      } else {
        elStatusText.textContent = 'Intervalo';
        elStatusDot.className = 'status-dot warning';
        elStatusBadge.style.color = 'var(--accent-amber)';
      }
    }
  }
}

/** Preenche o card "Aulas do Dia" */
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
    el.innerHTML = '<li class="card__list-item skeleton">Sem aulas hoje (fim de semana)</li>';
    return;
  }

  if (!GRADE || !GRADE[diaChave]) {
    el.innerHTML = '<li class="card__list-item skeleton">Grade horária vazia — toque no <i class="fa-solid fa-pen"></i>️ para preencher</li>';
    return;
  }

  const aulas = GRADE[diaChave];
  aulas.forEach((materia, idx) => {
    const li = document.createElement('li');
    li.className = 'card__list-item';

    if (idx === aulaAtualIdx) {
      li.classList.add('active');
    }

    const fimUltimaAula = toMinutes(HORARIOS[HORARIOS.length - 1].fim);
    if (aulaAtualIdx === -1 && minutosAgora >= fimUltimaAula) {
      li.style.opacity = '0.5';
    } else if (aulaAtualIdx >= 0 && idx < aulaAtualIdx) {
      li.style.opacity = '0.5';
      li.style.textDecoration = 'line-through';
    }

    li.innerHTML = `
      <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);min-width:28px">${idx + 1}º</span>
      <span>${materia}</span>
      <span style="margin-left:auto;font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted)">${HORARIOS[idx].inicio}</span>
    `;
    el.appendChild(li);
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
  elMateria.textContent = materia;
  elHorario.textContent = `${horario.inicio} – ${horario.fim}`;
}

/** Preenche o card "Materiais Necessários" */
export function renderizarMateriaisCard() {
  const el = document.getElementById('materiaisCard');
  if (!el) return;

  const GRADE = getGrade();
  const agora = getBrasiliaDate();
  const diaSemanaIndex = agora.getDay();
  const diaChave = DIA_MAP[diaSemanaIndex] || null;

  el.innerHTML = '';

  if (!diaChave) {
    el.innerHTML = '<li class="card__list-item skeleton">Sem aulas hoje</li>';
    return;
  }

  if (!GRADE || !GRADE[diaChave]) {
    el.innerHTML = '<li class="card__list-item skeleton">Grade horária vazia — toque no <i class="fa-solid fa-pen"></i> para preencher</li>';
    return;
  }

  const materiasUnicas = unique(GRADE[diaChave]);
  materiasUnicas.forEach(materia => {
    const mat = MATERIAIS[materia];
    const li = document.createElement('li');
    li.className = 'card__list-item';
    li.innerHTML = `
      <span>${mat ? mat.icone : '📚'}</span>
      <span>${mat && mat.livro ? mat.livro : materia}</span>
    `;
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

  const liAulas = document.querySelectorAll('#aulasHoje .card__list-item');
  liAulas.forEach((li, idx) => {
    li.classList.remove('active');
    li.style.opacity = '';
    li.style.textDecoration = '';

    if (diaChave) {
      if (idx === aulaAtualIdx) {
        li.classList.add('active');
      } else if (aulaAtualIdx >= 0 && idx < aulaAtualIdx) {
        li.style.opacity = '0.5';
        li.style.textDecoration = 'line-through';
      } else if (aulaAtualIdx === -1 && minutosAgora >= fimUltimaAula) {
        li.style.opacity = '0.5';
        li.style.textDecoration = 'line-through';
      }
    }
  });

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

  const LABELS = { urgente: 'Urgente', atencao: 'Atenção', info: 'Aviso', ok: 'Concluído' };
  const pendentes = AVISOS.filter(a => a.tipo !== 'ok').slice(0, 3);
  const lista = pendentes.length ? pendentes : AVISOS.slice(0, 3);

  if (!lista.length) {
    el.innerHTML = '<p class="compromissos-empty">Nenhum compromisso cadastrado no momento.</p>';
    return;
  }

  lista.forEach(aviso => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `compromisso-item compromisso-item--${aviso.tipo}`;
    item.innerHTML = `
      <span class="compromisso-item__icon" aria-hidden="true">${aviso.icone}</span>
      <span class="compromisso-item__body">
        <span class="compromisso-item__badge">${LABELS[aviso.tipo] || 'Aviso'}</span>
        <span class="compromisso-item__title">${aviso.titulo}</span>
        <span class="compromisso-item__date">${aviso.data}</span>
      </span>
    `;
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
