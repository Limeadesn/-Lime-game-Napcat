// src/adv/types.ts

export interface AdvContext {
    userId: number;
    player: any;
    sendReply: (msg: string) => Promise<void>;
}

export interface Adv {
    id: number;
    name: string;
    description: string;
    duration: number;
    cost: number;
    requirements?: {
        maxCount?: number;
        maxAttribute?: { attr: string; value: number };
        minAttribute?: { attr: string; value: number };
    };
    checkCondition?: (player: any, completedCount: number) => Promise<{ success: boolean; message: string }>;
    settle: (ctx: AdvContext) => Promise<{ success: boolean; message: string; reward?: string }>;
}