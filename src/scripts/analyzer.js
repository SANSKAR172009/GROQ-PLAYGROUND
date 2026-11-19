/**
 * NEBULA — Groq Intelligence Playground
 * analyzer.js — Intelligent Prompt Technique Classifier & Prompt Engineering Engine
 *
 * Provides real-time structural prompt classification (Zero-shot, One-shot, Few-shot),
 * confidence scoring, diagnostic audits, and automated prompt enhancement.
 *
 * Runs 100% locally in the browser with zero external dependencies.
 */

class PromptAnalyzer {
  constructor() {
    // Structural markers used to identify demonstrations and exemplar pairs
    this.pairPatterns = [
      /(?:^|\n)\s*(?:input|in|prompt|user|q|query|text|sentence|problem)\s*[:：\-–]\s*([^\n]+)\s*\n\s*(?:output|out|completion|assistant|a|answer|label|response|result)\s*[:：\-–]\s*([^\n]+)/gi,
      /(?:^|\n)\s*(?:example|sample|demo|case|instance)\s*(?:\d+|[a-z])?\s*[:：\-–]\s*([\s\S]*?)(?=(?:\n\s*(?:example|sample|demo|case|instance)\s*(?:\d+|[a-z])?\s*[:：\-–]|\n\s*(?:task|instruction|now|your turn|test|input)[\s:：]|$))/gi,
      /(?:^|\n)\s*["'“]([^"'”\n]{2,})["'”]\s*(?:->|=>|→|↦|-->|:)\s*["'“]([^"'”\n]{2,})["'”]/gi
    ];

    // Imperative directive action verbs
    this.actionVerbs = [
      'analyze', 'summarize', 'explain', 'generate', 'write', 'create', 'translate',
      'extract', 'classify', 'convert', 'refactor', 'debug', 'solve', 'calculate',
      'design', 'implement', 'describe', 'evaluate', 'compare', 'critique', 'identify',
      'list', 'outline', 'simplify', 'rephrase', 'recommend', 'validate', 'simulate'
    ];

    // Persona patterns
    this.personaPatterns = [
      /\b(?:act as|you are|assume the role of|behave like|pretend you are|take on the persona of)\b/i,
      /\bas an? (?:senior|expert|specialist|developer|engineer|scientist|analyst|tutor|architect)\b/i
    ];

    // Constraint patterns
    this.constraintPatterns = [
      /\b(?:in json|json format|markdown table|bullet points?|csv|yaml|code only|no explanation|do not include|step-by-step|under \d+ words|limit to|strictly)\b/i,
      /\b(?:format as|output schema|return only|respond with|do not|avoid)\b/i
    ];
  }

  /**
   * Main analysis function
   * @param {string} promptText
   * @param {string} systemPrompt
   * @returns {Object} Comprehensive analysis report
   */
  analyze(promptText = '', systemPrompt = '') {
    const text = (promptText || '').trim();
    const system = (systemPrompt || '').trim();
    const fullText = system ? `${system}\n\n${text}` : text;

    if (!text && !system) {
      return this.getEmptyAnalysis();
    }

    // 1. Example Detection & Counting
    const exampleResults = this.detectExamples(text, system);
    const exampleCount = exampleResults.count;
    const isAmbiguous = exampleResults.isAmbiguous;

    // 2. Classify Prompt Technique
    let classification = 'zero-shot';
    let confidence = 0.90;
    let classificationReason = '';

    if (isAmbiguous) {
      classification = 'uncertain';
      confidence = 0.65;
      classificationReason =
        'The prompt contains words like "example" or "such as", but lacks distinct structured input-output demonstration pairs. It operates as a hybrid or loosely contextualized zero-shot prompt.';
    } else if (exampleCount === 0) {
      classification = 'zero-shot';
      confidence = text.length > 30 ? 0.95 : 0.85;
      classificationReason =
        'Direct instructional prompt without demonstrations. The model relies entirely on its pre-trained weights without in-context exemplar guidance.';
    } else if (exampleCount === 1) {
      classification = 'one-shot';
      confidence = exampleResults.hasExplicitHeaders ? 0.94 : 0.82;
      classificationReason =
        'Contains exactly 1 exemplar demonstration. One-shot conditioning establishes expected output schema and stylistic format while conserving context window tokens.';
    } else {
      classification = 'few-shot';
      confidence = exampleResults.hasExplicitHeaders ? 0.96 : 0.88;
      classificationReason =
        `Contains ${exampleCount} distinct in-context demonstration examples. Few-shot conditioning guides pattern recognition and dramatically improves reasoning accuracy on structured tasks.`;
    }

    // 3. Structural Quality Audit
    const audit = this.auditStructure(text, system);

    // 4. Generate Actionable Suggestions
    const suggestions = this.generateSuggestions(classification, audit, text);

    // 5. Generate Enhanced Prompt Candidate
    const improvedPrompt = this.generateImprovedPrompt(text, system, classification, audit);

    return {
      classification: {
        type: classification,
        label: this.getClassificationLabel(classification),
        badgeClass: this.getClassificationBadgeClass(classification),
        confidenceScore: Math.round(confidence * 100),
        confidenceLevel: confidence >= 0.9 ? 'High' : confidence >= 0.75 ? 'Moderate' : 'Low',
        exampleCount,
        reason: classificationReason,
        isEstimate: true
      },
      audit: {
        overallScore: audit.overallScore,
        clarityScore: audit.clarityScore,
        specificityScore: audit.specificityScore,
        constraintsScore: audit.constraintsScore,
        hasActionVerb: audit.hasActionVerb,
        actionVerbFound: audit.actionVerbFound,
        hasPersona: audit.hasPersona,
        hasFormatConstraint: audit.hasFormatConstraint,
        hasNegativeConstraint: audit.hasNegativeConstraint,
        wordCount: audit.wordCount,
        charCount: text.length,
        estimatedTokens: Math.ceil(text.length / 3.8)
      },
      diagnostics: {
        strengths: audit.strengths,
        missingElements: audit.missingElements,
        suggestions
      },
      improvedPrompt
    };
  }

  /**
   * Count examples and detect ambiguity
   */
  detectExamples(text, system) {
    const combined = `${system}\n${text}`;
    let count = 0;
    let hasExplicitHeaders = false;
    let isAmbiguous = false;

    // Test structured Input/Output pairs
    const ioMatches = text.match(this.pairPatterns[0]);
    if (ioMatches) {
      count += ioMatches.length;
      hasExplicitHeaders = true;
    }

    // Test "Example 1:", "Example 2:" headers
    const exampleHeaderMatches = text.match(this.pairPatterns[1]);
    if (exampleHeaderMatches && count === 0) {
      count += exampleHeaderMatches.length;
      hasExplicitHeaders = true;
    }

    // Test Arrow transformations ("A" -> "B")
    const arrowMatches = text.match(this.pairPatterns[2]);
    if (arrowMatches && count === 0) {
      count += arrowMatches.length;
      hasExplicitHeaders = true;
    }

    // Check for ambiguous conversational references
    const casualExampleRegex = /\b(?:for example|e\.g\.|such as|like an example|here is an example)\b/i;
    if (count === 0 && casualExampleRegex.test(text)) {
      // Check if followed by structured text or just casual mention
      const afterMatch = text.slice(text.search(casualExampleRegex) + 15);
      if (afterMatch.includes('\n') && afterMatch.length > 20 && !afterMatch.match(/[:：]/)) {
        isAmbiguous = true;
      }
    }

    return {
      count,
      hasExplicitHeaders,
      isAmbiguous
    };
  }

  /**
   * Audit prompt structure: clarity, persona, constraints, length
   */
  auditStructure(text, system) {
    const combined = `${system} ${text}`;
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Check action verb
    let actionVerbFound = null;
    const lowerText = text.toLowerCase();
    for (const verb of this.actionVerbs) {
      const regex = new RegExp(`\\b${verb}\\b`, 'i');
      if (regex.test(lowerText)) {
        actionVerbFound = verb;
        break;
      }
    }

    const hasPersona = this.personaPatterns.some(p => p.test(combined));
    const hasFormatConstraint = this.constraintPatterns[0].test(combined);
    const hasNegativeConstraint = this.constraintPatterns[1].test(combined);

    // Calculate sub-scores (0-100)
    let clarityScore = 50;
    if (actionVerbFound) clarityScore += 25;
    if (wordCount >= 10 && wordCount <= 300) clarityScore += 15;
    if (text.includes('?') || text.includes('.')) clarityScore += 10;
    clarityScore = Math.min(100, clarityScore);

    let specificityScore = 40;
    if (wordCount > 25) specificityScore += 20;
    if (wordCount > 60) specificityScore += 15;
    if (hasPersona) specificityScore += 15;
    if (text.includes('```') || text.includes('"')) specificityScore += 10;
    specificityScore = Math.min(100, specificityScore);

    let constraintsScore = 30;
    if (hasFormatConstraint) constraintsScore += 35;
    if (hasNegativeConstraint) constraintsScore += 25;
    if (hasPersona) constraintsScore += 10;
    constraintsScore = Math.min(100, constraintsScore);

    const overallScore = Math.round((clarityScore * 0.4) + (specificityScore * 0.35) + (constraintsScore * 0.25));

    // Compile strengths & missing items
    const strengths = [];
    const missingElements = [];

    if (actionVerbFound) {
      strengths.push(`Clear directive goal identified using action verb "${actionVerbFound}".`);
    } else {
      missingElements.push('Missing explicit directive verb (e.g., "Analyze", "Generate", "Extract").');
    }

    if (hasPersona) {
      strengths.push('Defined role or domain expert persona provides contextual grounding.');
    } else {
      missingElements.push('No assigned AI persona or target audience context.');
    }

    if (hasFormatConstraint) {
      strengths.push('Defined output format constraints (e.g., JSON, markdown, bullet points).');
    } else {
      missingElements.push('Lacks explicit output formatting requirements (e.g., Markdown table, JSON schema).');
    }

    if (!hasNegativeConstraint) {
      missingElements.push('No negative boundary constraints (e.g., "Do not include conversational filler").');
    }

    return {
      overallScore,
      clarityScore,
      specificityScore,
      constraintsScore,
      hasActionVerb: Boolean(actionVerbFound),
      actionVerbFound,
      hasPersona,
      hasFormatConstraint,
      hasNegativeConstraint,
      wordCount,
      strengths,
      missingElements
    };
  }

  /**
   * Actionable improvement suggestions
   */
  generateSuggestions(classification, audit, text) {
    const list = [];

    if (!audit.hasPersona) {
      list.push('Assign an explicit role (e.g., "Act as a senior DevOps engineer") to bias generation towards high-accuracy domain terminology.');
    }

    if (!audit.hasFormatConstraint) {
      list.push('Specify your desired output structure (e.g., "Respond in a 3-column Markdown table" or "Provide strict valid JSON").');
    }

    if (!audit.hasNegativeConstraint) {
      list.push('Add negative guardrails (e.g., "Do not provide conversational preamble or wrap code in explanations").');
    }

    if (classification === 'zero-shot' && audit.wordCount < 20) {
      list.push('Consider transforming into One-Shot or Few-Shot by providing 1-2 examples of ideal input-output pairs to eliminate ambiguity.');
    }

    if (classification === 'uncertain') {
      list.push('Format your examples explicitly with standardized prefixes like "Input: ... Output: ..." or numbered "Example 1:" blocks.');
    }

    if (text.length > 500 && !text.includes('###') && !text.includes('---')) {
      list.push('Use markdown headers (`### Objective`, `### Context`) or delimiters (`---`) to separate instructions from source data.');
    }

    return list;
  }

  /**
   * Intelligent prompt enhancer
   */
  generateImprovedPrompt(text, system, classification, audit) {
    if (!text) {
      return 'Please enter a prompt to generate an optimized version.';
    }

    const verb = audit.actionVerbFound ? audit.actionVerbFound.toUpperCase() : 'ANALYZE';
    const personaLine = audit.hasPersona
      ? ''
      : 'You are an elite, production-grade AI assistant specialized in high-precision execution.\n\n';

    let improved = '';

    if (classification === 'few-shot') {
      improved = `${personaLine}### OBJECTIVE
${text}

### INSTRUCTIONS & CONSTRAINTS
1. Analyze the pattern established in the demonstrations above carefully.
2. Maintain strict stylistic and structural consistency with provided examples.
3. Output the result clearly without unnecessary filler or commentary.`;
    } else if (classification === 'one-shot') {
      improved = `${personaLine}### TASK
${text}

### OUTPUT REQUIREMENTS
- Follow the demonstration format provided above exactly.
- Verify factual accuracy and internal logical consistency.
- Return only the requested deliverable.`;
    } else {
      // Zero-shot upgrade to structured production prompt
      improved = `${personaLine}### OBJECTIVE
${text}

### CONSTRAINTS & FORMATTING
- Structure your response using clean, professional Markdown.
- Provide comprehensive, step-by-step reasoning where applicable.
- Ensure all technical terms and code snippets are accurate and production-ready.
- Exclude unnecessary conversational pleasantries; proceed directly to the deliverable.`;
    }

    return improved.trim();
  }

  getClassificationLabel(type) {
    switch (type) {
      case 'zero-shot': return 'Zero-Shot Prompting';
      case 'one-shot': return 'One-Shot Prompting';
      case 'few-shot': return 'Few-Shot Prompting';
      case 'uncertain': return 'Ambiguous / Hybrid';
      default: return 'Prompt Technique';
    }
  }

  getClassificationBadgeClass(type) {
    switch (type) {
      case 'zero-shot': return 'badge-zero-shot';
      case 'one-shot': return 'badge-one-shot';
      case 'few-shot': return 'badge-few-shot';
      case 'uncertain': return 'badge-uncertain';
      default: return 'badge-default';
    }
  }

  getEmptyAnalysis() {
    return {
      classification: {
        type: 'none',
        label: 'Awaiting Prompt',
        badgeClass: 'badge-empty',
        confidenceScore: 0,
        confidenceLevel: 'None',
        exampleCount: 0,
        reason: 'Type or paste a prompt in the editor to trigger live structural analysis.',
        isEstimate: true
      },
      audit: {
        overallScore: 0,
        clarityScore: 0,
        specificityScore: 0,
        constraintsScore: 0,
        hasActionVerb: false,
        actionVerbFound: null,
        hasPersona: false,
        hasFormatConstraint: false,
        hasNegativeConstraint: false,
        wordCount: 0,
        charCount: 0,
        estimatedTokens: 0
      },
      diagnostics: {
        strengths: [],
        missingElements: ['Enter a prompt to inspect its structural technique.'],
        suggestions: ['Start with a clear directive verb (e.g. "Explain", "Write", "Analyze").']
      },
      improvedPrompt: ''
    };
  }
}

// Export singleton instance
window.PromptAnalyzer = PromptAnalyzer;
window.promptAnalyzer = new PromptAnalyzer();

