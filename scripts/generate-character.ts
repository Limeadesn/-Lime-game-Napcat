/**
 * 人物模型数学生成器 (Character Model Math Generator)
 * 
 * 纯数学计算生成 Blockbench .bbmodel 人物模型文件。
 * 通过参数控制人体比例、体型、骨骼结构，自动计算所有 cube 坐标和 UV 映射。
 * 
 * 用法:
 *   npx tsx scripts/generate-character.ts                    # 默认 Steve 风格
 *   npx tsx scripts/generate-character.ts --preset alex      # Alex 风格 (细手臂)
 *   npx tsx scripts/generate-character.ts --preset chibi     # Q版大头
 *   npx tsx scripts/generate-character.ts --preset custom --height 40 --head 10
 * 
 * 数学原理:
 *   人体可表示为骨骼层级树，每个骨骼包含若干 cube 元素。
 *   所有 cube 的 from/to 坐标 = f(比例参数, 骨骼位置)，纯函数计算。
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// UUID 生成器 (v4, 符合 RFC 4122)
// ============================================================

function generateUUID(): string {
  // 简单的伪随机 v4 UUID 生成
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // version 4
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8]; // variant
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

// ============================================================
// 类型定义
// ============================================================

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface FaceUV {
  uv: [number, number, number, number];
  texture?: number;
}

interface BBFaces {
  north: FaceUV;
  south: FaceUV;
  east: FaceUV;
  west: FaceUV;
  up: FaceUV;
  down: FaceUV;
}

interface BBElement {
  type: 'cube';
  name: string;
  uuid: string;
  from: [number, number, number];
  to: [number, number, number];
  autouv: number;
  color: number;
  origin: [number, number, number];
  rotation: [number, number, number];
  locked: boolean;
  visibility: boolean;
  faces: BBFaces;
}

interface OutlinerBone {
  name: string;
  uuid: string;
  origin: [number, number, number];
  rotation: [number, number, number];
  locked: boolean;
  visibility: boolean;
  children: (OutlinerBone | BBElement)[];
}

interface BBTexture {
  name: string;
  id: string;
  path: string;
  folder: string;
  namespace: string;
  source: string;
  visible: boolean;
  saved: boolean;
  particles: boolean;
  render_mode: 'default';
  uv_width: number;
  uv_height: number;
}

interface BBModel {
  meta: {
    format_version: string;
    creation_time: number;
    model_format: string;
    box_uv: boolean;
  };
  name: string;
  model_identifier: string;
  visible_box: [number, number, number];
  variable_placeholders: string;
  variable_placeholder_buttons: never[];
  resolution: {
    width: number;
    height: number;
  };
  elements: BBElement[];
  outliner: OutlinerBone[];
  textures: BBTexture[];
  animations: never[];
}

/** 人物模型参数 */
interface CharacterParams {
  // === 基础尺寸 (像素) ===
  /** 头部边长 (正方形), 默认 8 */
  headSize: number;
  /** 身体宽度 (X), 默认 8 */
  bodyWidth: number;
  /** 身体厚度 (Z), 默认 4 */
  bodyDepth: number;
  /** 身体高度 (Y), 默认 12 */
  bodyHeight: number;
  /** 手臂宽度 (X), 默认 4 */
  armWidth: number;
  /** 手臂厚度 (Z), 默认 4 */
  armDepth: number;
  /** 手臂高度 (Y), 默认 12 */
  armHeight: number;
  /** 腿部宽度 (X), 默认 4 */
  legWidth: number;
  /** 腿部厚度 (Z), 默认 4 */
  legDepth: number;
  /** 腿部高度 (Y), 默认 12 */
  legHeight: number;

  // === 偏移量 ===
  /** 手臂与身体的间隙, 默认 0 */
  armGap: number;

  // === 第二层 (外套/帽子/裤子) ===
  /** 是否生成帽子层 */
  hasHat: boolean;
  /** 是否生成外套层 */
  hasJacket: boolean;
  /** 是否生成袖子层 */
  hasSleeves: boolean;
  /** 是否生成裤子层 */
  hasPants: boolean;
  /** 外层膨胀量 (像素), 默认 0.5 */
  outerInset: number;

  // === 纹理 ===
  textureWidth: number;
  textureHeight: number;

  // === 元数据 ===
  modelName: string;
  modelIdentifier: string;
}

// ============================================================
// 预设人物风格
// ============================================================

const PRESETS: Record<string, Partial<CharacterParams>> = {
  /** 标准 Steve 风格: 宽手臂 */
  steve: {
    headSize: 8,
    bodyWidth: 8, bodyDepth: 4, bodyHeight: 12,
    armWidth: 4, armDepth: 4, armHeight: 12,
    legWidth: 4, legDepth: 4, legHeight: 12,
    armGap: 0,
    hasHat: true, hasJacket: true, hasSleeves: true, hasPants: true,
    outerInset: 0.5,
    textureWidth: 64, textureHeight: 64,
  },

  /** Alex 风格: 细手臂 (3px) */
  alex: {
    headSize: 8,
    bodyWidth: 8, bodyDepth: 4, bodyHeight: 12,
    armWidth: 3, armDepth: 4, armHeight: 12,
    legWidth: 4, legDepth: 4, legHeight: 12,
    armGap: 0,
    hasHat: true, hasJacket: true, hasSleeves: true, hasPants: true,
    outerInset: 0.5,
    textureWidth: 64, textureHeight: 64,
  },

  /** Q版大头风格: 大头 + 短身体 + 短四肢 */
  chibi: {
    headSize: 10,
    bodyWidth: 6, bodyDepth: 3, bodyHeight: 8,
    armWidth: 3, armDepth: 3, armHeight: 8,
    legWidth: 3, legDepth: 3, legHeight: 6,
    armGap: 1,
    hasHat: true, hasJacket: false, hasSleeves: false, hasPants: false,
    outerInset: 0.3,
    textureWidth: 64, textureHeight: 64,
  },

  /** 纤细高挑风格 */
  slender: {
    headSize: 7,
    bodyWidth: 6, bodyDepth: 3, bodyHeight: 14,
    armWidth: 3, armDepth: 3, armHeight: 14,
    legWidth: 3, legDepth: 3, legHeight: 15,
    armGap: 1,
    hasHat: true, hasJacket: true, hasSleeves: true, hasPants: true,
    outerInset: 0.4,
    textureWidth: 64, textureHeight: 64,
  },

  /** 健壮壮汉风格 */
  bulky: {
    headSize: 8,
    bodyWidth: 10, bodyDepth: 6, bodyHeight: 13,
    armWidth: 5, armDepth: 5, armHeight: 13,
    legWidth: 5, legDepth: 5, legHeight: 12,
    armGap: 0,
    hasHat: true, hasJacket: true, hasSleeves: true, hasPants: true,
    outerInset: 0.5,
    textureWidth: 64, textureHeight: 64,
  },
};

// ============================================================
// 默认参数
// ============================================================

const DEFAULT_PARAMS: CharacterParams = {
  headSize: 8,
  bodyWidth: 8, bodyDepth: 4, bodyHeight: 12,
  armWidth: 4, armDepth: 4, armHeight: 12,
  legWidth: 4, legDepth: 4, legHeight: 12,
  armGap: 0,
  hasHat: true, hasJacket: true, hasSleeves: true, hasPants: true,
  outerInset: 0.5,
  textureWidth: 64, textureHeight: 64,
  modelName: 'character',
  modelIdentifier: 'character:character',
};

// ============================================================
// 人物身体结构计算
// ============================================================

interface BoneDef {
  name: string;
  origin: [number, number, number];
  parent: string | null;
}

interface CubeDef {
  name: string;
  bone: string;
  from: [number, number, number];
  to: [number, number, number];
  /** UV 基准偏移 [u, v] */
  uvBase: [number, number];
}

/**
 * 根据参数计算所有骨骼定义和 cube 定义。
 * 
 * 坐标系统 (Minecraft 标准):
 *   X: 左(-) → 右(+)
 *   Y: 下(0) → 上(+)
 *   Z: 后(-) → 前(+)
 * 
 * 人体结构 (从下到上的 Y 坐标):
 *   0          → 脚底
 *   legHeight  → 髋部 / 身体底部
 *   +bodyHeight → 肩部 / 头部底部
 *   +headSize  → 头顶
 */
function computeBodyStructure(p: CharacterParams): { bones: BoneDef[]; cubes: CubeDef[] } {
  const bones: BoneDef[] = [];
  const cubes: CubeDef[] = [];

  // Y 轴关键位置
  const feetY = 0;
  const hipY = p.legHeight;                    // 腿顶部 = 身体底部
  const shoulderY = hipY + p.bodyHeight;        // 身体顶部 = 手臂顶部
  const headBottomY = shoulderY;                // 头部底部
  const headTopY = headBottomY + p.headSize;    // 头顶

  // X 轴关键位置
  const bodyHalfX = p.bodyWidth / 2;
  const armHalfX = p.armWidth / 2;
  const legHalfX = p.legWidth / 2;

  // Z 轴关键位置
  const bodyHalfZ = p.bodyDepth / 2;
  const armHalfZ = p.armDepth / 2;
  const legHalfZ = p.legDepth / 2;

  // --- 骨骼定义 ---
  // 身体 (根骨骼), pivot 在颈部
  bones.push({
    name: 'body',
    origin: [0, shoulderY, 0],
    parent: null,
  });

  // 头部, pivot 在颈部 (与身体共享旋转点)
  bones.push({
    name: 'head',
    origin: [0, shoulderY, 0],
    parent: 'body',
  });

  // 左臂, pivot 在左肩
  bones.push({
    name: 'left_arm',
    origin: [-(bodyHalfX + p.armGap), shoulderY, 0],
    parent: 'body',
  });

  // 右臂, pivot 在右肩
  bones.push({
    name: 'right_arm',
    origin: [bodyHalfX + p.armGap, shoulderY, 0],
    parent: 'body',
  });

  // 左腿, pivot 在髋部
  bones.push({
    name: 'left_leg',
    origin: [-(legHalfX), hipY, 0],
    parent: 'body',
  });

  // 右腿, pivot 在髋部
  bones.push({
    name: 'right_leg',
    origin: [legHalfX, hipY, 0],
    parent: 'body',
  });

  // --- Cube 定义 ---
  // 头部
  cubes.push({
    name: 'head',
    bone: 'head',
    from: [-p.headSize / 2, headBottomY, -p.headSize / 2],
    to: [p.headSize / 2, headTopY, p.headSize / 2],
    uvBase: [0, 0],
  });

  // 身体
  cubes.push({
    name: 'body',
    bone: 'body',
    from: [-bodyHalfX, hipY, -bodyHalfZ],
    to: [bodyHalfX, shoulderY, bodyHalfZ],
    uvBase: [16, 16],
  });

  // 左臂
  cubes.push({
    name: 'left_arm',
    bone: 'left_arm',
    from: [-(bodyHalfX + p.armGap) - p.armWidth, shoulderY - p.armHeight, -armHalfZ],
    to: [-(bodyHalfX + p.armGap), shoulderY, armHalfZ],
    uvBase: [32, 48],
  });

  // 右臂
  cubes.push({
    name: 'right_arm',
    bone: 'right_arm',
    from: [bodyHalfX + p.armGap, shoulderY - p.armHeight, -armHalfZ],
    to: [bodyHalfX + p.armGap + p.armWidth, shoulderY, armHalfZ],
    uvBase: [40, 16],
  });

  // 左腿
  cubes.push({
    name: 'left_leg',
    bone: 'left_leg',
    from: [-p.legWidth, feetY, -legHalfZ],
    to: [0, hipY, legHalfZ],
    uvBase: [16, 48],
  });

  // 右腿
  cubes.push({
    name: 'right_leg',
    bone: 'right_leg',
    from: [0, feetY, -legHalfZ],
    to: [p.legWidth, hipY, legHalfZ],
    uvBase: [0, 16],
  });

  // --- 第二层 (外层) ---
  const oi = p.outerInset;

  if (p.hasHat) {
    cubes.push({
      name: 'hat',
      bone: 'head',
      from: [-(p.headSize / 2 + oi), headBottomY - oi, -(p.headSize / 2 + oi)],
      to: [p.headSize / 2 + oi, headTopY + oi, p.headSize / 2 + oi],
      uvBase: [32, 0],
    });
  }

  if (p.hasJacket) {
    cubes.push({
      name: 'jacket',
      bone: 'body',
      from: [-(bodyHalfX + oi), hipY - oi * 0, -(bodyHalfZ + oi)],
      to: [bodyHalfX + oi, shoulderY + oi * 0, bodyHalfZ + oi],
      uvBase: [16, 32],
    });
  }

  if (p.hasSleeves) {
    cubes.push({
      name: 'left_sleeve',
      bone: 'left_arm',
      from: [-(bodyHalfX + p.armGap) - p.armWidth - oi, shoulderY - p.armHeight - oi, -(armHalfZ + oi)],
      to: [-(bodyHalfX + p.armGap) + oi, shoulderY + oi, armHalfZ + oi],
      uvBase: [48, 48],
    });
    cubes.push({
      name: 'right_sleeve',
      bone: 'right_arm',
      from: [bodyHalfX + p.armGap - oi, shoulderY - p.armHeight - oi, -(armHalfZ + oi)],
      to: [bodyHalfX + p.armGap + p.armWidth + oi, shoulderY + oi, armHalfZ + oi],
      uvBase: [40, 32],
    });
  }

  if (p.hasPants) {
    cubes.push({
      name: 'left_pants',
      bone: 'left_leg',
      from: [-p.legWidth - oi, feetY - oi, -(legHalfZ + oi)],
      to: [0 + oi, hipY + oi, legHalfZ + oi],
      uvBase: [0, 48],
    });
    cubes.push({
      name: 'right_pants',
      bone: 'right_leg',
      from: [0 - oi, feetY - oi, -(legHalfZ + oi)],
      to: [p.legWidth + oi, hipY + oi, legHalfZ + oi],
      uvBase: [0, 32],
    });
  }

  return { bones, cubes };
}

// ============================================================
// UV 面计算
// ============================================================

/**
 * 根据 cube 的六个面计算标准 Minecraft 皮肤 UV 映射。
 * 
 * Minecraft 皮肤布局规则:
 *   头部: 8x8, 六个面排列在 [0,0]~[32,16]
 *   身体: 8x12 front/back, 4x12 sides, 8x4 top/bottom
 *   手臂: 4x12 front/back, 4x12 sides, 4x4 top/bottom
 *   腿部: 4x12 front/back, 4x12 sides, 4x4 top/bottom
 */
function computeFaces(
  cube: CubeDef,
  p: CharacterParams
): BBFaces {
  const [uBase, vBase] = cube.uvBase;
  const name = cube.name;

  // 根据部位确定尺寸
  let w: number, h: number, d: number;
  if (name === 'head' || name === 'hat') {
    w = p.headSize + (name === 'hat' ? p.outerInset * 2 : 0);
    h = p.headSize + (name === 'hat' ? p.outerInset * 2 : 0);
    d = p.headSize + (name === 'hat' ? p.outerInset * 2 : 0);
  } else if (name === 'body' || name === 'jacket') {
    w = p.bodyWidth + (name === 'jacket' ? p.outerInset * 2 : 0);
    h = p.bodyHeight;
    d = p.bodyDepth + (name === 'jacket' ? p.outerInset * 2 : 0);
  } else if (name.includes('arm') || name.includes('sleeve')) {
    const isSleeve = name.includes('sleeve');
    w = p.armWidth + (isSleeve ? p.outerInset * 2 : 0);
    h = p.armHeight + (isSleeve ? p.outerInset : 0);
    d = p.armDepth + (isSleeve ? p.outerInset * 2 : 0);
  } else if (name.includes('leg') || name.includes('pants')) {
    const isPants = name.includes('pants');
    w = p.legWidth + (isPants ? p.outerInset * 2 : 0);
    h = p.legHeight + (isPants ? p.outerInset : 0);
    d = p.legDepth + (isPants ? p.outerInset * 2 : 0);
  } else {
    w = 1; h = 1; d = 1;
  }

  // UV 在纹理图上的布局 (标准 Minecraft 64x64)
  // 对于头部: front在右边, back在更右边, top在上, bottom在top下
  // 对于身体/手臂/腿: front, back, sides, top, bottom 竖直排列
  const isHead = name === 'head' || name === 'hat';

  if (isHead) {
    // 头部 UV 布局:
    // top:     [uBase+8, vBase]    -> [uBase+16, vBase+8]
    // bottom:  [uBase+16, vBase]   -> [uBase+24, vBase+8]
    // front:   [uBase+8, vBase+8]  -> [uBase+16, vBase+16]
    // back:    [uBase+24, vBase+8] -> [uBase+32, vBase+16]
    // right:   [uBase, vBase+8]    -> [uBase+8, vBase+16]
    // left:    [uBase+16, vBase+8] -> [uBase+24, vBase+16]
    return {
      north: { uv: [uBase + 8, vBase + 8, uBase + 16, vBase + 16] },   // front
      south: { uv: [uBase + 24, vBase + 8, uBase + 32, vBase + 16] },  // back
      east:  { uv: [uBase, vBase + 8, uBase + 8, vBase + 16] },         // right
      west:  { uv: [uBase + 16, vBase + 8, uBase + 24, vBase + 16] },   // left
      up:    { uv: [uBase + 8, vBase, uBase + 16, vBase + 8] },         // top
      down:  { uv: [uBase + 16, vBase, uBase + 24, vBase + 8] },        // bottom
    };
  }

  // 身体/手臂/腿 UV 布局 (标准 Minecraft 64x64 纹理):
  // 水平方向: | right(d) | front(w) | left(d) | back(w) |
  // 上面: top(w×d) 在 vBase-d 行, 下面: bottom(w×d) 紧接着
  // right:  [uBase, vBase]          -> [uBase+d, vBase+h]
  // front:  [uBase+d, vBase]        -> [uBase+d+w, vBase+h]
  // left:   [uBase+d+w, vBase]      -> [uBase+d+w+d, vBase+h]
  // back:   [uBase+d+w+d, vBase]    -> [uBase+d+w+d+w, vBase+h]
  // top:    [uBase+d, vBase-d]      -> [uBase+d+w, vBase]
  // bottom: [uBase+d+w, vBase-d]    -> [uBase+d+w+w, vBase]
  return {
    north: { uv: [uBase + d, vBase, uBase + d + w, vBase + h] },                     // front
    south: { uv: [uBase + d + w + d, vBase, uBase + d + w + d + w, vBase + h] },    // back
    east:  { uv: [uBase, vBase, uBase + d, vBase + h] },                              // right
    west:  { uv: [uBase + d + w, vBase, uBase + d + w + d, vBase + h] },             // left
    up:    { uv: [uBase + d, vBase - d, uBase + d + w, vBase] },                     // top
    down:  { uv: [uBase + d + w, vBase - d, uBase + d + w + w, vBase] },            // bottom
  };
}

// ============================================================
// .bbmodel 构建
// ============================================================

function buildBBModel(p: CharacterParams): BBModel {
  const { bones, cubes } = computeBodyStructure(p);

  // 创建骨骼映射
  const boneMap = new Map<string, BoneDef>();
  for (const b of bones) {
    boneMap.set(b.name, b);
  }

  // 创建所有 elements
  const elements: BBElement[] = [];
  for (const cube of cubes) {
    const faces = computeFaces(cube, p);
    elements.push({
      type: 'cube',
      name: cube.name,
      uuid: generateUUID(),
      from: cube.from,
      to: cube.to,
      autouv: 0,
      color: 0,
      origin: [0, 0, 0],
      rotation: [0, 0, 0],
      locked: false,
      visibility: true,
      faces,
    });
  }

  // 构建骨骼层级树
  function buildBoneChildren(parentName: string): (OutlinerBone | BBElement)[] {
    const children: (OutlinerBone | BBElement)[] = [];

    // 先添加属于该骨骼的 cube
    for (let i = 0; i < cubes.length; i++) {
      if (cubes[i].bone === parentName) {
        children.push(elements[i]);
      }
    }

    // 再添加子骨骼
    for (const bone of bones) {
      if (bone.parent === parentName) {
        children.push({
          name: bone.name,
          uuid: generateUUID(),
          origin: bone.origin,
          rotation: [0, 0, 0],
          locked: false,
          visibility: true,
          children: buildBoneChildren(bone.name),
        });
      }
    }

    return children;
  }

  // 找到根骨骼 (parent === null)
  const rootBone = bones.find(b => b.parent === null);
  if (!rootBone) throw new Error('没有找到根骨骼！');

  const rootNode: OutlinerBone = {
    name: rootBone.name,
    uuid: generateUUID(),
    origin: rootBone.origin,
    rotation: [0, 0, 0],
    locked: false,
    visibility: true,
    children: buildBoneChildren(rootBone.name),
  };

  const textures: BBTexture[] = [
    {
      name: 'skin',
      id: '0',
      path: '',
      folder: '',
      namespace: '',
      source: '',
      visible: true,
      saved: false,
      particles: false,
      render_mode: 'default',
      uv_width: p.textureWidth,
      uv_height: p.textureHeight,
    },
  ];

  return {
    meta: {
      format_version: '4.10',
      creation_time: Math.floor(Date.now() / 1000),
      model_format: 'modded_entity',
      box_uv: false,
    },
    name: p.modelName,
    model_identifier: p.modelIdentifier,
    visible_box: [1, 1, 1],
    variable_placeholders: '',
    variable_placeholder_buttons: [],
    resolution: {
      width: p.textureWidth,
      height: p.textureHeight,
    },
    elements,
    outliner: [rootNode],
    textures,
    animations: [],
  };
}

// ============================================================
// CLI 入口
// ============================================================

function parseArgs(): CharacterParams {
  const args = process.argv.slice(2);
  let preset = 'steve';
  const overrides: Partial<CharacterParams> & Record<string, number | string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--preset' && i + 1 < args.length) {
      preset = args[++i];
    } else if (arg.startsWith('--') && i + 1 < args.length) {
      const key = arg.slice(2);
      const val = args[++i];
      // 尝试解析为数字
      const numVal = Number(val);
      if (!isNaN(numVal) && val.trim() !== '') {
        (overrides as Record<string, number>)[key] = numVal;
      } else if (val === 'true') {
        (overrides as Record<string, boolean>)[key] = true;
      } else if (val === 'false') {
        (overrides as Record<string, boolean>)[key] = false;
      } else {
        (overrides as Record<string, string>)[key] = val;
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // 获取预设
  const presetParams = PRESETS[preset];
  if (!presetParams) {
    console.error(`未知预设: ${preset}`);
    console.error(`可用预设: ${Object.keys(PRESETS).join(', ')}`);
    process.exit(1);
  }

  // 合并
  const finalParams: CharacterParams = {
    ...DEFAULT_PARAMS,
    ...presetParams,
    ...overrides,
    modelName: (overrides.modelName as string) || `${preset}_character`,
    modelIdentifier: (overrides.modelIdentifier as string) || `${preset}:character`,
  };

  return finalParams;
}

function printHelp(): void {
  console.log(`
(｡･ω･｡) 人物模型数学生成器 - 使用说明

用法:
  npx tsx scripts/generate-character.ts [选项]

选项:
  --preset <name>    预设风格: steve, alex, chibi, slender, bulky (默认: steve)
  --headSize <n>     头部大小 (默认: 8)
  --bodyWidth <n>    身体宽度
  --bodyHeight <n>   身体高度
  --armWidth <n>     手臂宽度
  --legWidth <n>     腿部宽度
  --armGap <n>       手臂与身体间隙
  --hasHat <bool>    是否生成帽子层 (true/false)
  --hasJacket <bool> 是否生成外套层
  --hasSleeves <bool>是否生成袖子层
  --hasPants <bool>  是否生成裤子层
  --outerInset <n>   外层膨胀量 (默认: 0.5)
  --modelName <str>  模型名称
  -h, --help         显示此帮助

预设说明:
  steve   - 标准 Steve 风格 (宽手臂 4px)
  alex    - Alex 风格 (细手臂 3px)
  chibi   - Q版大头 (大头+短身体+短四肢)
  slender - 纤细高挑风格
  bulky   - 健壮壮汉风格

示例:
  npx tsx scripts/generate-character.ts                           # 默认 Steve
  npx tsx scripts/generate-character.ts --preset alex             # Alex 风格
  npx tsx scripts/generate-character.ts --preset chibi            # Q版
  npx tsx scripts/generate-character.ts --preset custom \\
      --headSize 12 --bodyHeight 10 --armHeight 10 --legHeight 8

输出文件: output/character.bbmodel
`);
}

function main(): void {
  const params = parseArgs();

  console.log('');
  console.log('  (｡･ω･｡) 开始炼成人物模型...');
  console.log(`  预设风格: ${process.argv.includes('--preset') ? process.argv[process.argv.indexOf('--preset') + 1] : 'steve'}`);
  console.log(`  头部: ${params.headSize}px | 身体: ${params.bodyWidth}x${params.bodyHeight}x${params.bodyDepth}`);
  console.log(`  手臂: ${params.armWidth}x${params.armHeight}x${params.armDepth} | 腿: ${params.legWidth}x${params.legHeight}x${params.legDepth}`);
  console.log(`  总高: ${params.legHeight + params.bodyHeight + params.headSize}px`);
  console.log('');

  // 计算身体结构
  const { bones, cubes } = computeBodyStructure(params);
  console.log(`  骨骼数: ${bones.length} | Cube数: ${cubes.length}`);
  for (const b of bones) {
    const boneCubes = cubes.filter(c => c.bone === b.name);
    console.log(`    - ${b.name} (pivot: [${b.origin.join(', ')}]), cubes: ${boneCubes.map(c => c.name).join(', ') || '(无)'}`);
  }

  // 构建模型
  const model = buildBBModel(params);

  // 输出目录
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${params.modelName}.bbmodel`);
  fs.writeFileSync(outputPath, JSON.stringify(model, null, 2), 'utf-8');

  console.log('');
  console.log(`  (≧▽≦) 模型生成完成！`);
  console.log(`  输出文件: ${outputPath}`);
  console.log('');
  console.log('  下一步:');
  console.log('  1. 用 Blockbench 打开 .bbmodel 文件');
  console.log('  2. 贴上皮肤纹理 (64x64 PNG)');
  console.log('  3. 用 YSM 插件导出为 .ysm 模型');
  console.log('');
}

main();
