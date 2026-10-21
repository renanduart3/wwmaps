# Painel editorial local

```powershell
npm run dev
```

Abra **http://127.0.0.1:4321/__studio/** ou use o link “Painel local / Local studio” exibido no site em desenvolvimento. O painel está em português e opera conteúdos EN e PT-BR.

## Como usar

1. **Adicionar pautas:** digite um assunto por linha, escolha explicitamente o estilo editorial, a categoria, o formato e os idiomas. Os posts são criados como drafts. O estilo não é escolhido silenciosamente.
2. **Editar células:** títulos dos idiomas existentes, estilo, categoria, tipo de visual, layout, status e data com fuso. O ID é fixo para preservar pastas e URLs. Pesquisa, fontes e textos completos continuam no fluxo com Codex/post.json.
3. **Editar em massa:** filtre a tabela, marque as linhas desejadas, abra “Edição em massa”, escolha os campos e clique “Aplicar à seleção”. “Manter” não altera aquele campo. “Selecionar todos” seleciona somente os itens editáveis do filtro; o lote pode ser conferido na tabela antes de salvar.
4. **Salvar alterações:** grava os post.json selecionados. O lote é validado antes da gravação. Uma linha inválida impede o lote. Agendar/liberar exige data com fuso, pesquisa, prompts atuais e imagens válidas em todos os idiomas.
5. **Atualizar prompts:** após salvar, selecione os posts e clique na ação correspondente. Ela exige pesquisa completa e não gera imagens. Se houver um item incompleto, o lote de prompts não é gravado.
6. **Baixar CSV:** exporta o estado salvo. Recarregar consulta os arquivos atuais. Alterações não salvas precisam ser salvas ou descartadas antes dessas ações.

O estágio de produção é calculado, não uma célula manual. O status `published` é exibido como “Liberado para publicação”: salvar não executa Git nem deploy. Mudanças em estilo, títulos ou composição podem exigir novo prompt e nova imagem externa. Revise antes de agendar. A validação estrutural não comprova a correção visual da arte.

Pacotes legados e metadados inválidos aparecem para consulta. Não são convertidos automaticamente para o novo contrato; alterações desses pacotes continuam pelos arquivos e pelo Codex. Uma tradução ausente não é criada só porque um título foi editado.

## Arquivos e proteção

- Posts: `content/visuals/<id>/post.json`, versionados para que o build no GitHub possa publicá-los conforme status/data.
- Relatório gerado: `content/catalog.csv`, ignorado pelo Git e fora dos assets públicos.
- Backups de edição: `.studio/backups/<transacao>/changes.json`, com conteúdo anterior e posterior dos arquivos alterados. São privados e ignorados pelo Git. A recuperação pode ser feita com Codex a partir desse arquivo.
- Listas de trabalho em `content/inbox/` são locais; apenas os exemplos/template entram no Git.

Cada linha possui uma revisão baseada no hash do post.json. Se outro painel ou o Codex editar o arquivo, a gravação com revisão antiga é recusada. Recarregue para revisar os novos dados. Os backups não substituem uma cópia de segurança do computador.

## Ausência na versão online

O painel é middleware exclusivo do Vite em desenvolvimento (`apply: serve`, `configureServer`). Não há rota Astro nem Pages Function de administração. O HTML e a API local não são copiados para public/dist. O link no site usa `import.meta.env.DEV`. `npm run preview` mostra o build público, sem esse painel.

Acesso restrito a conexão/Host loopback, requisições da mesma origem, token efêmero e JSON para mutações. Nenhum CORS aberto. Não exponha o servidor de desenvolvimento por túnel/proxy: ele inclui previews locais de drafts em outras páginas. O painel não usa login remoto nem depende de Cloudflare.

`npm run site:verify` confere que a saída pública não contém página, planilha ou referências ao painel/API privados.
