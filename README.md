# 🌙 Online Sheikh AI

An intelligent Islamic consultant grounded in the Quran and authentic Sunnah. Built for the modern Ummah with a focus on accessibility and authenticity.

## ✨ Features
- **Authentic Guidance**: Powered by a sophisticated system prompt that mandates Quranic and Hadith citations.
- **Progressive Depth**: Suitable for both beginners (simple explanations) and students of knowledge (deeper Fiqh/Tafsir).
- **Secure Infrastructure**: Designed for Cloudflare Pages with Edge Functions.
- **Rate Limiting**: Integrated client-side and server-side ready limiting to prevent API abuse.
- **Monetization Ready**: Includes optimized slots for advertisements to keep the service free for users.

## 🚀 Getting Started

### 1. Repository Setup
- Push this code to a new **GitHub** repository.

### 2. Cloudflare Deployment
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository.
4. Set the Build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Click **Save and Deploy**.

### 3. Environment Variables
In your Cloudflare Pages project settings, add the following variables:
- `AI_API_KEY`: Your OpenAI or Gemini API key.
- `SHEIKH_PROMPT`: (Copy from `src/lib/ai-prompt.ts`)

### 4. Rate Limiting (Optional but Recommended)
To prevent bot abuse on the server-side, you can connect a **Cloudflare KV** namespace to your project and update `functions/api/chat.ts` to log usage per IP.

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, Framer Motion (Animations), Lucide React (Icons).
- **Backend**: Cloudflare Pages Functions (Edge Runtime).
- **Styling**: Vanilla CSS with a custom Islamic-themed design system.

## 📜 Disclaimer
This AI is intended for educational and informational purposes. While it aims for high accuracy, it is not a replacement for a qualified human Mufti or Scholar. Always consult with local authorities for binding fatwas.

---
Built with 💚 by Antigravity
