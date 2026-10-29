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
  excludePatterns?: RegExp[];
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
  /** Current missions can ask directly for their first missing required slot. */
  slotPrompts?: Record<string, NpcReply>;
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

// Mission codes and state codes in scenarios.ts differ from the older scenario
// templates above. Keep each supported mission's intent and response together.
const drinkPatterns: SlotPattern[] = [
  { slot: "drink_type", patterns: [/拿铁|na\s?tie|\blatte\b/i], value: "拿铁" },
  { slot: "drink_type", patterns: [/美式|mei\s?shi|\bamericano\b/i], value: "美式" },
  { slot: "drink_type", patterns: [/卡布奇诺|\bcappuccino\b/i], value: "卡布奇诺" },
  { slot: "drink_type", patterns: [/奶茶|nai\s?cha|\bmilk\s?tea\b/i], value: "奶茶" },
  { slot: "drink_type", patterns: [/咖啡|ka\s?fei|\bcoffee\b/i], value: "咖啡" },
  { slot: "drink_type", patterns: [/茶|\bcha\b|\btea\b/i], value: "茶" },
];

const unavailableTimePatterns = [
  /没(?:有)?空|没有时间|不方便|\bmei\s*(?:you\s*)?kong\b|\bmei\s*you\s*shi\s*jian\b|\b(?:not\s+(?:available|free)|can't\s+make\s+it|cannot\s+make\s+it)\b/i,
];

function missionDialogue(
  slotPatterns: SlotPattern[],
  slotPrompts: Record<string, NpcReply>,
  completionReply: NpcReply,
): ScenarioData {
  return { slotPatterns, slotPrompts, completionReply, stateReplies: {}, fallback: genericData.fallback };
}

const missionDataMap: Record<string, ScenarioData> = {
  order_hot_latte: missionDialogue(
    [
      ...drinkPatterns,
      { slot: "temperature", patterns: [/热|\bre\b|\bhot\b/i], value: "热的" },
      { slot: "temperature", patterns: [/冰|冷|\bbing\b|\bleng\b|\bcold\b|\biced?\b/i], value: "冰的" },
      ...cafeData.slotPatterns.filter((pattern) => pattern.slot === "size"),
    ],
    {
      drink_type: { cn: "请问你想喝什么？", en: "What would you like to drink?" },
      temperature: { cn: "好的！你要热的还是冰的？", en: "Great! Would you like it hot or iced?" },
    },
    { cn: "好的，马上为你做，请稍等。", en: "OK, I'll make that for you. One moment, please." },
  ),
  order_no_ice: missionDialogue(
    [
      ...drinkPatterns,
      { slot: "ice_preference", patterns: [/不(?:要)?加冰|不要冰|去冰|无冰|\bbu\s*(?:yao\s*)?jia\s*bing\b|\bbu\s*yao\s*bing\b|\bqu\s*bing\b|\b(?:no|without)\s+ice\b/i], value: "不加冰" },
      ...cafeData.slotPatterns.filter((pattern) => pattern.slot === "size"),
    ],
    {
      drink_type: { cn: "好的，你想喝什么饮料？", en: "OK, what drink would you like?" },
      ice_preference: { cn: "饮料要加冰吗？", en: "Would you like ice in your drink?" },
    },
    { cn: "好的，不加冰，马上为你做。", en: "OK, no ice. I'll make that for you." },
  ),
  ask_for_bill: missionDialogue(
    [{
      slot: "payment_request",
      patterns: [/买单|结账|多少钱|\bmai\s*dan\b|\bjie\s*zhang\b|\bduo\s*shao\s*qian\b|\bthe\s+(?:bill|check)\b|\b(?:bill|check)(?:\s*,\s*|\s+)please\b|\bhow\s+much\b/i],
      excludePatterns: [/不(?:要|用|想|需要)\s*(?:买单|结账)|\b(?:don't|do\s+not)\s+(?:want|need)\s+(?:the\s+)?(?:bill|check)\b/i],
      value: "买单",
    }],
    { payment_request: { cn: "请问需要什么帮助？", en: "How can I help you?" } },
    { cn: "好的，马上给你拿账单。", en: "Of course. I'll bring your bill right away." },
  ),
  takeaway_order: missionDialogue(
    [
      { slot: "food_item", patterns: [/宫保鸡丁|炒饭|炒面|米饭|饺子|面条|\bgong\s*bao\s*ji\s*ding\b|\b(?:kung\s*pao\s*chicken|fried\s+rice|noodles|dumplings)\b/i], value: "food_selected" },
      {
        slot: "takeaway_request",
        patterns: [/打包|带走|外带|\bda\s*bao\b|\bdai\s*zou\b|\b(?:takeaway|takeout|take\s+away|to\s+go)\b/i],
        excludePatterns: [/不(?:要|用|想|需要)\s*(?:打包|带走|外带)|\bbu\s*(?:yao|yong|xiang)\s*(?:da\s*bao|dai\s*zou)\b|\b(?:no|not)\s+(?:takeaway|takeout|to\s+go)\b|\b(?:don't|do\s+not)\s+(?:want\s+)?(?:takeaway|takeout|to\s+go)\b/i],
        value: "打包",
      },
    ],
    {
      food_item: { cn: "好的，你想点什么菜？", en: "OK, what food would you like to order?" },
      takeaway_request: { cn: "你在这里吃还是带走？", en: "For here or to go?" },
    },
    { cn: "好的，给你打包，请稍等。", en: "OK, I'll pack that to go. One moment, please." },
  ),
  tell_destination: missionDialogue(
    [{
      slot: "destination",
      patterns: [/机场|火车站|地铁站|天安门|酒店|这个地方|\b(?:ji\s*chang|huo\s*che\s*zhan|di\s*tie\s*zhan|tian\s*an\s*men|jiu\s*dian|zhe\s*ge\s*di\s*fang)\b|\b(?:airport|train\s+station|subway\s+station|tiananmen|hotel|this\s+place)\b/i],
      excludePatterns: [/不(?:要|用|想|需要)去|\bbu\s*(?:yao|yong|xiang)\s*qu\b|\b(?:don't|do\s+not)\s+(?:want\s+to\s+)?go\b/i],
      value: "destination_provided",
    }],
    { destination: { cn: "请问你要去哪里？", en: "Where would you like to go?" } },
    { cn: "好的，知道了，我们现在出发。", en: "Got it. Let's get going." },
  ),
  ask_slow_down: missionDialogue(
    [{
      slot: "slow_down_request",
      patterns: [/慢一点|开慢|太快了|\bman\s*(?:yi\s*dian|dian)\b|\btai\s*kuai\s*le\b|\b(?:slow\s+down|slower|too\s+fast)\b/i],
      excludePatterns: [/不(?:要|用|需要)(?:开)?慢|\bbu\s*(?:yao|yong)\s*(?:kai\s*)?man\b|\b(?:don't|do\s+not)\s+(?:drive\s+)?slow(?:\s+down|er)\b/i],
      value: "slow_down",
    }],
    { slow_down_request: { cn: "你想让我开慢一点吗？", en: "Would you like me to slow down?" } },
    { cn: "好的，我开慢一点。", en: "OK, I'll drive more slowly." },
  ),
  stop_here: missionDialogue(
    [{
      slot: "stop_request",
      patterns: [/这里停|这儿停|停一下|停车|\b(?:zhe\s*li|zher)\s*ting\b|\bting\s*(?:yi\s*xia|che)\b|\b(?:stop\s+here|pull\s+over|we(?:'re|\s+are)\s+here)\b/i, /^(?:(?:师傅[，,\s]*)?(?:我们)?到了|dao\s*le)(?:[，,。！!\s]*(?:谢谢|xie\s*xie))?[。！!\s]*$/i],
      excludePatterns: [/不(?:要|用|需要)(?:在)?(?:这里|这儿)?停|\bbu\s*(?:yao|yong)\s*(?:zai\s*)?(?:zhe\s*li\s*)?ting\b|\b(?:don't|do\s+not)\s+(?:stop|pull\s+over)\b/i],
      value: "stop_here",
    }],
    { stop_request: { cn: "你想在哪里下车？", en: "Where would you like to get out?" } },
    { cn: "好的，在这里停。下车请注意安全。", en: "OK, I'll stop here. Take care getting out." },
  ),
  where_is_subway: missionDialogue(
    [{ slot: "location_query", patterns: [/地铁站.*(?:哪里|哪儿|怎么走)|怎么走|\bdi\s*tie\s*zhan\s*(?:zai\s*)?(?:na\s*li|nar)\b|\bzen\s*me\s*zou\b|\bwhere\s+is\s+the\s+(?:subway|metro)\s+station\b|\bhow\s+(?:do\s+i\s+get|to\s+go)\s+to\s+the\s+(?:subway|metro)\b/i], value: "subway_location" }],
    { location_query: { cn: "你好，你想去哪里？", en: "Hello, where would you like to go?" } },
    { cn: "地铁站在前面，过马路后右转就到了。", en: "The subway station is ahead. Cross the road and turn right." },
  ),
  how_far: missionDialogue(
    [{ slot: "distance_query", patterns: [/多远|远不远|多长时间|\bduo\s*yuan\b|\byuan\s*bu\s*yuan\b|\bduo\s*chang\s*shi\s*jian\b|\bhow\s+(?:far|long)\b/i], value: "distance_requested" }],
    { distance_query: { cn: "你想问距离还是时间？", en: "Would you like to know the distance or travel time?" } },
    { cn: "不太远，走路大概十分钟。", en: "It's not far, about ten minutes on foot." },
  ),
  which_way: missionDialogue(
    [{ slot: "direction_query", patterns: [/(?:往|走|拐|转).*(?:左|右)|左.*还是.*右|怎么走|\b(?:zuo|you)\s*(?:zou|guai|zhuan)\b|\bzen\s*me\s*zou\b|\b(?:which\s+way|(?:turn|go)\s+(?:left|right))\b/i], value: "direction_requested" }],
    { direction_query: { cn: "你想确认往哪边走？", en: "Which direction would you like to check?" } },
    { cn: "在前面的红绿灯左转，然后一直走。", en: "Turn left at the traffic lights ahead, then go straight." },
  ),
  basic_intro: missionDialogue(
    [
      { slot: "greeting", patterns: [/你好|您好|很高兴认识你|\bni\s*hao\b|\bhen\s*gao\s*xing\s*ren\s*shi\s*ni\b|\b(?:hello|hi|nice\s+to\s+meet\s+you)\b/i], value: "greeted" },
      { slot: "name", patterns: [/(?:我叫|叫我)[\p{Script=Han}a-zA-Z]+/u, /\b(?:wo\s*jiao|jiao\s*wo)\s+[a-z]+|\b(?:my\s+name\s+is|call\s+me)\s+[a-z]+/i], value: "name_provided" },
    ],
    {
      greeting: { cn: "你好！很高兴认识你。", en: "Hello! Nice to meet you." },
      name: { cn: "你好，你叫什么名字？", en: "Hello, what's your name?" },
    },
    { cn: "很高兴认识你！欢迎一起练习中文。", en: "Nice to meet you! Let's practice Chinese together." },
  ),
  where_from: missionDialogue(
    [{ slot: "country", patterns: [/(?:我是|我从)(?:美国|法国|英国|德国|日本|韩国|中国|加拿大|澳大利亚)|^(?:美国|法国|英国|德国|日本|韩国|中国|加拿大|澳大利亚)[人。！!]?$/, /\bwo\s*(?:shi|cong)\s*(?:mei\s*guo|fa\s*guo|ying\s*guo|de\s*guo|ri\s*ben|han\s*guo|zhong\s*guo|jia\s*na\s*da|ao\s*da\s*li\s*ya)\b|\b(?:i\s+am|i'm)\s+(?:from\s+(?:the\s+)?(?:usa|us|united\s+states|france|uk|united\s+kingdom|germany|japan|korea|china|canada|australia)|american|french|british|german|japanese|korean|chinese|canadian|australian)\b/i], value: "country_provided" }],
    { country: { cn: "你是哪国人？", en: "Where are you from?" } },
    { cn: "原来如此，欢迎来中国！", en: "I see. Welcome to China!" },
  ),
  what_do_you_do: missionDialogue(
    [{ slot: "occupation", patterns: [/我是.*(?:老师|教师|学生|工程师|医生|设计师|程序员)|我在.*(?:公司|学校|医院).*(?:上班|工作)|我(?:是)?做IT的|\bwo\s*shi\s*(?:lao\s*shi|xue\s*sheng|gong\s*cheng\s*shi|yi\s*sheng|she\s*ji\s*shi)\b|\b(?:i\s+am|i'm)\s+(?:a|an)\s+(?:teacher|student|engineer|doctor|designer|programmer)\b|\bi\s+work\s+(?:at|in|for)\b/i], value: "occupation_provided" }],
    { occupation: { cn: "你做什么工作？", en: "What do you do?" } },
    { cn: "原来如此，很高兴了解你的工作！", en: "I see. It's nice to learn about your work!" },
  ),
  add_wechat: missionDialogue(
    [{ slot: "wechat_request", patterns: [/(?:加.*微信|微信号.*多少|扫.*二维码)|\bjia\s*(?:ge\s*)?wei\s*xin\b|\bwei\s*xin\s*hao\s*shi\s*duo\s*shao\b|\bsao\s*yi\s*xia.*er\s*wei\s*ma\b|\b(?:add|exchange|scan)\b.*\b(?:wechat|qr\s+code)\b|\b(?:your|my)\s+wechat\s+(?:id|number)\b/i], value: "wechat_requested" }],
    { wechat_request: { cn: "我们以后怎么联系？", en: "How can we keep in touch?" } },
    { cn: "好啊，我们加个微信吧。", en: "Sure, let's add each other on WeChat." },
  ),
  invite_dinner: missionDialogue(
    [
      { slot: "invitation", patterns: [/一起吃饭|我请你|\byi\s*qi\s*chi\s*fan\b|\bwo\s*qing\s*ni\b|\b(?:let's|shall\s+we|would\s+you\s+like\s+to)\s+(?:have\s+)?(?:dinner|lunch|eat)\b/i], value: "dinner_invitation" },
      {
        slot: "time_suggestion",
        patterns: [/今天|明天|后天|周[一二三四五六日末天]|星期[一二三四五六日天]|\b(?:jin\s*tian|ming\s*tian|hou\s*tian|zhou\s*mo)\b|\b(?:today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)\b/i],
        excludePatterns: unavailableTimePatterns,
        value: "time_provided",
      },
    ],
    {
      invitation: { cn: "你有什么安排？", en: "What would you like to do?" },
      time_suggestion: { cn: "好啊，什么时候一起吃饭？", en: "Sure! When shall we have dinner?" },
    },
    { cn: "好啊，那就说定了，到时候见！", en: "Sounds good. It's a plan. See you then!" },
  ),
  talk_hobbies: missionDialogue(
    [{ slot: "own_hobby", patterns: [/我(?:很|也)?喜欢(?:跑步|游泳|看书|阅读|音乐|电影|旅行|运动|打球|唱歌|跳舞)|\bwo\s*(?:ye\s*)?xi\s*huan\s*(?:pao\s*bu|you\s*yong|kan\s*shu|yin\s*yue|yun\s*dong)\b|\bi\s+(?:like|enjoy|love)\s+(?:running|swimming|reading|music|movies|travel|sports|singing|dancing)\b/i], value: "hobby_provided" }],
    { own_hobby: { cn: "你平时喜欢做什么？", en: "What do you like doing in your free time?" } },
    { cn: "这个爱好很不错，有空我们一起吧！", en: "That's a great hobby. Let's try it together sometime!" },
  ),
  greet_colleagues: missionDialogue(
    [{ slot: "greeting", patterns: [/你好|您好|嗨|早上好|吃了吗|周末过得怎么样|\bni\s*hao\b|\bzao\s*shang\s*hao\b|\bchi\s*le\s*ma\b|\bzhou\s*mo\s*guo\s*de\s*zen\s*me\s*yang\b|\b(?:hello|hi|good\s+morning|how\s+was\s+your\s+weekend)\b/i], value: "greeted" }],
    { greeting: { cn: "早上好！", en: "Good morning!" } },
    { cn: "早上好！祝你今天工作顺利。", en: "Good morning! Have a good day at work." },
  ),
  ask_for_help: missionDialogue(
    [{
      slot: "help_request",
      patterns: [/帮我|帮.*忙|这个我不太懂|\bbang\s*wo\b|\bbang.*mang\b|\bzhe\s*ge\s*wo\s*bu\s*tai\s*dong\b|\b(?:help\s+me|give\s+me\s+a\s+hand|i\s+don't\s+understand\s+this)\b/i],
      excludePatterns: [/不(?:用|要|需要)帮|\bbu\s*(?:yong|yao)\s*bang\b|\b(?:don't|do\s+not)\s+help\s+me\b/i],
      value: "help_requested",
    }],
    { help_request: { cn: "你需要什么帮助？", en: "What do you need help with?" } },
    { cn: "当然可以，我们一起看看。", en: "Of course. Let's take a look together." },
  ),
  schedule_meeting: missionDialogue(
    [
      { slot: "meeting_topic", patterns: [/项目|进度|预算|计划|设计|\b(?:xiang\s*mu|jin\s*du|yu\s*suan|ji\s*hua|she\s*ji)\b|\b(?:project|progress|budget|plan|design)\b/i], value: "topic_provided" },
      {
        slot: "time_proposal",
        patterns: [/今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|[一二三四五六七八九十两\d]+点(?:钟|半)?(?=开会|见|有空|[，,。！!？?\s]|$)|\b(?:jin\s*tian|ming\s*tian|hou\s*tian)\b|\b(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s*(?:am|pm))\b/i],
        excludePatterns: unavailableTimePatterns,
        value: "time_proposed",
      },
    ],
    {
      meeting_topic: { cn: "这次会议想讨论什么？", en: "What would you like to discuss at the meeting?" },
      time_proposal: { cn: "好的，你想约什么时间？", en: "OK, what time would you suggest?" },
    },
    { cn: "好的，就按你说的时间讨论这个话题。", en: "OK, let's discuss that at the time you suggested." },
  ),
  call_in_sick: missionDialogue(
    [
      {
        slot: "leave_request",
        patterns: [/请(?:个|一[天周])?(?:病)?假|\bqing\s*(?:ge\s*|yi\s*tian\s*)?(?:bing\s*)?jia\b|\b(?:day\s+off|sick\s+leave|take\s+(?:a\s+)?leave)\b/i],
        excludePatterns: [/不(?:需要|想|用|要)?请|\bbu\s*(?:(?:xu\s*yao|xiang|yong|yao)\s*)?qing\b|\b(?:don't|do\s+not)\s+(?:need|want)\s+(?:a\s+)?(?:day\s+off|sick\s+leave)\b/i],
        value: "leave_requested",
      },
      { slot: "reason", patterns: [/身体不舒服|生病|病假|感冒|发烧|头疼|头痛|\bshen\s*ti\s*bu\s*shu\s*fu\b|\b(?:sheng\s*bing|bing\s*jia|gan\s*mao|fa\s*shao|tou\s*teng)\b|\b(?:sick|ill|unwell|fever|headache)\b/i], value: "illness" },
    ],
    {
      leave_request: { cn: "需要请假吗？", en: "Do you need to take leave?" },
      reason: { cn: "你身体哪里不舒服？", en: "What's wrong? Are you feeling unwell?" },
    },
    { cn: "好的，好好休息，祝你早日康复。", en: "OK, get some rest. I hope you feel better soon." },
  ),
};

function getScenarioData(mission: Mission): ScenarioData {
  if (Object.hasOwn(missionDataMap, mission.code)) return missionDataMap[mission.code];
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
  // Match tone-marked and plain pinyin identically, keeping the original text
  // in the response. Limit normalization to the new mission-specific rules.
  const matchInput = scenarioData.slotPrompts
    ? trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : trimmed;

  // Copy existing filled slots
  const filledSlots: Record<string, string> = { ...session.slotsFilledMap };
  const newlyFilled: string[] = [];
  const errorTags: string[] = [];

  // Match input against slot patterns
  for (const sp of scenarioData.slotPatterns) {
    if (sp.slot in filledSlots) continue; // already filled
    if (sp.excludePatterns?.some((pattern) => pattern.test(matchInput))) continue;
    for (const pat of sp.patterns) {
      if (pat.test(matchInput)) {
        filledSlots[sp.slot] = sp.value;
        newlyFilled.push(sp.slot);
        break;
      }
    }
  }

  // Determine state AFTER slot filling
  const missingSlots = mission.requiredSlots.filter((s) => !(s in filledSlots));
  let currentState = determineCurrentStateName(mission, filledSlots);
  if (scenarioData.slotPrompts) {
    const pendingState = mission.states.find((state) =>
      state.requiredSlotsInState.some((slot) => missingSlots.includes(slot)),
    );
    currentState = missingSlots.length === 0
      ? mission.states[mission.states.length - 1]?.code ?? "completed"
      : pendingState?.code ?? session.currentState;
  }
  // Recognize courtesy without adding an unrelated slot to the progress count.
  const courtesyUnderstood = Boolean(scenarioData.slotPrompts) &&
    /^(?:你好|您好|嗨|谢谢(?:你|您)?|ni\s*hao|nin\s*hao|xie\s*xie(?:\s*(?:ni|nin))?|hello|hi|thanks|thank\s+you)[!！?？。,.，\s]*$/i.test(matchInput);
  const understood = newlyFilled.length > 0 || courtesyUnderstood;

  // Check completion
  const isComplete = allRequiredSlotsFilled(mission, filledSlots);

  // Pick NPC reply
  let reply: NpcReply;
  if (isComplete) {
    // If there is a final state reply, use it; otherwise use completion
    const stateReplies = scenarioData.stateReplies[currentState];
    reply = stateReplies?.["*"] ?? scenarioData.completionReply;
  } else if (scenarioData.slotPrompts) {
    reply = scenarioData.slotPrompts[missingSlots[0]] ?? scenarioData.fallback;
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
    if (!scenarioData.slotPrompts && !scenarioData.stateReplies[currentState]) {
      reply = scenarioData.fallback;
    }
  }

  // Determine task status
  let taskStatus: "in_progress" | "completed" | "failed" = "in_progress";
  if (isComplete) {
    taskStatus = "completed";
  }

  return {
    normalizedUserCn: trimmed,
    understood,
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
