# Dados do observatório

A homepage é um agregador de visuais com painel mundial, não um feed de artigos. Os pacotes editoriais originais continuam em `content/posts`; os exemplos do painel são uma coleção separada e explicitamente demonstrativa.

## Arquivos editáveis na raiz

- `datasets/indicators.json`: seis indicadores, 24 países e 15 anos (2010–2024). **Todos os valores são sintéticos**, inclusive rankings e gráficos. `source` aponta para onde buscar dados reais, não para a origem dos números mock.
- `datasets/visuals.json`: títulos, subtítulos, indicador associado e variação de cor dos 12 posts visuais. Cada item gera `/visuais/<slug>/`. O índice mostra oito por página, quatro por linha no desktop e dois no celular.
- `datasets/products.json`: três produtos ilustrativos. `url: null` não gera link de compra. Cadastre uma URL HTTPS afiliada para ativar o link com `rel="sponsored noopener noreferrer"`.
- `schemas/dashboard.schema.json`, `schemas/visuals.schema.json`, `schemas/products.schema.json`: contratos para agentes/editores. As validações cruzadas em Zod são executadas no build.

O prepare copia os três JSON para `/data/`. Não edite `apps/web/public/data`: é saída gerada. O navegador e as Pages Functions não chamam Ollama. Dados e limites geográficos são servidos localmente pelo site, sem dependência de CDN em runtime.

```powershell
npm run data:validate
npm run dev
npm run check
npm test
npm run build
```

## Convenções

`countries[].id` é o código numérico ISO com três dígitos, usado pelos limites Natural Earth; `iso3` é o código textual usado ao importar dados. Os arrays em `values[id]` seguem exatamente a ordem de `years`. Use `null` para observação indisponível; nunca converta ausência em zero. País sem série fica cinza. A linha histórica deixa lacunas e o ranking exclui observações ausentes.

A escala de cor usa raiz quadrada de valor/máximo, fixando o máximo de toda a série e todos os países para cada indicador. Isso evita que uma mesma cor mude de significado a cada ano. O ranking contém apenas a amostra disponível. Cor mais escura significa valor maior, não um resultado melhor. Não há total mundial calculado sobre a amostra.

A linha histórica tem escala vertical ajustada ao país; compare valores numéricos, não inclinações entre países. Botões permitem animar anos e alternar indicadores. A animação só começa por ação do visitante, pode ser pausada e para quando a aba fica oculta. Transições respeitam redução de movimento.

## Fontes previstas para a substituição

| Indicador | Código WDI | Conversão para a unidade exibida |
| --- | --- | --- |
| [PIB corrente](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD) | NY.GDP.MKTP.CD | US$ / 1.000.000.000.000 |
| [PIB per capita corrente](https://data.worldbank.org/indicator/NY.GDP.PCAP.CD) | NY.GDP.PCAP.CD | US$ / 1.000 |
| [Homicídios intencionais](https://data.worldbank.org/indicator/VC.IHR.PSRC.P5) | VC.IHR.PSRC.P5 | por 100 mil; fonte original UNODC |
| [Taxa bruta de natalidade](https://data.worldbank.org/indicator/SP.DYN.CBRT.IN) | SP.DYN.CBRT.IN | por mil habitantes |
| [Pobreza](https://data.worldbank.org/indicator/SI.POV.DDAY) | SI.POV.DDAY | percentual; referência consultada: US$ 3/dia, PPC 2021 |
| [Expectativa de vida ao nascer](https://data.worldbank.org/indicator/SP.DYN.LE00.IN) | SP.DYN.LE00.IN | anos |

Fontes consultadas em 20/10/2026. Verifique definições e revisões na data de importação, especialmente a linha de pobreza. A API de cada indicador está no JSON. Trate paginação, agregados regionais, códigos e anos ausentes. PIB corrente não é uma série de crescimento real ajustada pela inflação.

Geometria: `world-atlas` 2.x, derivada de [Natural Earth](https://github.com/topojson/world-atlas), com limites em domínio público e projeção Natural Earth. D3/TopoJSON só geram os caminhos no build; não são enviados como bibliotecas ao navegador. Os mapas de miniaturas são SVG estáticos reutilizáveis e carregados sob demanda.

## Prompt para operar com IA

> Leia AGENTS.md e docs/DATA.md. Prepare uma proposta de atualização de [indicador], consultando o código e a API indicados em datasets/indicators.json. Salve o download original com data de consulta, confira códigos ISO, unidades, cobertura e valores ausentes. Não misture os mocks com dados oficiais. Produza um arquivo candidato separado e um relatório de diferenças para revisão. Execute as validações. Não publique nem retire os avisos de demonstração automaticamente.

Para um visual de exemplo:

> Adicione um visual em datasets/visuals.json usando um indicador existente, com título e subtítulo que não façam afirmações factuais sobre números sintéticos. Respeite o schema, use um slug único e valide/build o site.

O contrato agora distingue `mock`, `official-candidate` e `official`, com procedência, licença, coleta e revisão por série para dados oficiais. O arquivo ativo continua obrigatoriamente mock até uma mudança de ativação revisada; o candidato é inspecionado em uma página própria. A importação é um comando local explícito, sem agendamento. A revisão editorial e a publicação nunca são automáticas.


## Importação oficial candidata — etapa 3

Leia [DATA-IMPORT-REPORT.md](DATA-IMPORT-REPORT.md) para resultados, cobertura, limitações, arquivos e comandos. `npm run data:import` baixa as respostas e prepara um candidato separado; `npm run data:verify-candidate` confere valores e hashes. Definições em `/indicators/` e `/pt-br/indicadores/`; revisão em `/data-review/` e `/pt-br/revisao-dados/`. Exportações incluem código da fonte, valor/unidade originais, divisor, arquivo/índice bruto, hash, licença e estado da revisão. Nos mocks, `source_role=planned-reference` deixa claro que o link não é origem dos números fictícios.
