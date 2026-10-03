# Pirate Battle

[English guide](README.md) | [Enunciado original](CHALLENGE.md)

Jogo naval 2D desenvolvido para o desafio de React, TypeScript e PixiJS. Navegue pela arena, desvie da ilha e enfrente Chasers e Shooters usando disparos frontais e laterais. A interface do jogo e a documentação técnica permanecem em inglês; este arquivo é o guia complementar em português.

## O que foi construído

- Simulação em TypeScript puro, passo fixo de 60 Hz, pausa manual/automática e controles simultâneos de teclado/toque.
- Arena PixiJS, inimigos, colisões, dano, pontuação, efeitos, barras de vida e resultado persistente.
- Options com validação e persistência; configuração completa congelada no início de cada partida.
- Ranking e Match History usando Axios, TanStack Query e MSW, paginação e comparação por configuração.
- Registro idempotente, fila persistente de envios pendentes, recuperação após refresh e 14 cenários de rede.
- Testes unitários, E2E em desktop/mobile, baselines visuais e profiling medido com evidências.

A publicação ainda está pendente. O projeto precisa de uma URL pública funcional e da validação do worker nesse ambiente antes da entrega. As etapas e os resultados verificáveis ficam na [revisão final](docs/delivery/final-review.md).

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

## Apoio da IA

A IA apoiou a documentação, o planejamento e a implementação dos testes, mudanças no aplicativo, investigação de falhas e revisão das evidências. O guia de construção registra esse apoio por etapa. A responsabilidade por revisar o código, compreender as decisões e validar a entrega permanece com o desenvolvedor.
