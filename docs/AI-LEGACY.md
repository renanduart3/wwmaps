# Histórico — integração Ollama e geração antiga

**Arquivo de referência, não o fluxo atual.** Os comandos `atlas run --brief` abaixo foram desativados; não geram mais imagens. Use `docs/AI.md` e `docs/CONTENT-WORKFLOW.md` para prompts e imagens externas. Sugestões históricas de modelos não representam uma verificação atual de disponibilidade.

Há duas maneiras de trabalhar: um agente como Codex edita e opera o repositório, ou a CLI do Atlas chama um modelo Ollama que redige o briefing editorial. Codex usando um modelo OpenAI pode trabalhar nos arquivos locais, mas a inferência acontece na nuvem. O Ollama faz a inferência na sua máquina.

## Iniciar o projeto

Use Node.js 22.19+ (ou uma versão LTS mais recente compatível). O ambiente encontrado nesta revisão tinha Node 22.18 e gerou avisos de engine. Não foi possível identificar a RAM/VRAM, e o Ollama não respondeu em `127.0.0.1:11434`.

```powershell
cd C:\Users\renan\Documents\ChatGPT\wwmaps
npm ci
npm run dev
```

O site abre em `http://localhost:4321`. Para testar também os endpoints Cloudflare:

```powershell
npm run preview
```

O preview usa `http://localhost:8788`. O servidor Astro sozinho não executa Pages Functions.

## Usar Ollama

Instale o [Ollama para Windows](https://ollama.com/download/windows). Depois escolha e baixe um modelo:

```powershell
ollama pull qwen3:8b
ollama list
```

Se o aplicativo não tiver iniciado o servidor, rode `ollama serve` em outro terminal. Não inicie um segundo servidor se a porta já estiver ocupada.

```powershell
npm run ai:doctor
npm run atlas -- ai draft --brief briefs/research/mercator.json --out briefs/queue/mercator-ai.json
npm run atlas -- run --brief briefs/queue/mercator-ai.json
```

O exemplo de pesquisa usa outro ID (`mercator-ai-demo`) para preservar o post existente. A saída da IA nunca substitui um briefing existente. Se o modelo devolver JSON inválido, referências desconhecidas ou números sem dado correspondente, o comando falha e não cria o briefing.

Configuração padrão: `atlas.config.json`. Para ajustes da sua máquina, copie para `atlas.config.local.json` (ignorado pelo Git). Parâmetros: `baseUrl`, `model`, `effort`, `timeoutMs`, `contextTokens` e `outputTokens`. O cliente aceita apenas endpoint HTTP de loopback, sem redirecionamentos, e não usa fallback de nuvem.

### Modelo e esforço

Estas são sugestões de partida, não resultados de benchmark nesta máquina. Teste um briefing curto e monitore memória antes de aumentar contexto ou modelo.

| Uso | Modelo | Esforço inicial | Observação |
| --- | --- | --- | --- |
| Primeira execução / edição em português | `qwen3:8b` | `off` | Download de cerca de 5,2 GB; precisa de memória adicional para contexto e execução |
| Redação com mais capacidade | `qwen3:14b` | `off`, depois `on` para comparar | Exige mais memória; avalie latência e fidelidade ao schema |
| Análise local com níveis de raciocínio | `gpt-oss:20b` | `medium` | Artefato consultado de cerca de 14 GB; não assumir que cabe em uma GPU de 16 GB com qualquer contexto |
| Reformatação simples | o modelo local já instalado | `off` ou `low`, conforme suporte | Evita gastar raciocínio em tarefas mecânicas |

`off/on` e `low/medium/high` não são intercambiáveis. O cliente consulta `/api/show` para conferir os controles suportados; `default` omite o parâmetro e usa o padrão do modelo. Os orçamentos de saída incluem o trabalho do modelo: se houver truncamento com thinking ligado, aumente `outputTokens` com cautela ou use `off`.

```powershell
ollama pull gpt-oss:20b
npm run atlas -- ai doctor --model gpt-oss:20b --effort medium
npm run atlas -- ai draft --brief briefs/research/mercator.json --out briefs/queue/mercator-oss.json --model gpt-oss:20b --effort medium
```

O pipeline registra modelo, esforço, horários e contagem retornada de tokens em `output/runs/`. Não armazena a cadeia interna de raciocínio. O resultado é sempre rascunho e requer revisão.

## Operar com Codex

Para direção artística dos mapas, leia [MAP-STYLE.md](MAP-STYLE.md). A IA gera o modo e o prompt estruturado; o motor preserva geografia real. Marque temas sensíveis no arquivo de pesquisa. `npm run style:preview` gera os dois exemplos locais; o renderer executável continua restrito à comparação Mercator/Gall–Peters.

O `AGENTS.md` na raiz fornece os comandos, contratos e limites do projeto. Abra esta pasta no app e use:

> Leia AGENTS.md e docs/AI.md. Prepare uma pesquisa sobre [tema] com fontes primárias verificáveis. Registre fontes, afirmações e dados em briefs/research. Gere o briefing e o pacote editorial como rascunho, valide e mostre os arquivos que precisam de revisão. Se não houver um template visual adequado, aponte a lacuna antes de renderizar.

Minha recomendação para as tarefas deste repositório:

| Tarefa | Modelo no Codex | Esforço |
| --- | --- | --- |
| Manutenção, layout e fluxo editorial | GPT-6.1 Sol | `medium` |
| Mudanças em contratos, publicação ou integração Cloudflare | GPT-6.1 Sol | `high` |
| Revisão ampla de arquitetura ou investigação difícil | GPT-6 Astra | `high` |
| Pequenos ajustes de texto | GPT-6.1 Sol | `low` |

Os nomes são os modelos disponíveis no ambiente consultado. Disponibilidade depende da conta e do cliente. Esforço maior deve justificar a latência; não há necessidade de `max` para operações rotineiras.

```powershell
codex -C . -m gpt-6.1-sol -c model_reasoning_effort=medium
```

Para experimentar o próprio agente com inferência local, após instalar o modelo:

```powershell
codex --oss --local-provider ollama -m gpt-oss:20b -C .
```

Esse modo depende da compatibilidade da versão do Codex/Ollama e do modelo com ferramentas. O comando existe no CLI instalado, mas a execução com modelo real não foi verificada nesta máquina. A CLI `atlas ai draft` é um caminho menor e mais previsível para começar: solicita somente JSON editorial e não dá ferramentas de shell ao modelo.

## Revisar e publicar

```powershell
npm run atlas -- validate --post content/posts/mercator-ai-demo
```

Leia artigo, legenda, fontes e imagem. Após a revisão, marque `reviewed: true` no `research-summary.json` daquele post:

```powershell
npm run atlas -- publish --post content/posts/mercator-ai-demo
npm run build
```

`publish` apenas inclui o post no próximo build. O deploy externo é `npm run deploy`. Mantenha a geração de conteúdo independente da publicação.

## Fontes oficiais consultadas

- [Ollama: saída estruturada](https://docs.ollama.com/capabilities/structured-outputs)
- [Ollama: controles de thinking](https://docs.ollama.com/capabilities/thinking)
- [Qwen3 8B](https://ollama.com/library/qwen3:8b), [Qwen3 14B](https://ollama.com/library/qwen3:14b), [gpt-oss 20B](https://ollama.com/library/gpt-oss:20b)
- [Modelos no Codex](https://learn.chatgpt.com/docs/models?surface=app)
- [Referência CLI, incluindo `--oss`](https://learn.chatgpt.com/docs/developer-commands?surface=cli)
- [GPT-6.1 Sol e esforços suportados](https://developers.openai.com/api/docs/models/gpt-6.1-sol)

## Atualizar o observatório com IA

Leia `docs/DATA.md` para os arquivos `datasets/`, fontes previstas, schemas e prompts de atualização. Execute `npm run data:validate` antes do build. Os valores atuais são sintéticos: não os transforme em afirmações reais nem remova o estado `mock` sem uma migração revisada e proveniência dos dados importados.

## Catálogo editorial

A taxonomia independente de categoria, tipo funcional, mapa, escopo, finalidade e saídas está em `docs/EDITORIAL-SYSTEM.md`. Use o prompt de sete pautas desse guia para planejar assuntos sem restringir a IA a um tema. O pipeline Ollama atual ainda depende de pesquisa fornecida e do único renderer esquemático existente.

## Dados oficiais

Leia `docs/DATA-IMPORT-REPORT.md` antes de propor trocar os mocks. A IA pode importar, auditar e propor ajustes em `datasets/candidates/`. Os testes de integridade não autorizam marcar séries como aprovadas nem ativar dados oficiais. Há um comando offline para reproduzir o candidato a partir dos originais arquivados.
