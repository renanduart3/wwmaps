# Tabela de conteúdos

Para consultar e editar dentro da plataforma, execute `npm run dev` e abra `http://127.0.0.1:4321/__studio/`. O [painel local](LOCAL-STUDIO.md) permite edição de células e em massa, grava nos posts e não entra na versão online. Você também pode abrir `content/catalog.csv` no Excel, LibreOffice ou editor de texto. É um relatório local, com uma linha por postagem, gerado a partir de `content/visuals/<id>/post.json`, prompts e imagens. Inclui os pacotes antigos de `content/posts`, identificados como legado. Os visuais sintéticos do observatório e produtos demonstrativos não são posts produzidos e não entram no catálogo.

Formato: CSV UTF-8 com BOM, separador ponto e vírgula, campos entre aspas. Se o Excel não separar as colunas automaticamente, use Dados → De Texto/CSV, UTF-8 e ponto e vírgula. Fórmulas não são usadas; textos que poderiam ser interpretados como fórmulas recebem proteção.

## Colunas

| Colunas | Significado |
| --- | --- |
| `id`, `titulo`, `titulo_pt_br` | Identificação estável e títulos disponíveis. |
| `origem`, `categoria` | Fluxo novo ou legado e categoria editorial. |
| `estilo_editorial` | handdraw-simple, editorial-data ou micro-people-data. Legados sem estilo registrado permanecem explicitamente sem classificação oficial. |
| `layout_visual`, `tipo_visual` | Composição editorial e tipo de mapa/gráfico. |
| `idiomas` | Idiomas realmente declarados. |
| `etapa_producao`, `produzido` | Estado de produção calculado a partir dos arquivos. |
| `status_configurado`, `publicacao_no_build`, `data_publicacao` | Status do post, efeito no próximo build e data com fuso. Não confirmam deploy no site. |
| `prompts`, `imagens`, `pendencias` | Situação por idioma e ações ainda necessárias. |
| `pasta`, `fontes` | Local dos arquivos e URLs pesquisadas. |

Etapas: `planejado` → `em-pesquisa` → `prompts-pendentes` → `aguardando-imagens` → `aguardando-revisao` → `producao-completa`. Erros aparecem como `corrigir-arquivos` ou `corrigir-metadados`. Algumas etapas podem ser puladas ao concluir vários requisitos juntos.

`produzido: sim` significa pesquisa e campos necessários completos, prompts atuais e arquivos de imagem estruturalmente válidos em todos os idiomas. Não garante que os números ou mapas desenhados pela IA estejam corretos. Um draft produzido continua aguardando sua revisão. Somente você define status/data. Agendado com data vencida e pacote válido fica `elegivel-para-build`; a tabela não consulta Cloudflare nem confirma publicação online.

Essa checagem de produção se aplica ao fluxo novo (`origem: visual`). No legado, `produzido-legado` registra a presença do asset principal; não certifica os requisitos novos de estilo, pesquisa ou prompt. A pendência de classificação/revisão fica explícita na mesma linha.

## Atualizar

```powershell
npm run content:catalog
```

`content:analyze`, `content:prompts`, `content:check` e a preparação de `dev`/`build` também atualizam a tabela. Se salvar uma imagem ou editar JSON enquanto o site já estiver rodando, execute `content:catalog` novamente para atualizar o relatório; a prévia do site continua atualizando normalmente.

O CSV é uma visão gerada: editar suas células não altera os posts, e uma nova geração substitui essas edições. Mantenha alterações de conteúdo/estilo/data no `post.json`. A saída é determinística e não regrava quando nada mudou. O catálogo é ignorado pelo Git; os post.json e imagens que alimentam a publicação continuam versionados. Para editar sem mexer no JSON manualmente, use o painel local.

## Declarar pautas em tabela

Você pode continuar com a lista Markdown ou copiar `content/inbox/template.csv` para `content/inbox/assuntos.csv` e preencher:

```csv
topic;style;layout;kind;category
Countries by GDP per capita;editorial-data;editorial-data-ranking;ranking;economy
Social media by region;micro-people-data;;map;culture
GDP growth over time;handdraw-simple;;line-chart;economy
```

São exemplos de estrutura, não pautas pesquisadas. `topic` é obrigatório e `style` deve vir por linha ou por `--style`. `layout`, `kind` e `category` são opcionais. Quando ausentes, kind começa como map e category como geography, sujeitos à classificação do agente durante a pesquisa. Os quatro layouts especializados só podem ser usados com editorial-data.

```powershell
npm run content:analyze -- --input content/inbox/assuntos.csv
```

O comando cria rascunhos e inclui as pautas no catálogo como planejadas. Não pesquisa nem gera imagens. O Codex continua a pesquisa e completa os posts. Itens existentes não são sobrescritos: para alterar seu estilo ou composição, edite o post e regenere os prompts. A tabela acompanha o conteúdo efetivamente declarado em pastas; linhas de uma inbox ainda não analisada não aparecem como posts.
