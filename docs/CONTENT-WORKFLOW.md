# Fluxo simples: lista → prompts → imagens externas → publicação

## Catálogo

O acompanhamento fica em `content/catalog.csv`: uma linha por post, com estilo editorial, layout, etapa, imagens e pendências. `npm run content:catalog` atualiza a partir dos arquivos reais. Também é atualizado pelos comandos de conteúdo e pela preparação de dev/build. Para declarar as pautas diretamente em uma tabela CSV, veja [CONTENT-CATALOG.md](CONTENT-CATALOG.md).

## O que você faz

1. Salva a lista de assuntos em `content/inbox/assuntos.md`. Exemplo:

   ```text
   1. Countries with the highest GDP per capita | handdraw-simple
   2. Historical trade routes | editorial-data
   3. Where the population is concentrated | micro-people-data
   ```

2. Pede ao Codex:

   > Rode a análise de conteúdos de content/inbox/assuntos.md. Use os estilos informados. Pesquise fontes primárias, organize os dados e textos em inglês e prepare os prompts finais de cada post. Não gere imagens nem publique. Deixe pendências explícitas se faltar evidência.

3. Copia **somente** o conteúdo de `prompt.en.txt` para sua IA de imagens. Salva o PNG recebido como `image.en.png` na mesma pasta do post.
4. Executa `npm run dev` e abre `http://localhost:4321`. Posts locais, inclusive rascunhos/agendados, aparecem na galeria e em sua página. Salvar a imagem ou editar `post.json` recarrega a prévia; se necessário, atualize a página. Não precisa copiar assets, converter imagens nem fazer build para cada imagem salva.
5. Depois de revisar, define a data e `status: "scheduled"` no `post.json`; faz **commit e push**. A publicação externa depende da configuração inicial descrita abaixo.

## A pasta de cada post

```text
content/visuals/meu-assunto/
  post.json          # estilo, textos, fontes/dados, status e data
  prompt.en.txt      # copiar inteiro para a IA externa
  image.en.png       # você salva aqui a imagem recebida
```

Aceita PNG, JPG/JPEG ou WebP, sem conversão; mantenha somente uma imagem por idioma. Para PT-BR, acrescente `pt-BR` a `languages` e preencha `translations["pt-BR"]`: o Codex gera `prompt.pt-BR.txt`, e você salva `image.pt-BR.png`. Nada é traduzido/publicado automaticamente. Prompts não são publicados no site; só as imagens dos posts já liberados entram no build público.

## Status e data

No `post.json`:

```json
"status": "scheduled",
"publishAt": "2026-12-01T09:00:00-03:00"
```

- `draft`: aparece no desenvolvimento local; nunca no build público.
- `scheduled`: entra no primeiro build após `publishAt`.
- `published`: também respeita `publishAt`; use uma data passada/atual para publicar no próximo build.

Use sempre fuso explícito (`-03:00` para esse horário de São Paulo, ou `Z` para UTC). O campo não aceita horário sem fuso. Para retirar um post, volte a `draft` e faça push para um novo deploy.

**Commit sozinho não publica.** O workflow `.github/workflows/deploy.yml` faz deploy no push para main/master e verifica novas publicações a cada 15 minutos. É um site estático: a data exige novo build/deploy. O agendamento do GitHub pode atrasar; não é uma promessa de publicação no segundo exato. Sem alteração de conteúdo liberado, a rotina agendada evita deploys repetidos. Ela também considera alterações/agendamento do pacote legado existente.

Para ativar isso uma vez: conectar o repositório, configurar o projeto Pages e seu nome em `apps/web/wrangler.jsonc`, secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`, variável `PUBLIC_SITE_URL` e habilitar Actions. Ajuste as branches do workflow se usar outro nome. Não habilite simultaneamente outro deploy automático para o mesmo destino sem decidir qual fluxo deve publicar. Se preferir a integração Git nativa do Pages, o agendamento equivalente exige um Deploy Hook/cron; o caminho preparado aqui é Actions + Wrangler.

Essas configurações externas **não foram ativadas** nesta alteração. O workflow pula o deploy enquanto não há credenciais. A chave de estado é salva no cache apenas após deploy bem-sucedido; falhas não marcam o conteúdo como já publicado.

Referências: [Deploy Hooks do Pages](https://developers.cloudflare.com/pages/configuration/deploy-hooks/), [agendamentos do GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## O que o Codex executa

```powershell
# Abre as estruturas sem sobrescrever posts existentes:
npm run content:analyze -- --input content/inbox/assuntos.md
# Ou uma lista sem estilos por item, com estilo padrão informado por você:
npm run content:analyze -- --input content/inbox/assuntos.md --style handdraw-simple

# Depois de pesquisar e completar os post.json:
npm run content:prompts -- --all
npm run content:check
```

O primeiro comando só estrutura a lista; ele não é uma IA de pesquisa. Ao receber seu pedido de análise, o Codex deve continuar a pesquisa, preencher cada `post.json` e gerar os prompts. Não basta criar pastas e dizer que o lote está pronto. Pesquisa insuficiente impede o prompt final daquele item. `content:prompts -- --post meu-assunto` regenera somente um post.

O contrato está em `schemas/visual-post.schema.json`. Você pode editar título, subtítulo e corpo em `translations.en`, composição em `visual.instructions`, estilo em `style`, fontes em `sources` e dados exatos em `data`. `sourceCredit` é o rodapé da arte no idioma final; `imageText` contém os demais textos que precisam aparecer exatamente. `body` é texto simples com parágrafos separados por linha vazia; `caption` é uma legenda opcional para sua publicação externa. Depois de mudar o que aparece na arte, regenere o prompt e revise se precisa gerar outra imagem.

Observações ausentes usam `value: null`, nunca zero inventado; gráficos precisam de pelo menos uma observação numérica. O prompt preserva explicitamente essas lacunas.

Não há aprovação automática: o Codex mantém `draft`. Você revisa a imagem gerada e a coerência com as fontes e libera ao mudar status/data. Posts liberados, mesmo com data futura, precisam ter pesquisa, prompts atuais e imagens presentes; um erro interrompe o build em vez de publicar incompleto. Rascunhos incompletos são permitidos.

Os antigos briefings/renderer Mercator foram preservados para compatibilidade com o exemplo já existente. `atlas run --brief` não gera mais imagens. `style:preview` agora é um alias para preparar os prompts novos. A interface do observatório continua renderizando gráficos a partir dos dados locais; isso é independente das imagens editoriais que você gera fora.
