import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zturns.chinesemission",
  appName: "Chinese Mission",
  webDir: "www",
  server: {
    url: "https://chinese-mission.vercel.app",
    cleartext: false,
    // Exact production origin only: a wildcard would let any Vercel tenant page run inside the native bridge,
    // and the model API is called from the server, never from the WebView.
    allowNavigation: ["chinese-mission.vercel.app"],
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#ffffff",
  },
};

export default config;
