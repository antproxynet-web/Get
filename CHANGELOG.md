# Changelog

## v6.2.0 — visual unificado

Todas as telas agora seguem a linguagem visual da Agenda (fundo escuro com brilho radial, superfícies lisas com borda fina, cantos de 22px, rótulos em caixa-alta, ícones em caixa e botões em pílula). Os 8 temas continuam funcionando.

- **Início:** cabeçalho editorial (dia + "Seu dia" + resumo), bloco Agora / A seguir, indicadores com barra de progresso, atalhos, semana, e duas colunas com compromissos + grade horária ao lado de aulas de hoje + materiais. O card "Próxima Aula" foi removido por repetir o bloco "A seguir".
- **Material:** cabeçalho editorial e blocos em grade com ícones de linha (no lugar dos emojis).
- **Ajustes:** categorias em painéis agrupados com linhas finas; "Sobre" reformulado.
- **Estrutura global:** topo, navegação inferior flutuante, tela de anotações, modais, FAB, editor da grade, seletor de temas, banner de atualização e aviso offline redesenhados.
- Novo kit compartilhado `.ui-*` em `css/components.css` e tokens `--ui-*` em `css/variables.css` (derivados das cores do tema).
- Botão "Importar" da grade deixou de ser vermelho (agora é contorno); apenas "Limpar" usa a cor de perigo.
- O banner "Nova versão" e o aviso offline não tinham estilo nenhum; agora têm.

## v6.1.0 — nova Agenda

- Agenda com layout novo: cabeçalho com a data, tira da semana clicável, indicadores, aulas do dia (com "Agora" e "A seguir") ao lado, avisos ordenados por prioridade em lista agrupada e anotações em blocos. Visual alinhado ao Perfil do CripSafe.
- Avisos usam ícones de linha e etiqueta de tipo no lugar dos emojis.
- Service worker: CSS, JS e HTML agora são buscados primeiro na rede (offline continua usando o cache), evitando que arquivos antigos fiquem presos no cache.

## v5.0 — revisão geral

### Segurança
- Nomes de matérias e demais textos agora são escapados antes de irem para o HTML (um backup JSON malicioso podia executar código).
- Importação de backup validada e normalizada (apenas strings, tamanhos limitados, ids de anotações únicos e seguros) e feita de forma atômica: se algo estiver inválido, nada é alterado.
- Pedido de confirmação antes de importar (substitui grade/anotações) e limite de 5 MB no arquivo.

### PWA / offline
- Corrigido: sem internet, abrir o app instalado (`index.html?utm_source=pwa`) mostrava a tela "offline" em vez do app.
- Fontes e Font Awesome (CDN) agora ficam realmente em cache (respostas opacas eram descartadas).
- Atualização coerente: o banner "Nova versão disponível" passou a funcionar e a página só recarrega quando o usuário aceita (antes recarregava sozinha e podia perder uma anotação em edição).
- Removido o "background sync" de mentira; corrigido o clique em notificações.
- Atalhos do manifest corrigidos ("Anotações" apontava para outra tela).

### Desempenho
- O relógio atualiza a cada segundo, mas o restante da interface só quando o minuto muda; pausa com a aba oculta.
- Troca de dia (meia-noite) redesenha tabelas e materiais automaticamente.

### Confiabilidade
- Horário de Brasília calculado com `Intl` (`America/Sao_Paulo`), correto em qualquer fuso do aparelho.
- Navegação rápida entre telas não causa mais condição de corrida.
- Falha ao gravar no `localStorage` agora avisa o usuário; banco corrompido é preservado em `agendaEscolar:db_v1:corrompido`.

### UX e acessibilidade
- Confirmação ao descartar anotação com texto não salvo e ao excluir.
- Foco volta ao botão de origem ao fechar o modal; título da aba muda por tela.
- Relógio não é mais anunciado por leitores de tela a cada segundo.
- Respeita "reduzir movimento" do sistema.
- Backup exportado com data no nome do arquivo.

### Limpeza
- Removidos 7 arquivos vazios de 1 byte (`views/J`, `css/J`, `js/6`, etc.).
- Adicionados `README.md` e este changelog.
