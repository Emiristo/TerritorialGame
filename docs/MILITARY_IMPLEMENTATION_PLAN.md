# Military Implementation Plan

## Status
**[IMPLEMENTED]** — M1 and M2 are implemented. M3–M9 remain planned.

## Reference
Military mechanics are based on the selected reference repository **Return-To-The-Roots/s25client**, but are adapted to the existing TerritorialGame architecture. Reference mechanics are not copied wholesale.

## M1 — Military Core
Implemented military subsystem as a separate domain module. Military buildings are identified from `BUILDING_TYPES`; military state contains soldiers and orders. No separate God Object was introduced.

## M2 — Territory Integration
Implemented direct integration with the existing `worldMap` and territory system.

Requirements and current implementation:
- use the existing worldMap geometry and coordinates — **implemented**;
- use the existing 8-direction adjacency model — **preserved**;
- military influence operates on the same map cells/territorial representation already used by the game — **implemented**;
- military buildings affect territory through the existing territory recalculation system — **implemented**;
- influence/radius calculations respect existing map boundaries and geometry — **implemented through worldMap.geometry**;
- no duplicate territory ownership state is introduced inside Military — **implemented**.

Military buildings expose territory sources derived from their existing building specifications. These sources are consumed by `territory.js`; Military does not maintain a second territory map.

**Principle:** Military extends the existing worldMap/territory mechanics; it does not replace them.

## M3 — Army
Implement the army/garrison model for military buildings.

The building contains soldiers as a garrison. Soldiers can be assigned to military buildings and participate in military orders according to the future combat model.

## M4 — Soldier Creation and Ranks
Implement the soldier lifecycle:

`WAREHOUSE / HQ → SOLDIER CREATION → GARRISON → RANK UPGRADES IN MILITARY BUILDINGS`

Requirements:
- a basic soldier is created through the warehouse/headquarters mechanism;
- the created soldier becomes an independent soldier entity before being assigned to a military building;
- military buildings are responsible for further soldier development/upgrading by ranks;
- rank progression must be explicit state, not a hidden numeric modifier;
- the system must support future equipment/armor progression without coupling soldier creation to combat logic.

The exact resource recipe/cost for soldier creation is **МЕХАНИКА НЕ ОПРЕДЕЛЕНА** and must be specified before implementation of the production recipe.

## M5 — Equipment
Equipment remains connected to the existing resource and production systems.

Military equipment must be produced through the existing economy/production chain and delivered through existing logistics. No magic creation of weapons/equipment inside Military.

## M6 — Army Upkeep
Soldiers stationed in military buildings consume **only coins** as regular army upkeep.

Requirements:
- upkeep is tied to soldiers actually stationed in military buildings;
- coin consumption goes through the existing economy/storage/logistics architecture where applicable;
- no food or other resource is consumed by garrison upkeep;
- the exact coin consumption rate is **МЕХАНИКА НЕ ОПРЕДЕЛЕНА** until separately approved.

This rule concerns **army upkeep**. It does not define the cost of soldier creation, equipment production, promotion or combat.

## M7 — Combat
Implement combat after the military core, territory integration, army and equipment systems are stable.

Combat must use the same soldier entities and military buildings already created by M3–M6. Combat must not bypass logistics, territory or economy.

## M8 — Supply
Supply remains part of the existing logistics architecture.

The military system must request and receive required resources through the same task/transport/storage mechanisms as other game systems. Military should not receive resources through special hidden transfers.

## M9 — Tests and Verification
For every military mechanic:

`MECHANIC → DOCUMENTATION → CODE → TESTS → ACTUAL BEHAVIOR → RESULT`

Minimum verification areas:
- military buildings on worldMap;
- territory influence and boundaries;
- soldier creation and entity lifecycle;
- garrison assignment;
- rank progression;
- coin-only army upkeep;
- equipment integration;
- logistics/supply;
- combat;
- regression against existing economy, workers, construction, logistics, roads, storage and territory mechanics.

## Implementation Order
1. ~~**M1 — Military Core**~~
2. ~~**M2 — Territory / worldMap Integration**~~
3. **M3 — Army / Garrisons**
4. **M4 — Soldier Creation + Ranks**
5. **M5 — Equipment**
6. **M6 — Coin-only Army Upkeep**
7. **M7 — Combat**
8. **M8 — Supply**
9. **M9 — Tests and Verification**

## Compatibility Rule
Before adding any Military mechanic, verify its interaction with existing `worldMap`, territory, resources, workers, tasks, logistics, storage, production and construction. If a conflict appears, it must be reported before code changes rather than silently resolved.
