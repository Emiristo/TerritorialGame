# WORLD MAP ARCHITECTURE

## 1. Purpose

WorldMap is the spatial foundation of TerritorialGame. It represents the simulation world independently from rendering and from the current test-map size.

The current 100×100 map is a test configuration only. The final game must support maps of different sizes and, in the future, multiplayer PvP matches such as 1×1 and larger configurations.

## 2. Architectural decision

The project remains on the current JavaScript/Vite architecture for this stage. We do not migrate the game to C++ or another engine before profiling demonstrates a real simulation-performance bottleneck.

The current goal is to correct the simulation architecture first. A future simulation core may be moved to C++, WebAssembly, or another technology only if measured requirements justify it.

## 3. Map size

Map size is data/configuration, not a hard-coded gameplay constant.

Conceptually:

```js
WorldMap({ width, height })
```

The existing 100×100 world is only the first test configuration. Systems must not assume 100×100.

Future examples may include 256×256, 512×512, or other dimensions, subject to performance testing.

## 4. Geometry

The current project keeps a cell-based map with square cells.

We do not switch to hexagonal or triangular cells at this stage.

However, gameplay systems must not embed geometry-specific neighbour calculations. All spatial rules are exposed through one canonical `MapGeometry` API.

This preserves the possibility of changing the underlying geometry later without rewriting buildings, workers, logistics, AI, territory, and other gameplay systems.

### Canonical spatial API

The geometry layer will provide operations such as:

- tile identity and coordinate conversion;
- neighbours;
- adjacency;
- distance;
- direction;
- radius queries;
- line queries;
- tiles between two positions.

There must be one source of truth for neighbour/distance rules. Roads, buildings, work zones, territory, workers, military, and AI must consume this API rather than maintain independent direction tables.

## 5. WorldMap layers

WorldMap is a collection of spatial layers rather than one monolithic object model.

```text
WORLD MAP
 ├── Geometry
 ├── Terrain
 ├── Height
 ├── Resources
 ├── Ownership
 ├── Occupancy
 ├── Roads
 ├── Objects
 └── Visibility
```

Each layer has a clear responsibility and should be stored in a data-oriented form where practical.

## 6. Geometry layer

Geometry defines the topology of the map.

It must not contain gameplay decisions such as whether a building may be placed or whether a road is allowed on terrain.

Geometry is the foundation consumed by all spatial systems.

## 7. Terrain layer

Terrain is simulation data, not rendering data.

Terrain may describe properties such as grass, forest, water, mountain, rock, or other approved terrain types.

Rendering translates terrain state into visuals; rendering must not become the source of terrain rules.

## 8. Height / relief layer

The map has a separate height/relief layer.

Height does not automatically imply gameplay effects that have not yet been approved. It exists as a spatial foundation so future terrain, movement, visibility, construction, and tactical mechanics can use elevation without restructuring the map.

## 9. Resources layer

Resources are spatial state associated with the world map.

A resource deposit can have a type and quantity/state and can be discovered, extracted, depleted, or otherwise modified by gameplay systems.

Resource state must not be tied to rendering objects.

## 10. Ownership / territory layer

Territory ownership is spatial state.

A tile can have an owner independently of its terrain, resource, building, or road state.

Territory and influence systems consume the same canonical geometry as buildings and work zones.

## 11. Occupancy layer

Occupancy must be separated from terrain and other layers.

At minimum, the architecture must distinguish relevant categories such as:

- building footprint;
- building/construction reservation;
- road;
- worker/carrier or other mobile actor;
- military/static object;
- temporary/reservation state.

A terrain tile being forest, for example, is not equivalent to the tile being occupied by a building.

## 12. Roads layer

Roads become a spatial layer of WorldMap.

A road is a connection between map positions/tiles and is consumed by the logistics network.

The road layer must use `MapGeometry` for adjacency and direction rules. Roads must not maintain a conflicting independent geometry model.

`LogisticsNetwork` remains responsible for network connectivity and route calculation; WorldMap owns the spatial road state.

## 13. Objects layer

The map may reference spatially relevant objects such as buildings and other world entities.

The WorldMap layer must not absorb the full behavior of these entities. Buildings, workers, carriers, military units, and production remain gameplay systems/entities that use the map.

The map stores or indexes spatial state needed for efficient queries.

## 14. Visibility layer

Visibility/fog-of-war is a spatial layer.

It must be independent from rendering and should be represented compactly enough for mobile devices.

Future exploration, scouting, military visibility, and multiplayer information boundaries can consume the same layer.

## 15. Spatial queries

Spatial queries are separated from individual gameplay systems.

A `SpatialQueries` layer/API will provide reusable operations such as:

- tiles inside a radius;
- occupied tiles;
- buildings near a position;
- resources in an area;
- roads connected to a position;
- owned tiles;
- available construction positions.

Expensive searches must not be repeated every render frame when the same result can be indexed, cached, or updated at simulation events/ticks.

## 16. Building placement

Building placement becomes a shared spatial evaluation process rather than separate logic in UI, buildings, and AI.

A future `BuildingPlacementEvaluator` should return structured information including:

```text
valid
reasons
footprint
reservedTiles
flagPosition
workZone
influence
```

The same evaluation rules are used by player placement, construction, and AI decisions.

## 17. Separation from rendering and simulation

WorldMap is simulation state. Rendering is a consumer of that state.

The map must not depend on UI components, sprites, DOM state, or rendering coordinates as gameplay truth.

Simulation should operate at controlled ticks/updates rather than requiring heavy spatial searches every animation frame.

## 18. Multiplayer compatibility

The WorldMap architecture must be compatible with a future authoritative simulation model for PvP.

This means critical gameplay state must exist in explicit simulation data rather than hidden UI state or rendering objects.

The project does not implement networking at this stage. Multiplayer protocols, synchronization, prediction, rollback, matchmaking, and server infrastructure are future stages.

## 19. Performance requirements

The architecture must scale beyond the current test map.

Important principles:

- avoid one heavyweight JavaScript object per tile when compact arrays are sufficient;
- use typed/compact storage where appropriate;
- keep spatial indexes for frequently queried entities;
- avoid full-map scans in per-frame rendering or high-frequency logic;
- separate rendering frequency from simulation frequency;
- profile with progressively larger maps and increasing entity counts before changing language/engine.

## 20. Migration strategy

Migration is incremental. Existing approved gameplay mechanics are preserved unless explicitly changed.

Order:

1. Introduce `WorldMap` and `MapGeometry`.
2. Remove the architectural dependency on hard-coded 100×100 dimensions.
3. Move terrain and basic tile state behind the WorldMap API.
4. Add spatial resource state.
5. Add occupancy and spatial queries.
6. Migrate building placement/construction spatial checks.
7. Migrate roads to the canonical geometry and WorldMap road layer.
8. Connect work zones and territory to the shared spatial API.
9. Adapt logistics network/pathfinding to consume WorldMap spatial state.
10. Profile larger maps and entity populations.
11. Only then evaluate whether a lower-level simulation implementation is justified.

Production, construction timing, logistics rules, worker behavior, and other approved mechanics are not to be rewritten merely because WorldMap is introduced.

## 21. Geometry decision checkpoint

The current canonical decision is:

**cell-based square grid, abstracted behind `MapGeometry`.**

The project must resolve the existing discrepancy between the previously documented six-direction principle and the current road implementation before migrating road geometry. No silent conversion from 8 directions to 6 directions is permitted.

## 22. Relationship to RTTR research

RTTR/Settlers II is a reference for spatial-simulation concepts, not a source from which TerritorialGame mechanics or architecture are copied wholesale.

Useful concepts include:

- a world as a simulation space;
- spatial nodes/cells carrying multiple state layers;
- roads as world state;
- resources attached to map space;
- explicit world ownership and object state;
- dedicated pathfinding/world queries.

TerritorialGame is adapted for its own mechanics, mobile performance requirements, and future multiplayer architecture.

## 23. Definition of done for the WorldMap foundation

The foundation is considered ready for the next migration stage when:

- map dimensions are supplied by configuration/state;
- no gameplay system assumes 100×100;
- one `MapGeometry` API is the source of spatial topology rules;
- terrain, resources, occupancy, ownership, roads, and visibility have clear ownership;
- rendering does not own gameplay state;
- building placement can consume shared spatial evaluation;
- tests cover the spatial contracts;
- existing gameplay tests remain green;
- larger test maps can be instantiated without architectural changes.

This document defines the approved direction for the WorldMap transformation and should be updated only when the underlying game design is intentionally changed.