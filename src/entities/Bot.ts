import { Entity } from './Entity';

export const BotState = { Farming: 0, Retreating: 1, Hunting: 2 } as const;
export type BotState = typeof BotState[keyof typeof BotState];

export class Bot extends Entity {
  aiState: BotState = BotState.Farming;
  aiTarget: { x: number; y: number } | null = null;
  aiDecisionTimer: number = 0;
  huntTargetId: number = -1;

  constructor(name: string, color: string) {
    super(name, color);
  }
}
