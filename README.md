# AI Humanizer Pro

A production-grade, local-first web application designed to help users analyze and humanize AI-generated text. It uses client-side linguistic heuristics to make robotic AI-style text sound natural, varied, and fluent while 100% preserving factual data (names, dates, numbers, URLs, and references).

This application runs entirely in the browser with **no backend APIs, no external libraries, and no frameworks**.

## Core Features

### 1. Heuristic Rewrite Engine
An NLP rule-based pipeline that processes text paragraph by paragraph and sentence by sentence:
- **Protected Entity Extraction**: Identifies and locks proper nouns, URLs, emails, dates, numbers, and markdown citations. These are restored post-rewrite.
- **Active Voice Promotion**: Identifies passive voice structures (e.g., "was written by") and flips them into clear active sentences where possible.
- **Filler Word & Redundancy Reduction**: Identifies and removes common conversational fluff (e.g., "needless to say", "in order to").
- **Sentence Restructuring (Splitting & Merging)**: Splits bloated sentences containing multiple conjunctions, and merges choppy short sentences to optimize the natural rhythm.
- **Vocabulary Diversity**: Intelligently swaps highly repetitive or robotic vocabulary with contextual human synonyms.
- **Contraction Optimization**: Adapts contractions based on user-selected profiles (Casual, Balanced, or Professional).

### 2. Linguistic Analyzer & Diagnostics Dashboard
Computes a complete profile of the text:
- **Readability & Grade Levels**: Flesch-Kincaid Reading Ease, Gunning Fog Index, and estimated readability level.
- **Writing Characteristics**: Character, word, sentence, and paragraph counts.
- **Linguistic Metrics**: Lexical diversity percentage, transition word density, passive voice count, and sentence length variety (standard deviation).
- **Repetitive Vocabulary Detector**: Highlights frequently repeated words and phrases.
- **Interactive Canvas Visualizations**: Renders real-time, animated Gauge, Radar, and Line charts using the HTML5 Canvas API.

### 3. Desktop SaaS User Experience
- **Adaptive Layout**: Dual text panel layout (Original vs. Humanized) with interactive stats.
- **State Controls**: Full support for Undo/Redo stacks, history log, and starred favorites saved to local storage.
- **Theme Engine**: Seamless switching between dark glassmorphism (default) and crisp light glassmorphism.
- **Professional Exports**: Export to plain `.txt` file, or trigger native browser printing styled as a professional multi-page report card.
- **Offline Support**: Leverages a service worker to cache shell assets. Fully operational without an internet connection.

---

## File Structure

```
.
├── index.html              # Main HTML5 layout shell and SVG sprite assets
├── service-worker.js       # Offline cache manager
├── css/
│   └── style.css           # Premium glassmorphism design, dark/light themes, and print rules
└── js/
    ├── engine/
    │   ├── analyzer.js     # Text parsing and metrics math
    │   └── rewrite.js      # NLP rules and heuristics rewrite logic
    └── ui/
        ├── app.js          # Coordination, listeners, history, & exports
        └── dashboard.js    # High-DPI HTML5 Canvas charting
```

---

## Getting Started

1. Double-click or open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
2. Paste any AI-generated text in the left pane.
3. Configure the **Humanization Strength** and **Formality Shift** profiles in the sidebar.
4. Click **Humanize Content** (or press `Ctrl + Enter`).
5. Observe the metrics and charts update dynamically in the dashboard below.

### Keyboard Shortcuts
- `Ctrl + Enter`: Humanize Content
- `Ctrl + Z`: Undo text input edits
- `Ctrl + Y`: Redo text input edits
- `Ctrl + S`: Export Humanized Text as a `.txt` file
- `Ctrl + Alt + C`: Copy output to clipboard

---

## Technical Performance Details
- **Zero-Dependency Code**: Avoids external network calls or node modules. Loaded files are small (CSS & JS are less than 50KB combined).
- **Render Performance**: Canvas visualizers use standard `requestAnimationFrame` for 60fps enter-animations.
- **Memory Footprint**: Text structures are tokenized iteratively, ensuring low memory consumption even with texts exceeding 10,000 words.
- **Disclaimer**: Write-analyzer scores and Humanized percentages are heuristic estimations. Results are not mathematical guarantees of bypassing detector networks.
