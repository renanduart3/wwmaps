# Três estilos oficiais

| Estilo | Quando escolher |
| --- | --- |
| `handdraw-simple` | Gráficos, rankings, comparações, mapas simples e leitura rápida. Fundo claro, traço preto, poucas anotações e bastante espaço vazio. |
| `editorial-data` | Estilo editorial principal: cards estatísticos com mapa/gráfico central, título forte, subtítulo, legenda, labels, métricas, callouts e ranking quando útil. Cores sólidas, composição limpa e fonte no rodapé. Prioridade para leitura dos dados; sem ceninhas narrativas ou multidões decorativas. |
| `micro-people-data` | População, comportamento, concentração e atividade humana. Grupos de personagens representam o fenômeno; não são decoração aleatória. Sem escala de pictogramas fornecida, a arte deve identificar que são uma metáfora qualitativa, não uma contagem. |

Você informa o estilo de cada item, ou um estilo padrão explícito para o lote. O Codex pode recomendar, mas não muda o estilo escolhido silenciosamente. Não existem mais dois modos oficiais playful/analytical no fluxo novo; aqueles pertencem aos estudos técnicos legados.

`editorial-data` substitui `editorial-detailed`. O nome antigo não é aceito em novos posts; revise a composição antes de migrar metadados, gere novamente os prompts e revise a imagem. O pacote Mercator legado continua identificado como legado no catálogo, sem atribuir a ele um estilo que não foi registrado.

## Layouts de editorial-data

São composições do mesmo estilo, não estilos adicionais. Declare em `visual.layout` no post, na terceira coluna de uma lista Markdown ou na coluna `layout` do CSV de entrada.

| Layout | Estrutura dos dados |
| --- | --- |
| `editorial-data-map` | Categorias ou intensidade por país, estado ou região; mapa com legenda e labels. |
| `editorial-data-ranking` | Distribuição geográfica mais lista ordenada fornecida na pesquisa. |
| `editorial-data-event-map` | Localizações de eventos com datas, contagens e marcadores. |
| `editorial-data-profile` | Pessoas ou perfis nomeados associados a países/regiões. |

O Codex escolhe a composição conforme os dados pesquisados, preservando o estilo informado. Mapas usam o layout map por padrão e rankings usam ranking. Eventos e perfis exigem escolha explícita; gráficos de barras/linhas podem usar o card padrão sem impor um mapa. Não inventar ranking, localização, retrato ou métrica para preencher o layout. Diretrizes: [docs/EDITORIAL-DATA-LAYOUTS.md](docs/EDITORIAL-DATA-LAYOUTS.md).

O **prompt é sempre em inglês**, mas a arte obedece ao idioma escolhido: todo o texto em inglês ou todo em PT-BR. Um post bilingue tem dois prompts e duas imagens. Os prompts são autossuficientes: título, subtítulo, textos exatos, dados, períodos, unidades, fontes e composição estão no próprio TXT.

Templates em `styles/prompt-templates.json`. Preserve o branco/off-white, tinta preta, roxo WWMaps e destaques crimson. A IA externa pode cometer erros em mapas, texto e números: revise a imagem recebida antes de agendar. O Codex prepara o prompt e não gera, redesenha ou converte a imagem editorial.
