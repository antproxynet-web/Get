# Agenda Escolar Inteligente

PWA para estudantes do ensino médio organizarem a semana: grade horária, aula atual e próxima em tempo real, materiais do dia, anotações e 8 temas visuais. Funciona offline e pode ser instalado no celular.

Feito com HTML, CSS e JavaScript puro (ES modules) — sem framework, sem build, sem backend. Os dados ficam no `localStorage` do aparelho.

## Rodando localmente

Por usar ES modules e `fetch`, o projeto precisa de um servidor HTTP (abrir o `index.html` direto pelo arquivo não funciona):

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

## Publicando no GitHub Pages

Settings → Pages → Deploy from a branch → `main` / `(root)`.

## Estrutura

```
index.html        casca do app (header, navegação, overlays)
manifest.json     configuração de instalação (PWA)
sw.js             service worker (cache e modo offline)
offline.html      página de fallback sem conexão
views/            HTML de cada tela (Início, Agenda, Material, Ajustes)
js/               app.js, router.js, storage.js, ui.js, themes.js, utils.js
js/views/         lógica de cada tela
css/              estilos modulares, temas e telas (kit compartilhado .ui-* em components.css)
assets/icons/     ícones do app
```

## Backup (JSON)

Em **Ajustes** é possível exportar/importar um backup:

```json
{
  "tema": "dark",
  "grade": {
    "segunda": ["Matemática", "Física", "", "", "", ""],
    "terca": [], "quarta": [], "quinta": [], "sexta": []
  },
  "anotacoes": [
    { "id": "n1", "titulo": "Título", "conteudo": "Texto", "criadoEm": 0, "atualizadoEm": 0 }
  ]
}
```

Campos são opcionais. Na importação, tudo é validado e normalizado (apenas texto, máx. 40 caracteres por matéria, 6 aulas por dia).

## Configuração

- **Horários das aulas e matérias:** `js/storage.js` (`HORARIOS`, `MATERIAIS`, `CHIP_CLASS`).
- **Novo tema:** adicione uma entrada em `js/themes.js` e o bloco `[data-theme="id"]` em `css/themes.css` (também na lista `TEMAS_VALIDOS` do `index.html`).
- **Atualizar o app para os usuários:** altere `SW_VERSION` em `sw.js` a cada deploy.
