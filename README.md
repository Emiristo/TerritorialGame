# TerritorialGame

Strategy game by GPT.

## Current scaffold

The project currently contains a dependency-free browser prototype with:

- a grid-based map;
- central game state;
- player resource state;
- tile selection;
- turn progression;
- separated game-state, rendering, and UI modules.

## Structure

```text
.
├── index.html
└── src
    ├── main.js
    ├── styles.css
    ├── game
    │   └── state.js
    └── ui
        ├── map.js
        └── panels.js
```

The scaffold intentionally does not hard-code the final game balance. Game rules such as influence radius, work zones, resource reserves, workers, production, ownership, and economy will be implemented as dedicated systems.
