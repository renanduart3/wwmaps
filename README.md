# WWMaps · estúdio local

Estúdio editorial local com site Astro no Cloudflare Pages e APIs em Pages Functions (runtime Workers). O Codex prepara pesquisa, textos e prompts nos arquivos locais; você gera as imagens editoriais numa IA externa.

## Começar

Node.js **22.19+** e npm. Na raiz do projeto:

```powershell
npm ci
npm run dev
```

Site: `http://localhost:4321`. O desenvolvimento inclui rascunhos para revisão; o build público exclui drafts e posts futuros.

```powershell
npm run preview
```

Site com APIs Cloudflare locais: `http://localhost:8788`. Nenhum deploy é feito por `dev`, `build` ou `preview`.

## Catálogo de conteúdos

Com `npm run dev`, abra **http://127.0.0.1:4321/__studio/**. O painel permite criar pautas, editar células, selecionar conteúdos e alterar estilo/categoria/layout/status/data em massa. Salva nos posts locais, com validação e backups. O painel e sua API não existem no build público nem em `npm run preview`.

O relatório `content/catalog.csv` é local e ignorado pelo Git. Os posts e imagens continuam versionados para publicação. Guias: [painel local](docs/LOCAL-STUDIO.md) e [catálogo CSV](docs/CONTENT-CATALOG.md).

## Comparar países

O comparador avançado está em `/compare/` e `/pt-br/comparar/`, com busca de países, presets, séries históricas, tabela e exportações CSV/JSON/SVG/PNG/PDF direto. Veja [docs/COMPARISON.md](docs/COMPARISON.md) para escopo, testes e limites dos dados demonstrativos.

## Criar conteúdo — fluxo atual

1. Coloque sua lista em `content/inbox/assuntos.md`, indicando um dos três estilos em cada item.
2. Peça ao Codex: **“Rode a análise de conteúdos desse arquivo, pesquise e prepare os posts e prompts. Não gere imagens.”**
3. Copie cada `prompt.en.txt` para sua IA externa e salve a imagem recebida como `content/visuals/<id>/image.en.png`.
4. Veja a prévia com `npm run dev`. Edite o `post.json`, revise e escolha status/data.
5. Faça commit e push. O workflow preparado publica no Pages após a data, quando a infraestrutura estiver configurada.

Estilos oficiais: **handdraw-simple**, **editorial-data**, **micro-people-data**. Prompt em inglês, arte no idioma escolhido. PT-BR usa seu próprio prompt e imagem.

Guia prático: [docs/CONTENT-WORKFLOW.md](docs/CONTENT-WORKFLOW.md). Catálogo: [visual-styles.md](visual-styles.md). Operação do agente: [docs/AI.md](docs/AI.md).

### Comandos

`npm run content:analyze -- --input content/inbox/assuntos.md --style handdraw-simple` cria rascunhos sem sobrescrever. O Codex continua a pesquisa e preenche os metadados; esse comando sozinho não pesquisa.

`npm run content:prompts -- --all` gera os prompts finais dos itens pesquisados. `npm run content:check` confere prontidão. Nenhum dos comandos gera imagens.

Novos posts usam só `post.json`, `prompt.<idioma>.txt` e a imagem que você salvar. Os pacotes antigos em `content/posts` foram preservados; `atlas run --brief` não produz mais imagens. Não é necessário Ollama no fluxo atual.

### Agendamento

Use `status: "scheduled"` e, por exemplo, `publishAt: "2026-12-01T09:00:00-03:00"`. Drafts/futuros aparecem no desenvolvimento e ficam fora do site público. Um site estático precisa de novo build: o workflow faz deploy no push e verifica novas datas a cada 15 minutos. GitHub pode atrasar; commit sem push não publica. Ativação de Pages/Actions/secrets/domínio ainda pendente.

### Verificação

`npm run check`, `npm test`, `npm run content:check`, `npm run build`, `npm run site:verify`. Nenhuma chamada de IA acontece no browser ou nos endpoints públicos. Dados sintéticos do observatório não são fontes para posts reais.

## Observatório visual

A página inicial agora contém mapa mundial interativo, seis indicadores, histórico por país, animação de anos e alternância de indicadores. Abaixo, a galeria tem quatro visuais por linha no desktop, filtros, busca e paginação; a lateral e `/produtos/` exibem a coleção demonstrativa.

Edite `datasets/indicators.json`, `datasets/visuals.json` e `datasets/products.json`. Consulte [docs/DATA.md](docs/DATA.md) para contratos, fontes oficiais, unidades e prompts de manutenção com IA. Execute `npm run data:validate`. Dados e produtos atuais são fictícios e estão identificados na interface.

## Próximas etapas — WWMaps

O plano atualizado está em [ROADMAP.md](ROADMAP.md). A marca passa a ser WWMaps (`wwmaps.com`). O comparador está disponível em `/compare/` (inglês) e `/pt-br/comparar/` (português), com até cinco países, CSV, JSON e impressão/PDF. A home agora é inglesa em `/`, com equivalente em `/pt-br/`. Os pacotes e comandos internos mantêm os nomes `atlas` para preservar o fluxo existente.

## Sistema editorial e formatos

As categorias e formatos estão em [docs/EDITORIAL-SYSTEM.md](docs/EDITORIAL-SYSTEM.md). O fluxo atual usa prompts e imagens externas; as restrições dos renderers antigos não se aplicam a ele.


## Interface bilingue

A etapa 2 está descrita em [docs/LOCALIZATION.md](docs/LOCALIZATION.md), incluindo rotas, traduções centralizadas, fonte licenciada, SEO e limites da verificação assistiva. `npm run site:verify` confere o site após o build.


## Dados oficiais candidatos

A etapa 3 está em [docs/DATA-IMPORT-REPORT.md](docs/DATA-IMPORT-REPORT.md). `npm run data:import` prepara um candidato sem alterar o mock ativo. `npm run data:verify-candidate` confere a rastreabilidade. Há 215 países/economias no snapshot inicial; a aprovação editorial para ativação está pendente.
