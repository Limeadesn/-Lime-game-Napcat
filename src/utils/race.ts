export interface Kind {
    id: number;
    name: string;
    baseSize: number;
    strBonus: number;
    dexBonus: number;
    conBonus: number;
    intBonus: number;
    chaBonus: number;
    lucBonus: number;
}

export const KINDS: Kind[] = [
    { id: 0, name: '兽', baseSize: 2, strBonus: 0, dexBonus: 0, conBonus: 1, intBonus: -1, chaBonus: 0, lucBonus: 0 },
    { id: 1, name: '兽人', baseSize: 3, strBonus: 1, dexBonus: 0, conBonus: -1, intBonus: 0, chaBonus: 0, lucBonus: 0 },
    { id: 2, name: '人类', baseSize: 3, strBonus: -1, dexBonus: 0, conBonus: 0, intBonus: 1, chaBonus: 0, lucBonus: 0 }
];

// ==================== 性别定义 ====================
export interface Gender {
    id: number;
    name: string;
    strBonus: number;
    dexBonus: number;
    conBonus: number;
    intBonus: number;
    chaBonus: number;
    lucBonus: number;
}

export const GENDERS: Gender[] = [
    { id: 0, name: '男', strBonus: 1, dexBonus: 0, conBonus: 1, intBonus: 0, chaBonus: 0, lucBonus: 0 },
    { id: 1, name: '女', strBonus: 0, dexBonus: 0, conBonus: 0, intBonus: 1, chaBonus: 1, lucBonus: 0 }
];

// ==================== 体态定义 ====================
export interface Form {
    id: number;
    name: string;
    sizeBonus: number;
}

export const FORMS: Form[] = [
    { id: 0, name: '幼态', sizeBonus: -2 },
    { id: 1, name: '成长态', sizeBonus: -1 },
    { id: 2, name: '青年态', sizeBonus: 0 },
    { id: 3, name: '成熟态', sizeBonus: 1 }
];

// ==================== 种族定义 ====================
export interface Race {
    id: number;
    name: string;
    description: string;
    priority: number;
    strBonus: number;
    dexBonus: number;
    conBonus: number;
    intBonus: number;
    chaBonus: number;
    lucBonus: number;
    strMulti: number;
    dexMulti: number;
    conMulti: number;
    intMulti: number;
    chaMulti: number;
    lucMulti: number;
    isDragon?: boolean;
}

export const RACES: Race[] = [
    { id: 0, name: '人类', description: '均衡发展的种族，没有特殊优势也没有明显短板。', priority: 4,
        strBonus: 0, dexBonus: 0, conBonus: 0, intBonus: 0, chaBonus: 0, lucBonus: 0,
        strMulti: 1.0, dexMulti: 1.0, conMulti: 1.0, intMulti: 1.0, chaMulti: 1.0, lucMulti: 1.0 },
    { id: 1, name: '猫', description: '敏捷灵巧的种族，运气极佳但智慧稍逊。', priority: 2,
        strBonus: 0, dexBonus: 1, conBonus: 0, intBonus: -3, chaBonus: 1, lucBonus: 1,
        strMulti: 1.0, dexMulti: 1.0, conMulti: 1.0, intMulti: 0.75, chaMulti: 1.0, lucMulti: 1.25 },
    { id: 2, name: '狐', description: '聪慧魅惑的种族，智慧与魅力出众但力量体质薄弱。', priority: 2,
        strBonus: -2, dexBonus: 0, conBonus: -2, intBonus: 1, chaBonus: 3, lucBonus: 0,
        strMulti: 0.75, dexMulti: 1.0, conMulti: 0.75, intMulti: 1.25, chaMulti: 1.25, lucMulti: 1.0 },
    { id: 3, name: '鸟', description: '轻盈迅捷的种族，敏捷与魅力出众但力量体质智慧偏低。', priority: 2,
        strBonus: -2, dexBonus: 3, conBonus: -2, intBonus: -3, chaBonus: 3, lucBonus: 1,
        strMulti: 0.75, dexMulti: 1.25, conMulti: 1.0, intMulti: 1.0, chaMulti: 1.0, lucMulti: 1.0 },
    { id: 4, name: '龙', description: '古老而强大的龙族，体质和运气出众但智慧稍逊。', priority: 2,
        strBonus: 1, dexBonus: -2, conBonus: 2, intBonus: -3, chaBonus: 1, lucBonus: 1,
        strMulti: 1.0, dexMulti: 1.0, conMulti: 1.0, intMulti: 0.75, chaMulti: 1.0, lucMulti: 1.25,
        isDragon: true },
    { id: 5, name: '火龙', description: '掌控火焰的龙族，力量与体质极强但敏捷欠佳。', priority: 2,
        strBonus: 3, dexBonus: -3, conBonus: 2, intBonus: -2, chaBonus: 2, lucBonus: -2,
        strMulti: 1.5, dexMulti: 0.75, conMulti: 1.0, intMulti: 1.0, chaMulti: 1.0, lucMulti: 0.75,
        isDragon: true },
    { id: 6, name: '飞龙', description: '翱翔天际的龙族，力量与敏捷出众但魅力与运气欠佳。', priority: 2,
        strBonus: 2, dexBonus: 3, conBonus: 0, intBonus: 0, chaBonus: -2, lucBonus: -3,
        strMulti: 1.25, dexMulti: 1.25, conMulti: 1.0, intMulti: 1.0, chaMulti: 0.75, lucMulti: 0.75,
        isDragon: true },
    { id: 7, name: '机械', description: '钢铁之躯的机械生命，力量体质智力出众但缺乏魅力运气。', priority: 2,
        strBonus: 2, dexBonus: 0, conBonus: 2, intBonus: 4, chaBonus: -4, lucBonus: -4,
        strMulti: 1.0, dexMulti: 1.0, conMulti: 1.0, intMulti: 1.5, chaMulti: 0.75, lucMulti: 0.75 },
    { id: 8, name: '妖精', description: '神秘莫测的妖精，敏捷魅力运气出众但其他属性薄弱。', priority: 8,
        strBonus: -3, dexBonus: 3, conBonus: -3, intBonus: -3, chaBonus: 3, lucBonus: 3,
        strMulti: 0.75, dexMulti: 1.25, conMulti: 0.75, intMulti: 0.75, chaMulti: 1.25, lucMulti: 1.25,
        special: 'no_human_mix' }
];

// 混合种族特性定义
export interface MixedRaceBonus {
    name: string;
    strBonus: number;
    dexBonus: number;
    conBonus: number;
    intBonus: number;
    chaBonus: number;
    lucBonus: number;
    strMulti: number;
    dexMulti: number;
    conMulti: number;
    intMulti: number;
    chaMulti: number;
    lucMulti: number;
}

export const MIXED_RACE_BONUSES: Record<string, MixedRaceBonus> = {
    '0-1': { name: '菲林', strBonus: 1, dexBonus: 0, conBonus: 0, intBonus: 0, chaBonus: 0, lucBonus: 2,
        strMulti: 0, dexMulti: 0, conMulti: 0, intMulti: 0, chaMulti: 0, lucMulti: 0.10 },
    '0-2': { name: '沃尔珀', strBonus: 0, dexBonus: 0, conBonus: 1, intBonus: 1, chaBonus: 1, lucBonus: 0,
        strMulti: 0, dexMulti: 0, conMulti: 0, intMulti: 0, chaMulti: 0.10, lucMulti: 0 },
    '0-3': { name: '黎博利', strBonus: 0, dexBonus: 1, conBonus: 1, intBonus: 1, chaBonus: 0, lucBonus: 0,
        strMulti: 0, dexMulti: 0, conMulti: 0, intMulti: 0.10, chaMulti: 0, lucMulti: 0 },
    '0-4': { name: '龙', strBonus: 0, dexBonus: 1, conBonus: 0, intBonus: 2, chaBonus: 0, lucBonus: 0,
        strMulti: -0.25, dexMulti: 0.10, conMulti: 0, intMulti: 0.25, chaMulti: 0, lucMulti: 0 },
    '0-5': { name: '德拉克', strBonus: -3, dexBonus: 3, conBonus: 0, intBonus: 3, chaBonus: 0, lucBonus: 0,
        strMulti: -0.25, dexMulti: 0.10, conMulti: 0, intMulti: 0.25, chaMulti: 0, lucMulti: 0 },
    '0-6': { name: '瓦伊凡', strBonus: 2, dexBonus: -1, conBonus: 0, intBonus: 0, chaBonus: 2, lucBonus: 0,
        strMulti: 0.10, dexMulti: 0, conMulti: 0, intMulti: 0, chaMulti: 0, lucMulti: 0 }
};

export function getMixedRaceBonus(raceIds: number[]): MixedRaceBonus | null {
    if (raceIds.length !== 2) return null;
    const sorted = [...raceIds].sort();
    return MIXED_RACE_BONUSES[`${sorted[0]}-${sorted[1]}`] || null;
}