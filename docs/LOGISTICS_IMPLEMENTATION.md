# Logistics foundation

Current implementation stage:

- every building is associated with one logistics flag;
- flags are stored separately from buildings and reference their building;
- flags have a map position and connected road ids;
- roads are physical map-cell paths connecting two flags;
- the logistics network is represented as a flag graph;
- connectivity and flag-to-flag routes are resolved with graph traversal;
- destroying a building through `destroyBuilding` removes its flag and connected roads;
- invalidated network routes are no longer returned after network rebuild.

Not implemented yet:

- automatic nearest-flag road construction;
- road path generation/obstacle rules;
- carrier movement;
- resource transport tasks;
- logistics priorities and capacity;
- production integration with transport.
