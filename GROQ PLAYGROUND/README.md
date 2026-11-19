# NEBULA — Groq Intelligence Playground

<p align="center">
  <img src="src/assets/logo.svg" alt="NEBULA Logo" width="80" height="80" />
</p>

<p align="center">
  <strong>Production-Grade, Ultra-Low Latency AI Developer Workspace for Groq LPUs</strong>
</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#prompt-analyzer">Prompt Analyzer</a> •
  <a href="#model-catalog">Supported Models</a> •
  <a href="#vercel-deployment">Deploy to Vercel</a> •
  <a href="#security--privacy">Security</a>
</p>

---

## Overview

**NEBULA** is a high-performance, developer-first AI playground crafted specifically for Groq's Language Processing Units (LPUs). Designed with a modern, futuristic dark glassmorphism interface, NEBULA delivers real-time inference monitoring, DeepSeek R1 reasoning transparency, prompt engineering telemetry, and function calling exploration—all running on a **Bring Your Own Key (BYOK)** architecture with zero backend key storage or vendor lock-in.

---

## Key Features

### ⚡ Ultra-Low Latency Inference
- **Streaming Response Engine**: Leverages native `ReadableStream` and Server-Sent Events (SSE) with `TextDecoder` for instantaneous token streaming.
- **Live Telemetry HUD**: Measures Time-to-First-Token (TTFT), tokens-per-second generation velocity, total duration, prompt tokens, and completion tokens.
- **Inference Speed Benchmarks**: Live comparison gauges showing speedup multipliers relative to standard GPU cloud baselines.

### 🧠 DeepSeek R1 Chain-of-Thought Reasoning
- **Live `<think>` Tag Parser**: Transparently intercepts and separates chain-of-thought internal reasoning from final answer markdown.
- **Collapsible Reasoning Drawer**: Interactive, pulsing thought monitor with token counters and reasoning step inspectability.
- **Reasoning Effort Presets**: Configurable reasoning depth (Low, Medium, High).

### 🔍 Built-In AI Prompt Analyzer & Structural Classifier
- **Client-Side Heuristic Classifier**: Evaluates input prompts without sending them anywhere. Automatically identifies prompting styles:
  - **Zero-Shot**: Pure instructions or queries without demonstration pairs.
  - **One-Shot**: Contains a single concrete input/output exemplar.
  - **Few-Shot**: Contains $\ge 2$ structured exemplar pairs with format pattern verification.
- **Prompt Quality Audit**: Rates Clarity, Specificity, Context, and Constraints (0–100 score).
- **One-Click Enhancement**: Provides an optimized, production-ready version of the user's prompt with an immediate "Apply Improved Prompt" button.

### 🌐 Tool Calling & Web Search Integration
- **Function Calling Architecture**: Transparently implements Groq tool calling schemas (`web_search` and custom tools).
- **Interactive Tool Calls Viewer**: Shows arguments passed to tools and synthesizes cited responses with domain badges.

### 🎨 Premium Developer Experience
- **Fluid 3-Panel Layout**: Left collapsible navigation, central workspace with expandable system instructions, and right parameters/analyzer panel.
- **Syntax Highlighted Code**: Auto-detects programming languages, formatted with one-click copy buttons and line counts.
- **Interactive Canvas Starfield**: Subtle animated cosmic background with particle physics and depth effects.
- **Local History & Bookmarks**: Save prompts and benchmark runs directly in browser storage with instant recall and export.

---

## Project Structure

```text
GROQ PLAYGROUND/
├── index.html              # Main single-page application entry point
├── package.json            # Node project manifest (scripts & dev dependencies)
├── vercel.json             # Vercel deployment and security header config
├── .gitignore              # Standard git exclusion rules
├── .env.example            # Environment variables specification (BYOK documentation)
├── README.md               # Complete documentation and setup guide
├── api/
│   └── groq.js             # Optional Vercel Edge Serverless Function proxy
└── src/
    ├── assets/
    │   └── logo.svg        # Scalable vector brand asset (Orbital LPU Diamond)
    ├── scripts/
    │   ├── api.js          # Groq API client, catalog, SSE parser, and tools
    │   ├── analyzer.js     # Structural prompt classifier & heuristic auditor
    │   └── app.js          # UI controller, state management, and canvas FX
    └── styles/
        └── style.css       # Complete dark glassmorphism design system
```

---

## Quickstart

### Option 1: Instant Local HTTP Server (Zero Dependencies)

Run using Python's built-in HTTP server:

```bash
# Navigate to the project directory
cd "GROQ PLAYGROUND"

# Start a local static server on port 3000
python3 -m http.server 3000
```

Open your browser to:
```text
http://localhost:3000
```

### Option 2: Using Node.js / NPX

```bash
cd "GROQ PLAYGROUND"
npx serve .
```

### Option 3: Test in Demo Mode (No API Key Required)

1. Launch the application in any browser.
2. Click **"Try Demo Mode"** on the initial API Key setup modal.
3. You can explore the **Prompt Analyzer**, browse the **Model Catalog**, test **Prompt Templates**, and view simulated telemetry without entering an API key.

### Getting a Groq API Key

1. Go to [Groq Console](https://console.groq.com/keys).
2. Sign in or create a free account.
3. Click **Create API Key**, give it a name, and copy the key (starts with `gsk_`).
4. Paste it into NEBULA's connection modal.

---

## Vercel Deployment

NEBULA is designed for seamless zero-configuration deployment to [Vercel](https://vercel.com).

### Method A: Deploy with Vercel CLI

```bash
# Install Vercel CLI if you haven't already
npm install -g vercel

# Navigate to project folder
cd "GROQ PLAYGROUND"

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Method B: Deploy via GitHub / Git

1. Push this repository to GitHub or GitLab.
2. In the Vercel Dashboard, click **New Project** and import the repository.
3. If this folder is inside a parent repository, set **Root Directory** to `GROQ PLAYGROUND`.
4. **Environment Variables**: None required! The application uses the visitor's own API key via request headers.
5. Click **Deploy**.

> [!NOTE]
> Vercel will automatically serve `index.html` as the frontend entry point and mount `api/groq.js` as an Edge Runtime serverless function at `/api/groq` for optional proxy routing.

---

## Supported Models Catalog

NEBULA includes preconfigured metadata and context windows for all major Groq production models, and automatically synchronizes with the live Groq API:

| Model Name | Model ID | Context | Max Output | Speed (LPU) | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Llama 3.3 70B Versatile** | `llama-3.3-70b-versatile` | 128,000 | 32,768 | ~280 T/s | Flagship reasoning, coding, long context |
| **Llama 3.1 8B Instant** | `llama-3.1-8b-instant` | 128,000 | 8,192 | ~840 T/s | Ultra-fast low latency, micro-tasks |
| **DeepSeek R1 Distill 70B** | `deepseek-r1-distill-llama-70b` | 128,000 | 8,192 | ~260 T/s | Chain-of-thought math, code deduction |
| **DeepSeek R1 Distill 32B** | `deepseek-r1-distill-qwen-32b` | 128,000 | 8,192 | ~390 T/s | Fast scientific deduction, code logic |
| **Mixtral 8x7B MoE** | `mixtral-8x7b-32768` | 32,768 | 32,768 | ~450 T/s | High-efficiency multilingual tasks |
| **Gemma 2 9B Instruct** | `gemma2-9b-it` | 8,192 | 8,192 | ~520 T/s | Concise instruction following, safety |
| **Llama 3.2 11B Vision** | `llama-3.2-11b-vision-preview` | 128,000 | 8,192 | ~420 T/s | Multimodal visual reasoning |

---

## Prompt Analyzer & Structural Classifier

The built-in prompt analyzer (`src/scripts/analyzer.js`) runs entirely in the user's browser without sending user input to any remote server:

```
User Prompt ──► Regex Lexical Tokenizer
                    │
                    ├──► Pattern Detection (Exemplar Pairs: "Input: ... Output: ...")
                    │         ├── 0 Exemplars ──► Zero-Shot (Confidence 92%)
                    │         ├── 1 Exemplar   ──► One-Shot  (Confidence 95%)
                    │         └── ≥2 Exemplars ──► Few-Shot  (Confidence 98%)
                    │
                    ├──► Quality Heuristics (Clarity, Specificity, Context, Constraints)
                    │
                    └──► Rule-Based Optimizer ──► "Apply Improved Prompt"
```

---

## Security & Privacy Guarantee

- **BYOK (Bring Your Own Key)**: Visitors use their own Groq API keys. No shared or developer API keys are ever stored on any server.
- **Ephemeral Storage**: Keys are stored in `sessionStorage` or runtime memory by default. Local persistence (`localStorage`) is only enabled if the visitor explicitly checks *"Remember key on this device"*.
- **No Third-Party Telemetry**: Prompts, responses, and keys are never collected, logged, or sent to any server other than the official Groq API endpoint (`https://api.groq.com/openai/v1`).
- **Direct CORS or Edge Proxy**: The application defaults to direct browser-to-Groq requests. If CORS or corporate firewalls restrict outbound calls, the included minimal edge proxy (`api/groq.js`) securely forwards the key header without logging.

---

## License

MIT License. Designed and built for the AI developer community.

