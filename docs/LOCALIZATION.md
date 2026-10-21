# Idiomas e identidade — etapa 2

A interface tem inglês em `/` e português em `/pt-br/`. Componentes e rotas são compartilhados; a localização muda textos, nomes de países, unidades exibidas e mensagens, preservando os dados numéricos. Nenhuma tradução de interface converte valores mock em estatísticas oficiais.

## Onde editar

- `apps/web/src/lib/i18n.ts`: textos EN/PT-BR, países, indicadores, títulos/subtítulos dos visuais e produtos. A tipagem exige as mesmas chaves de interface nos dois idiomas. Novos visuais ou produtos sem tradução inglesa interrompem o build.
- `packages/contracts/src/taxonomy.ts`: categorias bilingues.
- `apps/web/src/lib/routes.ts`: equivalência entre rotas.
- `apps/web/src/lib/page-entries.ts`: páginas estáticas compartilhadas e redirects legados.
- `Base.astro`: navegação no idioma atual, seletor global, canonical, hreflang e metadados sociais.
- `comparison-state.ts`: leitura validada dos países/ano na URL; mantém a seleção ao trocar idioma.

| Página | Inglês | Português |
| --- | --- | --- |
| Início | `/` | `/pt-br/` |
| Comparar | `/compare/` | `/pt-br/comparar/` |
| Categorias | `/categories/` | `/pt-br/categorias/` |
| Coleção | `/collection/` | `/pt-br/produtos/` |
| Busca | `/search/` | `/pt-br/busca/` |
| Sobre | `/about/` | `/pt-br/sobre/` |
| Método | `/methodology/` | `/pt-br/metodologia/` |
| Visual | `/visuals/<slug>/` | `/pt-br/visuais/<slug>/` |

As antigas URLs portuguesas sem prefixo redirecionam para a versão PT-BR. O Cloudflare recebe regras 301 em `public/_redirects`; páginas estáticas de fallback também são geradas para previews sem esse recurso.

As páginas editoriais mantêm suas URLs e só declaram alternates que existem. O artigo legado de Mercator ainda foi aprovado apenas em português: ele aparece na busca e nas categorias PT-BR, sem uma tradução inglesa publicada automaticamente. Seu seletor English leva à home inglesa. A tradução do conteúdo editorial requer revisão antes de ampliar `languages` no pacote. A interface de leitura e os links já seguem o idioma do artigo.

## SEO e arquivos de marca

- `/sitemap.xml`: páginas indexáveis e traduções editoriais existentes. Visuais mock com noindex e o comparador demo ficam fora do sitemap.
- `/robots.txt`: aponta para o sitemap do domínio previsto.
- Favicon SVG e cartões sociais EN/PT-BR em PNG 1200 × 630 na identidade WWMaps.
- O cartão é gerado por `scripts/prepare-brand.ts` durante o prepare, nunca editado no dist.
- Fonte **Barlow Condensed ExtraBold Italic**, servida por arquivos WOFF2 do próprio site via Fontsource, com `font-display: swap`. Licença SIL OFL em `docs/BARLOW-OFL.txt` e no diretório público `/brand/` após o build. Acentos PT-BR fazem parte do subconjunto Latin.
- Os assets do exemplo Mercator receberam cores e marca WWMaps. A versão anterior está em `output/branding-backup/`. Textos, evidências e estado de publicação foram preservados. O renderer editorial continua esquemático e usa fonte própria; a incorporação tipográfica nesse renderer pertence à etapa 6.

## Verificação e limites

```powershell
npm run check
npm test
npm run build
npm run site:verify
```

A verificação do build conferiu 45 páginas localizadas, idioma do HTML, metadados, seletor, links locais, WOFF2, dimensões do cartão social e alternates no sitemap. Testes cobrem equivalência de rotas, cobertura dos catálogos traduzidos e parâmetros inválidos/duplicados na seleção.

No navegador: home EN/PT-BR, seleção de cinco países por teclado, troca de idioma preservando ano e países, mensagem de exportação e JSON em PT-BR. Revisão visual em desktop e em frames de 390 px e 768 px; isso não simula todos os navegadores/dispositivos. A estrutura foi inspecionada pela árvore de acessibilidade. O mapa expõe uma imagem descritiva, evitando ler centenas de contornos; o seletor de país permite operar por teclado.

Pares principais de texto medidos contra seus fundos: corpo 14,84:1; roxo sobre bege 5,99:1; texto auxiliar 5,69:1; aviso de demonstração 6,69:1; branco sobre crimson 5,96:1. Isso não é uma auditoria WCAG integral. Falta homologação assistiva em leitor real como NVDA ou VoiceOver.

Para repetir a inspeção visual local, inicie a prévia em 8788 e execute `node scripts/responsive-preview.mjs`. Abra `http://127.0.0.1:8789/__review?size=mobile` ou `?size=tablet&path=/pt-br/`. O servidor fica restrito ao loopback e não participa do build/deploy. Encerre-o após a revisão.

No Windows, encerre a prévia antes de reconstruir o dist se ocorrer EPERM por arquivo/diretório em uso. Reinicie a prévia depois do build.
