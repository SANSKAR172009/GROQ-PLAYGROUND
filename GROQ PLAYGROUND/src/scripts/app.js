/**
 * NEBULA — Groq Intelligence Playground
 * app.js — Main Application Orchestrator & UI Interaction Controller
 */

class NebulaPlayground {
  constructor() {
    this.api = window.groqApi;
    this.analyzer = window.promptAnalyzer;

    // Active Playground State
    this.state = {
      selectedModel: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      streaming: true,
      webSearch: false,
      reasoningMode: false,
      reasoningEffort: 'medium',
      systemPrompt: '',
      userPrompt: '',
      isGenerating: false,
      abortController: null,
      currentResponse: '',
      currentReasoning: '',
      lastPromptBackup: '',
      stats: {
        totalRequests: 0,
        totalTokens: 0,
        lastDurationMs: 0,
        lastTokensPerSec: 0,
        lastPromptTokens: 0,
        lastCompletionTokens: 0
      }
    };

    // Storage keys
    this.historyKey = 'nebula_history_v1';
    this.savedKey = 'nebula_saved_v1';
    this.statsKey = 'nebula_session_stats';

    this.history = [];
    this.savedPrompts = [];

    // Built-in Developer Templates
    this.templates = [
      {
        id: 'code-fastapi',
        title: 'Async FastAPI & Postgres Service',
        category: 'Development',
        system: 'You are a principal backend engineer specialized in high-throughput async Python, FastAPI, and SQLAlchemy 2.0.',
        prompt: `Create a production-grade async FastAPI microservice for an AI job queue.
Requirements:
1. SQLAlchemy 2.0 async engine with PostgreSQL connection pooling.
2. Pydantic v2 schemas for Request and Response validation.
3. Background worker task with exponential backoff on failure.
4. Health check endpoint returning database latency.
5. Provide strict code without conversational preamble.`
      },
      {
        id: 'few-shot-classifier',
        title: 'Few-Shot Customer Intent Classifier',
        category: 'Few-Shot Prompting',
        system: 'You are an NLP classification system. Respond strictly in JSON format matching the schema.',
        prompt: `Classify the intent and urgency of incoming customer support tickets.

Input: "My credit card was charged twice for invoice #9021. Please refund immediately!"
Output: {"intent": "billing_dispute", "urgency": "high", "department": "finance", "action_required": "process_refund"}

Input: "Where can I find documentation on how to configure SSO with Okta?"
Output: {"intent": "technical_support", "urgency": "low", "department": "identity", "action_required": "send_docs_link"}

Input: "Our production API endpoint is throwing 500 errors and our mobile app is down!"
Output: {"intent": "service_outage", "urgency": "critical", "department": "infrastructure", "action_required": "page_oncall"}

Input: "Can you change our company billing address to 450 Market St, San Francisco?"
Output:`
      },
      {
        id: 'one-shot-data-extractor',
        title: 'One-Shot Regex & Markdown Table Extractor',
        category: 'One-Shot Prompting',
        system: 'You are a data extraction specialist. Convert unstructured logs into clean Markdown tables.',
        prompt: `Extract IP addresses, HTTP status codes, response times, and requested endpoints from the server log snippet.

Example:
Log: 2026-11-19T04:12:01Z IP:192.168.1.45 GET /api/v1/auth 200 42ms "Mozilla/5.0"
Output:
| IP Address | Method | Endpoint | Status | Latency |
|---|---|---|---|---|
| 192.168.1.45 | GET | /api/v1/auth | 200 | 42ms |

Now extract this log:
Log: 2026-11-19T04:12:08Z IP:10.0.4.120 POST /api/v1/inference 504 12450ms "GroqClient/1.0"
Log: 2026-11-19T04:12:09Z IP:10.0.4.120 POST /api/v1/inference 200 180ms "GroqClient/1.0"
Output:`
      },
      {
        id: 'reasoning-deepseek',
        title: 'DeepSeek R1 Math & Logic Derivation',
        category: 'Reasoning Mode',
        system: 'You are an advanced mathematical logic and algorithm specialist. Show step-by-step rigorous deduction.',
        prompt: `Solve this optimization puzzle step by step:

A data center has 3 Groq LPU clusters:
- Cluster A processes 800 tokens/sec at 120W per node.
- Cluster B processes 450 tokens/sec at 65W per node.
- Cluster C processes 280 tokens/sec at 40W per node.

You have a power budget of exactly 1,200 Watts and need to achieve at least 7,500 tokens/sec total throughput while minimizing idle node count.
1. Determine the optimal allocation of nodes across Clusters A, B, and C.
2. Prove why your allocation maximizes efficiency (tokens per Watt).`
      },
      {
        id: 'zero-shot-explainer',
        title: 'Zero-Shot Technical Concept Explainer',
        category: 'Zero-Shot Prompting',
        system: 'You are a senior computer science professor known for crystal-clear analogies and zero fluff.',
        prompt: `Explain the Raft Consensus Algorithm to a junior backend engineer.
Cover:
1. Why distributed consensus is hard (the split-brain problem).
2. The three node states: Follower, Candidate, Leader.
3. How leader election works with randomized heartbeat timers.
4. How log replication achieves quorum.
Use an intuitive visual diagram using Markdown tables or ASCII art.`
      },
      {
        id: 'security-audit',
        title: 'Smart Contract & Auth Security Audit',
        category: 'Security',
        system: 'You are a cybersecurity auditor analyzing source code for OWASP Top 10 vulnerabilities.',
        prompt: `Audit the following JWT authentication code snippet:
\`\`\`javascript
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send("Access Denied");
  try {
    const verified = jwt.decode(token); // Vulnerability check
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send("Invalid Token");
  }
}
\`\`\`
1. Identify all critical security vulnerabilities.
2. Explain the exploit vector in detail.
3. Provide the corrected, production-ready replacement with signature verification and algorithm restriction.`
      }
    ];

    this.init();
  }

  async init() {
    this.loadStorage();
    this.initBackgroundCanvas();
    this.bindDomEvents();
    this.populateModelsDropdown();
    this.updateKeyStatusUI();
    this.updateStatsDisplay();

    // Trigger initial prompt analysis on default template or empty state
    this.runPromptAnalysis();

    // Check if user has an existing API key; if not, open setup modal after brief pause
    if (!this.api.hasApiKey()) {
      setTimeout(() => {
        this.openModal('modal-api-key');
      }, 700);
    } else {
      this.refreshLiveModels(false);
    }
  }

  /* ========================================================
     STORAGE & STATE INITIALIZATION
     ======================================================== */
  loadStorage() {
    try {
      const savedHistory = localStorage.getItem(this.historyKey);
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      }
    } catch (e) {
      this.history = [];
    }

    try {
      const savedBookmarks = localStorage.getItem(this.savedKey);
      if (savedBookmarks) {
        this.savedPrompts = JSON.parse(savedBookmarks);
      }
    } catch (e) {
      this.savedPrompts = [];
    }

    try {
      const savedStats = localStorage.getItem(this.statsKey);
      if (savedStats) {
        this.state.stats = { ...this.state.stats, ...JSON.parse(savedStats) };
      }
    } catch (e) {}
  }

  saveHistory(item) {
    this.history.unshift(item);
    if (this.history.length > 50) this.history.pop();
    try {
      localStorage.setItem(this.historyKey, JSON.stringify(this.history));
    } catch (_) {}
  }

  savePromptBookmark(title, prompt, system) {
    const item = {
      id: Date.now().toString(),
      title: title || 'Custom Prompt',
      prompt,
      system,
      timestamp: new Date().toISOString()
    };
    this.savedPrompts.unshift(item);
    try {
      localStorage.setItem(this.savedKey, JSON.stringify(this.savedPrompts));
      this.showToast(`Saved prompt "${item.title}" to bookmarks`, 'success');
    } catch (_) {}
  }

  updateSessionStats(promptTokens, completionTokens, durationMs, tokensPerSec) {
    this.state.stats.totalRequests++;
    this.state.stats.totalTokens += (promptTokens + completionTokens);
    this.state.stats.lastDurationMs = durationMs;
    this.state.stats.lastTokensPerSec = tokensPerSec;
    this.state.stats.lastPromptTokens = promptTokens;
    this.state.stats.lastCompletionTokens = completionTokens;

    try {
      localStorage.setItem(this.statsKey, JSON.stringify(this.state.stats));
    } catch (_) {}

    this.updateStatsDisplay();
  }

  /* ========================================================
     ANIMATED NEBULA STARRY BACKGROUND
     ======================================================== */
  initBackgroundCanvas() {
    const canvas = document.getElementById('nebula-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(65, Math.floor((width * height) / 22000));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.8 + 0.6,
        color: Math.random() > 0.4 ? '#8B5CF6' : Math.random() > 0.5 ? '#06B6D4' : '#F55036',
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0) p1.x = width;
        if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        if (p1.y > height) p1.y = 0;

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = p1.alpha;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#8B5CF6';
            ctx.globalAlpha = (1 - dist / 130) * 0.12;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }

        const mouseDist = Math.hypot(p1.x - mouseX, p1.y - mouseY);
        if (mouseDist < 160) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = '#06B6D4';
          ctx.globalAlpha = (1 - mouseDist / 160) * 0.25;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  /* ========================================================
     MODEL DROPDOWN & CATALOG MANAGEMENT
     ======================================================== */
  populateModelsDropdown() {
    const select = document.getElementById('model-select');
    if (!select) return;

    select.innerHTML = '';
    const models = this.api.modelsCatalog;

    const categories = {
      flagship: '⭐ Flagship Models',
      speed: '⚡ Ultra-Fast LPUs',
      reasoning: '🧠 Reasoning & Math (DeepSeek R1 / QwQ)',
      general: '🌐 Versatile General Models',
      vision: '👁️ Vision Multimodal',
      moe: '🧩 Mixture of Experts'
    };

    const grouped = {};
    for (const m of models) {
      const cat = m.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(m);
    }

    for (const [catKey, label] of Object.entries(categories)) {
      if (grouped[catKey] && grouped[catKey].length > 0) {
        const optGroup = document.createElement('optgroup');
        optGroup.label = label;
        for (const m of grouped[catKey]) {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.name} (${m.speed})`;
          if (m.id === this.state.selectedModel) {
            opt.selected = true;
          }
          optGroup.appendChild(opt);
        }
        select.appendChild(optGroup);
      }
    }

    this.updateActiveModelUI();
  }

  selectModelById(modelId) {
    this.state.selectedModel = modelId;
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) modelSelect.value = modelId;
    this.updateActiveModelUI();
  }

  selectModel(modelId) {
    this.selectModelById(modelId);
    this.closeModal('modal-models');
    this.showToast(`Active Model: ${modelId}`, 'success');
  }

  updateActiveModelUI() {
    const model = this.api.modelsCatalog.find(m => m.id === this.state.selectedModel) || {
      id: this.state.selectedModel,
      name: this.state.selectedModel,
      speed: '~300 T/s',
      context: 8192,
      maxTokens: 4096,
      supportsReasoning: this.state.selectedModel.includes('r1') || this.state.selectedModel.includes('qwq')
    };

    const headerName = document.getElementById('header-model-name');
    const headerSpeed = document.getElementById('header-model-speed');
    const modelDesc = document.getElementById('model-description-text');
    const modelContextPill = document.getElementById('model-context-pill');
    const reasoningToggleWrap = document.getElementById('reasoning-mode-wrap');
    const reasoningEffortWrap = document.getElementById('reasoning-effort-wrap');
    const reasoningDisabledNotice = document.getElementById('reasoning-unsupported-notice');

    if (headerName) headerName.textContent = model.name;
    if (headerSpeed) headerSpeed.textContent = model.speed;
    if (modelDesc) modelDesc.textContent = model.description || `Groq inference model (${model.id})`;
    if (modelContextPill) modelContextPill.textContent = `${(model.context / 1000).toFixed(0)}k Context`;

    // Adjust max tokens slider maximum according to selected model limits
    const maxTokensSlider = document.getElementById('param-max-tokens');
    if (maxTokensSlider) {
      maxTokensSlider.max = Math.min(model.maxTokens || 8192, 16384);
      if (this.state.maxTokens > Number(maxTokensSlider.max)) {
        this.state.maxTokens = Number(maxTokensSlider.max);
        maxTokensSlider.value = this.state.maxTokens;
        document.getElementById('val-max-tokens').textContent = this.state.maxTokens;
      }
    }

    // Handle Reasoning Mode Support
    const supportsReasoning = Boolean(model.supportsReasoning);
    if (reasoningToggleWrap) {
      const chk = document.getElementById('toggle-reasoning-mode');
      if (supportsReasoning) {
        if (chk) chk.disabled = false;
        if (reasoningDisabledNotice) reasoningDisabledNotice.style.display = 'none';
        if (this.state.reasoningMode && reasoningEffortWrap) {
          reasoningEffortWrap.style.display = 'flex';
        }
      } else {
        if (chk) {
          chk.checked = false;
          chk.disabled = true;
        }
        this.state.reasoningMode = false;
        if (reasoningEffortWrap) reasoningEffortWrap.style.display = 'none';
        if (reasoningDisabledNotice) reasoningDisabledNotice.style.display = 'block';
      }
    }
  }

  async refreshLiveModels(showToast = true) {
    if (!this.api.hasApiKey()) {
      if (showToast) this.showToast('Please connect an API key first.', 'info');
      return;
    }

    const refreshBtn = document.getElementById('btn-refresh-models');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    try {
      const models = await this.api.fetchLiveModels();
      this.populateModelsDropdown();
      if (showToast) {
        this.showToast(`Synced ${models.length} live models from Groq Cloud.`, 'success');
      }
    } catch (err) {
      if (showToast) this.showToast(`Model fetch error: ${err.message}`, 'error');
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
  }

  /* ========================================================
     DOM EVENT LISTENERS & WIRING
     ======================================================== */
  bindDomEvents() {
    // Model Select
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        this.state.selectedModel = e.target.value;
        this.updateActiveModelUI();
      });
    }

    const headerPill = document.getElementById('header-model-pill');
    if (headerPill) {
      headerPill.addEventListener('click', () => {
        this.switchConfigTab('tab-parameters');
        const select = document.getElementById('model-select');
        if (select) {
          select.focus();
          select.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Parameters Controls
    this.bindSlider('param-temperature', 'val-temperature', (val) => {
      this.state.temperature = parseFloat(val);
    });

    this.bindSlider('param-max-tokens', 'val-max-tokens', (val) => {
      this.state.maxTokens = parseInt(val, 10);
    });

    this.bindSlider('param-top-p', 'val-top-p', (val) => {
      this.state.topP = parseFloat(val);
    });

    this.bindSlider('param-freq-penalty', 'val-freq-penalty', (val) => {
      this.state.frequencyPenalty = parseFloat(val);
    });

    this.bindSlider('param-pres-penalty', 'val-pres-penalty', (val) => {
      this.state.presencePenalty = parseFloat(val);
    });

    // Max tokens preset chips
    document.querySelectorAll('.token-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseInt(chip.dataset.tokens, 10);
        this.state.maxTokens = val;
        const slider = document.getElementById('param-max-tokens');
        if (slider) slider.value = val;
        const display = document.getElementById('val-max-tokens');
        if (display) display.textContent = val;
      });
    });

    // Toggles
    const toggleStreaming = document.getElementById('toggle-streaming');
    if (toggleStreaming) {
      toggleStreaming.addEventListener('change', (e) => {
        this.state.streaming = e.target.checked;
        const pill = document.getElementById('header-stream-pill');
        if (pill) pill.style.display = this.state.streaming ? 'inline-flex' : 'none';
      });
    }

    const toggleWebSearch = document.getElementById('toggle-web-search');
    if (toggleWebSearch) {
      toggleWebSearch.addEventListener('change', (e) => {
        this.state.webSearch = e.target.checked;
        const pill = document.getElementById('header-search-pill');
        if (pill) pill.style.display = this.state.webSearch ? 'inline-flex' : 'none';
        const info = document.getElementById('web-search-info-card');
        if (info) info.style.display = this.state.webSearch ? 'block' : 'none';
      });
    }

    const toggleReasoning = document.getElementById('toggle-reasoning-mode');
    if (toggleReasoning) {
      toggleReasoning.addEventListener('change', (e) => {
        this.state.reasoningMode = e.target.checked;
        const effortWrap = document.getElementById('reasoning-effort-wrap');
        if (effortWrap) effortWrap.style.display = this.state.reasoningMode ? 'flex' : 'none';
      });
    }

    const selectEffort = document.getElementById('select-reasoning-effort');
    if (selectEffort) {
      selectEffort.addEventListener('change', (e) => {
        this.state.reasoningEffort = e.target.value;
      });
    }

    // Switch to DeepSeek R1 button from unsupported notice
    const btnSwitchR1 = document.getElementById('btn-switch-to-r1');
    if (btnSwitchR1) {
      btnSwitchR1.addEventListener('click', () => {
        this.selectModelById('deepseek-r1-distill-llama-70b');
        if (toggleReasoning) {
          toggleReasoning.checked = true;
          this.state.reasoningMode = true;
        }
        const effortWrap = document.getElementById('reasoning-effort-wrap');
        if (effortWrap) effortWrap.style.display = 'flex';
        this.showToast('Switched to DeepSeek R1 70B Reasoning Model', 'success');
      });
    }

    // System Prompt Accordion & Input
    const sysPromptToggle = document.getElementById('system-prompt-toggle');
    const sysPromptBody = document.getElementById('system-prompt-body');
    const sysPromptInput = document.getElementById('system-prompt-input');

    if (sysPromptToggle && sysPromptBody) {
      sysPromptToggle.addEventListener('click', () => {
        sysPromptBody.classList.toggle('open');
        const chevron = sysPromptToggle.querySelector('.accordion-chevron');
        if (chevron) {
          chevron.style.transform = sysPromptBody.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    }

    if (sysPromptInput) {
      sysPromptInput.addEventListener('input', (e) => {
        this.state.systemPrompt = e.target.value;
        this.debouncePromptAnalysis();
      });
    }

    // Persona Chips
    document.querySelectorAll('.persona-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const personaText = chip.dataset.persona || '';
        if (sysPromptInput) {
          sysPromptInput.value = personaText;
          this.state.systemPrompt = personaText;
          if (sysPromptBody && !sysPromptBody.classList.contains('open')) {
            sysPromptBody.classList.add('open');
          }
          this.debouncePromptAnalysis();
          this.showToast(`Applied ${chip.textContent.trim()} persona`, 'info');
        }
      });
    });

    // User Prompt Textarea
    const promptInput = document.getElementById('user-prompt-input');
    if (promptInput) {
      promptInput.addEventListener('input', (e) => {
        this.state.userPrompt = e.target.value;
        this.updatePromptCounters(e.target.value);
        this.debouncePromptAnalysis();
      });

      // Cmd / Ctrl + Enter to run
      promptInput.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          this.executePrompt();
        }
      });
    }

    // Action Buttons
    const btnRun = document.getElementById('btn-run-prompt');
    if (btnRun) {
      btnRun.addEventListener('click', () => this.executePrompt());
    }

    const btnStop = document.getElementById('btn-stop-generation');
    if (btnStop) {
      btnStop.addEventListener('click', () => this.stopGeneration());
    }

    const btnClearPrompt = document.getElementById('btn-clear-prompt');
    if (btnClearPrompt) {
      btnClearPrompt.addEventListener('click', () => {
        if (promptInput) {
          promptInput.value = '';
          this.state.userPrompt = '';
          this.updatePromptCounters('');
          this.runPromptAnalysis();
        }
      });
    }

    const btnCopyPrompt = document.getElementById('btn-copy-prompt');
    if (btnCopyPrompt) {
      btnCopyPrompt.addEventListener('click', () => {
        if (this.state.userPrompt) {
          navigator.clipboard.writeText(this.state.userPrompt);
          this.showToast('Prompt copied to clipboard', 'success');
        }
      });
    }

    // Quick Analyzer Pill Click -> Opens Right Analyzer Tab
    const quickPill = document.getElementById('quick-analyzer-pill');
    if (quickPill) {
      quickPill.addEventListener('click', () => {
        this.switchConfigTab('tab-analyzer');
        const panel = document.getElementById('panel-right');
        if (panel && window.innerWidth <= 1180) {
          panel.classList.add('mobile-open');
        }
      });
    }

    // Apply Improved Prompt button
    const btnApplyImproved = document.getElementById('btn-apply-improved-prompt');
    if (btnApplyImproved) {
      btnApplyImproved.addEventListener('click', () => {
        const improvedBox = document.getElementById('improved-prompt-text');
        if (improvedBox && promptInput) {
          this.state.lastPromptBackup = promptInput.value;
          promptInput.value = improvedBox.textContent;
          this.state.userPrompt = improvedBox.textContent;
          this.updatePromptCounters(promptInput.value);
          this.runPromptAnalysis();
          promptInput.focus();

          promptInput.style.borderColor = 'var(--cyan-light)';
          promptInput.style.boxShadow = '0 0 20px var(--cyan-glow)';
          setTimeout(() => {
            promptInput.style.borderColor = '';
            promptInput.style.boxShadow = '';
          }, 800);

          this.showToast('Enhanced prompt applied to editor!', 'success');
        }
      });
    }

    // Response Viewer Toolbar
    const btnCopyResponse = document.getElementById('btn-copy-response');
    if (btnCopyResponse) {
      btnCopyResponse.addEventListener('click', () => {
        if (this.state.currentResponse) {
          navigator.clipboard.writeText(this.state.currentResponse);
          this.showToast('Full response copied to clipboard', 'success');
        }
      });
    }

    const btnDownloadResponse = document.getElementById('btn-download-response');
    if (btnDownloadResponse) {
      btnDownloadResponse.addEventListener('click', () => this.downloadResponse());
    }

    const btnRegenerate = document.getElementById('btn-regenerate-response');
    if (btnRegenerate) {
      btnRegenerate.addEventListener('click', () => {
        if (this.state.userPrompt && !this.state.isGenerating) {
          this.executePrompt();
        }
      });
    }

    const btnClearResponse = document.getElementById('btn-clear-response');
    if (btnClearResponse) {
      btnClearResponse.addEventListener('click', () => {
        this.clearResponseViewer();
      });
    }

    // Right Configuration Tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.target;
        this.switchConfigTab(targetId);
      });
    });

    // Navigation triggers
    document.querySelectorAll('[data-action="new-chat"]').forEach(btn => {
      btn.addEventListener('click', () => this.resetPlayground());
    });

    document.querySelectorAll('[data-action="open-models"]').forEach(btn => {
      btn.addEventListener('click', () => this.openModelsModal());
    });

    document.querySelectorAll('[data-action="open-templates"]').forEach(btn => {
      btn.addEventListener('click', () => this.openTemplatesModal());
    });

    document.querySelectorAll('[data-action="open-history"]').forEach(btn => {
      btn.addEventListener('click', () => this.openHistoryModal());
    });

    document.querySelectorAll('[data-action="open-saved"]').forEach(btn => {
      btn.addEventListener('click', () => this.openSavedModal());
    });

    document.querySelectorAll('[data-action="open-settings"]').forEach(btn => {
      btn.addEventListener('click', () => this.openModal('modal-settings'));
    });

    document.querySelectorAll('[data-action="open-key-modal"]').forEach(btn => {
      btn.addEventListener('click', () => this.openModal('modal-api-key'));
    });

    document.querySelectorAll('[data-action="open-onboarding"]').forEach(btn => {
      btn.addEventListener('click', () => this.openModal('modal-onboarding'));
    });

    document.querySelectorAll('[data-action="open-shortcuts"]').forEach(btn => {
      btn.addEventListener('click', () => this.openModal('modal-shortcuts'));
    });

    // Model Explorer Filters & Search
    const modelSearch = document.getElementById('model-search-input');
    if (modelSearch) {
      modelSearch.addEventListener('input', (e) => {
        const activePill = document.querySelector('#model-category-filters .filter-pill.active');
        const cat = activePill ? activePill.dataset.filter : 'all';
        this.renderModelsGrid(cat, e.target.value);
      });
    }

    document.querySelectorAll('#model-category-filters .filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#model-category-filters .filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const searchInput = document.getElementById('model-search-input');
        this.renderModelsGrid(pill.dataset.filter, searchInput?.value || '');
      });
    });

    // History search & clear
    const historySearch = document.getElementById('history-search-input');
    if (historySearch) {
      historySearch.addEventListener('input', (e) => {
        this.openHistoryModal(e.target.value);
      });
    }

    const btnClearAllHist = document.getElementById('btn-clear-all-history');
    if (btnClearAllHist) {
      btnClearAllHist.addEventListener('click', () => this.promptClearAllHistory());
    }

    // Connection Route Radio
    const routeDirect = document.getElementById('route-direct');
    const routeProxy = document.getElementById('route-proxy');
    if (routeDirect && routeProxy) {
      routeDirect.addEventListener('change', () => {
        if (routeDirect.checked) {
          this.api.setUseProxy(false);
          this.showToast('Connection routing: Direct api.groq.com', 'info');
        }
      });
      routeProxy.addEventListener('change', () => {
        if (routeProxy.checked) {
          this.api.setUseProxy(true);
          this.showToast('Connection routing: Vercel Edge Proxy (/api/groq)', 'info');
        }
      });
    }

    // Bookmark prompt button
    const btnBookmark = document.getElementById('btn-save-prompt-bookmark');
    if (btnBookmark) {
      btnBookmark.addEventListener('click', () => {
        if (!this.state.userPrompt) {
          this.showToast('Please enter a prompt first', 'info');
          return;
        }
        const title = prompt('Enter a title for this bookmark:', this.state.userPrompt.slice(0, 32));
        if (title !== null) {
          this.savePromptBookmark(title, this.state.userPrompt, this.state.systemPrompt);
        }
      });
    }

    // API Key Modal Events
    const keyInput = document.getElementById('input-api-key');
    const keyToggleEye = document.getElementById('btn-toggle-key-visibility');
    const btnConnectKey = document.getElementById('btn-connect-key');
    const chkRemember = document.getElementById('chk-remember-key');

    if (keyToggleEye && keyInput) {
      keyToggleEye.addEventListener('click', () => {
        const isPassword = keyInput.type === 'password';
        keyInput.type = isPassword ? 'text' : 'password';
        keyToggleEye.innerHTML = isPassword
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      });
    }

    if (btnConnectKey && keyInput) {
      btnConnectKey.addEventListener('click', () => {
        this.handleConnectKey(keyInput.value, chkRemember?.checked || false);
      });

      keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleConnectKey(keyInput.value, chkRemember?.checked || false);
        }
      });
    }

    // Disconnect Key
    const btnDisconnectKey = document.getElementById('btn-disconnect-key');
    if (btnDisconnectKey) {
      btnDisconnectKey.addEventListener('click', () => {
        this.promptDisconnectKey();
      });
    }

    // Modal Close Triggers
    document.querySelectorAll('.modal-close-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const modal = trigger.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      });
    });

    // Click outside modal card to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
        }
      });
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-overlay.open');
        if (openModals.length > 0) {
          openModals.forEach(m => m.classList.remove('open'));
        } else if (this.state.isGenerating) {
          this.stopGeneration();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.clearResponseViewer();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (promptInput) {
          promptInput.value = '';
          this.state.userPrompt = '';
          this.updatePromptCounters('');
          this.runPromptAnalysis();
          promptInput.focus();
        }
      }

      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        this.openModal('modal-shortcuts');
      }
    });

    // Mobile Sidebar & Config Toggles
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('sidebar-left');
    if (btnToggleSidebar && sidebar) {
      btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    const btnToggleRightPanel = document.getElementById('btn-toggle-right-panel');
    const rightPanel = document.getElementById('panel-right');
    if (btnToggleRightPanel && rightPanel) {
      btnToggleRightPanel.addEventListener('click', () => {
        rightPanel.classList.toggle('mobile-open');
      });
    }
  }

  bindSlider(sliderId, displayId, onChange) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (!slider || !display) return;

    slider.addEventListener('input', (e) => {
      const val = e.target.value;
      display.textContent = val;
      onChange(val);
    });
  }

  switchConfigTab(tabId) {
    document.querySelectorAll('.panel-tab').forEach(t => {
      if (t.dataset.target === tabId) t.classList.add('active');
      else t.classList.remove('active');
    });

    document.querySelectorAll('.panel-content').forEach(c => {
      if (c.id === tabId) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  updatePromptCounters(text) {
    const charEl = document.getElementById('editor-char-count');
    const tokenEl = document.getElementById('editor-token-count');
    if (charEl) charEl.textContent = `${text.length} chars`;
    if (tokenEl) tokenEl.textContent = `~${Math.ceil(text.length / 3.8)} tokens`;
  }

  /* ========================================================
     API KEY SETUP & VALIDATION FLOW
     ======================================================== */
  async handleConnectKey(rawKey, remember) {
    const cleanKey = (rawKey || '').trim();
    const btn = document.getElementById('btn-connect-key');
    const errorEl = document.getElementById('key-modal-error');

    if (errorEl) errorEl.style.display = 'none';

    if (!cleanKey) {
      if (errorEl) {
        errorEl.textContent = 'Please enter your Groq API key.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (!cleanKey.startsWith('gsk_')) {
      if (errorEl) {
        errorEl.textContent = 'Invalid format. Groq API keys start with "gsk_".';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (btn) {
      btn.classList.add('spinning');
      btn.disabled = true;
    }

    try {
      const validation = await this.api.validateKey(cleanKey);

      if (validation.valid) {
        this.api.setApiKey(cleanKey, remember);
        this.updateKeyStatusUI();
        this.closeModal('modal-api-key');
        this.showToast('Groq API Key verified and connected successfully!', 'success');
        this.refreshLiveModels(false);
      } else {
        if (errorEl) {
          errorEl.textContent = validation.error;
          errorEl.style.display = 'block';
        }
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = `Validation failed: ${err.message}`;
        errorEl.style.display = 'block';
      }
    } finally {
      if (btn) {
        btn.classList.remove('spinning');
        btn.disabled = false;
      }
    }
  }

  updateKeyStatusUI() {
    const hasKey = this.api.hasApiKey();
    const badges = document.querySelectorAll('.api-status-badge');
    const masked = this.api.getMaskedKey();

    badges.forEach(badge => {
      if (hasKey) {
        badge.classList.remove('disconnected');
        badge.classList.add('connected');
        badge.innerHTML = `<span class="status-dot pulse"></span><span>Groq Connected (${masked})</span>`;
      } else {
        badge.classList.remove('connected');
        badge.classList.add('disconnected');
        badge.innerHTML = `<span class="status-dot"></span><span>Connect API Key</span>`;
      }
    });

    const settingsKeyDisplay = document.getElementById('settings-masked-key');
    if (settingsKeyDisplay) {
      settingsKeyDisplay.textContent = hasKey ? masked : 'No key connected';
    }

    const settingsDisconnectBtn = document.getElementById('btn-disconnect-key');
    if (settingsDisconnectBtn) {
      settingsDisconnectBtn.style.display = hasKey ? 'inline-flex' : 'none';
    }
  }

  promptDisconnectKey() {
    this.showConfirm(
      'Disconnect Groq API Key',
      'This will remove your API key from memory and local browser storage. You will need to re-enter it to make future inference queries.',
      () => {
        this.api.clearApiKey();
        this.updateKeyStatusUI();
        this.closeModal('modal-settings');
        this.showToast('Groq API Key disconnected', 'info');
      }
    );
  }

  /* ========================================================
     PROMPT ANALYZER (ZERO-SHOT / ONE-SHOT / FEW-SHOT)
     ======================================================== */
  debouncePromptAnalysis() {
    clearTimeout(this._analysisTimeout);
    this._analysisTimeout = setTimeout(() => {
      this.runPromptAnalysis();
    }, 280);
  }

  runPromptAnalysis() {
    const report = this.analyzer.analyze(this.state.userPrompt, this.state.systemPrompt);

    // 1. Update quick pill in editor
    const quickPill = document.getElementById('quick-analyzer-pill');
    if (quickPill) {
      quickPill.className = `quick-analyzer-pill ${report.classification.badgeClass}`;
      quickPill.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <span>${report.classification.label} (${report.classification.confidenceScore}%)</span>
      `;
    }

    // 2. Update Detailed Prompt Analyzer Tab
    const badgeLg = document.getElementById('analyzer-technique-badge');
    if (badgeLg) {
      badgeLg.className = `technique-badge-lg ${report.classification.badgeClass}`;
      badgeLg.textContent = report.classification.label;
    }

    const confScore = document.getElementById('analyzer-confidence-score');
    if (confScore) confScore.textContent = `${report.classification.confidenceScore}% (${report.classification.confidenceLevel})`;

    const confBar = document.getElementById('analyzer-confidence-bar');
    if (confBar) confBar.style.width = `${report.classification.confidenceScore}%`;

    const reasonEl = document.getElementById('analyzer-reasoning-text');
    if (reasonEl) reasonEl.textContent = report.classification.reason;

    // Sub-metrics
    const overallScore = document.getElementById('analyzer-overall-score');
    if (overallScore) overallScore.textContent = `${report.audit.overallScore}/100`;

    const clarityBar = document.getElementById('analyzer-clarity-bar');
    if (clarityBar) clarityBar.style.width = `${report.audit.clarityScore}%`;

    const specBar = document.getElementById('analyzer-specificity-bar');
    if (specBar) specBar.style.width = `${report.audit.specificityScore}%`;

    const constrBar = document.getElementById('analyzer-constraints-bar');
    if (constrBar) constrBar.style.width = `${report.audit.constraintsScore}%`;

    // Suggestions list
    const suggestionsList = document.getElementById('analyzer-suggestions-list');
    if (suggestionsList) {
      suggestionsList.innerHTML = '';
      if (report.diagnostics.suggestions.length === 0) {
        suggestionsList.innerHTML = '<li style="color:var(--emerald-light);">Prompt structure adheres to elite prompting standards.</li>';
      } else {
        report.diagnostics.suggestions.forEach(s => {
          const li = document.createElement('li');
          li.textContent = s;
          suggestionsList.appendChild(li);
        });
      }
    }

    // Missing elements list
    const missingList = document.getElementById('analyzer-missing-list');
    if (missingList) {
      missingList.innerHTML = '';
      report.diagnostics.missingElements.forEach(m => {
        const li = document.createElement('li');
        li.textContent = m;
        missingList.appendChild(li);
      });
    }

    // Improved prompt suggestion box
    const improvedBox = document.getElementById('improved-prompt-text');
    if (improvedBox) {
      improvedBox.textContent = report.improvedPrompt;
    }
  }

  /* ========================================================
     LIVE WEB SEARCH RETRIEVAL (CORS-FRIENDLY DDG & WIKIPEDIA)
     ======================================================== */
  async performLiveWebSearch(query) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return [];

    const statusEl = document.getElementById('response-status-text');
    if (statusEl) statusEl.textContent = 'Querying live web sources...';

    const sources = [];

    // 1. DuckDuckGo Instant Answers API (CORS friendly origin=*)
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&origin=*`;
      const res = await fetch(ddgUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.AbstractText) {
          sources.push({
            title: data.Heading || cleanQuery,
            url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
            snippet: data.AbstractText
          });
        }
        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, 3)) {
            if (topic.Text && topic.FirstURL) {
              sources.push({
                title: topic.Text.split(' - ')[0] || cleanQuery,
                url: topic.FirstURL,
                snippet: topic.Text
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('DuckDuckGo search error:', e);
    }

    // 2. Wikipedia API search (CORS friendly origin=*)
    if (sources.length < 2) {
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&origin=*`;
        const res = await fetch(wikiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.query?.search?.length > 0) {
            for (const item of data.query.search.slice(0, 3)) {
              sources.push({
                title: item.title,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
                snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, '')
              });
            }
          }
        }
      } catch (e) {
        console.warn('Wikipedia search error:', e);
      }
    }

    // Fallback search link
    if (sources.length === 0) {
      sources.push({
        title: `Web Query: ${cleanQuery}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
        snippet: `Real-time web search executed for query: "${cleanQuery}".`
      });
    }

    return sources;
  }

  renderSourcesCard(sources) {
    const card = document.getElementById('sources-card');
    const list = document.getElementById('sources-list');
    if (!card || !list) return;

    if (!sources || sources.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    list.innerHTML = '';
    sources.forEach((s, idx) => {
      const a = document.createElement('a');
      a.className = 'source-pill';
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = `${s.snippet}\n\nClick to open source URL`;
      a.innerHTML = `<span>[${idx + 1}]</span> <strong>${this.escapeHtml(s.title.slice(0, 35))}...</strong>`;
      list.appendChild(a);
    });
  }

  /* ========================================================
     INFERENCE EXECUTION & STREAMING CONTROLLER
     ======================================================== */
  async executePrompt() {
    if (this.state.isGenerating) return;

    if (!this.api.hasApiKey()) {
      this.openModal('modal-api-key');
      this.showToast('Please enter your Groq API key to run queries.', 'info');
      return;
    }

    const userPrompt = (this.state.userPrompt || '').trim();
    if (!userPrompt) {
      this.showToast('Please enter a prompt before running.', 'error');
      const input = document.getElementById('user-prompt-input');
      if (input) input.focus();
      return;
    }

    // Assemble messages array
    const messages = [];
    if (this.state.systemPrompt.trim()) {
      messages.push({ role: 'system', content: this.state.systemPrompt.trim() });
    }

    // Handle optional Web Search
    let tools = null;
    let searchContext = null;

    if (this.state.webSearch) {
      const modelMeta = this.api.modelsCatalog.find(m => m.id === this.state.selectedModel);
      const supportsTools = modelMeta ? Boolean(modelMeta.supportsTools) : this.state.selectedModel.includes('llama-3');

      if (supportsTools) {
        tools = [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the live web for recent factual information, documentation, news, or articles.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query to look up on the live web.'
                  }
                },
                required: ['query']
              }
            }
          }
        ];
      } else {
        // Model does not support function calling (e.g. DeepSeek R1, Gemma 2)
        // Perform direct search context injection so user still gets verified citations
        const liveSources = await this.performLiveWebSearch(userPrompt);
        this.renderSourcesCard(liveSources);
        searchContext = liveSources;
      }
    }

    if (searchContext && searchContext.length > 0) {
      const formattedSources = searchContext.map((s, i) => `[${i + 1}] "${s.title}" (${s.url}):\n${s.snippet}`).join('\n\n');
      messages.unshift({
        role: 'system',
        content: `You have access to verified web sources:\n\n${formattedSources}\n\nPlease synthesize your response accurately using these sources where relevant, citing sources as [1], [2], etc.`
      });
    }

    messages.push({ role: 'user', content: userPrompt });

    // Update UI to running state
    this.setGeneratingState(true);
    this.clearResponseViewer();

    const responseBody = document.getElementById('response-body');
    const reasoningBox = document.getElementById('reasoning-box');
    const reasoningContent = document.getElementById('reasoning-body-content');
    const reasoningTimer = document.getElementById('reasoning-timer');
    const sourcesCard = document.getElementById('sources-card');

    if (reasoningBox) reasoningBox.style.display = 'none';
    if (!searchContext && sourcesCard) sourcesCard.style.display = 'none';

    this.state.abortController = new AbortController();
    this.state.currentResponse = '';
    this.state.currentReasoning = '';

    const startTime = performance.now();
    let reasoningStartTime = null;

    try {
      const result = await this.api.chatCompletion({
        model: this.state.selectedModel,
        messages,
        temperature: this.state.temperature,
        max_tokens: this.state.maxTokens,
        top_p: this.state.topP,
        frequency_penalty: this.state.frequencyPenalty,
        presence_penalty: this.state.presencePenalty,
        stream: this.state.streaming,
        reasoning_effort: this.state.reasoningMode ? this.state.reasoningEffort : null,
        tools,
        signal: this.state.abortController.signal,
        onChunk: (chunk, accumulated) => {
          this.state.currentResponse = accumulated;
          this.renderMarkdown(accumulated, responseBody, true);
        },
        onReasoning: (chunk, accumulatedReasoning) => {
          if (!reasoningStartTime) reasoningStartTime = performance.now();
          this.state.currentReasoning = accumulatedReasoning;
          if (reasoningBox) reasoningBox.style.display = 'block';
          if (reasoningContent) reasoningContent.textContent = accumulatedReasoning;
          if (reasoningTimer) {
            const elapsed = ((performance.now() - reasoningStartTime) / 1000).toFixed(1);
            reasoningTimer.textContent = `${elapsed}s`;
          }
        }
      });

      // Handle tool call if model requested web search
      if (result.toolCalls && result.toolCalls.length > 0) {
        await this.handleToolCalls(result.toolCalls, messages, userPrompt);
        return;
      }

      // Finalize Markdown render
      this.state.currentResponse = result.content;
      this.renderMarkdown(result.content, responseBody, false);

      if (result.reasoningContent && reasoningBox && reasoningContent) {
        reasoningBox.style.display = 'block';
        reasoningContent.textContent = result.reasoningContent;
      }

      // Update telemetry & session stats
      const u = result.usage;
      this.updateTelemetryUI(u.durationMs, u.tokensPerSec, u.promptTokens, u.completionTokens, u.isEstimated);
      this.updateSessionStats(u.promptTokens, u.completionTokens, u.durationMs, u.tokensPerSec);

      // Save to prompt history
      this.saveHistory({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        model: this.state.selectedModel,
        prompt: userPrompt,
        response: result.content,
        promptTokens: u.promptTokens,
        completionTokens: u.completionTokens,
        durationMs: u.durationMs,
        tokensPerSec: u.tokensPerSec
      });
    } catch (err) {
      if (err.message.includes('cancelled') || err.message.includes('stopped')) {
        this.showToast('Generation cancelled.', 'info');
      } else {
        this.renderError(err.message, responseBody);
        this.showToast(`Error: ${err.message}`, 'error');
      }
    } finally {
      this.setGeneratingState(false);
      this.state.abortController = null;
    }
  }

  /**
   * Tool Calling Execution for Web Search
   */
  async handleToolCalls(toolCalls, originalMessages, defaultQuery) {
    const statusEl = document.getElementById('response-status-text');
    if (statusEl) statusEl.textContent = 'Searching web sources via Groq tool calling...';

    const call = toolCalls[0];
    let query = defaultQuery || 'recent information';
    try {
      const args = JSON.parse(call.function.arguments);
      query = args.query || query;
    } catch (_) {}

    const searchResults = await this.performLiveWebSearch(query);
    this.renderSourcesCard(searchResults);

    // Append tool call & tool result to messages
    const updatedMessages = [
      ...originalMessages,
      {
        role: 'assistant',
        content: null,
        tool_calls: toolCalls
      },
      {
        role: 'tool',
        tool_call_id: call.id,
        name: 'web_search',
        content: JSON.stringify(searchResults)
      }
    ];

    const responseBody = document.getElementById('response-body');

    // Second pass to synthesize answer with citations
    const finalResult = await this.api.chatCompletion({
      model: this.state.selectedModel,
      messages: updatedMessages,
      temperature: this.state.temperature,
      max_tokens: this.state.maxTokens,
      stream: this.state.streaming,
      signal: this.state.abortController?.signal,
      onChunk: (chunk, acc) => {
        this.state.currentResponse = acc;
        this.renderMarkdown(acc, responseBody, true);
      }
    });

    this.state.currentResponse = finalResult.content;
    this.renderMarkdown(finalResult.content, responseBody, false);
    const u = finalResult.usage;
    this.updateTelemetryUI(u.durationMs, u.tokensPerSec, u.promptTokens, u.completionTokens, u.isEstimated);
    this.updateSessionStats(u.promptTokens, u.completionTokens, u.durationMs, u.tokensPerSec);

    this.saveHistory({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      model: this.state.selectedModel,
      prompt: defaultQuery,
      response: finalResult.content,
      promptTokens: u.promptTokens,
      completionTokens: u.completionTokens,
      durationMs: u.durationMs,
      tokensPerSec: u.tokensPerSec
    });
  }

  stopGeneration() {
    if (this.state.abortController) {
      this.state.abortController.abort();
      this.setGeneratingState(false);
    }
  }

  setGeneratingState(isGenerating) {
    this.state.isGenerating = isGenerating;
    const btnRun = document.getElementById('btn-run-prompt');
    const btnStop = document.getElementById('btn-stop-generation');
    const statusText = document.getElementById('response-status-text');

    if (btnRun && btnStop) {
      if (isGenerating) {
        btnRun.style.display = 'none';
        btnStop.style.display = 'inline-flex';
      } else {
        btnRun.style.display = 'inline-flex';
        btnStop.style.display = 'none';
      }
    }

    if (statusText) {
      statusText.textContent = isGenerating ? 'Inference Running...' : 'Ready';
    }
  }

  updateTelemetryUI(durationMs, tokensPerSec, promptTokens, completionTokens, isEstimated = false) {
    const elSpeed = document.getElementById('telemetry-speed');
    const elLatency = document.getElementById('telemetry-latency');
    const elTokens = document.getElementById('telemetry-tokens');

    if (elSpeed) elSpeed.textContent = `${tokensPerSec} T/s`;
    if (elLatency) elLatency.textContent = `${durationMs}ms`;
    if (elTokens) {
      elTokens.textContent = `${promptTokens} in / ${completionTokens} out ${isEstimated ? '(est)' : '(LPU exact)'}`;
      elTokens.title = isEstimated ? 'Token count calculated via heuristics' : 'Exact token count returned by official Groq LPU usage telemetry';
    }
  }

  updateStatsDisplay() {
    const s = this.state.stats;
    const reqEl = document.getElementById('sidebar-stat-requests');
    const tokEl = document.getElementById('sidebar-stat-tokens');
    const speedEl = document.getElementById('sidebar-stat-speed');

    if (reqEl) reqEl.textContent = s.totalRequests;
    if (tokEl) tokEl.textContent = s.totalTokens > 1000 ? `${(s.totalTokens / 1000).toFixed(1)}k` : s.totalTokens;
    if (speedEl) speedEl.textContent = s.lastTokensPerSec > 0 ? `${s.lastTokensPerSec} T/s` : '---';

    // Metrics tab elements
    const mReq = document.getElementById('metric-total-requests');
    const mTok = document.getElementById('metric-total-tokens');
    const mSpeed = document.getElementById('metric-last-speed');
    const mLat = document.getElementById('metric-last-latency');

    if (mReq) mReq.textContent = s.totalRequests;
    if (mTok) mTok.textContent = s.totalTokens.toLocaleString();
    if (mSpeed) mSpeed.textContent = s.lastTokensPerSec > 0 ? `${s.lastTokensPerSec} T/s` : '0 T/s';
    if (mLat) mLat.textContent = `${s.lastDurationMs} ms`;
  }

  /* ========================================================
     MARKDOWN & SYNTAX RENDERING ENGINE
     ======================================================== */
  renderMarkdown(rawText, container, isStreaming = false) {
    if (!container) return;
    if (!rawText) {
      container.innerHTML = '';
      return;
    }

    let textToRender = rawText;
    // Balance unclosed code blocks during streaming
    if (isStreaming) {
      const codeFenceMatches = textToRender.match(/```/g);
      if (codeFenceMatches && codeFenceMatches.length % 2 === 1) {
        textToRender += '\n```';
      }
    }

    // Clean custom HTML tags and escape dangerous characters
    let html = textToRender
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks with syntax badge and copy button
    html = html.replace(/```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang.trim() || 'text';
      const cleanCode = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const id = 'code-' + Math.random().toString(36).substr(2, 9);
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span>${language}</span>
            <button class="code-copy-btn" onclick="window.nebula.copyCodeById('${id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code id="${id}">${this.highlightCode(code, language)}</code></pre>
        </div>
      `;
    });

    // Markdown Tables (| header | ... |)
    html = html.replace(/((?:^|\n)\|[^\n]+\|\n\|[\s\-:|]+\|\n(?:\|[^\n]+\|\n?)+)/g, (tableMatch) => {
      const rows = tableMatch.trim().split('\n');
      if (rows.length < 2) return tableMatch;
      let tableHtml = '<div class="table-responsive"><table class="markdown-table">';
      const headerCells = rows[0].split('|').slice(1, -1);
      tableHtml += '<thead><tr>' + headerCells.map(c => `<th>${c.trim()}</th>`).join('') + '</tr></thead><tbody>';
      for (let i = 2; i < rows.length; i++) {
        const cells = rows[i].split('|').slice(1, -1);
        tableHtml += '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
      }
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    });

    // Inline code
    html = html.replace(/`([^`\n]+)`/g, '<span class="inline-code">$1</span>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ol-item">$1</li>');
    html = html.replace(/(<li class="ol-item">[\s\S]*?<\/li>)/gim, '<ol>$1</ol>');
    html = html.replace(/<\/ol>\s*<ol>/g, '');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="markdown-link">$1 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>');

    // Paragraph line breaks
    html = html.replace(/\n\n+/g, '</p><p>');
    html = `<div class="markdown-body"><p>${html}</p></div>`;

    if (isStreaming) {
      html += '<span class="cursor-blink"></span>';
    }

    container.innerHTML = html;
  }

  highlightCode(code, lang) {
    const keywords = [
      'def', 'class', 'import', 'from', 'return', 'async', 'await', 'if', 'else', 'elif',
      'const', 'let', 'var', 'function', 'try', 'catch', 'finally', 'for', 'while', 'in', 'of',
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'TABLE', 'CREATE', 'fn', 'pub', 'struct', 'impl',
      'interface', 'type', 'export', 'default', 'extends', 'implements', 'yield', 'switch', 'case',
      'null', 'undefined', 'true', 'false', 'None', 'True', 'False', 'self', 'this'
    ];

    let highlighted = code;
    // Comments
    highlighted = highlighted.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span style="color:#64748B;font-style:italic;">$1</span>');
    // Strings
    highlighted = highlighted.replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color:#34D399;">$1</span>');
    // Numbers
    highlighted = highlighted.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#FBBF24;">$1</span>');
    // Keywords
    for (const kw of keywords) {
      const reg = new RegExp(`\\b(${kw})\\b`, 'g');
      highlighted = highlighted.replace(reg, '<span style="color:#A78BFA;font-weight:600;">$1</span>');
    }
    return highlighted;
  }

  copyCodeById(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      navigator.clipboard.writeText(el.innerText || el.textContent);
      this.showToast('Code block copied!', 'success');
    }
  }

  renderError(msg, container) {
    if (!container) return;
    container.innerHTML = `
      <div style="padding:16px; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:var(--radius-md); color:#FCA5A5;">
        <div style="display:flex; align-items:center; gap:8px; font-weight:700; margin-bottom:6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Inference Error</span>
        </div>
        <p style="font-size:13px; line-height:1.5;">${this.escapeHtml(msg)}</p>
      </div>
    `;
  }

  clearResponseViewer() {
    const container = document.getElementById('response-body');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h3>Awaiting Generation</h3>
          <p>Compose a prompt above and click <strong>Run Prompt</strong> (or press <code>Cmd/Ctrl + Enter</code>) to trigger ultra-low latency Groq inference.</p>
        </div>
      `;
    }

    const reasoningBox = document.getElementById('reasoning-box');
    if (reasoningBox) reasoningBox.style.display = 'none';

    const sourcesCard = document.getElementById('sources-card');
    if (sourcesCard) sourcesCard.style.display = 'none';

    this.state.currentResponse = '';
    this.state.currentReasoning = '';

    const elSpeed = document.getElementById('telemetry-speed');
    const elLatency = document.getElementById('telemetry-latency');
    const elTokens = document.getElementById('telemetry-tokens');
    if (elSpeed) elSpeed.textContent = '---';
    if (elLatency) elLatency.textContent = '---';
    if (elTokens) elTokens.textContent = '0 in / 0 out';
  }

  downloadResponse() {
    if (!this.state.currentResponse) {
      this.showToast('No response to download', 'info');
      return;
    }

    const filename = `nebula-${this.state.selectedModel}-${Date.now()}.md`;
    const blob = new Blob([this.state.currentResponse], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Downloaded response as Markdown file', 'success');
  }

  resetPlayground() {
    this.clearResponseViewer();
    const pInput = document.getElementById('user-prompt-input');
    const sInput = document.getElementById('system-prompt-input');
    if (pInput) {
      pInput.value = '';
      this.state.userPrompt = '';
      this.updatePromptCounters('');
    }
    if (sInput) {
      sInput.value = '';
      this.state.systemPrompt = '';
    }
    this.runPromptAnalysis();
    this.showToast('Playground workspace reset', 'info');
  }

  /* ========================================================
     MODALS: MODEL EXPLORER, TEMPLATES, HISTORY, SAVED, CONFIRM
     ======================================================== */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      const firstInput = modal.querySelector('input');
      if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  showConfirm(title, message, onConfirm) {
    const titleEl = document.getElementById('modal-confirm-title');
    const msgEl = document.getElementById('modal-confirm-message');
    const btnConfirm = document.getElementById('btn-confirm-action');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    if (btnConfirm) {
      btnConfirm.onclick = () => {
        this.closeModal('modal-confirm');
        if (typeof onConfirm === 'function') onConfirm();
      };
    }

    this.openModal('modal-confirm');
  }

  openModelsModal() {
    const searchInput = document.getElementById('model-search-input');
    const activePill = document.querySelector('#model-category-filters .filter-pill.active');
    const cat = activePill ? activePill.dataset.filter : 'all';
    this.renderModelsGrid(cat, searchInput?.value || '');
    this.openModal('modal-models');
  }

  renderModelsGrid(category = 'all', filterQuery = '') {
    const grid = document.getElementById('models-modal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const query = (filterQuery || '').toLowerCase().trim();
    const catalog = this.api.modelsCatalog;

    const filtered = catalog.filter(m => {
      const matchCat = category === 'all' ||
        m.category === category ||
        (category === 'reasoning' && m.supportsReasoning) ||
        (category === 'vision' && m.supportsVision) ||
        (category === 'speed' && m.category === 'speed') ||
        (category === 'moe' && m.category === 'moe');

      const matchQuery = !query ||
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query);

      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-dim); grid-column:1/-1;">No models matching filter criteria.</div>';
      return;
    }

    const gridWrap = document.createElement('div');
    gridWrap.className = 'models-grid';

    filtered.forEach(m => {
      const isSelected = m.id === this.state.selectedModel;
      const card = document.createElement('div');
      card.className = `model-matrix-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div>
          <div class="model-matrix-header">
            <div>
              <div class="model-matrix-name">${m.name}</div>
              <div style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">${m.provider} &bull; ${m.id}</div>
            </div>
            <span class="persona-chip" style="${m.supportsReasoning ? 'color:var(--violet-light); border-color:var(--violet-primary);' : ''}">${m.badge}</span>
          </div>
          <p class="model-matrix-desc" style="margin-top:8px;">${m.description}</p>
        </div>
        <div>
          <div class="model-matrix-specs">
            <span class="model-spec-tag model-spec-speed">${m.speed}</span>
            <span class="model-spec-tag">${(m.context / 1000).toFixed(0)}k Context</span>
            <span class="model-spec-tag">Max ${m.maxTokens > 1000 ? `${(m.maxTokens / 1000).toFixed(0)}k` : m.maxTokens} Out</span>
            ${m.supportsReasoning ? '<span class="model-spec-tag" style="color:var(--violet-light);">Reasoning Mode</span>' : ''}
            ${m.supportsVision ? '<span class="model-spec-tag" style="color:var(--cyan-light);">Vision Support</span>' : ''}
            ${m.supportsTools ? '<span class="model-spec-tag" style="color:var(--emerald-light);">Tool Calling</span>' : ''}
          </div>
          <div style="margin-top:12px; display:flex; justify-content:flex-end;">
            <button class="btn ${isSelected ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="window.nebula.selectModel('${m.id}')">
              ${isSelected ? 'Active Model' : 'Select Model'}
            </button>
          </div>
        </div>
      `;
      gridWrap.appendChild(card);
    });

    grid.appendChild(gridWrap);
  }

  openTemplatesModal() {
    const list = document.getElementById('templates-modal-list');
    if (!list) return;

    list.innerHTML = '';
    this.templates.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'analyzer-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#fff; font-size:14px;">${tpl.title}</strong>
          <span class="persona-chip">${tpl.category}</span>
        </div>
        <p style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono); margin-top:6px;">${tpl.prompt.slice(0, 110)}...</p>
      `;
      card.addEventListener('click', () => {
        const pInput = document.getElementById('user-prompt-input');
        const sInput = document.getElementById('system-prompt-input');
        if (pInput) {
          pInput.value = tpl.prompt;
          this.state.userPrompt = tpl.prompt;
          this.updatePromptCounters(tpl.prompt);
        }
        if (sInput && tpl.system) {
          sInput.value = tpl.system;
          this.state.systemPrompt = tpl.system;
          const sysBody = document.getElementById('system-prompt-body');
          if (sysBody) sysBody.classList.add('open');
        }
        this.runPromptAnalysis();
        this.closeModal('modal-templates');
        this.showToast(`Loaded "${tpl.title}" template`, 'success');
      });
      list.appendChild(card);
    });

    this.openModal('modal-templates');
  }

  openHistoryModal(filterQuery = '') {
    const list = document.getElementById('history-modal-list');
    if (!list) return;

    list.innerHTML = '';
    const query = (filterQuery || '').toLowerCase().trim();
    const items = this.history.filter(h => !query || h.prompt.toLowerCase().includes(query) || h.model.toLowerCase().includes(query));

    if (items.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);">${query ? 'No matching prompts found.' : 'No previous prompt history recorded yet.'}</div>`;
    } else {
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'analyzer-card';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-dim);">
            <span style="font-family:var(--font-mono); color:var(--violet-light);">${item.model}</span>
            <span>${new Date(item.timestamp).toLocaleTimeString()} &bull; ${item.tokensPerSec || 0} T/s &bull; ${item.completionTokens || 0} tokens</span>
          </div>
          <div style="font-size:13px; font-weight:600; color:#fff; max-height:48px; overflow:hidden; margin:6px 0;">${this.escapeHtml(item.prompt)}</div>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="window.nebula.loadHistoryPrompt('${item.id}')">Load to Editor</button>
            <button class="btn btn-ghost btn-sm" onclick="window.nebula.deleteHistoryPrompt('${item.id}')" title="Delete from history" style="color:var(--rose-light);">Delete</button>
          </div>
        `;
        list.appendChild(div);
      });
    }

    this.openModal('modal-history');
  }

  loadHistoryPrompt(itemId) {
    const found = this.history.find(h => h.id === itemId);
    if (found) {
      const pInput = document.getElementById('user-prompt-input');
      if (pInput) {
        pInput.value = found.prompt;
        this.state.userPrompt = found.prompt;
        this.updatePromptCounters(found.prompt);
        this.runPromptAnalysis();
      }
      this.closeModal('modal-history');
      this.showToast('Historical prompt loaded into editor', 'info');
    }
  }

  deleteHistoryPrompt(id) {
    this.history = this.history.filter(h => h.id !== id);
    try {
      localStorage.setItem(this.historyKey, JSON.stringify(this.history));
    } catch (_) {}
    const filterInput = document.getElementById('history-search-input');
    this.openHistoryModal(filterInput?.value || '');
    this.showToast('Item deleted from history', 'info');
  }

  promptClearAllHistory() {
    this.showConfirm(
      'Clear All History',
      'Are you sure you want to delete all session prompt history? This cannot be undone.',
      () => {
        this.history = [];
        try {
          localStorage.removeItem(this.historyKey);
        } catch (_) {}
        this.openHistoryModal();
        this.showToast('All prompt history cleared', 'info');
      }
    );
  }

  openSavedModal() {
    const list = document.getElementById('saved-modal-list');
    if (!list) return;

    list.innerHTML = '';
    if (this.savedPrompts.length === 0) {
      list.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-dim);">No bookmarked prompts yet. Click the bookmark icon in the editor to save prompts.</div>';
    } else {
      this.savedPrompts.forEach(item => {
        const div = document.createElement('div');
        div.className = 'analyzer-card';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--cyan-light); font-size:13px;">${item.title}</strong>
            <span style="font-size:11px; color:var(--text-dim);">${new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
          <p style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono); margin:6px 0;">${this.escapeHtml(item.prompt.slice(0, 120))}...</p>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="window.nebula.loadSavedPrompt('${item.id}')">Load</button>
            <button class="btn btn-danger btn-sm" onclick="window.nebula.deleteSavedPrompt('${item.id}')">Delete</button>
          </div>
        `;
        list.appendChild(div);
      });
    }

    this.openModal('modal-saved');
  }

  loadSavedPrompt(id) {
    const found = this.savedPrompts.find(s => s.id === id);
    if (found) {
      const pInput = document.getElementById('user-prompt-input');
      const sInput = document.getElementById('system-prompt-input');
      if (pInput) {
        pInput.value = found.prompt;
        this.state.userPrompt = found.prompt;
        this.updatePromptCounters(found.prompt);
      }
      if (sInput && found.system) {
        sInput.value = found.system;
        this.state.systemPrompt = found.system;
      }
      this.runPromptAnalysis();
      this.closeModal('modal-saved');
      this.showToast(`Loaded bookmark "${found.title}"`, 'success');
    }
  }

  deleteSavedPrompt(id) {
    this.savedPrompts = this.savedPrompts.filter(s => s.id !== id);
    try {
      localStorage.setItem(this.savedKey, JSON.stringify(this.savedPrompts));
    } catch (_) {}
    this.openSavedModal();
    this.showToast('Bookmark removed', 'info');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ========================================================
     TOAST NOTIFICATION COMPONENT
     ======================================================== */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span style="flex:1;">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.nebula = new NebulaPlayground();
});
