# Etapa 3 — dados oficiais candidatos

Estado: **aguardando aprovação editorial**. O dataset ativo continua mock. Nenhuma publicação ou deploy foi realizado.

Coleta concluída em 2026-10-20T19:01:01.078Z. Fonte: Banco Mundial, World Development Indicators, source=2. Janela fixa: 2010–2024. Snapshot arquivado em `datasets/raw/worldbank/2026-10-20T18-57-44.420Z`.

## Resultado da importação

- 215 países/economias com correspondência ISO validada; 169 têm geometria no world-atlas 110m. Os 46 restantes permanecem disponíveis na revisão tabular.
- 15.607 valores observados e 3.743 células ausentes em 19.350 posições possíveis.
- 31 respostas originais (países, metadados e páginas de observações), preservadas sem reformatar, conferidas com SHA-256.
- Agregados regionais/de renda excluídos. Channel Islands (CHI) e Kosovo (XKX) registrados como excluídos por falta de correspondência ISO numérica segura, sem inventar códigos. Isso é uma limitação de integração, não posicionamento político.

| Série | Observados | Ausentes | Cobertura em 2024 | Atualização indicada pela API |
| --- | ---: | ---: | ---: | --- |
| gdp | 3124 | 101 | 199/215 | 2026-10-08 |
| income | 3124 | 101 | 199/215 | 2026-10-08 |
| homicide | 1777 | 1448 | 0/215 | 2026-10-08 |
| birth | 3225 | 0 | 215/215 | 2026-10-08 |
| poverty | 1132 | 2093 | 26/215 | 2026-10-08 |
| life | 3225 | 0 | 215/215 | 2026-10-08 |

Não houve interpolação, substituição por zero nem repetição do último ano. Homicídios em 2024 permanece ausente para todos os países nesta coleta. Pobreza tem apenas 26 observações nesse ano. A atualização da fonte em 2026 não significa que todos os indicadores tenham observações em 2026. O ano final 2024 é um recorte explícito da importação, não uma afirmação de ser o último ano disponível para toda série.

## Revisão numérica e procedência

Cada célula observada aponta para código do indicador, ISO3, ano, arquivo bruto, índice [1][n] na resposta JSON, SHA-256, unidade original e divisor. PIB é convertido de US$ correntes para US$ trilhões por divisão por 10^12. PIB per capita é convertido de US$ correntes por pessoa para US$ mil por divisão por 1000. As demais séries mantêm a unidade da fonte. Nenhum valor é arredondado durante a importação; arredondamento de tela é só apresentação.

`npm run data:verify-candidate` conferiu todos os 15.607 valores e todas as lacunas contra os arquivos originais, inclusive país, ano, código da série, duplicações, paginação e conversão. O comando também detecta registros que tenham sido omitidos do candidato apesar de existirem no bruto. A reprodução offline do snapshot foi executada com sucesso.

## Definições e limites

As definições, notas de comparabilidade, licença, data de coleta e atualização por série estão em `datasets/sources/worldbank.json`, na procedência do candidato e nas páginas /indicators/ e /pt-br/indicadores/. A revisão tabular fica em /data-review/ e /pt-br/revisao-dados/.

- PIB e PIB per capita: valores nominais em dólar corrente. Não são crescimento real, renda mediana nem medida de desigualdade.
- Homicídios: taxa de homicídios intencionais por 100 mil, baseada em UNODC/WDI; diferenças de registro afetam a comparação.
- Natalidade: nascidos vivos por mil habitantes; não é fecundidade por mulher.
- Pobreza: linha de US$3,00/dia em PPC de 2021. Não misturar com versões US$2,15/PPC 2017 ou US$1,90/PPC 2011. O importador interrompe se o nome na API deixar de confirmar o limiar/vintage esperado.
- Expectativa de vida: tábua de período; não prediz a longevidade real de uma coorte. Pode usar estimativas.
- A disponibilidade da fonte, a cobertura estatística de territórios e os limites cartográficos podem diferir. Não calcular um total mundial somando a amostra nem tratar áreas cinza como zero.

Referências consultadas: [WDI/API](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures), [licenciamento](https://datacatalog.worldbank.org/public-licenses), [revisões e erratas](https://datahelpdesk.worldbank.org/knowledgebase/articles/906522-data-updates-and-errata), [pobreza/PPC](https://data.worldbank.org/indicator/SI.POV.DDAY). As páginas de cada indicador estão registradas no candidato. Atribuição CC BY 4.0 e as transformações acompanham os arquivos.

## Revisão das publicações

`datasets/candidates/visual-review.json` contém a análise das 12 chamadas existentes, com cinco propostas EN/PT-BR. Há ajustes para não confundir PIB por habitante com renda domiciliar, longevidade com qualidade de vida, pobreza genérica com o limiar específico e homicídios com segurança em geral. O arquivo mantém status pendente; o texto público dos mocks não foi trocado por conclusões supostamente reais.

## Operar e aprovar em etapa própria

```powershell
npm run data:import
npm run data:verify-candidate
npm run data:validate
npm run check
npm test
npm run build
npm run site:verify
# Reprodução sem rede do snapshot desta coleta:
npm run data:import -- --from-raw datasets/raw/worldbank/2026-10-20T18-57-44.420Z
```

Arquivos principais: `datasets/candidates/worldbank.json`, `worldbank.audit.json`, `visual-review.json`, `datasets/raw/worldbank/2026-10-20T18-57-44.420Z/manifest.json`. O modo do candidato é official-candidate, com revisão pending em cada série país/indicador. A checagem técnica por IA não registra aprovação humana. O contrato official exige revisor e data por série; o build do observatório ativo ainda exige mock para impedir ativação com rótulos e decisões editoriais inadequados.

Antes da ativação, o operador precisa revisar cobertura/definições, aprovar as alterações de chamadas e decidir o comportamento dos anos ausentes. A mudança de ativação deverá atualizar as interfaces, avisos, exportações e revisão editorial em conjunto; copiar o JSON sobre o mock não é um caminho aceito pelo build. As páginas de revisão são noindex, os arquivos brutos têm X-Robots-Tag noindex e não entram no sitemap.
