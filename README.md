# 🌙 Online Sheikh — AI Islamic Guidance

> An intelligent Islamic consultant grounded in the Quran and authentic Sunnah, built for the modern Ummah.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-islamic--advisor.pages.dev-emerald?style=for-the-badge&logo=cloudflare)](https://islamic-advisor.pages.dev)
[![Built with Vite](https://img.shields.io/badge/Vite-React%20%2B%20TypeScript-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Deployed on Cloudflare](https://img.shields.io/badge/Deployed-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare)](https://pages.cloudflare.com)

---

## ✨ What is Online Sheikh?

Online Sheikh is a free, privacy-respecting web app that provides Islamic guidance powered by AI. It answers questions about:

- **Fiqh** (Islamic jurisprudence) across all four major schools of thought
- **Quran** — with Arabic text, English translation, word-by-word breakdown, and Ibn Kathir Tafsir
- **Hadith** — searchable access to Sahih Bukhari, Sahih Muslim, and other major collections
- **Aqeedah, Seerah, daily worship**, and more

Every response cites its Quranic verses and Hadith references directly, and users can click those references to jump straight to the exact verse or hadith in the built-in **Knowledge Library**.

---

## 🎯 Key Features

| Feature | Description |
|---|---|
| 🤖 **AI Chat** | Powered by Google Gemini via OpenRouter. Answers using Quran + Sunnah citations. |
| 📚 **Knowledge Library** | Browse or search all 114 Surahs and 6 major Hadith collections. |
| 🔗 **Deep-link References** | Click any AI citation to jump directly to that ayah or hadith. |
| 🔊 **Audio Recitation** | Listen to Mishary Rashid Al-Afasy reciting any verse. |
| 📖 **Word-by-Word** | Arabic breakdown with individual word translations per ayah. |
| 🕌 **Tafsir** | Ibn Kathir commentary on any verse, loaded on demand. |
| 🔐 **Rate Limiting** | Client-side rate limiting to prevent abuse. |
| 📱 **Mobile Responsive** | Fully responsive design. |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Vanilla CSS, custom Islamic design system |
| Animations | Framer Motion |
| Icons | Lucide React |
| Backend | Cloudflare Pages Functions (Edge Runtime) |
| AI Model | Google Gemini 2.0 Flash (via OpenRouter) |
| Quran API | [alquran.cloud](https://alquran.cloud/api) |
| Hadith API | [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) |
| Tafsir API | [spa5k/tafsir_api](https://github.com/spa5k/tafsir_api) |
| Audio | [everyayah.com](https://everyayah.com) |

---

## 🚀 Getting Started (Self-Host)

### Prerequisites
- Node.js 18+
- A [Cloudflare](https://cloudflare.com) account (free tier works)
- An [OpenRouter](https://openrouter.ai) API key (or OpenAI/Gemini key)

### Local Development

```bash
git clone https://github.com/lakar-team/Islamic-advisor.git
cd Islamic-advisor
npm install
npm run dev
```

> **Note:** The AI chat requires a backend (Cloudflare Function). For local testing, the app will show an error on chat but the Knowledge Library works fully offline from the Quran/Hadith APIs.

### Deploy to Cloudflare Pages

1. Fork this repository.
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select your fork.
4. Set build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Add the following **Environment Variables** in your Pages project settings:

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AI_API_KEY` | ✅ Yes | Your OpenRouter (or OpenAI) API key |
| `SHEIKH_PROMPT` | Optional | Override the codebase system prompt (default in `src/lib/ai-prompt.ts`) |
| `AI_API_URL` | Optional | Override the AI endpoint (default: `https://openrouter.ai/api/v1/chat/completions`) |
| `AI_MODEL` | Optional | Override the AI model (default: `google/gemini-2.0-flash-001`) |
| `STRIPE_SECRET_KEY` | ✅ Yes | Your Stripe Secret Key (for donations) |

> 💡 **Notice**: The system prompt is now managed through Git in `src/lib/ai-prompt.ts`. You only need to set the `SHEIKH_PROMPT` variable if you want to override the codebase default.

> ⚠️ **Never commit your API key.** Always set it via Cloudflare's environment variable UI, never in code or `.env` files checked into git.

---

## 🔐 Security

This project is designed with public deployment in mind:

- **API key is never exposed to the browser.** All AI calls are proxied through a Cloudflare Edge Function (`functions/api/chat.ts`). The key lives only in Cloudflare's secure environment variable store.
- **No user data is stored.** Chat history lives only in the user's browser session memory.
- **No authentication required.** The app is intentionally open and anonymous.
- **Rate limiting** is enforced client-side (10 messages / 15 minutes per session). For production at scale, Cloudflare KV-based server-side rate limiting is recommended.
- **External APIs** (Quran, Hadith, Tafsir, Audio) are all read-only public CDNs — no credentials required.

---

## 📡 API Sources

All content APIs used are free, open, and require no authentication:

- **Quran text & translation:** `https://api.alquran.cloud/v1/`
- **Hadith collections:** `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/`
- **Tafsir (Ibn Kathir):** `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/`
- **Word-by-word:** `https://api.quranwbw.com/v1/`
- **Audio:** `https://everyayah.com/data/Alafasy_128kbps/`

---

## 📜 Islamic Disclaimer

This AI is intended for **educational and informational purposes only**. While it strives for accuracy and always grounds responses in authentic sources, it is **not a replacement for a qualified human Scholar or Mufti**. For binding religious rulings (fatwas), always consult a qualified Islamic authority in your local community.

---

## 🤝 Contributing

Contributions are welcome. If you'd like to improve the AI prompt, add new features, or fix bugs:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

Please ensure all AI-related changes are tested against actual Islamic content for accuracy.

---

*Built with 💚 for the global Muslim community*
