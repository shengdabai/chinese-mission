import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zturns.chinesemission",
  appName: "Chinese Mission",
  webDir: "www",
  server: {
    url: "https://chinese-mission.vercel.app",
    cleartext: false,
    allowNavigation: [
      "chinese-mission.vercel.app",
      "*.vercel.app",
      "api.deepseek.com",
    ],
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#ffffff",
  },
};

export default config;
