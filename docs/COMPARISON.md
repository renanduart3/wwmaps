# Comparador avançado — etapa 4

Tudo nesta etapa funciona localmente e em arquivos estáticos. Não exige repositório remoto, domínio, credenciais, Cloudflare configurado ou serviço de IA. As rotas são `/compare/` e `/pt-br/comparar/`. O observatório ativo continua **mock**; o candidato oficial da etapa 3 permanece separado e pendente de revisão.

## Uso

1. Busque países pelo nome localizado ou código ISO. A busca ignora acentos.
2. Selecione de um a cinco países. Os selecionados aparecem também em botões removíveis, mesmo quando a busca os oculta. O último país não pode ser removido.
3. Escolha o ano das barras. Cada indicador mantém sua unidade e sua própria escala.
4. Escolha o indicador do histórico. Todos os países usam a mesma escala vertical nesse gráfico, de zero ao maior valor selecionado em todo o período. Não há normalização, nota geral nem soma de unidades diferentes.
5. Consulte a tabela. A opção de todos os anos amplia a tabela e os dados exportados em CSV/JSON/PDF.
6. Copie o link ou troque EN/PT-BR. Países, ordem, ano, indicador histórico e opção de todos os anos permanecem na URL. A cópia possui campo alternativo selecionável caso o navegador negue acesso ao clipboard.

As linhas do histórico não conectam valores ausentes nem anos não consecutivos. Zeros e pontos isolados continuam visíveis. As séries usam cores e padrões de traço distintos, com legenda e uma alternativa tabular. Em telas pequenas o gráfico e a tabela rolam horizontalmente; ambos podem receber foco por teclado.

### Presets explícitos

- BRICS **original**: Brasil, Rússia, Índia, China, África do Sul.
- Amostra G7: Estados Unidos, Canadá, Alemanha, França, Japão. Não representa os sete integrantes.
- Amostra América do Sul: Brasil, Argentina, Chile. São três países disponíveis na demonstração; não representa o continente completo.

Cada preset substitui a seleção atual e pode ser editado. Se faltar algum país definido no preset, o botão fica indisponível; o código não troca países nem trunca uma seleção silenciosamente. As definições são editoriais fixas, não um cadastro atualizado de membros de organizações.

## Exportações

| Formato | Conteúdo |
| --- | --- |
| CSV | Todos os seis indicadores para os países e ano selecionados; todos os anos quando solicitado. Valores numéricos originais sem arredondamento de exibição, null vazio, proveniência completa por linha, BOM UTF-8 e proteção contra fórmulas de planilha. |
| JSON | Mesmas observações, null explícito, locale, países, ano, indicador histórico, período e data de geração. |
| SVG / PNG | Seis painéis de barras do ano selecionado, histórico escolhido, legenda de países, unidades, marca, data de geração e todas as referências de fonte. SVG independente; PNG 1440 px de largura. |
| PDF direto | A4 paisagem com uma página por indicador: barras do ano escolhido, histórico, tabela e rodapé. Na base atual são seis páginas; mais de quinze anos por tabela criam páginas adicionais de até quinze linhas de anos. Textos e tabela nativos, gráfico em PNG, fontes, unidades, aviso e paginação. |
| Imprimir | Impressão do HTML pelo diálogo do navegador; cabeçalho da tabela repetível, controles ocultos e tabela inteira sem limite de rolagem. O navegador determina a paginação. |

As exportações capturam a seleção ao clicar: alterações durante a geração não mudam esse arquivo. O nome inclui o modo dos dados, códigos dos países, ano e idioma. O sufixo `all-years` vale para CSV/JSON/PDF; PNG/SVG sempre usam o ano das barras e o histórico completo do indicador escolhido. A data de geração não é a data de coleta da fonte.

CSV/JSON preservam os campos de proveniência adicionados na etapa 3, inclusive quando usados pelos candidatos. Os visuais do comparador são destinados ao dataset ativo mock; a futura ativação oficial precisa adaptar avisos, atribuição/licença e fontes em conjunto com a etapa 3. Não substitua o mock somente para mostrar mais países.

O PDF usa Helvetica padrão para texto e não depende de fontes remotas. A tipografia do site continua Barlow Condensed hospedada localmente; os exports priorizam texto e números portáveis. PDF não é marcado para acessibilidade (PDF/UA); a tabela HTML é a alternativa acessível. O texto de exibição é arredondado a duas casas, os dados CSV/JSON mantêm precisão. A comparação de PIB e PIB per capita é nominal: veja as definições e limites dos indicadores.

## Implementação

- `comparison-model.ts`: presets, busca, séries com lacunas e escopo dos dados.
- `comparison-client.ts`: seleção, URL, tabelas e interações.
- `comparison-visual.ts`: gráficos SVG e composição do export visual.
- `comparison-export.ts`: downloads e PDF com jsPDF carregado sob demanda. Não carrega Sharp, filesystem ou Ollama no browser.
- `compare-i18n.ts`: textos EN/PT-BR desta ferramenta, ao lado do catálogo geral `i18n.ts`.

Referência da API usada: [jsPDF](https://parallax.github.io/jsPDF/docs/jsPDF.html) e [addImage](https://parallax.github.io/jsPDF/docs/module-addImage.html).

## Repetir a verificação

```powershell
npm test
npm run check
npm run build
npm run site:verify
npm run preview -w @atlas/web
```

O teste de navegador foi escrito para a API CUA disponível no Codex; não instala nem abre um navegador por um driver de shell. Com o preview em execução, o agente pode executar no CUA REPL:

```javascript
var tab = await cua.createBrowserTab('iab', 'http://localhost:8788/compare/', {visible:false});
var checks = await import('file:///C:/Users/renan/Documents/ChatGPT/wwmaps/tests/browser/comparison.cua.mjs');
await checks.selectionChecks(tab);
await checks.downloadChecks(tab, 'C:/Users/renan/Documents/ChatGPT/wwmaps/output/comparison-checks');
await checks.printChecks(tab);
```

Seleção e downloads rodam em sequência: o primeiro teste termina no idioma português e com a amostra G7, ano 2015, histórico de PIB per capita e todos os anos. O segundo verifica os cinco downloads e grava `browser-results.json`. O terceiro verifica o botão e as regras CSS de impressão. Acionar a impressão nativa durante a revisão bloqueou o canal de automação; a aba de teste foi encerrada. A homologação visual do diálogo do sistema e uma impressora física não são cobertas por CUA e permanecem pendentes no roadmap. O PDF direto foi baixado e validado independentemente desse diálogo.

`scripts/verify-comparison-downloads.py` faz uma conferência independente das 450 linhas CSV/JSON contra o dataset ativo e verifica as seis páginas PDF, referências, avisos e posição dos textos. Requer `pypdf`; o runtime Python fornecido pelo Codex o inclui. Para revisão visual, renderizamos as seis páginas usando `pypdfium2` e inspecionamos o PNG exportado. Arquivos de QA ficam em `output/comparison-checks/`, ignorado pelo Git.

Testes de unidade cobrem limites, fontes, null/zero, busca, presets incompletos, escala compartilhada, lacunas, anos não consecutivos, locale e exportação SVG com texto escapado. A revisão responsiva usa frames de 390 e 768 px; não substitui testes em todos os dispositivos nem homologação NVDA/VoiceOver.
