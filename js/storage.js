/* ============================================================
   STORAGE.JS — Dados escolares + persistência (localStorage)
   Vanilla JS · ES6+
   ============================================================ */

'use strict';

/* ============================================================
   1. DADOS ESCOLARES (seed / configuração estática)
   ============================================================ */

/**
 * Horários de cada aula (início e fim)
 * Formato: HH:MM
 */
export const HORARIOS = [
  { slot: '1ª Aula', inicio: '13:00', fim: '13:40' },
  { slot: '2ª Aula', inicio: '13:40', fim: '14:20' },
  { slot: '3ª Aula', inicio: '14:20', fim: '15:00' },
  { slot: '4ª Aula', inicio: '15:15', fim: '15:55' },
  { slot: '5ª Aula', inicio: '15:55', fim: '16:35' },
  { slot: '6ª Aula', inicio: '16:35', fim: '17:00' },
];

/**
 * Grade horária semanal — carregada do banco unificado (localStorage).
 * null = nenhuma grade preenchida; objeto = dados válidos.
 * Use getGrade()/setGrade() para ler/alterar — não importe este binding diretamente.
 */
let GRADE = null;

/**
 * Materiais necessários por matéria
 */
export const MATERIAIS = {
  'Matemática':      { icone: '📐', livro: 'Livro de Matemática', extras: ['Calculadora', 'Caderno quadriculado'] },
  'Física':          { icone: '⚛️', livro: 'Livro de Física',     extras: ['Caderno de fórmulas', 'Calculadora'] },
  'Português':       { icone: '📖', livro: 'Livro de Português',  extras: ['Dicionário', 'Caderno de redação'] },
  'História':        { icone: '🏛️', livro: 'Livro de História',   extras: ['Caderno de anotações'] },
  'Biologia':        { icone: '🔬', livro: 'Livro de Biologia',   extras: ['Caderno de ciências'] },
  'Química':         { icone: '🧪', livro: 'Livro de Química',    extras: ['Tabela periódica', 'Calculadora'] },
  'Inglês':          { icone: '🌐', livro: 'Livro de Inglês',     extras: ['Dicionário inglês-português'] },
  'Filosofia':       { icone: '💭', livro: 'Livro de Filosofia',  extras: ['Caderno de anotações'] },
  'Sociologia':      { icone: '🌍', livro: 'Livro de Sociologia', extras: ['Caderno de ciências humanas'] },
  'Artes':           { icone: '🎨', livro: 'Livro de Artes',      extras: ['Material de desenho'] },
  'Educação Física': { icone: '🏃', livro: null,                  extras: ['Tênis', 'Roupa de esporte', 'Garrafa d\'água'] },
};

/**
 * Avisos e tarefas importantes
 */
export const AVISOS = [
  {
    tipo: 'urgente',
    icone: '🔴',
    titulo: 'Prova de Matemática',
    desc: 'Revisão de funções do 2º grau e geometria analítica. Estudar capítulos 5 e 6.',
    data: 'Sexta-feira, 10/04',
  },
  {
    tipo: 'urgente',
    icone: '🔴',
    titulo: 'Trabalho de Biologia',
    desc: 'Entregar relatório sobre mitose e meiose. Mínimo de 3 páginas com referências.',
    data: 'Quinta-feira, 10/04',
  },
  {
    tipo: 'atencao',
    icone: '🟡',
    titulo: 'Simulado Geral',
    desc: 'Simulado de todas as disciplinas no estilo ENEM. Trazer documento com foto.',
    data: 'Sábado, 12/04',
  },
  {
    tipo: 'atencao',
    icone: '🟡',
    titulo: 'Revisão de Física',
    desc: 'Revisão de termodinâmica e ondas antes da prova bimestral.',
    data: 'Quarta-feira, 09/04',
  },
  {
    tipo: 'info',
    icone: '🔵',
    titulo: 'Reunião de Pais',
    desc: 'Reunião com responsáveis para entrega de boletins do 1º bimestre.',
    data: 'Segunda-feira, 14/04',
  },
  {
    tipo: 'ok',
    icone: '🟢',
    titulo: 'Redação Entregue',
    desc: 'Redação sobre "Desafios da educação no Brasil" entregue com sucesso.',
    data: 'Concluído',
  },
];

/**
 * Ícones de linha (Font Awesome) por matéria — substituem os emojis na interface.
 * Matéria desconhecida usa ICONE_MATERIA_PADRAO.
 */
export const ICONE_MATERIA = {
  'Matemática': 'fa-square-root-variable', 'Física': 'fa-atom', 'Português': 'fa-book-open',
  'História': 'fa-landmark', 'Biologia': 'fa-dna', 'Química': 'fa-flask',
  'Inglês': 'fa-language', 'Filosofia': 'fa-lightbulb', 'Sociologia': 'fa-people-group',
  'Artes': 'fa-palette', 'Educação Física': 'fa-person-running', 'Geografia': 'fa-earth-americas',
};
export const ICONE_MATERIA_PADRAO = 'fa-book';

/** Ícone, rótulo e ordem de prioridade por tipo de aviso */
export const ICONE_AVISO  = { urgente: 'fa-circle-exclamation', atencao: 'fa-triangle-exclamation', info: 'fa-circle-info', ok: 'fa-circle-check' };
export const ROTULO_AVISO = { urgente: 'Urgente', atencao: 'Atenção', info: 'Info', ok: 'Concluído' };

/**
 * Mapeamento de índice JS (0=Dom) para chave da grade
 */
export const DIA_MAP = { 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta' };

/**
 * Nomes dos dias da semana em português
 */
export const DIAS_SEMANA = {
  0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
  4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado',
};

/**
 * Nomes curtos dos dias para o cabeçalho da tabela
 */
export const DIAS_HEADER = { segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta' };

/**
 * Mapeamento de matéria para classe CSS do chip
 */
export const CHIP_CLASS = {
  'Matemática': 'chip-matematica', 'Física': 'chip-fisica', 'Português': 'chip-portugues',
  'História': 'chip-historia', 'Biologia': 'chip-biologia', 'Química': 'chip-quimica',
  'Inglês': 'chip-ingles', 'Filosofia': 'chip-filosofia', 'Sociologia': 'chip-sociologia',
  'Artes': 'chip-artes', 'Educação Física': 'chip-ed-fisica', 'Geografia': 'chip-geografia',
};

/* ============================================================
   2. BANCO DE DADOS UNIFICADO (localStorage)
   ============================================================
   Estrutura:
   { "tema": "dark"|"light", "grade": {...}, "anotacoes": [...] }
   ============================================================ */

export const DB_KEY = 'agendaEscolar:db_v1';

/** Lê o banco do localStorage */
export function lerDB() {
  let raw = null;
  try {
    raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // Banco corrompido: guarda uma cópia bruta antes que o próximo
    // salvamento o sobrescreva, para que os dados possam ser recuperados.
    try {
      if (raw) localStorage.setItem(`${DB_KEY}:corrompido`, raw);
    } catch (e2) { /* ignora */ }
  }
  return { tema: null, grade: null, anotacoes: [] };
}

/**
 * Persiste o banco no localStorage.
 * Se falhar (cota cheia, modo privado...), dispara o evento
 * "agenda:erro-storage" para a UI avisar o usuário.
 * @returns {boolean} true se salvou
 */
export function salvarDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    window.dispatchEvent(new CustomEvent('agenda:erro-storage', { detail: e }));
    return false;
  }
}

/** Atualiza um ou mais campos do banco e persiste */
export function atualizarDB(patch) {
  const db = lerDB();
  Object.assign(db, patch);
  salvarDB(db);
  return db;
}

/* ============================================================
   SANITIZAÇÃO — todo dado importado passa por aqui antes de ser salvo
   ============================================================ */

export const DIAS_VALIDOS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
const MAX_MATERIA = 40;
const MAX_TITULO = 80;
const MAX_CONTEUDO = 20000;
const MAX_NOTAS = 500;

/**
 * Normaliza uma grade: só dias válidos, somente strings,
 * exatamente HORARIOS.length posições por dia.
 */
export function sanitizarGrade(obj) {
  const grade = {};
  for (const dia of DIAS_VALIDOS) {
    const origem = Array.isArray(obj?.[dia]) ? obj[dia] : [];
    grade[dia] = HORARIOS.map((_, i) => {
      const v = origem[i];
      return typeof v === 'string' ? v.trim().slice(0, MAX_MATERIA) : '';
    });
  }
  return grade;
}

/** Normaliza a lista de anotações importada (descarta itens inválidos) */
export function sanitizarAnotacoes(lista) {
  if (!Array.isArray(lista)) return [];
  const agora = Date.now();
  const vistos = new Set();
  const out = [];

  for (const n of lista.slice(0, MAX_NOTAS)) {
    if (!n || typeof n !== 'object') continue;
    const titulo = typeof n.titulo === 'string' ? n.titulo.trim().slice(0, MAX_TITULO) : '';
    const conteudo = typeof n.conteudo === 'string' ? n.conteudo.trim().slice(0, MAX_CONTEUDO) : '';
    if (!titulo && !conteudo) continue;

    let id = typeof n.id === 'string' && /^[\w-]{1,40}$/.test(n.id) ? n.id : '';
    if (!id || vistos.has(id)) id = 'n' + agora.toString(36) + Math.random().toString(36).slice(2, 7);
    vistos.add(id);

    const criadoEm = Number.isFinite(n.criadoEm) ? n.criadoEm : agora;
    const atualizadoEm = Number.isFinite(n.atualizadoEm) ? n.atualizadoEm : criadoEm;
    out.push({ id, titulo, conteudo, criadoEm, atualizadoEm });
  }
  return out;
}

/* ---- Grade horária (estado em memória + persistência) ---- */

/** Retorna a grade atualmente carregada em memória (ou null) */
export function getGrade() {
  return GRADE;
}

/** Define a grade em memória e persiste no banco */
export function setGrade(novaGrade) {
  GRADE = novaGrade;
  atualizarDB({ grade: novaGrade });
}

/** Carrega a grade do banco unificado para a memória (chamar uma vez, no boot) */
export function carregarGradeDoStorage() {
  const db = lerDB();
  if (db.grade && typeof db.grade === 'object' && !Array.isArray(db.grade)) {
    GRADE = sanitizarGrade(db.grade);
    return true;
  }
  // Migração silenciosa da chave legada
  try {
    const legado = localStorage.getItem('agendaEscolar_grade_v1');
    if (legado) {
      const parsed = JSON.parse(legado);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        GRADE = sanitizarGrade(parsed);
        atualizarDB({ grade: GRADE });
        localStorage.removeItem('agendaEscolar_grade_v1');
        return true;
      }
    }
  } catch (e) { /* ignora */ }
  return false;
}

/** Valida a estrutura de um objeto de grade (antes de sanitizar) */
export function validarGrade(obj) {
  if (typeof obj !== 'object' || Array.isArray(obj) || !obj) {
    return { ok: false, erro: 'O campo "grade" deve ser um objeto.' };
  }
  for (const chave of Object.keys(obj)) {
    if (!DIAS_VALIDOS.includes(chave)) {
      return { ok: false, erro: `Chave inválida em grade: "${chave}".` };
    }
    if (!Array.isArray(obj[chave])) {
      return { ok: false, erro: `"grade.${chave}" deve ser um array.` };
    }
  }
  return { ok: true };
}

/**
 * Importa um banco completo (JSON) — aplica tema, grade e anotações.
 * Aceita também JSONs parciais (só grade, só anotações, etc.)
 * @param {object} obj
 * @param {(tema:string)=>void} aplicarTemaFn — callback para aplicar o tema visualmente
 */
export function importarBanco(obj, aplicarTemaFn) {
  if (typeof obj !== 'object' || Array.isArray(obj) || !obj) {
    return { ok: false, erro: 'O JSON deve ser um objeto.' };
  }

  // Valida tudo ANTES de alterar qualquer coisa (importação atômica)
  const temGrade = obj.grade !== undefined && obj.grade !== null;
  if (temGrade) {
    const r = validarGrade(obj.grade);
    if (!r.ok) return r;
  }
  const temTema = typeof obj.tema === 'string' && obj.tema;
  const temNotas = Array.isArray(obj.anotacoes);

  if (!temGrade && !temTema && !temNotas) {
    return { ok: false, erro: 'Nenhum campo reconhecido (esperado: tema, grade, anotacoes).' };
  }

  const db = lerDB();

  if (temGrade) {
    db.grade = sanitizarGrade(obj.grade);
    GRADE = db.grade;
  }
  if (temNotas) {
    db.anotacoes = sanitizarAnotacoes(obj.anotacoes);
  }
  if (temTema) {
    // aplicarTemaFn valida o id (ids desconhecidos viram o padrão) e persiste
    if (aplicarTemaFn) db.tema = aplicarTemaFn(obj.tema) || db.tema;
  }

  if (!salvarDB(db)) return { ok: false, erro: 'Não foi possível salvar (armazenamento cheio ou bloqueado).' };
  return { ok: true };
}

/** Exporta o banco completo como arquivo JSON */
export function exportarBanco() {
  const db = lerDB();
  if (GRADE) db.grade = GRADE;
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const hoje = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agenda_escolar_backup_${hoje}.json`;
  document.body.appendChild(a); // necessário em alguns navegadores (Firefox/Safari)
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---- Tema ----
   A lógica de aplicação/persistência do Style Theme escolhido
   vive em js/themes.js (carregarTema, aplicarTema, salvarTema,
   obterTemaAtual). Este módulo só guarda o dado no banco. */

/* ---- Anotações ---- */

/** Lê todas as anotações do banco */
export function obterAnotacoes() {
  const db = lerDB();
  return Array.isArray(db.anotacoes) ? db.anotacoes : [];
}

/** Salva a lista completa de anotações no banco */
export function salvarAnotacoes(notas) {
  atualizarDB({ anotacoes: notas });
}
