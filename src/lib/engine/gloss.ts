import type { GlossItem } from "../types";

// ---------------------------------------------------------------------------
// Pre-built gloss database (~40 entries across all 6 scenarios)
// ---------------------------------------------------------------------------

const glossDatabase: Record<string, GlossItem> = {
  // ======================== Greetings / basics ========================
  你好: {
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    chunks: ["你", "好"],
    gloss: ["you", "good"],
    naturalEn: "Hello",
    level: "A0",
  },
  谢谢: {
    hanzi: "谢谢",
    pinyin: "xiè xie",
    chunks: ["谢谢"],
    gloss: ["thank"],
    naturalEn: "Thank you",
    level: "A0",
  },
  再见: {
    hanzi: "再见",
    pinyin: "zài jiàn",
    chunks: ["再", "见"],
    gloss: ["again", "see"],
    naturalEn: "Goodbye",
    level: "A0",
  },
  不好意思: {
    hanzi: "不好意思",
    pinyin: "bù hǎo yì si",
    chunks: ["不好意思"],
    gloss: ["sorry / excuse me"],
    naturalEn: "Sorry / Excuse me",
    level: "A0",
  },
  请: {
    hanzi: "请",
    pinyin: "qǐng",
    chunks: ["请"],
    gloss: ["please"],
    naturalEn: "Please",
    level: "A0",
  },
  对不起: {
    hanzi: "对不起",
    pinyin: "duì bu qǐ",
    chunks: ["对不起"],
    gloss: ["sorry"],
    naturalEn: "I'm sorry",
    level: "A0",
  },
  没关系: {
    hanzi: "没关系",
    pinyin: "méi guān xi",
    chunks: ["没", "关系"],
    gloss: ["not", "related"],
    naturalEn: "It's OK / No problem",
    level: "A0",
  },

  // ======================== Cafe / restaurant ========================
  我要一杯咖啡: {
    hanzi: "我要一杯咖啡",
    pinyin: "wǒ yào yī bēi kā fēi",
    chunks: ["我", "要", "一", "杯", "咖啡"],
    gloss: ["I", "want", "one", "cup", "coffee"],
    naturalEn: "I'd like a cup of coffee",
    level: "A0",
  },
  请给我一杯拿铁: {
    hanzi: "请给我一杯拿铁",
    pinyin: "qǐng gěi wǒ yī bēi ná tiě",
    chunks: ["请", "给", "我", "一杯", "拿铁"],
    gloss: ["please", "give", "me", "one cup", "latte"],
    naturalEn: "A latte, please",
    level: "A1",
  },
  热的: {
    hanzi: "热的",
    pinyin: "rè de",
    chunks: ["热", "的"],
    gloss: ["hot", "(adj. marker)"],
    naturalEn: "Hot",
    level: "A0",
  },
  冰的: {
    hanzi: "冰的",
    pinyin: "bīng de",
    chunks: ["冰", "的"],
    gloss: ["iced", "(adj. marker)"],
    naturalEn: "Iced",
    level: "A0",
  },
  大杯: {
    hanzi: "大杯",
    pinyin: "dà bēi",
    chunks: ["大", "杯"],
    gloss: ["big", "cup"],
    naturalEn: "Large (size)",
    level: "A0",
  },
  中杯: {
    hanzi: "中杯",
    pinyin: "zhōng bēi",
    chunks: ["中", "杯"],
    gloss: ["medium", "cup"],
    naturalEn: "Medium (size)",
    level: "A0",
  },
  小杯: {
    hanzi: "小杯",
    pinyin: "xiǎo bēi",
    chunks: ["小", "杯"],
    gloss: ["small", "cup"],
    naturalEn: "Small (size)",
    level: "A0",
  },
  多少钱: {
    hanzi: "多少钱",
    pinyin: "duō shǎo qián",
    chunks: ["多少", "钱"],
    gloss: ["how much", "money"],
    naturalEn: "How much is it?",
    level: "A0",
  },
  买单: {
    hanzi: "买单",
    pinyin: "mǎi dān",
    chunks: ["买单"],
    gloss: ["pay the bill"],
    naturalEn: "Check, please",
    level: "A1",
  },
  微信支付: {
    hanzi: "微信支付",
    pinyin: "wēi xìn zhī fù",
    chunks: ["微信", "支付"],
    gloss: ["WeChat", "pay"],
    naturalEn: "Pay with WeChat",
    level: "A1",
  },
  支付宝: {
    hanzi: "支付宝",
    pinyin: "zhī fù bǎo",
    chunks: ["支付", "宝"],
    gloss: ["pay", "treasure"],
    naturalEn: "Alipay",
    level: "A1",
  },
  请稍等: {
    hanzi: "请稍等",
    pinyin: "qǐng shāo děng",
    chunks: ["请", "稍", "等"],
    gloss: ["please", "briefly", "wait"],
    naturalEn: "Please wait a moment",
    level: "A1",
  },

  // ======================== Taxi / directions ========================
  我要去机场: {
    hanzi: "我要去机场",
    pinyin: "wǒ yào qù jī chǎng",
    chunks: ["我", "要", "去", "机场"],
    gloss: ["I", "want", "go", "airport"],
    naturalEn: "I want to go to the airport",
    level: "A0",
  },
  火车站: {
    hanzi: "火车站",
    pinyin: "huǒ chē zhàn",
    chunks: ["火车", "站"],
    gloss: ["train", "station"],
    naturalEn: "Train station",
    level: "A0",
  },
  到了吗: {
    hanzi: "到了吗",
    pinyin: "dào le ma",
    chunks: ["到", "了", "吗"],
    gloss: ["arrive", "(completed)", "(question)"],
    naturalEn: "Are we there yet?",
    level: "A1",
  },
  左转: {
    hanzi: "左转",
    pinyin: "zuǒ zhuǎn",
    chunks: ["左", "转"],
    gloss: ["left", "turn"],
    naturalEn: "Turn left",
    level: "A1",
  },
  右转: {
    hanzi: "右转",
    pinyin: "yòu zhuǎn",
    chunks: ["右", "转"],
    gloss: ["right", "turn"],
    naturalEn: "Turn right",
    level: "A1",
  },
  一直走: {
    hanzi: "一直走",
    pinyin: "yī zhí zǒu",
    chunks: ["一直", "走"],
    gloss: ["straight", "walk"],
    naturalEn: "Go straight",
    level: "A1",
  },

  // ======================== Hotel check-in ========================
  我有预订: {
    hanzi: "我有预订",
    pinyin: "wǒ yǒu yù dìng",
    chunks: ["我", "有", "预订"],
    gloss: ["I", "have", "reservation"],
    naturalEn: "I have a reservation",
    level: "A1",
  },
  护照: {
    hanzi: "护照",
    pinyin: "hù zhào",
    chunks: ["护照"],
    gloss: ["passport"],
    naturalEn: "Passport",
    level: "A0",
  },
  房间: {
    hanzi: "房间",
    pinyin: "fáng jiān",
    chunks: ["房间"],
    gloss: ["room"],
    naturalEn: "Room",
    level: "A0",
  },
  住两晚: {
    hanzi: "住两晚",
    pinyin: "zhù liǎng wǎn",
    chunks: ["住", "两", "晚"],
    gloss: ["stay", "two", "night"],
    naturalEn: "Stay for two nights",
    level: "A1",
  },

  // ======================== Shopping ========================
  这个多少钱: {
    hanzi: "这个多少钱",
    pinyin: "zhè ge duō shǎo qián",
    chunks: ["这个", "多少", "钱"],
    gloss: ["this", "how much", "money"],
    naturalEn: "How much is this?",
    level: "A0",
  },
  太贵了: {
    hanzi: "太贵了",
    pinyin: "tài guì le",
    chunks: ["太", "贵", "了"],
    gloss: ["too", "expensive", "(emphasis)"],
    naturalEn: "Too expensive!",
    level: "A0",
  },
  便宜一点: {
    hanzi: "便宜一点",
    pinyin: "pián yi yī diǎn",
    chunks: ["便宜", "一点"],
    gloss: ["cheap", "a little"],
    naturalEn: "A little cheaper, please",
    level: "A1",
  },
  我要这个: {
    hanzi: "我要这个",
    pinyin: "wǒ yào zhè ge",
    chunks: ["我", "要", "这个"],
    gloss: ["I", "want", "this"],
    naturalEn: "I want this one",
    level: "A0",
  },

  // ======================== Social / introductions ========================
  你叫什么名字: {
    hanzi: "你叫什么名字",
    pinyin: "nǐ jiào shén me míng zi",
    chunks: ["你", "叫", "什么", "名字"],
    gloss: ["you", "called", "what", "name"],
    naturalEn: "What's your name?",
    level: "A0",
  },
  我叫: {
    hanzi: "我叫",
    pinyin: "wǒ jiào",
    chunks: ["我", "叫"],
    gloss: ["I", "am called"],
    naturalEn: "My name is…",
    level: "A0",
  },
  认识你很高兴: {
    hanzi: "认识你很高兴",
    pinyin: "rèn shi nǐ hěn gāo xìng",
    chunks: ["认识", "你", "很", "高兴"],
    gloss: ["know", "you", "very", "happy"],
    naturalEn: "Nice to meet you",
    level: "A1",
  },
  你是哪国人: {
    hanzi: "你是哪国人",
    pinyin: "nǐ shì nǎ guó rén",
    chunks: ["你", "是", "哪", "国", "人"],
    gloss: ["you", "are", "which", "country", "person"],
    naturalEn: "Where are you from?",
    level: "A1",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a gloss entry by exact hanzi key.
 * Returns null if no entry is found.
 */
export function getGloss(hanzi: string): GlossItem | null {
  const trimmed = hanzi.trim();
  return glossDatabase[trimmed] ?? null;
}

/**
 * Try to find a gloss by matching a substring of the input.
 * Useful when the user types a sentence containing a known phrase.
 */
export function findGlossInText(text: string): GlossItem[] {
  const results: GlossItem[] = [];
  const trimmed = text.trim();

  for (const [key, item] of Object.entries(glossDatabase)) {
    if (trimmed.includes(key)) {
      results.push(item);
    }
  }

  return results;
}

/**
 * Generate a minimal gloss for an unknown hanzi string.
 * Provides character-by-character breakdown with placeholder glosses.
 * For a real app this would call an LLM; here we do best-effort.
 */
export function generateSimpleGloss(hanzi: string): GlossItem {
  const trimmed = hanzi.trim();

  // Check if it exists in our database first
  const existing = glossDatabase[trimmed];
  if (existing) return existing;

  // Character-by-character decomposition
  const chars = Array.from(trimmed).filter((c) => /[\u4e00-\u9fff]/.test(c));
  const chunks = chars.length > 0 ? chars : [trimmed];

  // Try to gloss individual characters from known entries
  const glossParts = chunks.map((char) => {
    for (const item of Object.values(glossDatabase)) {
      const idx = item.chunks.indexOf(char);
      if (idx !== -1 && item.gloss[idx]) {
        return item.gloss[idx];
      }
    }
    return "?";
  });

  return {
    hanzi: trimmed,
    pinyin: "",
    chunks,
    gloss: glossParts,
    naturalEn: "",
    note: "Auto-generated gloss — may be incomplete",
    level: "A0",
  };
}

/**
 * Get all gloss entries, optionally filtered by level.
 */
export function getAllGlossEntries(
  level?: "A0" | "A1" | "A2",
): GlossItem[] {
  const entries = Object.values(glossDatabase);
  if (!level) return entries;
  return entries.filter((e) => e.level === level);
}

/**
 * Get gloss entries relevant to a specific scenario keyword.
 */
export function getGlossForScenario(scenarioKeyword: string): GlossItem[] {
  const keyword = scenarioKeyword.toLowerCase();
  const scenarioGlossMap: Record<string, string[]> = {
    cafe: [
      "我要一杯咖啡",
      "请给我一杯拿铁",
      "热的",
      "冰的",
      "大杯",
      "中杯",
      "小杯",
      "多少钱",
      "买单",
      "微信支付",
      "支付宝",
      "请稍等",
    ],
    restaurant: [
      "我要一杯咖啡",
      "多少钱",
      "买单",
      "微信支付",
      "支付宝",
      "请稍等",
    ],
    taxi: [
      "我要去机场",
      "火车站",
      "到了吗",
      "左转",
      "右转",
      "一直走",
    ],
    hotel: ["我有预订", "护照", "房间", "住两晚"],
    shopping: ["这个多少钱", "太贵了", "便宜一点", "我要这个"],
    social: [
      "你叫什么名字",
      "我叫",
      "认识你很高兴",
      "你是哪国人",
    ],
  };

  for (const [key, hanziList] of Object.entries(scenarioGlossMap)) {
    if (keyword.includes(key) || key.includes(keyword)) {
      return hanziList
        .map((h) => glossDatabase[h])
        .filter((g): g is GlossItem => g !== undefined);
    }
  }

  // Fallback: return basic greetings
  return ["你好", "谢谢", "再见", "不好意思", "请"]
    .map((h) => glossDatabase[h])
    .filter((g): g is GlossItem => g !== undefined);
}
