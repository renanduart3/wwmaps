# Painel editorial local

```powershell
npm run dev
```

Abra **http://127.0.0.1:4321/__studio/** ou clique no botão roxo **Plan** (selo LOCAL) do cabeçalho do site em desenvolvimento. O painel está em português e opera conteúdos EN e PT-BR.

## Como usar

1. **Adicionar pautas:** digite um assunto por linha, escolha explicitamente o estilo editorial, a categoria, o formato e os idiomas. Os posts são criados como drafts. O estilo não é escolhido silenciosamente.
2. **Consultar e editar:** cada linha tem **Abrir / editar**, **Ver prévia** e **Excluir**. O formulário completo dos posts novos permite editar idiomas, títulos, subtítulos, texto, legenda, texto alternativo, fonte na arte, textos exatos, composição, fontes pesquisadas, fatos e dados, além de estilo/categoria/status/data. Os dados da pesquisa têm linhas que podem ser adicionadas e removidas. Idiomas adicionais só são salvos quando seus campos obrigatórios estão preenchidos.
3. **Editar células:** títulos dos idiomas existentes, estilo, categoria, tipo de visual, layout, status e data com fuso. O ID é fixo para preservar pastas e URLs. Pesquisa, fontes e textos completos continuam no fluxo com Codex/post.json.
4. **Editar em massa:** filtre a tabela, marque as linhas desejadas, abra “Edição em massa”, escolha os campos e clique “Aplicar à seleção”. “Manter” não altera aquele campo. “Selecionar todos” seleciona somente os itens editáveis do filtro; o lote pode ser conferido na tabela antes de salvar.
5. **Salvar alterações:** grava os post.json selecionados. O lote é validado antes da gravação. Uma linha inválida impede o lote. Agendar/liberar exige data com fuso, pesquisa, prompts atuais e imagens válidas em todos os idiomas.
6. **Atualizar prompts:** após salvar, selecione os posts e clique na ação correspondente. Ela exige pesquisa completa e não gera imagens. Se houver um item incompleto, o lote de prompts não é gravado.
7. **Baixar CSV:** exporta o estado salvo. Recarregar consulta os arquivos atuais. Alterações não salvas precisam ser salvas ou descartadas antes dessas ações.

O estágio de produção é calculado, não uma célula manual. O status `published` é exibido como “Liberado para publicação”: salvar não executa Git nem deploy. Mudanças em estilo, títulos ou composição podem exigir novo prompt e nova imagem externa. Revise antes de agendar. A validação estrutural não comprova a correção visual da arte.

Pacotes legados também têm consulta, formulário de edição e exclusão. O formulário preserva seu contrato, idiomas e geografia, permite metadados, artigo Markdown e legenda, e valida citações/números em uma cópia privada antes de salvar. Eles não são convertidos automaticamente para um dos três estilos novos. Metadados inválidos continuam identificados na tabela e exigem correção antes de editar.

## Importar CSV

No planejamento, abra **Importar pautas por CSV** → **Baixar modelo CSV**. Substitua o exemplo pelas suas pautas, salve como CSV UTF-8 e selecione o arquivo. Clique **Validar e visualizar**, confira a lista e use **Confirmar importação**. Salve ou descarte edições pendentes antes de importar.

Colunas: `topic` e `style` obrigatórias; `category` (padrão geography), `kind` (map), `layout` (vazio), `languages` (en), `title_en`, `title_pt_br` (título do topic quando vazios) e `instructions` opcionais. Para dois idiomas, preencha `en,pt-BR`; use títulos traduzidos nas colunas correspondentes. Estilos e layouts seguem os contratos oficiais. O modelo usa BOM UTF-8 e ponto e vírgula, compatível com Excel/LibreOffice; CSV separado por vírgula também é aceito.

Até 100 pautas e 500 KB por arquivo. Prévia não grava arquivos; a confirmação revalida o lote e verifica colisões. Todas as pautas entram como draft sem data de publicação. IDs vêm de topic; duplicados, IDs existentes, colunas desconhecidas e valores inválidos bloqueiam o lote. A importação não atualiza posts existentes e não gera pesquisa, prompts finais ou imagens. **Baixar CSV** continua sendo o relatório de produção e não é o modelo de importação. Arquivos enviados são lidos em memória, sem guardar uma cópia pública do CSV.

## Excluir e restaurar

Clique em **Excluir** na linha ou no formulário, ou em **Excluir selecionados** na edição em massa. A confirmação mostra os IDs que serão movidos. **Mover para lixeira** retira o conteúdo das pastas ativas e preserva o pacote inteiro, incluindo imagens e prompts, em `.studio/trash/`. Nenhum arquivo é apagado permanentemente pelo painel.

Na aba **Lixeira local**, use **Restaurar** para recuperar o pacote. Se já existir outro conteúdo com o mesmo ID, a restauração é bloqueada e nada é sobrescrito. O status/data anteriores são preservados; confira antes do próximo commit/build. Excluir localmente não executa deploy, mas um commit posterior com a exclusão remove aquela publicação no próximo deploy.

## Arquivos e proteção

- Posts: `content/visuals/<id>/post.json`, versionados para que o build no GitHub possa publicá-los conforme status/data.
- Relatório gerado: `content/catalog.csv`, ignorado pelo Git e fora dos assets públicos.
- Lixeira recuperável: `.studio/trash/<id-da-exclusao>/`, com metadados e o pacote completo; ignorada pelo Git.
- Cópias de validação do legado: `.studio/validation/`, privadas e ignoradas pelo Git.
- Backups de edição: `.studio/backups/<transacao>/changes.json`, com conteúdo anterior e posterior dos arquivos alterados. São privados e ignorados pelo Git. A recuperação pode ser feita com Codex a partir desse arquivo.
- Listas de trabalho em `content/inbox/` são locais; apenas os exemplos/template entram no Git.

Cada linha possui uma revisão baseada no hash do post.json. Se outro painel ou o Codex editar o arquivo, a gravação com revisão antiga é recusada. Recarregue para revisar os novos dados. Os backups não substituem uma cópia de segurança do computador.

## Ausência na versão online

O painel é middleware exclusivo do Vite em desenvolvimento (`apply: serve`, `configureServer`). Não há rota Astro nem Pages Function de administração. O HTML e a API local não são copiados para public/dist. O link no site usa `import.meta.env.DEV`. `npm run preview` mostra o build público, sem esse painel.

Acesso restrito a conexão/Host loopback, requisições da mesma origem, token efêmero e JSON para mutações. Nenhum CORS aberto. Não exponha o servidor de desenvolvimento por túnel/proxy: ele inclui previews locais de drafts em outras páginas. O painel não usa login remoto nem depende de Cloudflare.

`npm run site:verify` confere que a saída pública não contém página, planilha ou referências ao painel/API privados.
