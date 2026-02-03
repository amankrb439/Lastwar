
import { Building, Unit, ResourceType } from './types';

export const INITIAL_RESOURCES = {
  [ResourceType.GOLD]: 500,
  [ResourceType.FOOD]: 500,
  [ResourceType.STEEL]: 200,
  [ResourceType.TECH]: 50
};

export const INITIAL_BUILDINGS: Building[] = [
  {
    id: 'b1',
    name: 'Command Center',
    level: 1,
    baseCost: { [ResourceType.GOLD]: 200, [ResourceType.STEEL]: 100 },
    costMultiplier: 1.8,
    description: 'The heart of your base. Limits max level of other buildings.',
    type: 'command'
  },
  {
    id: 'b2',
    name: 'Gold Mine',
    level: 1,
    baseCost: { [ResourceType.GOLD]: 100, [ResourceType.STEEL]: 50 },
    costMultiplier: 1.5,
    description: 'Excavates precious metals from the wasteland.',
    type: 'production',
    production: { [ResourceType.GOLD]: 10 }
  },
  {
    id: 'b3',
    name: 'Hydroponic Farm',
    level: 1,
    baseCost: { [ResourceType.GOLD]: 80, [ResourceType.STEEL]: 40 },
    costMultiplier: 1.4,
    description: 'Produces food for your citizens and troops.',
    type: 'production',
    production: { [ResourceType.FOOD]: 15 }
  },
  {
    id: 'b4',
    name: 'Steel Works',
    level: 1,
    baseCost: { [ResourceType.GOLD]: 150, [ResourceType.STEEL]: 80 },
    costMultiplier: 1.6,
    description: 'Smelts scrap into industrial-grade steel.',
    type: 'production',
    production: { [ResourceType.STEEL]: 5 }
  },
  {
    id: 'b5',
    name: 'Barracks',
    level: 1,
    baseCost: { [ResourceType.GOLD]: 300, [ResourceType.STEEL]: 150 },
    costMultiplier: 1.7,
    description: 'Train and house your military units.',
    type: 'military'
  }
];

export const INITIAL_UNITS: Unit[] = [
  {
    id: 'u1',
    name: 'Wasteland Scavenger',
    type: 'infantry',
    power: 5,
    cost: { [ResourceType.FOOD]: 20, [ResourceType.GOLD]: 10 },
    count: 0
  },
  {
    id: 'u2',
    name: 'Armored Raider',
    type: 'vehicle',
    power: 25,
    cost: { [ResourceType.FOOD]: 50, [ResourceType.STEEL]: 30, [ResourceType.GOLD]: 20 },
    count: 0
  },
  {
    id: 'u3',
    name: 'Stealth Drone',
    type: 'air',
    power: 60,
    cost: { [ResourceType.TECH]: 20, [ResourceType.STEEL]: 50, [ResourceType.GOLD]: 100 },
    count: 0
  }
];
