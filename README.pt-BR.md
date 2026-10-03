# Pirate Battle

[Jogar](https://game-pirate-battle.vercel.app/) | [English guide](README.md) | [Repositório original do desafio](https://github.com/junglegaming/game-developer-challenge)

Jogo naval 2D desenvolvido para o desafio de React, TypeScript e PixiJS. Navegue pela arena, desvie da ilha e enfrente Chasers e Shooters usando disparos frontais e laterais. A interface do jogo e a documentação técnica permanecem em inglês; este arquivo é o guia complementar em português.

## Estado do projeto

**O desenvolvimento do escopo do desafio está concluído e o jogo está publicado na Vercel.** Foram entregues gameplay, telas, persistência, ranking/histórico, recuperação de falhas, testes automatizados, arquitetura e evidências de profiling. As limitações estão documentadas; sugestões de evolução ficam separadas do escopo implementado.

A validação passou com **161 testes unitários/integração, 176 execuções E2E desktop/mobile e 6 execuções em StrictMode**, incluindo seis comparações visuais sem atualizar os baselines. Formatação, lint, tipos e build também passaram. Os [relatórios versionados](docs/delivery/artifacts/2026-10-03-release/README.md) registram as evidências e seu alcance.

## Fonte do desafio

O projeto implementa o shooter naval proposto em [junglegaming/game-developer-challenge](https://github.com/junglegaming/game-developer-challenge), com React, TypeScript, PixiJS, APIs simuladas, testes e documentação de performance. Esse é o repositório fonte do enunciado e dos assets. O texto completo também permanece preservado em [CHALLENGE.md](CHALLENGE.md).

## O que foi construído

- Simulação em TypeScript puro, passo fixo de 60 Hz, pausa manual/automática e controles simultâneos de teclado/toque.
- Arena PixiJS, inimigos, colisões, dano, pontuação, efeitos, barras de vida e resultado persistente.
- Options com validação e persistência; configuração completa congelada no início de cada partida.
- Ranking e Match History usando Axios, TanStack Query e MSW, paginação e comparação por configuração.
- Registro idempotente, fila persistente de envios pendentes, recuperação após refresh e 14 cenários de rede.
- Testes unitários, E2E em desktop/mobile, baselines visuais e profiling medido com evidências.
- Colisões contínuas de projéteis, spawn seguro, limites de alcance/vida útil e pontuação sem duplicação.
- HUD por snapshots, sem renderização React a cada frame; cache de texturas e limpeza de recursos compatível com StrictMode.
- Contratos REST tipados, cancelamento de consultas, retries limitados, desempate determinístico e proteção contra respostas obsoletas.
- SCSS Modules, tokens Sass, ESLint, Stylelint, Prettier, workflow de CI, ADRs e specs rastreáveis aos testes.

**Jogue na Vercel: [Pirate Battle](https://game-pirate-battle.vercel.app/).** A publicação está acessível. A [verificação publicada](docs/delivery/public-verification.md) registra os checks de worker, refresh, persistência e recuperação, com seus limites.

## Publicação e entrega

A publicação na Vercel usa preset Vite, raiz do repositório, Node.js 24.x, instalação `npm ci`, build `npm run build` e saída `dist`. Não são necessárias variáveis de ambiente. O [README em inglês](README.md#publish-on-vercel) contém as instruções completas e referências da plataforma.

Os checks publicados confirmaram worker, refresh, persistência de Options, registro nas duas abas e recuperação dos envios pendentes. Ao atualizar a entrega, faça o redeploy e confira o SHA na Vercel. A revisão manual em celular físico permanece separada dos testes automatizados. Envie a URL pública, a URL do repositório e o SHA do commit publicado.

Os [relatórios da última verificação local](docs/delivery/artifacts/2026-10-03-release/README.md) ficam versionados junto às evidências anteriores e ao profiling. O enunciado original permanece em CHALLENGE.md; o README padrão e os documentos técnicos permanecem em inglês.

## Como executar

Use Node.js 20.19+ na linha 20.x, 22.12+ na linha 22.x ou 24+.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Abra a URL indicada pelo Vite. Não são necessárias variáveis de ambiente nem serviços privados. Os registros ficam no navegador/origem atual; não existe um ranking compartilhado entre computadores. O worker requer HTTPS ou localhost.

## Como jogar e testar

W/seta para cima avança; A/D ou setas esquerda/direita giram; Space dispara à frente; Q/E disparam três projéteis paralelos pelo lado correspondente; Esc/P pausa. No mobile, use os botões de toque, com ações simultâneas. Perder foco ou ocultar a aba pausa o jogo; a retomada exige uma ação explícita. Sair ou recarregar durante o combate abandona a partida sem registrá-la.

Options permite salvar duração de 60–180 segundos e intervalo de spawn proposto de 1–10 segundos. Os padrões são 120 e 3 segundos. Alterações valem para novas partidas. O resultado concluído pode ser reaberto em Last Result após refresh.

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npx playwright test --config=playwright.strict.config.ts
npm run test:e2e:report
```

Os testes de navegador usam as portas 4173 e 4174. O [guia de testes](TESTING.md) descreve os comandos, os relatórios e os cenários. Para reproduzir a recuperação, abra `/?scenario=offline-at-match-end&seed=42`, conclua uma partida, recarregue e selecione Recover connection no painel Network scenarios. O registro deve confirmar com o mesmo identificador, sem duplicar.

Apply troca o cenário preservando os dados. Reset demo data descarta resultados, envios pendentes e registros de demonstração, mantendo Options e a identidade local. Leia o escopo exibido antes de usar esse reset.

## Documentação e limites

- [Guia em inglês](README.md): comandos, controles, configuração, rede e entrega.
- [Arquitetura](ARCHITECTURE.md) e [guia técnico](TECHNICAL.md).
- [Auditoria do enunciado](docs/delivery/challenge-audit.md) e [revisão final](docs/delivery/final-review.md).
- [Profiling medido](docs/performance/profiling.md) e evidências brutas.
- [Registro da construção e apoio da IA](docs/README.md).

Os testes mobile usam emulação; não comprovam desempenho num celular físico. O profiling usa um preset explícito de resistência e mede a cadência de renderização, sem comprovar frames apresentados no monitor ou ausência de vazamentos. Escritas simultâneas em várias abas não são coordenadas. O enunciado original permanece integral em CHALLENGE.md.

## Carregamento inicial

A primeira renderização e o refresh podem apresentar uma pequena demora, observada na revisão da entrega. O startup do aplicativo e do worker, além de PixiJS e texturas ao entrar na partida, tem custo separado do FPS durante o combate. A causa exata não foi medida; o bundle principal grande permanece uma possível contribuição. Esta atualização documenta a observação e não reivindica uma otimização do carregamento.

## Sugestões de evolução fora do escopo entregue

- Medir o startup para orientar divisão do bundle e preload de assets.
- Ampliar cobertura em celulares físicos e outros navegadores.
- Explorar novas arenas, padrões de inimigos e feedback sonoro.
- Em uma evolução de produto, avaliar backend compartilhado e coordenação entre abas.

## Apoio da IA

A IA apoiou a documentação, o planejamento e a implementação dos testes, mudanças no aplicativo, investigação de falhas e revisão das evidências. O guia de construção registra esse apoio por etapa. A responsabilidade por revisar o código, compreender as decisões e validar a entrega permanece com o desenvolvedor.
