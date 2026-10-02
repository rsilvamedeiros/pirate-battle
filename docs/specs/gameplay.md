# Gameplay specification

Sources: [CHALLENGE.md](../../CHALLENGE.md) §§2–4, §7, and §8; [ADR 0002](../adr/0002-functional-core-imperative-shell.md), [ADR 0003](../adr/0003-fixed-timestep-simulation.md), [ADR 0004](../adr/0004-react-pixi-sync-strategy.md), and [ADR 0007](../adr/0007-seeded-rng-and-test-hooks.md).

Challenge requirements are stated below. Controls, numeric tuning, and behaviors explicitly labeled **proposed** are design choices awaiting validation, not additional challenge requirements.

## Controls

All bindings and touch controls in this table are **proposed**.

| Action | Keyboard | Touch control |
| --- | --- | --- |
| Move forward | W / ArrowUp | Hold Forward button |
| Rotate left | A / ArrowLeft | Hold Rotate Left button |
| Rotate right | D / ArrowRight | Hold Rotate Right button |
| Front fire | Space | Hold Front Fire button |
| Left side fire | Q | Hold Left Fire button |
| Right side fire | E | Hold Right Fire button |
| Pause | Esc / P | Tap Pause button |

Movement, rotation, and each weapon use independent action states. Keyboard combinations and simultaneous touch pointers must support moving and firing together. Proposed: held fire repeats subject to cooldown; opposite rotation commands cancel each other; front, left, and right weapons may fire concurrently with independent cooldowns.

Capture gameplay keys only in the active gameplay context, suppressing browser defaults only for handled keys. Clear held actions on pointer cancellation, focus loss, pause, exit, and restart. Proposed: while paused, a focused Resume button or Esc/P resumes explicitly; resuming requires fresh movement/fire input and never replays paused actions.

## Game configuration

Parameters form one typed configuration, frozen as a snapshot at match start. Options changes affect subsequent matches only. Validate finite numbers and bounds; HP values are integers. Only sessionTime and enemySpawnInterval are exposed in Options (§3).

All defaults and bounds below are **proposed**, except the required sessionTime range of 60–180 s. Logical units (lu) are world coordinates, independent of screen pixels and pixel density. Proposed tuning reference: a 1000 × 700 lu arena scaled proportionally to the viewport; validate ship footprints and safe spawn availability against the eventual island layout.

| Parameter | Unit | Default (proposed) | Minimum | Maximum | Options |
| --- | --- | ---: | ---: | ---: | --- |
| sessionTime | active s | 120 | 60 (required) | 180 (required) | Yes |
| enemySpawnInterval | active s | 3 | 1 | 10 | Yes |
| chaserSpawnWeight | fraction | 0.5 | 0.1 | 0.9 | No |
| shooterSpawnWeight | fraction | 0.5 | 0.1 | 0.9 | No |
| minSpawnDistance | lu, center-to-center | 250 | 150 | 400 | No |
| playerHp | HP | 100 | 1 | 500 | No |
| chaserHp | HP | 40 | 1 | 500 | No |
| shooterHp | HP | 60 | 1 | 500 | No |
| playerMoveSpeed | lu/s | 180 | 30 | 400 | No |
| chaserMoveSpeed | lu/s | 100 | 30 | 300 | No |
| shooterMoveSpeed | lu/s | 80 | 30 | 300 | No |
| playerRotationSpeed | rad/s | 3 | 0.5 | 6 | No |
| chaserRotationSpeed | rad/s | 2.5 | 0.5 | 6 | No |
| shooterRotationSpeed | rad/s | 2 | 0.5 | 6 | No |
| frontProjectileDamage | HP/projectile | 20 | 1 | 100 | No |
| sideProjectileDamage | HP/projectile | 15 | 1 | 100 | No |
| shooterProjectileDamage | HP/projectile | 10 | 1 | 100 | No |
| frontProjectileSpeed | lu/s | 400 | 100 | 800 | No |
| sideProjectileSpeed | lu/s | 350 | 100 | 800 | No |
| shooterProjectileSpeed | lu/s | 250 | 100 | 800 | No |
| frontProjectileRange | lu | 600 | 100 | 1200 | No |
| sideProjectileRange | lu | 450 | 100 | 1200 | No |
| shooterProjectileRange | lu | 500 | 100 | 1200 | No |
| frontProjectileLifetime | active s | 1.5 | 0.25 | 5 | No |
| sideProjectileLifetime | active s | 1.5 | 0.25 | 5 | No |
| shooterProjectileLifetime | active s | 2 | 0.25 | 5 | No |
| frontFireCooldown | active s | 0.35 | 0.1 | 3 | No |
| sideFireCooldown | active s | 1 | 0.1 | 3 | No |
| shooterAttackRange | lu | 400 | 100 | 600 | No |
| shooterFireCooldown | active s | 1.5 | 0.25 | 5 | No |
| chaserCollisionDamage | HP/impact | 25 | 1 | 100 | No |

Proposed cross-field validation: spawn weights sum to 1; shooterAttackRange does not exceed min(shooterProjectileRange, shooterProjectileSpeed × shooterProjectileLifetime). Both range and lifetime are tracked; whichever is exhausted first removes the projectile. Feasible spawn distance also depends on the arena and ship footprints, so passing numeric bounds alone does not authorize an overlapping spawn.

The chosen enemySpawnInterval bounds keep the exposed value positive and initially constrain spawn pressure. Defaults and other bounds need playtesting and profiling; the challenge does not supply them. Configuration changes must not require changes to system logic.

## Player

Initial navigation geometry (**proposed**, implemented): a 1000 × 700 lu arena, one circular island centered at (500, 350) with radius 100 lu, and a player collision radius of 40 lu enclosing the 44 × 64 lu hull. Clamp the ship center to arena bounds inset by its radius; reject movement overlapping the island, while allowing rotation. Combat collision geometry remains pending.

The player moves forward along its heading and rotates left or right; there is no required reverse or strafe action. Front fire emits one projectile forward. Each side fire emits three parallel projectiles toward that side, rather than a fan; proposed: place their origins along the hull with non-overlapping initial positions outside the firing ship.

Enemy projectiles and Chaser impact reduce player HP. Ships remain within the visible arena and cannot cross islands. Islands block projectiles as well as ships. The player loses when HP reaches zero.

## Enemies

| Type | Behavior | Damage and destruction |
| --- | --- | --- |
| Chaser | Rotates and advances toward the player while respecting islands | Applies chaserCollisionDamage once on player impact, then explodes and is removed; player attacks can destroy it when HP reaches zero |
| Shooter | Rotates and approaches the player; fires when within shooterAttackRange and its cooldown permits | Proposed: emits one projectile toward its current heading when aligned with the player and stops advancing inside attack range; player attacks destroy it when HP reaches zero |

Both types receive damage, advance, rotate, and obey island collisions. Proposed: each Shooter uses its own cooldown, and its first shot is subject to that cooldown after spawning; aiming tolerance and obstacle avoidance remain tuning details.

Spawns occur at the configured active-time interval until completion. Each spawn must fit completely inside the arena, avoid obstacles, and be sufficiently far from the player to prevent unavoidable immediate damage. Proposed: also avoid existing ships, check minSpawnDistance, and skip that interval if no valid point can be found rather than weakening safety checks.

Both types must appear during a standard match. Proposed: spawn a Chaser at the first interval and a Shooter at the second, then use seeded weighted selection. This guarantees both types in a standard match that reaches the second interval; early player death can end it sooner. Spawn schedule, weights, and seed are reproducible without using Math.random in the core.

## Combat rules

Initial weapons implementation (**proposed**): projectile circles have radius 4 lu; muzzle origins sit 46 lu from the player center. Broadside origins are spaced 16 lu along the hull at offsets −16, 0 and 16, with identical side headings. Swept segment contact uses the island expanded by projectile radius and arena bounds inset by that radius; remove the shot at the earliest contact along its reachable trajectory. Range/lifetime clip travel before contact checks, so obstacles beyond effective reach cannot produce impacts. Target damage is pending.

Cooldowns use the next eligible active-time timestamp for each weapon; player weapons start ready. Navigation/rotation is applied before spawning shots, which then advance during that fixed step. On time exhaustion, weapon state freezes without a new shot; simultaneous death/time arbitration remains unresolved until enemies are implemented. Proposed muzzle flash and obstacle impact durations are 120 ms and 180 ms of active time.

- Player projectiles damage enemies; enemy projectiles damage the player.
- A projectile applies damage at most once. Remove it on its first valid target or obstacle hit, range/lifetime exhaustion, or arena exit.
- Each weapon respects its configured cooldown in active simulation time. Proposed: weapons start ready for the player, cooldown starts when firing, and unused cooldown time never accumulates extra shots.
- Destroyed enemies cannot move, fire, deal damage, or participate in collisions. Destruction produces at most one scoring event.
- Proposed: process boundary/island blocking before target damage, and resolve equal-time target hits using stable entity IDs. An explosion is visual feedback and does not add unspecified area damage.

## Match rules

| Event | Required behavior |
| --- | --- |
| Enemy destroyed by player attacks | Add exactly 1 point |
| Chaser self-destructs against player | Add no points |
| Time exhausted or player HP reaches zero | Complete the match and show the result |
| Completion | Stop movement, attacks, damage, spawns, timer, and scoring; persist the completed result and enqueue its single submission |
| Restart / Play Again | Create fresh HP, score, timer, entities, input, cooldowns, and scheduling state using the current configuration snapshot |
| Manual pause, focus loss, or hidden tab | Suspend simulation, active timer, spawns, and cooldowns; clear input and the accumulator |
| Resume | Require player action, reset clock baseline, and do not accumulate paused movement or attacks |
| Refresh or leave active combat | Abandon the current match; do not submit it to history or ranking |

Proposed: at a fixed-step boundary, check time exhaustion before further combat; if HP becomes zero during combat, complete immediately and stop remaining interactions. If both end conditions coincide, player-death takes precedence. Effective duration counts executed active simulation time, excluding pause and discarded frame delays, as in ADR 0003.

An abandoned match does not replace the last completed result. A pending submission from an earlier completed match does not prevent a new match. API failures do not interrupt combat or block Options.

## Visual feedback

Provide perceptible firing effects, impact/damage feedback, destruction explosions, and ship deterioration as HP decreases. Keep the arena readable and show health above the player and every enemy ship using PixiJS.

Show score and remaining time in the HUD, with score, time, and match state also available semantically in React. Proposed: display remaining seconds using ceil(remaining active seconds) and publish HUD snapshots only when visible values change; do not render React or announce state on every frame.

## Screens

Screen content follows §3; navigation labels beyond those specified there are **proposed**.

| Screen | Elements | Actions |
| --- | --- | --- |
| Main Menu | Control instructions; Ranking and Match History tabs | Play; Options; switch tabs |
| Options | Game session time; Enemy spawn time; bounds and accessible validation; saved values | Proposed: Save; Back; apply saved values to future matches |
| Match | PixiJS arena, ship HP indicators, HUD, keyboard/touch controls, pause state, visible asset loading and retry on failure | Move, rotate, fire, pause; proposed Resume and Main Menu actions in pause dialog |
| Result | Score, active duration, end reason, pending/sending/confirmed/error registration state | Play Again; Main Menu; retry pending registration |
| Ranking | Player identification, score, configuration group, paginated ranking; loading/empty/error/refresh states | Change page; retry query; proposed configuration-group selection |
| Match History | Current player's date, score, duration, end reason, pagination; loading/empty/error/refresh states | Change page; retry query |

Scenario selection and reset controls are specified in [Network scenarios](network-scenarios.md); result registration and persistence are specified in [API contracts](api-contracts.md).

## Accessibility

- [ ] All interface text, labels, controls, and documentation are in English.
- [ ] Menus are keyboard navigable with visible focus.
- [ ] Dialogs manage focus; proposed: move focus into the dialog, contain navigation, and restore focus on close.
- [ ] Forms and controls have meaningful labels; errors are accessible and associated with the affected controls.
- [ ] Text, controls, and feedback provide adequate contrast.
- [ ] Score, time, and match state are available in a semantic interface without per-frame announcements.
- [ ] Capture gameplay keys only while the gameplay context is active.
- [ ] Provide usable touch controls with simultaneous movement and attacks.
- [ ] Desktop/mobile layouts do not crop the arena or HUD; resizing preserves rules and input coordinates.
- [ ] Declare supported mobile orientation; proposed: support portrait and landscape, subject to layout validation.
- [ ] Asset loading has visible progress or loading state; failures allow a retry before combat begins.

## Open questions

The challenge does not specify movement/collision geometry, island layout, aiming tolerance, projectile spacing, player identification, or balance values. Initial navigation uses the proposed geometry above and the 250 ms clamp in ADR 0003. Validate combat geometry, tuning, mobile orientation, and safe-spawn policy with the implemented game.
