import type {
  Mission,
  MissionState,
  Session,
  Turn,
  HintContent,
  GlossItem,
  DebriefResult,
  DebriefFix,
} from "../types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DialogueResponse {
  normalizedUserCn: string;
  understood: boolean;
  taskStatus: "in_progress" | "completed" | "failed";
  slotsFilled: string[];
  missingSlots: string[];
  npcReplyCn: string;
  npcReplyEn: string;
  currentState: string;
  errorTags: string[];
  hintAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Script detection
// ---------------------------------------------------------------------------

const CJK_RANGE = /[\u4e00-\u9fff\u3400-\u4dbf]/;
const PINYIN_TONE =
  /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;
const ASCII_LETTER = /[a-zA-Z]/;

export function detectScript(
  input: string,
): "hanzi" | "pinyin" | "mixed" | "en" {
  const hasHanzi = CJK_RANGE.test(input);
  const hasAscii = ASCII_LETTER.test(input);
  const hasPinyinTone = PINYIN_TONE.test(input);

  if (hasHanzi && hasAscii) return "mixed";
  if (hasHanzi) return "hanzi";
  if (hasPinyinTone) return "pinyin";
  if (hasAscii) return "en";
  return "hanzi"; // default for punctuation-only etc.
}

// ---------------------------------------------------------------------------
// Slot-pattern database – keyed by scenario code
// ---------------------------------------------------------------------------

interface SlotPattern {
  slot: string;
  patterns: RegExp[];
  value: string; // the canonical value to record
}

interface NpcReply {
  cn: string;
  en: string;
}

interface StateReplies {
  /** Keyed by list of NEWLY filled slot names joined with "," – or "*" as fallback */
  [key: string]: NpcReply;
}

interface ScenarioData {
  slotPatterns: SlotPattern[];
  /** Keyed by state code */
  stateReplies: Record<string, StateReplies>;
  /** Fallback when nothing matched */
  fallback: NpcReply;
  /** Reply when all required slots are filled */
  completionReply: NpcReply;
}

// ---------------------------------------------------------------------------
// Cafe / restaurant scenario data
// ---------------------------------------------------------------------------

const cafeData: ScenarioData = {
  slotPatterns: [
    // drink_type
    {
      slot: "drink_type",
      patterns: [
        /拿铁|nǎ tiě|na\s?tie|latte/i,
      ],
      value: "拿铁",
    },
    {
      slot: "drink_type",
      patterns: [
        /美式|měi shì|mei\s?shi|americano/i,
      ],
      value: "美式",
    },
    {
      slot: "drink_type",
      patterns: [
        /卡布奇诺|cappuccino/i,
      ],
      value: "卡布奇诺",
    },
    {
      slot: "drink_type",
      patterns: [
        /咖啡|kā fēi|ka\s?fei|coffee/i,
      ],
      value: "咖啡",
    },
    {
      slot: "drink_type",
      patterns: [
        /茶|chá|cha\b|tea/i,
      ],
      value: "茶",
    },
    {
      slot: "drink_type",
      patterns: [
        /奶茶|nǎi chá|nai\s?cha|milk\s?tea/i,
      ],
      value: "奶茶",
    },
    // temperature
    {
      slot: "temperature",
      patterns: [/热|rè|re\b|hot/i],
      value: "热的",
    },
    {
      slot: "temperature",
      patterns: [/冰|bīng|bing|冷|lěng|leng|cold|iced/i],
      value: "冰的",
    },
    // size
    {
      slot: "size",
      patterns: [/大杯|dà bēi|da\s?bei|large|grande/i],
      value: "大杯",
    },
    {
      slot: "size",
      patterns: [/中杯|zhōng bēi|zhong\s?bei|medium/i],
      value: "中杯",
    },
    {
      slot: "size",
      patterns: [/小杯|xiǎo bēi|xiao\s?bei|small/i],
      value: "小杯",
    },
    // payment
    {
      slot: "payment",
      patterns: [/微信|wēi xìn|wei\s?xin|wechat/i],
      value: "微信支付",
    },
    {
      slot: "payment",
      patterns: [/支付宝|zhī fù bǎo|zhi\s?fu\s?bao|alipay/i],
      value: "支付宝",
    },
    {
      slot: "payment",
      patterns: [/现金|xiàn jīn|xian\s?jin|cash/i],
      value: "现金",
    },
    // greeting (pseudo-slot to track state progression)
    {
      slot: "greeting",
      patterns: [/你好|nǐ hǎo|ni\s?hao|hello|hi|嗨|hey/i],
      value: "你好",
    },
  ],
  stateReplies: {
    greeting: {
      greeting: {
        cn: "你好！欢迎光临！请问你要喝点什么？",
        en: "Hello! Welcome! What would you like to drink?",
      },
      "*": {
        cn: "你好！请问你要喝点什么？",
        en: "Hello! What would you like to drink?",
      },
    },
    ordering: {
      drink_type: {
        cn: "好的！你要热的还是冰的？",
        en: "Great! Would you like it hot or iced?",
      },
      "drink_type,temperature": {
        cn: "好的！要大杯、中杯还是小杯？",
        en: "Got it! Large, medium, or small?",
      },
      "drink_type,size": {
        cn: "好的！你要热的还是冰的？",
        en: "Got it! Would you like it hot or iced?",
      },
      temperature: {
        cn: "好的，你要什么饮料呢？",
        en: "OK, what drink would you like?",
      },
      size: {
        cn: "好的，你要什么饮料呢？",
        en: "OK, what drink would you like?",
      },
      "*": {
        cn: "不好意思，请再说一遍？你想喝什么？",
        en: "Sorry, could you say that again? What would you like to drink?",
      },
    },
    confirming: {
      "*": {
        cn: "好的，请稍等。你怎么付款？微信、支付宝还是现金？",
        en: "OK, one moment please. How would you like to pay? WeChat, Alipay, or cash?",
      },
    },
    paying: {
      payment: {
        cn: "好的！一共二十五块。谢谢！请稍等。",
        en: "OK! That will be 25 yuan total. Thank you! Please wait a moment.",
      },
      "*": {
        cn: "你怎么付款？微信、支付宝还是现金？",
        en: "How would you like to pay? WeChat, Alipay, or cash?",
      },
    },
    completed: {
      "*": {
        cn: "你的饮料好了，请慢用！再见！",
        en: "Your drink is ready, enjoy! Goodbye!",
      },
    },
  },
  fallback: {
    cn: "不好意思，我没听懂。请再说一遍？",
    en: "Sorry, I didn't understand. Could you say that again?",
  },
  completionReply: {
    cn: "你的饮料好了，请慢用！再见！",
    en: "Your drink is ready, enjoy! Goodbye!",
  },
};

// ---------------------------------------------------------------------------
// Taxi scenario data
// ---------------------------------------------------------------------------

const taxiData: ScenarioData = {
  slotPatterns: [
    {
      slot: "greeting",
      patterns: [/你好|nǐ hǎo|ni\s?hao|hello|hi|嗨|师傅/i],
      value: "你好",
    },
    {
      slot: "destination",
      patterns: [/机场|jī chǎng|ji\s?chang|airport/i],
      value: "机场",
    },
    {
      slot: "destination",
      patterns: [/火车站|huǒ chē zhàn|huo\s?che\s?zhan|train\s?station/i],
      value: "火车站",
    },
    {
      slot: "destination",
      patterns: [/酒店|jiǔ diàn|jiu\s?dian|hotel/i],
      value: "酒店",
    },
    {
      slot: "destination",
      patterns: [/去|qù|qu\b|到|dào|dao\b|go\s?to/i],
      value: "_detected_",
    },
    {
      slot: "confirmation",
      patterns: [/好|hǎo|hao|可以|kě yǐ|ok|sure|yes|是/i],
      value: "confirmed",
    },
  ],
  stateReplies: {
    greeting: {
      "*": {
        cn: "你好！请问你去哪里？",
        en: "Hello! Where are you going?",
      },
    },
    destination: {
      destination: {
        cn: "好的，没问题。大概三十分钟到。",
        en: "OK, no problem. About 30 minutes to get there.",
      },
      "*": {
        cn: "请问你要去哪里？",
        en: "Where would you like to go?",
      },
    },
    completed: {
      "*": {
        cn: "到了！一共四十五块。谢谢！",
        en: "We're here! That's 45 yuan. Thank you!",
      },
    },
  },
  fallback: {
    cn: "不好意思，你说什么？你要去哪里？",
    en: "Sorry, what did you say? Where do you want to go?",
  },
  completionReply: {
    cn: "到了！祝你一路顺风！",
    en: "We're here! Have a good trip!",
  },
};

// ---------------------------------------------------------------------------
// Hotel check-in scenario data
// ---------------------------------------------------------------------------

const hotelData: ScenarioData = {
  slotPatterns: [
    {
      slot: "greeting",
      patterns: [/你好|nǐ hǎo|ni\s?hao|hello|hi/i],
      value: "你好",
    },
    {
      slot: "reservation_name",
      patterns: [/我叫|wǒ jiào|wo\s?jiao|my\s?name|预订|yù dìng|reservation/i],
      value: "provided",
    },
    {
      slot: "nights",
      patterns: [/一晚|两晚|三晚|yī wǎn|liǎng wǎn|one\s?night|two\s?night|三|两|一/i],
      value: "provided",
    },
    {
      slot: "passport",
      patterns: [/护照|hù zhào|hu\s?zhao|passport/i],
      value: "provided",
    },
  ],
  stateReplies: {
    greeting: {
      "*": {
        cn: "你好，欢迎光临！请问你有预订吗？",
        en: "Hello, welcome! Do you have a reservation?",
      },
    },
    checkin: {
      reservation_name: {
        cn: "好的，请出示你的护照。",
        en: "OK, please show me your passport.",
      },
      passport: {
        cn: "谢谢。你住几晚？",
        en: "Thank you. How many nights?",
      },
      "*": {
        cn: "请问你的名字是什么？有预订吗？",
        en: "What is your name? Do you have a reservation?",
      },
    },
    completed: {
      "*": {
        cn: "好的，你的房间号是305。电梯在右边。祝你住得愉快！",
        en: "OK, your room number is 305. The elevator is on the right. Enjoy your stay!",
      },
    },
  },
  fallback: {
    cn: "不好意思，请再说一遍？",
    en: "Sorry, could you say that again?",
  },
  completionReply: {
    cn: "好的，你的房间号是305。祝你住得愉快！",
    en: "OK, your room number is 305. Enjoy your stay!",
  },
};

// ---------------------------------------------------------------------------
// Generic fallback scenario
// ---------------------------------------------------------------------------

const genericData: ScenarioData = {
  slotPatterns: [
    {
      slot: "greeting",
      patterns: [/你好|nǐ hǎo|ni\s?hao|hello|hi|嗨/i],
      value: "你好",
    },
  ],
  stateReplies: {
    greeting: {
      "*": { cn: "你好！有什么可以帮你的？", en: "Hello! How can I help you?" },
    },
  },
  fallback: {
    cn: "不好意思，我没听懂。请再说一遍？",
    en: "Sorry, I didn't understand. Could you say that again?",
  },
  completionReply: {
    cn: "好的，没问题！再见！",
    en: "OK, no problem! Goodbye!",
  },
};

// ---------------------------------------------------------------------------
// Scenario registry
// ---------------------------------------------------------------------------

const scenarioDataMap: Record<string, ScenarioData> = {
  cafe_order: cafeData,
  cafe_restaurant: cafeData,
  taxi_ride: taxiData,
  taxi_directions: taxiData,
  hotel_checkin: hotelData,
  hotel_check_in: hotelData,
};

function getScenarioData(mission: Mission): ScenarioData {
  // Try mission code prefix, scenario id, or fall back
  const code = mission.code.toLowerCase();
  for (const key of Object.keys(scenarioDataMap)) {
    if (code.includes(key)) return scenarioDataMap[key];
  }
  const sid = mission.scenarioId.toLowerCase();
  for (const key of Object.keys(scenarioDataMap)) {
    if (sid.includes(key)) return scenarioDataMap[key];
  }
  return genericData;
}

// ---------------------------------------------------------------------------
// State machine helpers
// ---------------------------------------------------------------------------

function determineCurrentStateName(
  mission: Mission,
  filledSlots: Record<string, string>,
): string {
  const states = mission.states;
  if (states.length === 0) return "greeting";

  // Walk states in order; pick the latest state whose required slots are all filled
  let current = states[0].code;
  for (const st of states) {
    const needed = st.requiredSlotsInState;
    if (needed.length === 0 || needed.every((s) => s in filledSlots)) {
      current = st.code;
    } else {
      break;
    }
  }
  return current;
}

function allRequiredSlotsFilled(
  mission: Mission,
  filledSlots: Record<string, string>,
): boolean {
  return mission.requiredSlots.every((s) => s in filledSlots);
}

// ---------------------------------------------------------------------------
// processUserInput
// ---------------------------------------------------------------------------

export function processUserInput(
  input: string,
  mission: Mission,
  session: Session,
): DialogueResponse {
  const script = detectScript(input);
  const scenarioData = getScenarioData(mission);
  const trimmed = input.trim();

  // Copy existing filled slots
  const filledSlots: Record<string, string> = { ...session.slotsFilledMap };
  const newlyFilled: string[] = [];
  const errorTags: string[] = [];

  // Match input against slot patterns
  for (const sp of scenarioData.slotPatterns) {
    if (sp.slot in filledSlots) continue; // already filled
    for (const pat of sp.patterns) {
      if (pat.test(trimmed)) {
        filledSlots[sp.slot] = sp.value;
        newlyFilled.push(sp.slot);
        break;
      }
    }
  }

  // Determine state AFTER slot filling
  const currentState = determineCurrentStateName(mission, filledSlots);
  const understood = newlyFilled.length > 0 || trimmed.length > 0;

  // Check completion
  const isComplete = allRequiredSlotsFilled(mission, filledSlots);

  // Pick NPC reply
  let reply: NpcReply;
  if (isComplete) {
    // If there is a final state reply, use it; otherwise use completion
    const stateReplies = scenarioData.stateReplies[currentState];
    reply = stateReplies?.["*"] ?? scenarioData.completionReply;
  } else {
    const stateReplies = scenarioData.stateReplies[currentState];
    if (stateReplies) {
      // Try matching by newly-filled slot keys
      const key = newlyFilled.sort().join(",");
      reply =
        stateReplies[key] ??
        stateReplies["*"] ??
        scenarioData.fallback;
    } else {
      reply = scenarioData.fallback;
    }
  }

  // If nothing was understood at all
  if (newlyFilled.length === 0 && !isComplete) {
    // Check for very short or empty input
    if (trimmed.length === 0) {
      errorTags.push("empty_input");
    }
    // Still return what we have – the fallback reply asks to repeat
    if (!scenarioData.stateReplies[currentState]) {
      reply = scenarioData.fallback;
    }
  }

  // Determine missing slots
  const missingSlots = mission.requiredSlots.filter((s) => !(s in filledSlots));

  // Determine task status
  let taskStatus: "in_progress" | "completed" | "failed" = "in_progress";
  if (isComplete) {
    taskStatus = "completed";
  }

  return {
    normalizedUserCn: trimmed,
    understood: understood && newlyFilled.length > 0,
    taskStatus,
    slotsFilled: Object.keys(filledSlots),
    missingSlots,
    npcReplyCn: reply.cn,
    npcReplyEn: reply.en,
    currentState,
    errorTags,
    hintAvailable: session.hintLevel < 3,
  };
}

// ---------------------------------------------------------------------------
// getHint
// ---------------------------------------------------------------------------

export function getHint(
  level: number,
  mission: Mission,
  currentState: string,
): HintContent {
  const scenarioData = getScenarioData(mission);

  // Find warmup patterns relevant to current state
  const warmups = mission.warmupPatterns ?? [];

  switch (level) {
    case 0:
      // Keywords only
      return {
        level: 0,
        keywords: getKeywordsForState(currentState, mission),
      };
    case 1:
      // Gloss hint
      return {
        level: 1,
        keywords: getKeywordsForState(currentState, mission),
        glossHint: warmups[0] ?? undefined,
      };
    case 2:
      // Half sentence
      return {
        level: 2,
        keywords: getKeywordsForState(currentState, mission),
        glossHint: warmups[0] ?? undefined,
        halfSentence: getHalfSentence(currentState, mission),
      };
    case 3:
    default:
      // Full reference
      return {
        level: 3,
        keywords: getKeywordsForState(currentState, mission),
        glossHint: warmups[0] ?? undefined,
        halfSentence: getHalfSentence(currentState, mission),
        fullReference: getFullReference(currentState, mission),
      };
  }
}

function getKeywordsForState(state: string, mission: Mission): string[] {
  const stateKeywords: Record<string, string[]> = {
    greeting: ["你好", "nǐ hǎo"],
    ordering: ["我要", "一杯", "请给我"],
    confirming: ["好的", "对", "没错"],
    paying: ["微信", "支付宝", "现金"],
    destination: ["去", "到", "机场", "酒店", "火车站"],
    checkin: ["预订", "我叫", "护照"],
    completed: ["谢谢", "再见"],
  };
  return stateKeywords[state] ?? ["你好", "请"];
}

function getHalfSentence(state: string, _mission: Mission): string {
  const sentences: Record<string, string> = {
    greeting: "你好，我想...",
    ordering: "请给我一杯...",
    confirming: "好的，我要...",
    paying: "我用...付款",
    destination: "我要去...",
    checkin: "我叫...，我有预订",
    completed: "谢谢！",
  };
  return sentences[state] ?? "请...";
}

function getFullReference(state: string, _mission: Mission): string {
  const references: Record<string, string> = {
    greeting: "你好，我想点一杯咖啡。",
    ordering: "请给我一杯热的拿铁，大杯的。",
    confirming: "好的，没问题。",
    paying: "我用微信付款。",
    destination: "你好，我要去机场。",
    checkin: "你好，我叫 Smith，我有预订。",
    completed: "谢谢，再见！",
  };
  return references[state] ?? "你好，请帮我。";
}

// ---------------------------------------------------------------------------
// generateDebrief
// ---------------------------------------------------------------------------

export function generateDebrief(
  mission: Mission,
  session: Session,
): DebriefResult {
  const turns = session.turns;
  const userTurns = turns.filter((t) => t.role === "user");
  const totalTurns = userTurns.length;
  const understoodTurns = userTurns.filter((t) => t.understood === true).length;
  const errorTurns = userTurns.filter(
    (t) => t.errorTags && t.errorTags.length > 0,
  );
  const hintsUsed = userTurns.filter(
    (t) => t.hintUsed !== undefined && t.hintUsed > 0,
  ).length;

  // Calculate score (0-100)
  const comprehensionRate =
    totalTurns > 0 ? understoodTurns / totalTurns : 0;
  const errorPenalty = errorTurns.length * 5;
  const hintPenalty = hintsUsed * 3;
  const turnEfficiency = Math.max(
    0,
    1 - (totalTurns - mission.requiredSlots.length) * 0.1,
  );
  const rawScore =
    comprehensionRate * 60 + turnEfficiency * 40 - errorPenalty - hintPenalty;
  const score = Math.max(0, Math.min(1, Math.round(rawScore) / 100));

  // Determine result
  let result: "success" | "partial_success" | "failure";
  if (session.status === "completed" || allRequiredSlotsFilled(mission, session.slotsFilledMap)) {
    result = score >= 0.6 ? "success" : "partial_success";
  } else {
    result = session.turns.length > 0 ? "partial_success" : "failure";
  }

  // Strengths
  const strengths: string[] = [];
  const hanziTurns = userTurns.filter(
    (t) => t.detectedScript === "hanzi",
  ).length;
  if (hanziTurns > totalTurns * 0.5) {
    strengths.push("Good use of Chinese characters (汉字)");
  }
  if (comprehensionRate > 0.7) {
    strengths.push("Strong communication — understood most of the time");
  }
  if (hintsUsed === 0 && totalTurns > 0) {
    strengths.push("Completed without using hints — great independence!");
  }
  if (totalTurns <= mission.requiredSlots.length + 1) {
    strengths.push("Very efficient dialogue — minimal turns needed");
  }
  if (strengths.length === 0) {
    strengths.push("Good effort — keep practicing!");
  }

  // Fixes
  const topFixes: DebriefFix[] = [];
  const pinyinTurns = userTurns.filter(
    (t) => t.detectedScript === "pinyin" || t.detectedScript === "en",
  );
  if (pinyinTurns.length > totalTurns * 0.5) {
    topFixes.push({
      type: "script",
      before: "Using mostly pinyin/English",
      after: "Try using Chinese characters (汉字)",
      reason:
        "Character recognition strengthens reading and real-world comprehension",
    });
  }
  if (hintsUsed > 2) {
    topFixes.push({
      type: "independence",
      before: "Relying on hints frequently",
      after: "Try recalling phrases from memory before asking for hints",
      reason: "Active recall builds stronger memory",
    });
  }
  if (errorTurns.length > 0) {
    topFixes.push({
      type: "accuracy",
      before: "Some inputs were not understood",
      after: "Review the phrases in the warmup section before starting",
      reason: "Preparation reduces errors during the mission",
    });
  }

  // Transfer patterns – reuse warmup glosses from mission
  const transferPatterns: GlossItem[] = (mission.warmupPatterns ?? []).slice(
    0,
    3,
  );

  return {
    result,
    score,
    strengths,
    topFixes,
    transferPatterns,
    nextMissionId: undefined, // to be filled by the scenario system
  };
}
