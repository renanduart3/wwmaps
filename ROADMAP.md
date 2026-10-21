# WWMaps — plano de implementação

Atualizado em 21/10/2026. Este é o checklist central para continuar em etapas.

## Direção vigente — fluxo simples com imagens externas

- [x] Painel editorial exclusivo de desenvolvimento: aba Planejamento na navegação, CRUD de conteúdos, formulário completo, edição em massa, lixeira recuperável, validação e backups locais; ausente do build público.
- [x] Catálogo CSV de conteúdos com estilo, layout, etapa de produção, imagens, data e pendências; entrada de pautas também em CSV.
- [x] Editorial-data como estilo principal de infográficos de dados, com layouts de mapa, ranking, eventos e perfis.
- [x] Três estilos oficiais: handdraw-simple, editorial-data e micro-people-data.
- [x] Entrada de lista, estruturas por assunto e prompts autossuficientes por idioma.
- [x] Pesquisa assistida pelo Codex e checagem de prontidão, sem imagens geradas localmente.
- [x] Posts novos em content/visuals: post.json, prompt e imagem fornecida pelo usuário.
- [x] Prévia local de rascunhos/agendados, galeria e páginas próprias com imagem salva na pasta.
- [x] Filtro público por status/data, imagens e prompts obrigatórios antes da liberação.
- [x] Workflow preparado para push e verificação de agendamentos a cada 15 minutos.
- [ ] Ativar repositório/Actions, configurar Pages, secrets e domínio; homologar o deploy agendado real.

Guia: `docs/CONTENT-WORKFLOW.md`. As tarefas antigas de construir renderers editoriais locais da etapa 6 foram **substituídas pela geração externa de imagens**, não são requisito do fluxo novo. O observatório e o comparador continuam com seus gráficos locais. Posts não publicados não entram no build público.

## Direção aprovada

- Marca e domínio: **WWMaps — wwmaps.com**.
- Inglês como idioma principal; português brasileiro como segundo idioma.
- Agregador de mapas, estatísticas e posts visuais.
- Observatório mundial na home; galeria de quatro posts por linha no desktop.
- Comparador dedicado: até cinco países, principais indicadores e exportação.
- Paleta: roxo `#7132DF`, bege claro `#FAF5E9`, crimson `#BE2349`.
- Títulos condensados, pesados, itálicos e em caixa alta, inspirados na referência enviada; textos e números usam sans-serif legível.

## Etapa 1 — protótipo funcional entregue

- [x] Observatório com seis indicadores e histórico demonstrativo.
- [x] Galeria, filtros, paginação e coleção ilustrativa de produtos.
- [x] Comparador em inglês em `/compare/`.
- [x] Comparador em português em `/pt-br/comparar/`.
- [x] Seleção de um a cinco países; Brasil, EUA e China selecionados inicialmente.
- [x] Comparação dos seis indicadores em barras independentes, com ano selecionável.
- [x] Limites de seleção, unidades, valores ausentes e indicação explícita de mock.
- [x] Exportação CSV e JSON com país, ano, unidade, fonte e estado mock.
- [x] Impressão com folha de estilos própria; PDF pelo diálogo de impressão do navegador.
- [x] Botão flutuante de acesso ao comparador na home e item na navegação.
- [x] Primeira aplicação da nova marca, cores e tipografia de referência.
- [x] URL canônica padrão configurada como `https://wwmaps.com`.

**Limites originais da etapa 1 (superados na etapa 2):** a interface era apenas portuguesa e usava fontes de sistema. Os dados e produtos são fictícios. Domínio não conectado, nenhum deploy realizado. O PDF não é um download direto: o visitante usa “Salvar como PDF” no diálogo do navegador.

## Etapa 2 — inglês como padrão e identidade final

- [x] Tornar `/` a home em inglês e criar `/pt-br/` equivalente.
- [x] Centralizar traduções de interface, indicadores, países, galeria e produtos; evitar strings espalhadas.
- [x] Traduzir busca, metodologia, sobre, coleção, detalhes e mensagens de exportação.
- [x] Garantir navegação no mesmo idioma e seletor EN/PT-BR em todas as páginas.
- [x] Manter país/ano selecionados ao trocar idioma do comparador.
- [x] Definir rotas equivalentes e redirecionamentos das URLs antigas.
- [x] Completar canonical, hreflang, sitemap, título e descrição por idioma para as rotas equivalentes.
- [x] Selecionar e hospedar uma fonte condensada itálica licenciada; conferir acentos, peso, legibilidade e carregamento.
- [x] Finalizar favicon, marca, cartões sociais e textos dos visuais que ainda usam “Atlas”.
- [x] Revisão visual em desktop, tablet e celular, teclado, contraste e árvore de acessibilidade.
- [ ] Homologação final em leitor de tela real (NVDA/VoiceOver).

**Entregue nesta etapa:** interface bilingue, rotas, fontes e metadados. Relatório em `docs/LOCALIZATION.md`. O artigo legado Mercator continua com publicação aprovada somente em PT-BR; sua futura tradução editorial exige revisão. A homologação assistiva real permanece pendente.

**Aceite:** navegação em inglês desde a home, nenhuma mistura de idioma na jornada; equivalente completo em português.

## Etapa 3 — dados reais e comparabilidade

- [x] Importar dados oficiais para arquivos candidatos separados, mantendo o download original.
- [x] Conferir código de cada país, unidade, moeda, ano, revisões e definição de pobreza.
- [x] Adicionar proveniência, licença, data de coleta e revisão por série ao contrato.
- [x] Distinguir anos sem dados e cobertura por país; nunca preencher ausências com zero.
- [x] Ampliar cobertura além dos 24 países demonstrativos.
- [x] Revisar tecnicamente as 12 chamadas existentes e preparar cinco propostas de correção EN/PT-BR antes de converter mock em publicação real.
- [x] Exibir definição completa de cada indicador e limites de comparabilidade.

- [ ] Aprovação humana das séries e propostas editoriais, seguida da mudança específica de ativação dos dados oficiais.

**Resultado técnico:** candidato de 215 países/economias, 15.607 observações e 3.743 lacunas, com 31 arquivos originais verificados. O dataset ativo permanece mock. Ver `docs/DATA-IMPORT-REPORT.md`.

**Aceite:** qualquer valor mostrado e exportado é rastreável à fonte e à transformação aplicada. Ler `docs/DATA.md`.

## Etapa 4 — comparador e exportações avançadas

- [x] Link compartilhável com países/ano na URL e validação dos parâmetros (implementado como dependência da troca de idioma na etapa 2).
- [x] Seleção pesquisável de países, útil com cobertura mundial.
- [x] Histórico de múltiplos países em gráfico de linhas.
- [x] Tabela acessível para comparação detalhada e opção de exportar todos os anos.
- [x] PNG/SVG do comparativo com marca, fontes, unidades, data e legenda.
- [x] PDF próprio com paginação previsível e download direto.
- [x] Presets editoriais (BRICS original, amostras América do Sul e G7) respeitando cinco países.
- [x] Testes automatizados no navegador para seleção, idioma, cinco downloads, botão e regras de impressão.
- [ ] Homologação visual do diálogo nativo de impressão e da saída de impressora física; esse diálogo bloqueia o canal de automação disponível.

**Entregue localmente:** busca por nome/ISO, seleção editável e compartilhável, histórico com lacunas, tabela e exportação de todos os anos, CSV/JSON/SVG/PNG e PDF A4 paisagem com seis páginas na base atual. Guia e testes reproduzíveis em `docs/COMPARISON.md`. A impressão HTML dispara o diálogo nativo; inspeção visual do diálogo do sistema e saída de impressora física ficam fora da automação CUA. A base continua mock até a aprovação da etapa 3; não há dependência de configuração externa para usar estas ferramentas.

**Aceite:** exportações representam exatamente a seleção, não cortam conteúdo e preservam fontes/avisos.

## Etapa 5 — publicação no Cloudflare

- [ ] Atualizar Node e resolver avisos de dependências em `docs/TECHNICAL-NOTES.md`.
- [ ] Migrar Astro/Sharp com testes de regressão do pipeline editorial e Pages Functions.
- [ ] Configurar projeto Pages e credenciais conforme `docs/ARCHITECTURE.md`.
- [ ] Conectar `wwmaps.com`, decidir redirecionamento de `www` e verificar DNS/TLS.
- [ ] Ajustar `PUBLIC_SITE_URL=https://wwmaps.com` no ambiente de publicação.
- [ ] Configurar URLs reais de afiliados, identificação de links e política editorial.
- [ ] Revisar privacidade, metadados, performance e indexação; retirar noindex de demos apenas após conteúdo oficial revisado.
- [ ] Deploy de preview, aprovação visual e publicação.

## Como continuar com IA

Abra este arquivo e peça: “Implemente a etapa 2 do ROADMAP.md. Leia AGENTS.md e preserve o comparador e os avisos de mock. Marque apenas itens concluídos e registre o que não foi verificado.”

Comandos de verificação: `npm run data:validate`, `npm run check`, `npm test`, `npm run build`. Atualize este checklist ao terminar cada etapa. Não marque infraestrutura externa como concluída só porque há configuração local.

## Etapa 6 — catálogo editorial e motor visual

Referência detalhada e diagnóstico: `docs/EDITORIAL-SYSTEM.md`.

- [x] Centralizar as 11 categorias com nomes EN/PT-BR e prioridade nas seis primeiras.
- [x] Cadastrar quatro contentTypes e finalidade comercial independente.
- [x] Cadastrar oito mapTypes no plano e informar capacidade real por ambiente.
- [x] Validar planos sem fingir suporte de renderização.
- [x] Propagar tipo funcional, formato, escopo e finalidade no briefing/post/prompt.
- [x] Disponibilizar catálogo de categorias e filtro no site.
- [x] Alinhar novos prompts e o renderer esquemático à marca/paleta WWMaps.
- [x] Centralizar o guia illustrated-editorial-maps e os modos playful-editorial / analytical-editorial; bloquear personagens em temas sensíveis e B2B.
- [x] Substituir grades do renderer Studio por geografia real Mercator/Gall–Peters, preservando paths entre estilos e exportando SVG/PNG/WebP.
- [x] Aplicar acabamento editorial aos mapas da home/miniaturas e gerar duas prévias locais com `npm run style:preview`.
- [ ] Ampliar personagens, ícones e callouts; compor ilustrações opcionais sem redesenhar a geografia. Ver `docs/MAP-STYLE.md`.
- [ ] Implementar renderer editorial choropleth com dados reais e exportação.
- [ ] Implementar highlight, comparative de dois mapas, bubble, flow, historical-timeline e regional-heatmap.
- [ ] Adicionar contratos próprios de geometrias, coordenadas, fluxos e fronteiras por período.
- [x] Ligar a galeria pública aos novos posts de imagens externas; os pacotes legados continuam acessíveis por suas rotas.
- [ ] Selecionar outputs individuais em vez do agrupamento legado site/instagram.
- [ ] Criar orquestração de lote de pautas, pesquisa verificável e fila de revisão.
- [ ] Regenerar e revisar assets legados na identidade atual; incorporar a fonte final licenciada.

Critério de aceite: nenhum formato cadastrado é apresentado como implementado sem renderer, dados, legenda, fontes e exportação verificados. Nenhuma pauta é publicada pela IA automaticamente.
