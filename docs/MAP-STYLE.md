# Direção visual — mapas editoriais ilustrados

**Estudo legado.** Os estilos oficiais atuais são os três de `visual-styles.md`; a produção agora é somente de prompts para imagens externas. O guia técnico antigo foi preservado em `styles/legacy-map-style-guide.json`. O comando style:preview agora prepara prompts do fluxo novo e não executa a renderização descrita abaixo.

Fonte de verdade: `styles/map-style-guide.json`. Contratos e seleção: `packages/contracts/src/visual-style.ts`. A identidade continua roxo #7132DF, bege #FAF5E9, crimson #BE2349 e tinta #281A3B. Verde e lavanda suaves são superfícies auxiliares, não novas cores principais.

## Dois modos

| Modo | Uso | Personagens |
| --- | --- | --- |
| `playful-editorial` / Cartoon Editorial Maps | Curiosidades, educação, cultura, geografia leve | Opcionais; um guia pequeno, fora do mapa |
| `analytical-editorial` / Investigative Sketch Maps | Economia, geopolítica, inteligência regional, B2B e temas sensíveis | Nenhum |

Não existe obrigação de colocar bonequinhos. O padrão é `characters: "none"`. Economia, geopolítica, categoria/tipo regional-intelligence, propósito B2B ou `sensitiveContent: true` no arquivo de pesquisa forçam o modo analítico, mesmo se o modelo pedir cartoon. Marque sensibilidade também em história, cultura, religião e sociedade quando o assunto exigir; o sistema não possui classificador semântico de violência/conflitos.

No briefing completo:

```json
{
  "sensitiveContent": false,
  "visual": {
    "title": "A different view of Earth",
    "subtitle": "Mercator and an equal-area projection",
    "mode": "playful-editorial",
    "characters": "guide",
    "accent": "#7132DF"
  }
}
```

Este trecho é parcial; preserve fontes, claims, traduções e demais campos do briefing. No contrato de planejamento, a preferência é `visualMode`; ao preparar o briefing transfira para `visual.mode`. O planejamento não executa renderização. Na saída de `ai draft`, a preferência é normalizada pela política antes de salvar; post, prompt e renderer usam o mesmo seletor.

## Geografia primeiro, ilustração depois

O Studio agora projeta os países reais de Natural Earth/world-atlas 1:110m em Mercator e Gall–Peters (cilíndrica equivalente, paralelos padrão ±45°). Usa exatamente as mesmas feições em ambos os painéis e nos dois estilos. Mercator recorta polos em aproximadamente ±85,05°; os painéis são ajustados separadamente. Não compare áreas por pixels entre os painéis. Fronteiras são generalizadas e contemporâneas; não servem para análises históricas, jurídicas ou medições precisas.

A camada ilustrada acrescenta tinta escura com pesos discretamente variados, junções arredondadas, superfícies suaves, papel sutil, sublinhados e seta desenhada. A textura fica atrás dos dados e textos. Não usamos deslocamento de costa, jitter de coordenadas ou reconstrução geográfica por IA. Os personagens são elementos vetoriais auxiliares fora das regiões.

No observatório e nas miniaturas, preservamos a projeção Natural Earth e as cores quantitativas; aplicamos bordas de tinta, molduras e acabamento editorial. A seleção permanece crimson e os controles por teclado continuam disponíveis. Os números da home continuam mock, com os avisos existentes.

## Prompts para IA

`createImagePrompt` salva tópico, modo, tom, insight, elementos obrigatórios/opcionais, identidade, dados e fontes, além do prompt completo em inglês. A direção dos oito formatos está no guia; o prompt executável continua restrito ao renderer implementado. Não acrescenta destaques de países ou proporções de área sem suporte do briefing. O prompt é especificação artística: a geometria deve ser composta pelo motor, não redesenhada livremente por um gerador de imagens.

Operação sugerida:

> Leia AGENTS.md e docs/MAP-STYLE.md. Prepare a pesquisa com fontes e marque sensitiveContent conforme o assunto. Escolha o modo editorial, preserve a geometria real e os valores. Gere briefing, pacote draft e prompt. Mostre a prévia e as limitações do renderer. Revise antes de publicar.

## Gerar as duas prévias

```powershell
npm run style:preview
```

Saídas em `output/style-previews/playful-editorial/` e `output/style-previews/analytical-editorial/`: `map.svg`, `instagram-4x5.png`, `cover.webp` e `image-prompt.json`. São estudos baseados no briefing PT-BR Mercator, sem alterar conteúdo publicado. `cover.webp` contém a peça completa em vez de cortar projeção ou notas. O renderer escolhe os rótulos EN/PT pelo primeiro idioma do briefing; o título/subtítulo devem ser fornecidos nesse idioma. Para peças em ambos os idiomas, prepare briefings visuais separados.

O site usa Barlow Condensed licenciada e hospedada localmente. O SVG declara Barlow Condensed/Arial Narrow; a rasterização usa as fontes instaladas e ainda precisa incorporar a fonte de forma portátil. Não prometer tipografia idêntica em toda máquina.

## Próximos incrementos

- Revisar e substituir o asset legado publicado, que ainda é esquemático.
- Incorporar a fonte licenciada ao processo de rasterização de forma portátil.
- Criar templates de callouts, ícones e personagens por contexto; o guia vetorial atual é apenas uma primeira variante.
- Implementar choropleth editorial, highlight, mapas históricos, fluxos e demais formatos com seus contratos próprios.
- Compor ilustrações raster opcionais mascaradas fora da geografia, com revisão humana; nenhuma chamada a gerador de imagens acontece automaticamente.
- Ligar a galeria pública aos pacotes aprovados. A galeria atual continua demonstrativa.

Verificação: testes comparam todos os paths entre os dois modos, verificam numericamente a preservação de área em Gall–Peters e a ampliação em Mercator, e impedem personagens nos contextos sóbrios. Isso não substitui revisão editorial e visual.
