# Frontend Navigation Map (`frontend/`)

## Structure & Component Locations
- `index.html` — Application shell linking favicons, FontAwesome 6.4.0, Google Fonts (`Inter`, `JetBrains Mono`), and Tailwind CSS.
- `package.json` — Dependencies (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`).
- `vite.config.js` — Vite configuration (`port: 5173`, `outDir: 'dist'`).
- `public/` — Static favicon assets copied from `D:\suniyintellekt uz`:
  - `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-96x96.png`
  - `android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png`
  - `site.webmanifest`
- `src/`
  - `main.jsx` — React DOM entry mount point.
  - `App.jsx` — Top-level desktop layout combining `Sidebar`, `Header`, `EmptyState`, and `ChatInputBar`.
  - `index.css` — Custom scrollbar rules, typography classes, and skill-chip active glow states.
  - `constants/uiData.js` — Static session items, 4 preset cards, 9 skill chips, and model selector groups matching Emris AI v1.9 Beta.
  - `components/Sidebar.jsx` — Left navigation sidebar with Emris AI v1.9 Beta header, `+ Yangi suhbat` button, session history list (`123`), and bottom settings/legal actions.
  - `components/Header.jsx` — Top workspace bar with `sandbox_test` folder badge, `Yangi suhbat` title, Uzbek flag language selector, and `API Kalitlar` button.
  - `components/EmptyState.jsx` — Centered Emris AI logo card, Uzbek welcome heading/subtitle, and 2x2 preset cards grid.
  - `components/ChatInputBar.jsx` — Horizontal `KO'NIKMALAR:` skill chips bar, prompt input bar with image attachment button and `Gemini 3.5 Flash Lite` selector, and footer attribution.
