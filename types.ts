
export enum ResourceType {
  GOLD = 'Gold',
  FOOD = 'Food',
  STEEL = 'Steel',
  TECH = 'Tech'
}

export interface Resources {
  [ResourceType.GOLD]: number;
  [ResourceType.FOOD]: number;
  [ResourceType.STEEL]: number;
  [ResourceType.TECH]: number;
}

export interface Building {
  id: string;
  name: string;
  level: number;
  baseCost: Partial<Resources>;
  costMultiplier: number;
  description: string;
  type: 'production' | 'military' | 'tech' | 'command';
  production?: Partial<Resources>;
}

export interface Unit {
  id: string;
  name: string;
  type: 'infantry' | 'vehicle' | 'air';
  power: number;
  cost: Partial<Resources>;
  count: number;
}

export interface Mission {
  id: string;
  title: string;
  difficulty: number;
  enemyPower: number;
  rewards: Partial<Resources>;
  description: string;
}

export interface GameState {
  resources: Resources;
  buildings: Building[];
  units: Unit[];
  log: string[];
  day: number;
}
