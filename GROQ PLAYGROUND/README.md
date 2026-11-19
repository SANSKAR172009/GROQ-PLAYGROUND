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
- **Official Groq LPU Telemetry**: Sends `stream_options: { include_usage: true }` to capture exact token usage metadata, generation speed (up to 840+ tokens/sec), queue time, and latency directly from Groq LPUs.
- **Inference Speed Benchmarks**: Live telemetry displays tokens per second, request latency, and input/output token breakdowns.

### 🧠 DeepSeek R1 Chain-of-Thought Reasoning
- **Live `<think>` Tag Parser**: Transparently intercepts and separates chain-of-thought internal reasoning from final answer markdown during streaming.
- **Collapsible Reasoning Drawer**: Interactive, pulsing thought monitor with token counters and live elapsed reasoning timers.
- **Reasoning Effort Presets**: Configurable reasoning depth (Low, Medium, High) for models that support reasoning effort.
- **Model Compatibility Guardrails**: Explicitly disables reasoning controls for unsupported models with a 1-click option to switch to DeepSeek R1 70B.

### 🔍 Built-In AI Prompt Analyzer & Structural Classifier
- **Client-Side Structural Classifier**: Evaluates input prompts 100% locally in the browser with zero external network requests:
  - **Zero-Shot**: Pure instructions or queries without demonstration pairs.
  - **One-Shot**: Contains exactly one concrete input/output exemplar pair.
  - **Few-Shot**: Contains $\ge 2$ structured exemplar pairs with format pattern verification.
  - **Uncertain / Ambiguous**: Identifies loose conversational references (e.g. "for example") lacking structured exemplar syntax.
- **Prompt Quality Audit**: Rates Clarity, Specificity, Context, and Constraints (0–100 score).
- **One-Click Enhancement**: Provides an optimized, production-ready version of the user's prompt with an immediate "Apply to Editor" button.

### 🌐 Live Web Search & Citations
- **Dual-Mode Web Search**:
  - **Native Tool Calling**: Automatically leverages Groq function-calling schemas on models that support tools (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
  - **Direct Search Context Retrieval**: Uses client-side CORS-friendly search (DuckDuckGo & Wikipedia) to augment prompts with real-time sources on non-tool models (e.g. DeepSeek R1) without throwing 400 Bad Request errors.
- **Verified Source Pills**: Interactive sources card displaying live source titles, URLs, and citations (`[1]`, `[2]`).

### 🎨 Developer Experience & Workspace Architecture
- **Interactive Model Explorer**: Search, filter by capability (Flagship, Reasoning, Ultra-Fast, Vision, MoE), and inspect hardware parameters with a 1-click model switcher.
- **Syntax Highlighted Code**: Formats code blocks in real time with line counts, language badges, and one-click copy buttons.
- **Prompt History & Bookmarks**: Full session history with keyword search, individual item deletion, and "Clear All" with confirmation modal.
- **Curated Prompt Templates**: Built-in production templates for FastAPI microservices, intent classifiers, security audits, and mathematical logic.
- **Interactive Canvas Starfield**: Subtle animated cosmic background with particle physics and depth effects.

---

## Project Structure

```text
nebula-groq-playground/
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
# Start a local static server on port 3000
python3 -m http.server 3000
```

Open your browser to:
```text
http://localhost:3000
```

### Option 2: Using Node.js / NPX

```bash
npx serve . -l 3000
```

### Option 3: Test in Demo Mode (No API Key Required)

1. Launch the application in any browser.
2. Click **"Explore in Demo Mode"** on the initial API Key setup modal.
3. You can explore the **Prompt Analyzer**, browse the **Model Explorer**, test **Prompt Templates**, and view simulated telemetry without entering an API key.

### Getting a Groq API Key

1. Go to [Groq Console](https://console.groq.com/keys).
2. Sign in or create a free account.
3. Click **Create API Key**, give it a name, and copy the key (starts with `gsk_`).
4. Paste it into NEBULA's connection modal.

---

## Vercel Deployment

NEBULA is designed for seamless zero-configuration deployment to [Vercel](https://vercel.com).

### Method A: Deploy via GitHub / Git (Recommended)

1. Push this repository to GitHub or GitLab.
2. In the Vercel Dashboard, click **New Project** and import the repository.
3. **Root Directory**: Leave as default root (or set to `GROQ PLAYGROUND`).
4. **Environment Variables**: None required! The application uses the visitor's own API key via request headers.
5. Click **Deploy**.

### Method B: Deploy with Vercel CLI

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

> [!NOTE]
> Vercel will automatically serve `index.html` as the frontend entry point and mount `api/groq.js` as an Edge Runtime serverless function at `/api/groq` for optional proxy routing.

---

## Supported Models Catalog

NEBULA includes preconfigured metadata and context windows for all major Groq production models, and automatically synchronizes with the live Groq API:

| Model Name | Model ID | Context | Max Output | Speed (LPU) | Primary Capability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Llama 3.3 70B Versatile** | `llama-3.3-70b-versatile` | 128,000 | 32,768 | ~280 T/s | Flagship reasoning, coding, tool calling |
| **Llama 3.1 8B Instant** | `llama-3.1-8b-instant` | 128,000 | 8,192 | ~840 T/s | Ultra-fast low latency, micro-tasks |
| **DeepSeek R1 Distill 70B** | `deepseek-r1-distill-llama-70b` | 128,000 | 8,192 | ~260 T/s | Chain-of-thought math, code deduction |
| **DeepSeek R1 Distill 32B** | `deepseek-r1-distill-qwen-32b` | 128,000 | 8,192 | ~390 T/s | Fast scientific deduction, code logic |
| **Qwen QwQ 32B Preview** | `qwen-qwq-32b` | 128,000 | 8,192 | ~380 T/s | Step-by-step reasoning & verification |
| **Llama 3.1 70B Versatile** | `llama-3.1-70b-versatile` | 128,000 | 8,192 | ~280 T/s | Versatile general intelligence |
| **Llama 3.2 11B Vision** | `llama-3.2-11b-vision-preview` | 128,000 | 8,192 | ~420 T/s | Multimodal visual reasoning |
| **Llama 3.2 90B Vision** | `llama-3.2-90b-vision-preview` | 128,000 | 8,192 | ~180 T/s | Flagship multimodal visual reasoning |
| **Mixtral 8x7B MoE** | `mixtral-8x7b-32768` | 32,768 | 32,768 | ~450 T/s | High-efficiency multilingual tasks |
| **Gemma 2 9B Instruct** | `gemma2-9b-it` | 8,192 | 8,192 | ~520 T/s | Concise instruction following, safety |

---

## Prompt Analyzer & Structural Classifier

The built-in prompt analyzer (`src/scripts/analyzer.js`) runs entirely in the user's browser without sending user input to any remote server:

```
User Prompt ──► Regex Lexical Tokenizer
                    │
                    ├──► Pattern Detection (Exemplar Pairs: "Input: ... Output: ...")
                    │         ├── 0 Exemplars ──► Zero-Shot (Confidence 92%)
                    │         ├── 1 Exemplar   ──► One-Shot  (Confidence 95%)
                    │         ├── ≥2 Exemplars ──► Few-Shot  (Confidence 98%)
                    │         └── Loose Mentions ──► Uncertain (Confidence 65%)
                    │
                    ├──► Quality Heuristics (Clarity, Specificity, Context, Constraints)
                    │
                    └──► Rule-Based Optimizer ──► "Apply to Editor"
```

---

## Security & Privacy Guarantee

- **BYOK (Bring Your Own Key)**: Visitors use their own Groq API keys. No shared or developer API keys are ever stored on any server.
- **Ephemeral Storage**: Keys are stored in `sessionStorage` or runtime memory by default. Local persistence (`localStorage`) is only enabled if the visitor explicitly checks *"Remember key on this device"*.
- **No Third-Party Telemetry**: Prompts, responses, and keys are never collected, logged, or sent to any server other than the official Groq API endpoint (`https://api.groq.com/openai/v1`).
- **Direct CORS or Edge Proxy**: The application defaults to direct browser-to-Groq requests. If CORS or corporate firewalls restrict outbound calls, the included minimal edge proxy (`api/groq.js`) securely forwards the key header without logging.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘ / Ctrl + Enter` | Run prompt |
| `Escape` | Abort generation / Close modal |
| `⌘ / Ctrl + K` | Clear response viewer |
| `⌘ / Ctrl + L` | Clear prompt editor |
| `?` | Open keyboard shortcuts modal |

---

## License

MIT License. Designed and built for the AI developer community.
