# Experimento reversível: movimento do mapa central

## Desligar em uma linha

Em `apps/web/src/config/map-motion.ts`, altere `enabled: true` para **`enabled: false`**. Reinicie/reconstrua o site conforme o comando em uso. O componente passa a devolver somente o mapa original: sem camada visual, toolbar ou alterações de layout. Para comparar imediatamente no navegador, use o botão Pausar/Ativar animação; isso pausa o efeito e lembra a preferência nesse navegador, mas não remove a toolbar.

Se pedir “não gostei, reverta a animação”, basta desligar essa configuração. Não é preciso desfazer comparador, estilos editoriais, dados ou outras etapas. Uma remoção definitiva consiste em retirar o wrapper/import `MapMotion` de `Dashboard.astro` e apagar os dois arquivos novos do experimento. Nenhum CSS global foi alterado.

## O que foi acrescentado

- Varredura lenta em roxo, halo suave e órbita pontilhada, atrás dos países.
- Transição suave de cor ao trocar o indicador/ano pelos controles existentes.
- Identificação bilingue “Local dataset / Ambient motion” ou “Dados locais / Movimento visual”.
- Pausa manual, automática fora da tela/aba oculta e respeito a `prefers-reduced-motion`.

São três elementos SVG animados por CSS e um pequeno indicador de estado. Não há biblioteca nova, requisição periódica, WebSocket, relógio de atualização fictício ou alteração automática de números. O experimento utiliza os dados locais já carregados; o dataset ativo continua demonstrativo. As curvas são ornamentais, não rotas, eventos, fluxos comerciais nem observações geográficas. Ficam atrás das cores quantitativas e não alteram a geometria real.

Toda a apresentação e a lógica de pausa estão em `apps/web/src/components/MapMotion.astro`. O armazenamento da preferência usa a chave local `wwmaps:map-motion`; não envia dados. Sem JavaScript, o efeito começa pausado. Com movimento reduzido, a animação e as transições ficam desativadas. Na impressão a camada decorativa e a toolbar são ocultadas.

Verificação realizada: build com a chave desligada confirmou mapa presente e ausência do wrapper/toolbar em EN e PT-BR. Depois a chave foi religada. No navegador, pausa/retomada e preferência após recarregar foram conferidas; o número exibido permaneceu igual durante o efeito. Não houve erro no console. A preferência de movimento reduzido é respeitada por CSS e JavaScript; não alteramos a configuração do sistema operacional para testá-la.
