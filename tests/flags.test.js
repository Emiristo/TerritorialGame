import { describe, expect, it } from 'vitest';
import { createGameState } from '../src/game/state.js';
import { addStandaloneFlag, canPlaceStandaloneFlag, createStandaloneFlag, getFlagAtNode } from '../src/game/flags.js';
import { addRoad, createRoad } from '../src/game/roads.js';
function ownAround(state,x,y){for(const t of state.tiles){if(Math.abs(t.x+0.5-x)<=0.5&&Math.abs(t.y+0.5-y)<=0.5)t.ownerId='player';}}
describe('standalone flags',()=>{
 it('creates a flag as an inter-cell node',()=>{const f=createStandaloneFlag('f','player',20,20.5);expect(f).toMatchObject({id:'f',buildingId:null,ownerId:'player',x:20,y:20.5});});
 it('allows placement at a free inter-cell node inside controlled influence',()=>{const s=createGameState();const f=addStandaloneFlag(s,'f','player',50,50.5);expect(getFlagAtNode(s,50,50.5)).toBe(f);});
 it('rejects invalid, unowned, or out-of-influence nodes',()=>{const s=createGameState();expect(canPlaceStandaloneFlag(s,-0.5,20.5)).toBe(false);expect(canPlaceStandaloneFlag(s,20.5,20.5)).toBe(false);expect(canPlaceStandaloneFlag(s,20,20.5)).toBe(false);expect(canPlaceStandaloneFlag(s,60,50.5)).toBe(false);});
 it('rejects an occupied node',()=>{const s=createGameState();addStandaloneFlag(s,'a','player',50,50.5);expect(canPlaceStandaloneFlag(s,50,50.5)).toBe(false);});
 it('splits an existing road when a flag is placed between two road cells',()=>{const s=createGameState();addStandaloneFlag(s,'a','player',50,50.5);addStandaloneFlag(s,'b','player',55,50.5);addRoad(s,createRoad('road','a','b',['50-50','51-50','52-50','53-50','54-50','55-50']));const f=addStandaloneFlag(s,'mid','player',53,50.5);expect(f.buildingId).toBeNull();expect(s.roads).toHaveLength(2);expect(s.roads.some(r=>r.startFlagId==='a'&&r.endFlagId==='mid'&&r.cells.join('|')==='50-50|51-50|52-50')).toBe(true);expect(s.roads.some(r=>r.startFlagId==='mid'&&r.endFlagId==='b'&&r.cells.join('|')==='53-50|54-50|55-50')).toBe(true);});
 it('keeps the original road unchanged when a split would violate the minimum length',()=>{const s=createGameState();addStandaloneFlag(s,'a','player',50,50.5);addStandaloneFlag(s,'b','player',52,50.5);addRoad(s,createRoad('road','a','b',['50-50','51-50','52-50']));const before=s.roads.map(r=>({...r,cells:[...r.cells]}));expect(canPlaceStandaloneFlag(s,51,50.5)).toBe(false);expect(s.roads).toEqual(before);});
});
