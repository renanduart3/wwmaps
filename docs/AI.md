# Operar o conteúdo com Codex

O fluxo vigente é **lista → pesquisa e prompts no Codex → imagens geradas por você fora → salvar → revisar → agendar**. Não exige Ollama nem outro servidor de IA local. Codex opera os arquivos locais; a localização da inferência depende do modelo/provedor que você usa no Codex.

## Pedido padrão

> Rode a análise de conteúdos de content/inbox/assuntos.md. Use os estilos que informei, pesquise fontes primárias, organize os dados e textos em inglês e prepare os prompts finais. Não gere imagens nem publique. Mostre as pastas e qualquer pendência de pesquisa.

Se quiser PT-BR também, diga isso no pedido. O agente deve:

1. Ler `AGENTS.md`, `visual-styles.md` e `docs/CONTENT-WORKFLOW.md`.
2. Confirmar que cada tema possui um estilo explícito, no item ou no padrão informado por você.
3. Estruturar os rascunhos com `content:analyze`.
4. Continuar a pesquisa; preencher fontes reais, datas de consulta, fatos, valores, unidades, períodos, composição e textos no `post.json` de cada item. A lista da IA externa é entrada, não prova das afirmações.
5. Gerar `prompt.en.txt` e/ou `prompt.pt-BR.txt` com `content:prompts`. Não dizer que o lote está pronto se só criou esqueletos.
6. Manter `draft`, conferir com `content:check`, atualizar `content/catalog.csv` com `content:catalog` e entregar os caminhos. A tabela registra o estilo e a composição de cada postagem. Sem evidência suficiente, deixar o item pendente e não fabricar um prompt final.

Você usa somente o TXT na IA de imagens e salva o resultado no local indicado. `npm run dev` mostra a imagem na galeria e na página do post. Depois da revisão, você define status/data, faz commit e push. Detalhes e exemplos curtos em [CONTENT-WORKFLOW.md](CONTENT-WORKFLOW.md).

Aceita lista Markdown, JSON ou CSV. Consulte `docs/CONTENT-CATALOG.md` para as colunas de entrada e os estados de produção. Em editorial-data, escolha `visual.layout` conforme os dados: mapa, ranking geográfico, eventos ou perfis. Os prompts priorizam mapa/gráfico, métricas, legendas e fonte; não cenas narrativas.

## Regras

- **Nunca gerar imagens editoriais aqui**: nenhum imagegen, renderer, rasterização ou conversão faz parte deste fluxo. Os componentes gráficos do observatório são funções do site, separadas da produção das imagens de posts.
- Estilos oficiais: `handdraw-simple`, `editorial-data`, `micro-people-data`.
- Prompt sempre em inglês; todo texto da arte no idioma escolhido. Não misturar EN/PT-BR numa única peça.
- Incluir no próprio prompt os dados e textos necessários; não exigir que o gerador leia outros arquivos.
- Rever mapas, números, unidades e texto da imagem recebida antes de agendar. A checagem estrutural não comprova a fidelidade da IA externa.
- Não aprovar séries candidatas nem trocar os mocks do observatório automaticamente. Ler `docs/DATA-IMPORT-REPORT.md` ao tratar desses dados.

As experiências anteriores com Ollama e renderer foram arquivadas em `docs/AI-LEGACY.md`. Seus comandos de geração não são o fluxo atual; `atlas run --brief` foi desativado. Nenhum modelo, programa, commit ou deploy externo é acionado automaticamente pela análise de pautas.
