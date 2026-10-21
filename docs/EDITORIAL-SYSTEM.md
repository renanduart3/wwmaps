# Sistema editorial WWMaps — revisão e contrato

**Direção vigente:** imagens externas, três estilos em `visual-styles.md` e posts simples conforme `docs/CONTENT-WORKFLOW.md`. O catálogo de categorias continua útil. As restrições de renderer/briefing descritas abaixo são da camada legada; não bloqueiam prompts para mapas e gráficos gerados fora. Não precisamos implementar oito renderers locais para esse fluxo.

O projeto agora organiza cada pauta por eixos independentes. A fonte de verdade é `packages/contracts/src/taxonomy.ts`; `schemas/editorial-catalog.json` é a cópia exportada para agentes. Atualize com `npm run schemas`.

## Categorias e finalidade

| ID | Categoria | Prioridade inicial | Potencial editorial/comercial |
| --- | --- | --- | --- |
| geography | Geografia e Demografia | Sim | Compartilhamento |
| history | História e Civilizações | Sim | Compartilhamento e produtos |
| economy | Economia e Desenvolvimento | Sim | Compartilhamento e B2B |
| geopolitics | Geopolítica e Política | Sim | Compartilhamento |
| culture | Religião e Cultura | Sim | Compartilhamento e educação |
| environment | Meio Ambiente e Recursos Naturais | Sim | Compartilhamento e educação |
| society | Sociedade e Qualidade de Vida | Não | Compartilhamento |
| technology | Tecnologia e Infraestrutura | Não | Nicho e B2B |
| brazil | Brasil e Regiões | Não | Público brasileiro |
| regional-intelligence | Inteligência Comercial Regional | Não | B2B |
| travel | Viagens e Turismo | Não | Produtos e afiliados |

Prioridade é orientação editorial, não bloqueio de assunto. Potencial não promete desempenho, receita ou viralização. Os rótulos estão cadastrados em inglês e PT-BR. `/categorias/` apresenta o catálogo; o filtro da home usa IDs estáveis, sem depender do texto traduzido.

`commercialPurpose` aceita `audience-growth`, `education`, `products`, `affiliates`, `b2b`. É intenção da pauta. O campo existente `monetization` continua sem oferta nos pacotes gerados; intenção comercial não cadastra produtos, adiciona CTA nem publica automaticamente.

## Tipos funcionais

| contentType | Objetivo |
| --- | --- |
| map-analysis | Explicar um fenômeno com mapas |
| statistical-geography | Apresentar indicadores por região |
| regional-intelligence | Analisar dados regionais e oportunidades comerciais |
| comparative-insight | Comparar países, regiões, períodos ou indicadores |

`regional-intelligence` pode ser uma categoria e um tipo funcional, com significados separados pelo nome do campo. Categoria não seleciona um template de artigo nem determina o formato do mapa.

## Formatos e disponibilidade real

| mapType | Web atual | Studio atual | O que falta |
| --- | --- | --- | --- |
| choropleth | Demo funcional | Não implementado | Contrato de dados editoriais + render de assets para posts |
| highlight | Não implementado | Não implementado | Seleção temática e legendas; borda de país selecionado no painel não é esse template |
| bubble | Não implementado | Não implementado | Coordenadas e círculos com área proporcional |
| flow | Não implementado | Não implementado | Origem/destino, magnitude e rotas |
| historical-timeline | Não implementado | Não implementado | Geometrias históricas por período; animar um indicador em países atuais não reconstrói fronteiras |
| projection-comparison | Exibe o asset legado esquemático | Implementado com geografia real | Studio usa Natural Earth em Mercator/Gall–Peters, SVG/PNG/WebP e dois modos ilustrados; falta revisar e substituir o asset publicado |
| comparative | Parcial | Não implementado | Comparador por barras e CSV/JSON já existe; dois mapas sincronizados ainda não |
| regional-heatmap | Não implementado | Não implementado | Geometrias regionais, método de densidade, escala e cobertura |

Os oito nomes existem no planejamento. Isso não significa que oito renderers estejam prontos. O briefing executável aceita apenas `projection-comparison` por enquanto e o renderer verifica esse formato antes de gerar arquivos. O alias legado `visualizationType` continua para compatibilidade e tem o mesmo único valor permitido. Não amplie esse enum sem implementar e verificar o renderer correspondente.

Barras, ranking, séries históricas e indicadores destacados são elementos auxiliares de composição. Não substituem um formato cartográfico faltante.

## Planejar com IA

Exemplo válido em `briefs/plans/gdp-per-capita.json`:

```json
{
  "topic": "Countries with the highest GDP per capita",
  "category": "economy",
  "contentType": "statistical-geography",
  "mapType": "choropleth",
  "geographicScope": "world",
  "commercialPurpose": ["audience-growth", "b2b"],
  "languages": ["en", "pt-BR"],
  "outputs": ["website-visual", "instagram-image", "instagram-caption"]
}
```

`website-visual` acompanha o produto atual de posts visuais. `website-article` também existe para pautas que precisam de texto longo. O plano aceita ambos; isso não cria outro template de artigo por categoria.

```powershell
npm run plan:validate -- briefs/plans/gdp-per-capita.json
```

Esse comando valida o plano e informa disponibilidade. Não faz pesquisa, não converte o plano em briefing e não gera assets. Antes de executar, reúna fontes, claims e dados em `briefs/research/`, verifique disponibilidade e prepare o briefing de execução. Os campos `contentType`, `mapType`, `geographicScope` e `commercialPurpose` seguem para os metadados do pacote e o prompt visual. Pacotes antigos recebem defaults compatíveis ao serem lidos; os arquivos históricos não são reescritos automaticamente.

Para os outputs, o pipeline legado usa `distribution: ["site", "instagram"]`: `website-*` corresponde a site e `instagram-*` a Instagram. A seleção individual de saídas ainda precisa ser integrada; atualmente o pipeline gera artigo, legenda e assets do único template. A entrada do plano é um contrato distinto do briefing de execução.

Prompt de operação:

> Leia AGENTS.md, docs/EDITORIAL-SYSTEM.md e schemas/editorial-catalog.json. Proponha sete pautas originais, priorizando geografia, economia e história, com fontes primárias verificáveis e potencial de compartilhamento. Para cada pauta, escolha categoria, contentType, mapType, geographicScope, commercialPurpose, idiomas e outputs de forma independente. Salve planos distintos em briefs/plans e valide. A preferência pelas seis categorias iniciais não proíbe temas nas demais. Pesquise e registre evidências antes de redigir afirmações. Se o renderer necessário não existe, informe a dependência e deixe a pauta planejada. Não transforme todo assunto em Mercator. Deixe os pacotes gerados em draft para revisão.

A escolha de pautas e pesquisa por um agente continua sendo um fluxo operado localmente, não um comando autônomo que já busca e produz sete publicações. A integração Ollama atual redige a partir de pesquisa fornecida. Ela não navega nem recolhe fontes por conta própria.

## Identidade visual e pendências

A web usa roxo, bege e crimson e títulos condensados, fortes e itálicos. `styles/map-style-guide.json` define os modos playful-editorial e analytical-editorial, consumidos pelos prompts e pelo Studio. O renderer usa geografia real com acabamento ilustrado; assets do exemplo publicado permanecem legados até revisão. Veja `docs/MAP-STYLE.md` para regras de sensibilidade, prévias e limites. A fonte da web é Barlow Condensed licenciada; sua incorporação portátil ao renderer ainda está pendente.

A galeria demonstrativa não é o motor editorial: usa `datasets/visuals.json` e herda categoria do indicador. Para publicações reais combinando múltiplos indicadores, o esquema da galeria precisará referenciar o pacote editorial e seu `mapType`, em vez de inferir tudo pelo indicador.

Próxima ordem recomendada de implementação: choropleth para pacotes editoriais, highlight, comparative com dois mapas, bubble, flow, histórico territorial, heatmap regional. Cada etapa precisa de schema de dados, legenda, fonte, cobertura, caso demonstrativo e exportação. O comparador existente continua útil como visual auxiliar.
