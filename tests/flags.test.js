import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { addStandaloneFlag, canPlaceStandaloneFlag, createStandaloneFlag, getFlagAtNode } from '../src/game/flags.js';
import { addRoad, createRoad } from '../src/game/roads.js';
function ownAround(state,x,y){for(const t of state.tiles){if(Math.abs(t.x+0.5-x)<=0.5&&Math.abs(t.y+0.5-y)<=0.5)t.ownerId='player';}}
describe('standalone flags',()=>{
 it('creates a flag as an inter-cell node',()=>{const f=createStandaloneFlag('f','player',20,20.5);expect(f).toMatchObject({id:'f',buildingId:null,ownerId:'player',x:20,y:20.5});});
 it('allows placement at a free inter-cell node',()=>{const s=createGameState();ownAround(s,20,20.5);const f=addStandaloneFlag(s,'f','player',20,20.5);expect(getFlagAtNode(s,20,20.5)).toBe(f);});
 it('rejects invalid or unowned nodes',()=>{const s=createGameState();expect(canPlaceStandaloneFlag(s,-0.5,20.5)).toBe(false);expect(canPlaceStandaloneFlag(s,20.5,20.5)).toBe(false);});
 it('rejects an occupied node',()=>{const s=createGameState();ownAround(s,20,20.5);addStandaloneFlag(s,'a','player',20,20.5);expect(canPlaceStandaloneFlag(s,20,20.5)).toBe(false);});
 it('splits an existing road when a flag is placed between two road cells',()=>{const s=createGameState();ownAround(s,20,20.5);ownAround(s,25,20.5);addStandaloneFlag(s,'a','player',20,20.5);addStandaloneFlag(s,'b','player',25,20.5);addRoad(s,createRoad('road','a','b',['20-20','21-20','22-20','23-20','24-20','25-20']));ownAround(s,23,20.5);const f=addStandaloneFlag(s,'mid','player',23,20.5);expect(f.buildingId).toBeNull();expect(s.roads).toHaveLength(2);expect(s.roads.some(r=>r.startFlagId==='a'&&r.endFlagId==='mid'&&r.cells.join('|')==='20-20|21-20|22-20')).toBe(true);expect(s.roads.some(r=>r.startFlagId==='mid'&&r.endFlagId==='b'&&r.cells.join('|')==='23-20|24-20|25-20')).toBe(true);});
 it('keeps the original road unchanged when a split would violate the minimum length',()=>{const s=createGameState();ownAround(s,20,20.5);ownAround(s,22,20.5);addStandaloneFlag(s,'a','player',20,20.5);addStandaloneFlag(s,'b','player',22,20.5);addRoad(s,createRoad('road','a','b',['20-20','21-20','22-20']));const before=s.roads.map(r=>({...r,cells:[...r.cells]}));expect(canPlaceStandaloneFlag(s,21,20.5)).toBe(false);expect(s.roads).toEqual(before);});
});
