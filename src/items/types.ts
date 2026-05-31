// src/items/types.ts

export interface Item {
    id: number;
    name: string;
    description: string;
    price: number;
    usable: boolean;
    onUse?: (userId: number, quantity: number) => Promise<{ success: boolean; message: string; effects?: string[] }>;
}