# Inicializador local no Windows

Na raiz, dê dois cliques em **iniciar.cmd** ou execute:

```powershell
.\iniciar.cmd
```

O site fica em **http://127.0.0.1:4321/**. O botão **Plan** abre o planejamento local. Mantenha a janela do inicializador aberta enquanto estiver usando o site.

## O que ele faz

1. Obtém uma trava exclusiva para esta pasta do projeto. Uma nova execução substitui a anterior.
2. Encerra o inicializador anterior verificando PID, data de criação e identidade do script, para não confundir um PID reutilizado.
3. Encerra os runtimes reconhecidos do WWMaps e suas árvores de processos: Astro, Wrangler/workerd, esbuild e helpers de preview.
4. Libera as portas reservadas **4321, 8788 e 8789**, inclusive se outro processo estiver ocupando uma delas. Portanto, use essas portas para este projeto. Processos independentes em outras portas não são encerrados.
5. Procura Node **22.19+** no PATH. Se necessário, tenta o runtime já existente no cache local do Codex. Não instala nem baixa Node. Na ausência de versão compatível ou dependências, encerra com uma mensagem; execute `npm ci` uma vez após instalar Node compatível.
6. Prepara dados e previews e inicia o Astro diretamente, sem manter uma cadeia de wrappers npm/cmd para cada tarefa. O servidor só é anunciado após responder HTTP.

O Astro usa porta estrita: não migra silenciosamente para 4322 ou outras portas quando há conflito. Se uma porta não puder ser liberada, o inicializador falha em vez de deixar outro servidor em paralelo. Processos protegidos do Windows e os ancestrais da própria execução não são encerrados. Caso um processo de outro usuário/administrador impeça a limpeza, a mensagem identifica a falha.

## Parar e reiniciar

```powershell
.\iniciar.cmd stop
# Ou diretamente:
.\iniciar.ps1 -Stop
```

Para reiniciar, abra **iniciar.cmd** novamente. Também é possível encerrar com **Ctrl+C** ou fechando a janela. Os processos do servidor entram em um **Windows Job Object com KILL_ON_JOB_CLOSE**: fechar ou finalizar à força o inicializador encerra seus filhos, incluindo processos auxiliares. Não há daemon de limpeza separado.

O CMD não usa `pause` nem `-NoExit`, para não deixar janelas antigas esperando após uma substituição. Para ler uma mensagem de erro com calma, execute o script em um terminal já aberto.

## Opções

```powershell
# Abrir o navegador depois que o site responder:
.\iniciar.cmd -OpenBrowser

# Usar outra porta explicitamente (as três portas padrão também são limpas):
.\iniciar.cmd -Port 4330
```

Por padrão, o navegador não é aberto para evitar abas repetidas. O único laço de acompanhamento aguarda o encerramento do processo; não faz builds, consultas de rede ou varreduras de memória continuamente.

Estado e logs ficam em **.studio/runtime/**, ignorados pelo Git:

- `launcher.json`: identidade da instância ativa, removida na parada normal. Se a janela for finalizada à força, a próxima execução descarta o estado antigo com segurança.
- `prepare.out.log` / `prepare.err.log`: preparação.
- `dev.out.log` / `dev.err.log`: servidor.

Os logs são substituídos na próxima execução. O gerenciamento evita instâncias e filhos órfãos; não impõe um limite arbitrário de RAM ao servidor nem corrige eventuais vazamentos internos de bibliotecas.

`npm run dev` continua disponível como entrada manual, mas não passa pela limpeza e pelo Job Object. Para o uso cotidiano no Windows, prefira **iniciar.cmd**. `npm run preview` continua sendo a prévia do build público, sem o botão Plan.

## Verificações realizadas

Testado em Windows PowerShell 5.1: limpeza de instâncias antigas, portas liberadas, segunda inicialização substituindo a primeira, comando `stop`, término forçado do inicializador encerrando servidor e esbuild e preservação de um processo Node independente. O build público também mantém o painel local fora da publicação.
