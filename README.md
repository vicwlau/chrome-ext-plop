# Prerequisites

- Google Chrome Version (install the version necessary to access Built-in Prompt API)
- Ensure you meet the system requireemtns, including minimum storage for local LLM
- Ensure you review acknowledge Google's generative AI Prohibited Uses Policy

# Installion / Configuration

- Clone the repository
- Create `.env` file with the following api key: `GOOGLE_GENERATIVE_AI_API_KEY` in the file (for example: GOOGLE_GENERATIVE_AI_API_KEY="YOUR-KEY-HERE")
  - This is needed to access Gemini Cloud `generateContent()` API
- Install NPM dependencies

```cli
npm i
```

# Running local version

1. initialize and run backend server to enable gemini cloud api usage
   `npm run backend`

2. (Recommended Option) build Chrome Extension and run extension within browser
   a) `npm run build`
   b) in chrome://extensions, load unpacked from the build folder (e.g., `/.output/chrome-mv3`)

3. (Secondary Option) run WXT configured chrome extension;
   npm run dev
