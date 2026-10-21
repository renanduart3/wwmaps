# Arquitetura e comparação com astrozod

## Fluxo vigente de conteúdo

`content/inbox/lista.md` → Codex pesquisa e preenche `content/visuals/<id>/post.json` → `prompt.<idioma>.txt` → o usuário gera e salva `image.<idioma>.png` → `npm run dev` mostra a prévia → usuário define status/data e faz commit + push → Actions/Pages publica após build. O workflow verifica novas datas a cada 15 minutos, depois da configuração externa. Guia em `docs/CONTENT-WORKFLOW.md`. Imagens editoriais não são mais produzidas por renderer local.

Os diagramas e comandos de briefings abaixo descrevem a camada legada preservada para o exemplo Mercator. `atlas run --brief` foi desativado; novos posts usam o contrato visual-post. O observatório/comparador mantêm seus gráficos locais independentes desse fluxo.

O relatório local `content/catalog.csv` é derivado dos posts, prompts e imagens por `apps/studio/src/content-catalog.ts`. CLI e preparação de dev/build atualizam o arquivo; não é servido publicamente nem é fonte de aprovação. O contrato visual-post centraliza os três estilos oficiais e os layouts opcionais de editorial-data.

O painel `/__studio/` é middleware dev-only em `apps/studio/local-plugin.mjs`, sem rotas Astro/Pages Functions. Sua API valida edições com o contrato Zod e grava posts locais; `apps/studio/src/local-editor.ts` mantém revisões e backups privados. CSV, backups e inbox de trabalho são ignorados pelo Git. Veja `docs/LOCAL-STUDIO.md`.

## O que foi observado no projeto de referência

O `astrozod` usa `@astrojs/cloudflare`, `wrangler deploy`, `main: dist/_worker.js/index.js` e `assets.directory: dist`. Essa configuração publica **Workers com assets**, apesar do conteúdo editorial ser majoritariamente estático. O projeto também tem contratos Zod, regras de publicação centralizadas, instruções para agentes e um `ai-feed.json`.

O Atlas mantém **Cloudflare Pages** conforme a proposta, com **Pages Functions** para os endpoints. As Functions executam no runtime dos Workers; não é necessário um Worker separado para uma API pequena vinculada ao site. Um serviço separado passa a fazer sentido para cron, consumidores de filas ou tarefas independentes do ciclo de publicação.

```text
Pesquisa do operador/agente
  -> briefs/research/*.json (fontes, claims, dados)
  -> packages/ai (Ollama local, saída estruturada)
  -> briefs/queue/*.json (texto editorial)
  -> apps/studio (render + validação)
  -> content/posts/<id> (draft)
  -> revisão editorial + publish
  -> apps/web build
     -> HTML / imagens / ai-feed.json / llms.txt -> Pages
     -> functions/api/* -> Workers runtime
```

## Responsabilidades

| Camada | Responsabilidade |
| --- | --- |
| `apps/studio` | Comandos locais, arquivos, geração e publicação editorial |
| `packages/contracts` | Zod e tipos; JSON schemas exportados em `schemas/` |
| `packages/ai` | Ollama em loopback, timeout, schema e validação do texto gerado |
| `packages/content-engine` | Montagem do artigo Markdown e legenda |
| `packages/prompts` | Prompt visual salvo junto ao conteúdo |
| `packages/renderer` | Render programático SVG, PNG e WebP |
| `packages/validator` | Arquivos, referências, citações e números explícitos |
| `packages/content-store` | Leitura tipada, slugs únicos, drafts e agendamento |
| `apps/web` | Site Astro, componentes reutilizáveis, feed e busca |
| `apps/web/functions/api` | Health e busca JSON sobre o feed público |

O build falha ao encontrar um pacote público inválido. Ele não oculta silenciosamente erros. Drafts e publicações futuras ficam fora da produção e dos feeds; o servidor Astro de desenvolvimento permite revisá-los. Publicações agendadas aparecem no próximo build após a data, portanto precisam de um novo deploy ou de um deploy hook agendado.

## Cloudflare Pages

Arquivo: `apps/web/wrangler.jsonc`.

- Nome inicial: `atlas-studio`; ajuste para o nome do seu projeto Pages.
- Diretório de execução do Wrangler: `apps/web`.
- Output: `apps/web/dist`.
- `_routes.json` limita o Worker a `/api/*`; os arquivos estáticos são servidos diretamente.
- `/api/health`: status do serviço.
- `/api/search?q=mercator`: até vinte entradas públicas do feed; não chama modelos.
- `/ai-feed.json`: metadados, fontes e texto dos artigos publicados.
- `/llms.txt`: índice navegável para agentes; não representa uma garantia de indexação por serviços de IA.

O caminho de deploy preparado e verificável deste repositório é **Wrangler**, executado em `apps/web` pelo workspace. Isso mantém `functions/`, `wrangler.jsonc` e `dist/` no mesmo diretório de projeto. Crie um projeto Pages com Direct Upload na sua conta, ajuste `name` e faça o primeiro deploy pela CLI. A configuração antiga de apenas conectar o output estático da raiz no dashboard não incluiria automaticamente as Functions desta subpasta.

Para publicar pelo GitHub, o workflow `Deploy Pages` em `.github/workflows/deploy.yml` aceita execução manual, push para main/master e verificação de datas a cada 15 minutos. Configure os secrets `CLOUDFLARE_API_TOKEN` (permissão de edição de Pages na conta escolhida) e `CLOUDFLARE_ACCOUNT_ID`, além da variável `PUBLIC_SITE_URL` e do projeto Pages. Sem credenciais, o deploy é pulado. Em execuções agendadas, compara o estado público com o último deploy bem-sucedido e evita publicação repetida sem alterações. Usa o mesmo comando Wrangler do deploy local. Veja `docs/CONTENT-WORKFLOW.md` para limites de horário e configuração inicial.

```powershell
npm ci
npm run preview
# Site + APIs: http://localhost:8788
# Só após configurar o projeto/conta:
npx wrangler login
npm run deploy
```

Defina `PUBLIC_SITE_URL` com o domínio real **durante o build**, para URLs canônicas e metadados absolutos. Em PowerShell: `$env:PUBLIC_SITE_URL = "https://seu-dominio.com"`.

Não há D1/R2/KV fictícios nem credenciais no repositório. Adicione bindings somente quando houver uma funcionalidade que os use. Pesquisa, modelos e renderização continuam locais. Workers AI seria inferência remota, inclusive em desenvolvimento, e não está habilitado.

## Limites atuais

- A pesquisa web ainda é feita pelo operador ou por um agente com acesso à web.
- A IA local redige a partir de evidências fornecidas; ela não confirma as fontes.
- O Studio renderiza fronteiras generalizadas Natural Earth em Mercator/Gall–Peters; o asset publicado antigo ainda representa uma grade e aguarda substituição revisada.
- A verificação de números usa tokens numéricos explícitos. Não prova equivalência semântica, arredondamentos, cálculos, números por extenso ou correção de unidades.
- `reviewed` é uma declaração do revisor. Se texto, dados ou imagens mudarem, revise novamente.

Próximas extensões úteis: conector de pesquisa com snapshots, novos renderers de dados e aprovação vinculada ao hash do pacote. Essas extensões podem usar os contratos existentes sem colocar inferência no site público. `styles/map-style-guide.json` e `docs/MAP-STYLE.md` descrevem a composição ilustrada sobre geografia real já implementada para comparação de projeções.

Referências: [configuração de Pages](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/).

## Camada de dados e visuais

`datasets/*.json` alimenta o observatório e a coleção. `scripts/validate-dashboard.ts` valida contratos e referências antes de cada dev/build; `prepare.ts` publica cópias em `/data/`. `lib/atlas.ts` projeta a geometria Natural Earth no build e `/maps/*.svg` entrega miniaturas estáticas. O navegador recebe apenas dados e JavaScript de interação (sem D3/TopoJSON). Veja `docs/DATA.md` para limites do mock, importação futura e unidades.

## Comparações

`Comparison.astro` serve as páginas `/compare/` e `/pt-br/comparar/`. A seleção e exportação acontecem no navegador com os mesmos dados estáticos; não usam APIs, IA ou armazenamento externo. `lib/comparison.ts` valida a seleção e produz linhas de dados e CSV. `comparison-model.ts` organiza presets, busca e séries com lacunas; `comparison-visual.ts` compõe SVG/PNG e `comparison-export.ts` carrega jsPDF sob demanda para o PDF direto. Tabela, todos os anos, compartilhamento e testes estão em `docs/COMPARISON.md`. O domínio canônico padrão é `https://wwmaps.com`; isso não configura DNS nem publica o site. O checklist de idiomas, infraestrutura e evolução do produto está em `ROADMAP.md`.

## Contrato de planejamento editorial

`taxonomy.ts` centraliza 11 categorias, quatro tipos funcionais, oito mapas e finalidades comerciais. O plano aceita todo o catálogo; o briefing executável restringe `mapType` ao renderer implementado. O motor propaga metadados para o post e o prompt. O renderer valida capacidade antes de desenhar. `docs/EDITORIAL-SYSTEM.md` descreve a migração, aliases legados e a diferença entre os mocks da web e o pipeline editorial.

## Localização e identidade

`docs/LOCALIZATION.md` documenta as rotas EN/PT-BR, o catálogo de traduções, a preservação de seleção via URL e a fonte servida localmente. A home inglesa é `/`; PT-BR fica em `/pt-br/`. As páginas compartilham componentes; o build gera os dois idiomas. `site:verify` confere links locais e metadados dos arquivos gerados. Artigos só expõem traduções existentes e aprovadas no pacote editorial.

## Importação de dados

`scripts/import-worldbank.ts` faz a coleta local paginada. `scripts/lib/worldbank.ts` valida observações e transforma unidades sem imputar lacunas. A procedência e a revisão por série são contratos em `packages/contracts/src/dashboard.ts`. Originais ficam em `datasets/raw/worldbank/<snapshot>`; candidatos separados em `datasets/candidates/`. O prepare publica cópias para revisão noindex, sem alterar o mock ativo. Veja `docs/DATA-IMPORT-REPORT.md` para os limites de cobertura e a aprovação pendente.
