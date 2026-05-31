// src/works/types.ts

export interface WorkContext {
    userId: number;
    player: any;
    duration: number;
    sendReply: (msg: string) => Promise<void>;
}

export interface Work {
    id: number;
    name: string;
    description: string;
    type: 'I' | 'II';
    duration: number;
    attribute: string;
    attrRequirement: number;
    basePay?: number;
    checkCondition?: (player: any) => Promise<{ success: boolean; message: string }>;
    settle: (ctx: WorkContext) => Promise<{ success: boolean; message: string; reward?: number }>;
}