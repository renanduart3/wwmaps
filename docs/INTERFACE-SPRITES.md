# Personagens da interface

Sete personagens isolados da cartela WWMaps fornecida pelo usuário, editados com a ferramenta integrada de imagens para remover o fundo e os elementos vizinhos. São adaptações por IA da referência; não são recortes pixel a pixel. Os arquivos finais são PNGs com transparência em `apps/web/public/sprites/`.

| Arquivo | Uso |
| --- | --- |
| `mascot.png` | Assinatura junto à logo, em um selo bege sobre o cabeçalho roxo |
| `researcher.png` | Cabeçalho da busca e nota sobre metodologia na página inicial |
| `map-reader.png` | Cabeçalho das categorias |
| `chart-presenter.png` | Introdução da comparação entre países |
| `laptop-analyst.png` | Abertura da galeria de publicações |
| `traveler.png` | Área de produtos da página inicial, coleção e rodapé |
| `gardener.png` | Rodapé, junto ao viajante e a uma rota pontilhada decorativa |

O componente `apps/web/src/components/InterfaceSprite.astro` centraliza dimensões, carregamento e acessibilidade. São ilustrações decorativas, com texto alternativo vazio, ignoradas por leitores de tela e ocultadas na impressão. Não representam valores estatísticos nem são imagens de posts. Não há animação ou JavaScript adicional.

## Desligar ou substituir

Em `apps/web/src/config/interface-sprites.ts`, altere `enabled: true` para `enabled: false`. Todas as instâncias desaparecem. Para trocar um personagem, substitua o PNG de mesmo nome. Os arquivos são locais e seguem no build estático para Cloudflare Pages.

## Produção dos arquivos

Referência: `Cartela de Sprites do Império WWMaps.png`, enviada pelo usuário. Modo: edição com a ferramenta integrada de imagens, fundo transparente. Os prompts completos usados estão em `assets/interface-sprites/prompts.json` e `assets/interface-sprites/crew-prompts.json`; não são prompts editoriais do fluxo de publicações.

A marca usa o mascote com chapéu de navio de papel. O rodapé reúne viajante e jardineiro em uma pequena composição; os demais personagens orientam as seções. Todos os sete arquivos têm uso na interface. Foram selecionados personagens ligados a pesquisa, mapas e dados para manter a interface limpa. Os demais personagens da cartela continuam disponíveis na imagem original para uma etapa posterior.
