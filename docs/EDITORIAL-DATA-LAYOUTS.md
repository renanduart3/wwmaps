# Editorial data

Um infográfico editorial de dados combina título e subtítulo, mapa ou gráfico central, legenda, labels e fonte no rodapé. Métricas, callouts e listas auxiliares entram quando ajudam a interpretar os dados disponíveis. A hierarquia deve permitir entender o resultado em segundos.

`editorial-data` é o estilo; `visual.kind` indica o tipo de visual; `visual.layout` define uma composição especializada opcional. Não são categorias editoriais. Economia, história, geografia ou qualquer outra categoria podem usar o mesmo estilo.

```json
{
  "style": "editorial-data",
  "visual": {
    "kind": "ranking",
    "layout": "editorial-data-ranking",
    "instructions": "Central map tied to a ranked list using the exact sourced observations. Show period, unit, legend and missing data."
  }
}
```

| Dados pesquisados | Layout |
| --- | --- |
| Categorias/intensidade por país ou estado | `editorial-data-map` |
| Resultados geográficos com lista ordenada | `editorial-data-ranking` |
| Eventos localizados com datas/contagens | `editorial-data-event-map` |
| Pessoas/perfis identificados por região | `editorial-data-profile` |

O agente registra a escolha no post e o catálogo mostra o layout efetivo. Sem escolha explícita, kind map resolve para map e kind ranking para ranking. Nos demais tipos, usa-se o card editorial padrão. Eventos e perfis não são inferidos a partir do título.

Ordem de prioridade: legibilidade, hierarquia clara, métricas corretas, legendas úteis e explicação concisa. Evitar excesso de ilustrações, personagens, balões, cenas e textos minúsculos. Os sprites da interface do site são independentes e não entram automaticamente nas artes dos posts.

Os prompts continuam em inglês e contêm os textos visíveis no idioma final. Não misturar inglês e português na mesma arte. Fonte, período, unidade, valores ausentes e limitações devem permanecer explícitos. Textos adicionais de legenda, ranking e callouts precisam constar em `translations.<idioma>.imageText` para serem reproduzidos no idioma correto. A tabela `data` e os links são evidência de referência, não texto bruto para desenhar na arte.

Templates: `styles/prompt-templates.json` e `styles/editorial-data-layouts.json`. Regra de escolha: `styles/style-selection-rules.json`. A imagem continua sendo gerada externamente pelo usuário.
