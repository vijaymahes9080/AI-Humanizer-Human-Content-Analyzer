/**
 * AI Humanizer Pro - Main Application Controller
 * Coordinates the UI, local state, undo/redo stacks, event listeners,
 * history, favorites, keyboard shortcuts, exports, and offline status.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const textInput = document.getElementById('text-input');
  const textOutput = document.getElementById('text-output');
  const btnHumanize = document.getElementById('btn-humanize');
  
  const origWords = document.getElementById('orig-words');
  const origChars = document.getElementById('orig-chars');
  const humWords = document.getElementById('hum-words');
  const humChars = document.getElementById('hum-chars');
  
  const btnPaste = document.getElementById('btn-paste');
  const btnLoadDemo = document.getElementById('btn-load-demo');
  const btnClear = document.getElementById('btn-clear');
  const btnCopy = document.getElementById('btn-copy');
  const btnFavorite = document.getElementById('btn-favorite');
  
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  
  const selectStrength = document.getElementById('profile-strength');
  const selectFormality = document.getElementById('profile-formality');
  
  const btnExportTxt = document.getElementById('btn-export-txt');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const favoritesList = document.getElementById('favorites-list');
  
  const metricReadability = document.getElementById('metric-readability');
  const metricStyle = document.getElementById('metric-style');
  
  const diagPassive = document.getElementById('diag-passive');
  const diagTransitions = document.getElementById('diag-transitions');
  const diagDiversity = document.getElementById('diag-diversity');
  const diagVariety = document.getElementById('diag-variety');
  
  const diagWordsContainer = document.getElementById('diag-words-container');
  const diagPhrasesContainer = document.getElementById('diag-phrases-container');
  
  const appStatus = document.getElementById('app-status');
  const offlineBanner = document.getElementById('offline-banner');

  // Advanced feature element references
  const toggleDeepAi = document.getElementById('toggle-deep-ai');
  const btnDictTrigger = document.getElementById('btn-dict-trigger');
  const dictUpload = document.getElementById('dict-upload');
  const dictStatus = document.getElementById('dict-status');
  const toggleHeatmap = document.getElementById('toggle-heatmap');
  const aiLoadingOverlay = document.getElementById('ai-loading-overlay');
  const aiProgressBar = document.getElementById('ai-progress-bar');
  const aiProgressStatus = document.getElementById('ai-progress-status');

  // --- Core State ---
  let state = {
    theme: 'dark',
    history: [],
    favorites: [],
    undoStack: [],
    redoStack: [],
    activeRecord: null,
    customDict: {},
    deepAi: false
  };

  // --- Initialize Custom Canvas Charts ---
  const gaugeChart = new Dashboard.Gauge('gauge-canvas');
  const radarChart = new Dashboard.Radar('radar-canvas');
  const distributionChart = new Dashboard.Distribution('distribution-canvas');

  // --- LocalStorage Persistence Helpers ---
  function loadState() {
    state.theme = localStorage.getItem('ai_humanizer_theme') || 'dark';
    state.history = JSON.parse(localStorage.getItem('ai_humanizer_history')) || [];
    state.favorites = JSON.parse(localStorage.getItem('ai_humanizer_favorites')) || [];
    state.customDict = JSON.parse(localStorage.getItem('ai_humanizer_custom_dict')) || {};
    
    // Update dictionary visual indicator
    const keysCount = Object.keys(state.customDict).length;
    if (keysCount > 0 && dictStatus) {
      dictStatus.textContent = `${keysCount} active term maps`;
    }

    // Apply theme
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.querySelector('use').setAttribute('href', state.theme === 'dark' ? '#icon-sun' : '#icon-moon');
    }
    Dashboard.updateColors(state.theme === 'dark');
  }

  function saveHistory() {
    localStorage.setItem('ai_humanizer_history', JSON.stringify(state.history));
  }

  function saveFavorites() {
    localStorage.setItem('ai_humanizer_favorites', JSON.stringify(state.favorites));
  }

  // --- Stats Display Updates ---
  function updateStats(text, isOutput = false) {
    const words = Analyzer.getWords(text).length;
    const chars = text.length;
    
    if (isOutput) {
      humWords.textContent = `${words} words`;
      humChars.textContent = `${chars} chars`;
      
      btnCopy.disabled = words === 0;
      btnFavorite.disabled = words === 0;
      btnExportTxt.disabled = words === 0;
      btnExportPdf.disabled = words === 0;
    } else {
      origWords.textContent = `${words} words`;
      origChars.textContent = `${chars} chars`;
    }
  }

  // --- Clear Screen state ---
  function clearAll() {
    textInput.value = '';
    textOutput.textContent = '';
    textOutput.removeAttribute('data-content');
    
    updateStats('', false);
    updateStats('', true);
    
    // Reset indicators
    metricReadability.textContent = 'Readability: -';
    metricStyle.textContent = 'Style: -';
    
    diagPassive.textContent = '-';
    diagTransitions.textContent = '-';
    diagDiversity.textContent = '-';
    diagVariety.textContent = '-';
    
    diagWordsContainer.innerHTML = '<span style="font-size:11px; color:var(--text-muted);">No repetitive words analyzed yet.</span>';
    diagPhrasesContainer.innerHTML = '<span style="font-size:11px; color:var(--text-muted);">No repetitive phrases analyzed yet.</span>';
    
    // Reset charts
    gaugeChart.render(0, 'Human Score');
    radarChart.render({}, {});
    distributionChart.render([], []);
    
    state.activeRecord = null;
    btnFavorite.classList.remove('active');
    btnFavorite.querySelector('use').setAttribute('href', '#icon-star');
    
    setStatus('Screen cleared');
  }

  // --- Undo/Redo Stacking ---
  function pushUndo(val) {
    // Avoid double entries
    if (state.undoStack.length > 0 && state.undoStack[state.undoStack.length - 1] === val) {
      return;
    }
    state.undoStack.push(val);
    if (state.undoStack.length > 50) state.undoStack.shift(); // limit size
    btnUndo.disabled = false;
  }

  function handleUndo() {
    if (state.undoStack.length > 0) {
      const current = textInput.value;
      state.redoStack.push(current);
      btnRedo.disabled = false;
      
      const prev = state.undoStack.pop();
      textInput.value = prev;
      updateStats(prev, false);
      
      if (state.undoStack.length === 0) {
        btnUndo.disabled = true;
      }
      setStatus('Undo applied');
    }
  }

  function handleRedo() {
    if (state.redoStack.length > 0) {
      const current = textInput.value;
      state.undoStack.push(current);
      btnUndo.disabled = false;
      
      const next = state.redoStack.pop();
      textInput.value = next;
      updateStats(next, false);
      
      if (state.redoStack.length === 0) {
        btnRedo.disabled = true;
      }
      setStatus('Redo applied');
    }
  }

  // --- Set status footer helper ---
  function setStatus(msg, isError = false) {
    appStatus.textContent = msg;
    appStatus.style.color = isError ? 'var(--color-original)' : 'var(--color-human)';
    setTimeout(() => {
      appStatus.textContent = 'Engine Ready';
      appStatus.style.color = 'var(--color-human)';
    }, 4000);
  }

  // --- Render Lists UI (History/Favorites) ---
  function renderHistoryUI() {
    if (state.history.length === 0) {
      historyList.innerHTML = '<div class="empty-state">No recent rewrites</div>';
      return;
    }

    historyList.innerHTML = state.history.map(item => `
      <div class="list-item" data-id="${item.id}">
        <div class="list-item-meta">
          <span>Score: ${Math.round(item.score)}%</span>
          <span>${new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="list-item-snippet">${escapeHtml(item.original.substring(0, 45))}...</div>
      </div>
    `).join('');

    // Bind listeners
    historyList.querySelectorAll('.list-item').forEach(el => {
      el.addEventListener('click', () => loadRecord(el.getAttribute('data-id'), 'history'));
    });
  }

  function renderFavoritesUI() {
    if (state.favorites.length === 0) {
      favoritesList.innerHTML = '<div class="empty-state">Star a rewrite to save it</div>';
      return;
    }

    favoritesList.innerHTML = state.favorites.map(item => `
      <div class="list-item" data-id="${item.id}">
        <div class="list-item-meta">
          <span>Score: ${Math.round(item.score)}%</span>
          <span>Starred</span>
        </div>
        <div class="list-item-snippet">${escapeHtml(item.humanized.substring(0, 45))}...</div>
      </div>
    `).join('');

    // Bind listeners
    favoritesList.querySelectorAll('.list-item').forEach(el => {
      el.addEventListener('click', () => loadRecord(el.getAttribute('data-id'), 'favorites'));
    });
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- Load a Selected Record from History/Favorites ---
  function loadRecord(id, source) {
    const list = source === 'history' ? state.history : state.favorites;
    const record = list.find(r => r.id === id);
    if (!record) return;

    state.activeRecord = record;
    textInput.value = record.original;
    textOutput.innerHTML = record.humanizedHtml || record.humanized;
    bindHighlightClickEvents();
    
    selectStrength.value = record.strength;
    selectFormality.value = record.formality;
    
    updateStats(record.original, false);
    updateStats(record.humanized, true);
    
    // Highlight items in sidebar
    document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.list-item[data-id="${id}"]`);
    if (activeEl) activeEl.classList.add('active');

    // Update Favorites button star
    const isStarred = state.favorites.some(f => f.id === record.id);
    if (isStarred) {
      btnFavorite.classList.add('active');
      btnFavorite.querySelector('use').setAttribute('href', '#icon-star');
      btnFavorite.style.color = '#eab308'; // Amber Star
    } else {
      btnFavorite.classList.remove('active');
      btnFavorite.querySelector('use').setAttribute('href', '#icon-star');
      btnFavorite.style.color = 'inherit';
    }

    // Restore Diagnostics and Charts
    displayAnalysis(record.originalStats, record.humanizedStats);
    setStatus('Record loaded');
  }

  // --- Display Analyzer metrics inside GUI and Draw Charts ---
  function displayAnalysis(origStats, humStats) {
    // 1. Set numeric metrics
    metricReadability.textContent = `Readability: ${humStats.readabilityLevel}`;
    metricStyle.textContent = `Style: ${humStats.writingStyle} (Formality: ${Math.round(humStats.formalityScore)}%)`;
    
    diagPassive.textContent = `${Math.round(humStats.passiveVoicePct)}%`;
    diagTransitions.textContent = `${Math.round(humStats.transitionDensity)}%`;
    diagDiversity.textContent = `${Math.round(humStats.vocabDiversity)}%`;
    diagVariety.textContent = `${Math.round(humStats.sentenceVariety)}%`;

    const diagPerplexity = document.getElementById('diag-perplexity');
    const diagBurstiness = document.getElementById('diag-burstiness');
    if (diagPerplexity) diagPerplexity.textContent = `${Math.round(humStats.perplexityScore)}%`;
    if (diagBurstiness) diagBurstiness.textContent = `${humStats.burstiness ? humStats.burstiness.toFixed(1) : '0.0'}`;

    // 2. Set Repeated Words Tags
    if (humStats.repeatedWords && humStats.repeatedWords.length > 0) {
      diagWordsContainer.innerHTML = humStats.repeatedWords.map(rw => `
        <span class="diag-tag">${rw.word} <span>x${rw.count}</span></span>
      `).join('');
    } else {
      diagWordsContainer.innerHTML = '<span style="font-size:11px; color:var(--text-muted);">Optimal diversity (no repetitions)</span>';
    }

    // 3. Set Repeated Phrases Tags
    if (humStats.repeatedPhrases && humStats.repeatedPhrases.length > 0) {
      diagPhrasesContainer.innerHTML = humStats.repeatedPhrases.map(rp => `
        <span class="diag-tag">${rp.phrase} <span>x${rp.count}</span></span>
      `).join('');
    } else {
      diagPhrasesContainer.innerHTML = '<span style="font-size:11px; color:var(--text-muted);">Clear phrasing structure</span>';
    }

    // 4. Render Dashboard Canvas Charts with transition details
    gaugeChart.render(humStats.flowScore, 'Human Score');
    radarChart.render(origStats, humStats);
    distributionChart.render(origStats.sentenceLengths, humStats.sentenceLengths);
  }

  let pipeline = null;
  let detectorPipeline = null;

  // --- Visual Sentence Heatmap overlay ---
  function applyHeatmap(htmlText) {
    if (!toggleHeatmap || !toggleHeatmap.checked) return htmlText;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;
    
    // Split sentences inside the HTML content, avoiding tag attributes
    const sentences = tempDiv.innerHTML.split(/(?<=[.!?])\s+(?=[A-Z0-9"']|$)/);
    
    const heatmapped = sentences.map(s => {
      if (!s.trim()) return s;
      
      const cleanText = s.replace(/<[^>]*>/g, '');
      const wordsCount = Analyzer.getWords(cleanText).length;
      if (wordsCount < 3) return s;

      const stats = Analyzer.analyze(cleanText);
      const isStiff = stats.passiveVoicePct > 0 || wordsCount > 20 || stats.formalityScore > 62;

      // Color mapping: light teal for humanized sentences, soft red for predictable robotic ones
      let color = 'rgba(20, 184, 166, 0.12)'; // Teal
      let label = `Natural flow. Words: ${wordsCount}`;

      if (isStiff) {
        const alpha = Math.min(0.35, 0.12 + (stats.formalityScore / 100) * 0.22);
        color = `rgba(239, 68, 68, ${alpha})`; // Red
        label = `Robotic syntax structure. Formality: ${Math.round(stats.formalityScore)}%`;
      }

      return `<span class="sentence-heatmap" style="background-color: ${color};" data-tooltip="${label}">${s}</span>`;
    });

    return heatmapped.join(' ');
  }

  if (toggleHeatmap) {
    toggleHeatmap.addEventListener('change', () => {
      if (state.activeRecord) {
        const rendered = applyHeatmap(state.activeRecord.humanizedHtml);
        textOutput.innerHTML = rendered;
        bindHighlightClickEvents();
      }
    });
  }

  // --- Humanize Core Trigger ---
  async function triggerHumanize() {
    const inputVal = textInput.value.trim();
    const wordCount = Analyzer.getWords(inputVal).length;

    if (!inputVal) {
      setStatus('Please enter some text to humanize', true);
      return;
    }

    if (wordCount < 5) {
      setStatus('Input must be at least 5 words long', true);
      return;
    }

    // Save current input to Undo stack before rewriting
    pushUndo(inputVal);

    const options = {
      strength: selectStrength.value,
      formality: selectFormality.value,
      customDict: state.customDict
    };

    // Calculate metrics of original stiff text
    const origStats = Analyzer.analyze(inputVal);
    let rewritten = null;

    // Check if Local Deep AI is toggled
    if (toggleDeepAi && toggleDeepAi.checked) {
      setStatus('Loading local AI model...');
      aiLoadingOverlay.style.display = 'flex';
      aiProgressBar.style.width = '0%';
      aiProgressStatus.textContent = 'Initializing WebGPU/Wasm modules...';

      try {
        if (typeof transformers === 'undefined') {
          throw new Error('Transformers library not loaded from CDN.');
        }

        transformers.env.allowLocalModels = false;

        // Load T5 rewriter pipeline
        if (!pipeline) {
          pipeline = await transformers.pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-78M', {
            progress_callback: (data) => {
              if (data.status === 'progress') {
                const percent = Math.round(data.progress);
                aiProgressBar.style.width = `${percent}%`;
                aiProgressStatus.textContent = `Downloading Rewriter: ${percent}% (${data.file.split('/').pop()})`;
              } else if (data.status === 'ready') {
                aiProgressStatus.textContent = 'Rewriter cached! Loading detector...';
              }
            }
          });
        }

        // Load Roberta detector pipeline
        if (!detectorPipeline) {
          detectorPipeline = await transformers.pipeline('text-classification', 'Xenova/roberta-base-openai-detector', {
            progress_callback: (data) => {
              if (data.status === 'progress') {
                const percent = Math.round(data.progress);
                aiProgressBar.style.width = `${percent}%`;
                aiProgressStatus.textContent = `Downloading Detector: ${percent}% (${data.file.split('/').pop()})`;
              } else if (data.status === 'ready') {
                aiProgressStatus.textContent = 'Detector cached! Preparing inference...';
              }
            }
          });
        }

        aiProgressStatus.textContent = 'Synthesizing client-side humanized content...';
        aiProgressBar.style.width = '100%';

        // Query rewriter locally
        const prompt = `Rewrite this text to make it sound highly human, natural, conversational, and direct: "${inputVal}"`;
        const result = await pipeline(prompt, {
          max_new_tokens: 512,
          temperature: 0.75,
          repetition_penalty: 1.25
        });

        const generatedText = result[0].generated_text;

        // Formats model text using visual highlighter spans
        rewritten = RewriteEngine.humanize(generatedText, {
          ...options,
          strength: 'light'
        });

        setStatus('Local LLM generation complete!');
      } catch (err) {
        console.error(err);
        setStatus('Deep AI failed. Running heuristic fallback...', true);
        rewritten = RewriteEngine.humanize(inputVal, options);
      } finally {
        aiLoadingOverlay.style.display = 'none';
      }
    } else {
      setStatus('Processing text heuristics...');
      rewritten = RewriteEngine.humanize(inputVal, options);
    }
    
    // Calculate metrics of rewritten human-like text
    const humStats = Analyzer.analyze(rewritten.text);

    // Apply Real Roberta AI classification scores if Deep AI was used
    if (toggleDeepAi && toggleDeepAi.checked && detectorPipeline) {
      try {
        const origClassResult = await detectorPipeline(inputVal);
        let origModelScore = 50;
        if (origClassResult && origClassResult.length > 0) {
          origModelScore = origClassResult[0].label === 'Real' 
            ? Math.round(origClassResult[0].score * 100) 
            : Math.round((1 - origClassResult[0].score) * 100);
        }

        const rewrittenClassResult = await detectorPipeline(rewritten.text);
        let rewrittenModelScore = 50;
        if (rewrittenClassResult && rewrittenClassResult.length > 0) {
          rewrittenModelScore = rewrittenClassResult[0].label === 'Real' 
            ? Math.round(rewrittenClassResult[0].score * 100) 
            : Math.round((1 - rewrittenClassResult[0].score) * 100);
        }

        // Merge Roberta detection score with heuristics
        humStats.flowScore = Math.round((rewrittenModelScore * 0.7) + (humStats.flowScore * 0.3));
        humStats.perplexityScore = Math.max(12, Math.min(98, rewrittenModelScore - 6 + (humStats.burstiness * 1.5)));
        
        origStats.flowScore = Math.round((origModelScore * 0.7) + (origStats.flowScore * 0.3));
        origStats.perplexityScore = Math.max(12, Math.min(98, origModelScore - 6 + (origStats.burstiness * 1.5)));
      } catch (detectorErr) {
        console.warn("Roberta classifier execution failed:", detectorErr);
      }
    }

    // Apply Heatmap overlays
    const renderedHtml = applyHeatmap(rewritten.html);

    // Apply HTML typing/fade emulation
    animateTextDisplay(renderedHtml);

    updateStats(rewritten.text, true);
    
    // Save to local state
    const record = {
      id: 'rec_' + Date.now(),
      timestamp: Date.now(),
      original: inputVal,
      humanized: rewritten.text,
      humanizedHtml: rewritten.html,
      strength: options.strength,
      formality: options.formality,
      score: humStats.flowScore,
      originalStats: origStats,
      humanizedStats: humStats
    };

    state.activeRecord = record;
    state.history.unshift(record);
    if (state.history.length > 20) state.history.pop(); // limit size
    
    saveHistory();
    renderHistoryUI();
    
    // Star toggle button defaults
    btnFavorite.classList.remove('active');
    btnFavorite.querySelector('use').setAttribute('href', '#icon-star');
    btnFavorite.style.color = 'inherit';

    // Renders visual dashboard diagnostics
    displayAnalysis(origStats, humStats);
    setStatus('Text humanized successfully!');
  }

  // Emulates typing/processing layout animation
  function animateTextDisplay(targetHtml) {
    textOutput.innerHTML = '';
    textOutput.style.opacity = 0.4;
    
    // Smooth transition reveal
    setTimeout(() => {
      textOutput.style.opacity = 1.0;
      textOutput.innerHTML = targetHtml;
      bindHighlightClickEvents();
    }, 200);
  }

  // --- Visual Diff Highlight Event Listeners ---
  function bindHighlightClickEvents() {
    const highlights = textOutput.querySelectorAll('.highlight-change');
    highlights.forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showSynonymDropdown(el);
      });
    });
  }

  let activeDropdown = null;

  async function showSynonymDropdown(el) {
    closeActiveDropdown();

    const orig = el.getAttribute('data-orig');
    const type = el.getAttribute('data-type');
    const synsAttr = el.getAttribute('data-syns');
    if (!synsAttr) return;

    let synonyms = synsAttr.split(',');
    const currentVal = el.textContent.trim().toLowerCase();

    // Create dropdown menu element
    const dropdown = document.createElement('div');
    dropdown.className = 'synonym-dropdown';

    // Header
    const header = document.createElement('div');
    header.className = 'synonym-dropdown-header';
    header.textContent = orig ? `Original: ${orig}` : 'Alternatives';
    dropdown.appendChild(header);

    // List of alternatives container
    const itemsContainer = document.createElement('div');
    dropdown.appendChild(itemsContainer);

    // Helper to render an item
    const renderItem = (syn) => {
      const cleanSyn = syn.trim();
      if (!cleanSyn) return;
      
      // Prevent duplicates
      const exists = Array.from(itemsContainer.querySelectorAll('.synonym-dropdown-item'))
        .some(item => item.textContent.trim().toLowerCase() === cleanSyn.toLowerCase());
      if (exists) return;

      const item = document.createElement('div');
      item.className = 'synonym-dropdown-item';
      
      let casedSyn = cleanSyn;
      if (el.textContent.charAt(0) === el.textContent.charAt(0).toUpperCase()) {
        casedSyn = casedSyn.charAt(0).toUpperCase() + casedSyn.slice(1);
      }
      
      item.textContent = casedSyn;
      if (casedSyn.toLowerCase() === currentVal) {
        item.classList.add('active');
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        updateWordWithSynonym(el, casedSyn);
        closeActiveDropdown();
      });

      itemsContainer.appendChild(item);
    };

    // Render local synonyms immediately
    synonyms.forEach(renderItem);

    // Append dropdown to body and position it (so the positioning is computed before the fetch)
    document.body.appendChild(dropdown);
    positionDropdown(el, dropdown);
    activeDropdown = dropdown;
    document.addEventListener('click', closeActiveDropdown);

    // Add loader element for online suggestions
    const onlineLoader = document.createElement('div');
    onlineLoader.className = 'synonym-dropdown-header';
    onlineLoader.style.fontSize = '10px';
    onlineLoader.style.color = 'var(--text-muted)';
    onlineLoader.style.borderTop = '1px solid var(--border-glass)';
    onlineLoader.style.marginTop = '4px';
    onlineLoader.style.paddingTop = '6px';
    onlineLoader.textContent = 'Searching online thesaurus...';
    dropdown.appendChild(onlineLoader);

    // Fetch from Datamuse API in the background
    const cleanWord = currentVal.replace(/[^a-z]/g, '');
    if (cleanWord && navigator.onLine) {
      try {
        const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(cleanWord)}&max=6`);
        if (response.ok) {
          const data = await response.json();
          const onlineSyns = data.map(item => item.word);
          if (onlineSyns.length > 0) {
            onlineLoader.textContent = 'Online suggestions:';
            onlineSyns.forEach(renderItem);
            // Re-position in case the dropdown height expanded downwards
            positionDropdown(el, dropdown);
          } else {
            onlineLoader.remove();
          }
        } else {
          onlineLoader.remove();
        }
      } catch (err) {
        console.warn('Datamuse API failure', err);
        onlineLoader.remove();
      }
    } else {
      onlineLoader.remove();
    }
  }

  function positionDropdown(el, dropdown) {
    const rect = el.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 6;

    if (left + 160 > window.innerWidth) {
      left = window.innerWidth - 170;
    }
    
    const dropdownHeight = dropdown.offsetHeight;
    if (top + dropdownHeight > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - dropdownHeight - 6;
    }

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
  }

  function closeActiveDropdown() {
    if (activeDropdown) {
      activeDropdown.remove();
      activeDropdown = null;
      document.removeEventListener('click', closeActiveDropdown);
    }
  }

  function updateWordWithSynonym(el, newWord) {
    el.textContent = newWord;
    setStatus('Word updated');

    const plainText = textOutput.textContent;
    updateStats(plainText, true);

    if (state.activeRecord) {
      state.activeRecord.humanized = plainText;
      state.activeRecord.humanizedHtml = textOutput.innerHTML;
      
      const newHumStats = Analyzer.analyze(plainText);
      state.activeRecord.humanizedStats = newHumStats;
      state.activeRecord.score = newHumStats.flowScore;

      // Update in history list
      const histItem = state.history.find(h => h.id === state.activeRecord.id);
      if (histItem) {
        histItem.humanized = plainText;
        histItem.humanizedHtml = textOutput.innerHTML;
        histItem.humanizedStats = newHumStats;
        histItem.score = newHumStats.flowScore;
        saveHistory();
        renderHistoryUI();
      }

      // Update in favorites list
      const favItem = state.favorites.find(f => f.id === state.activeRecord.id);
      if (favItem) {
        favItem.humanized = plainText;
        favItem.humanizedHtml = textOutput.innerHTML;
        favItem.humanizedStats = newHumStats;
        favItem.score = newHumStats.flowScore;
        saveFavorites();
        renderFavoritesUI();
      }

      displayAnalysis(state.activeRecord.originalStats, newHumStats);
    }
  }

  // --- Favorite Toggle ---
  function toggleFavorite() {
    if (!state.activeRecord) return;
    
    const index = state.favorites.findIndex(f => f.id === state.activeRecord.id);
    if (index === -1) {
      // Add to favorites
      state.favorites.unshift(state.activeRecord);
      btnFavorite.classList.add('active');
      btnFavorite.style.color = '#eab308'; // Gold Star
      setStatus('Starred and saved to favorites');
    } else {
      // Remove
      state.favorites.splice(index, 1);
      btnFavorite.classList.remove('active');
      btnFavorite.style.color = 'inherit';
      setStatus('Removed from favorites');
    }
    saveFavorites();
    renderFavoritesUI();
  }

  // --- Input handlers / count indicators ---
  let debounceTimeout;
  textInput.addEventListener('input', () => {
    const val = textInput.value;
    updateStats(val, false);
    
    // Capture state for Undo on pause typing
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      pushUndo(val);
    }, 800);
  });

  // --- Button Action Handlers ---
  if (btnLoadDemo) {
    btnLoadDemo.addEventListener('click', () => {
      pushUndo(textInput.value);
      textInput.value = "The implementation of regular physical exercise is significantly beneficial for overall cardiovascular health and mental well-being. It is important to note that individuals who engage in consistent workouts often experience a reduction in stress levels and an increase in daily productivity. Therefore, establishing a routine is highly recommended.";
      
      selectStrength.value = 'heavy';
      selectFormality.value = 'casual';
      
      updateStats(textInput.value, false);
      triggerHumanize();
      setStatus('Andy Stapleton Demo loaded!');
    });
  }

  // --- Drag and Drop File Handlers ---
  const dropzone = document.querySelector('.editor-card');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'txt' || ext === 'md' || ext === 'json') {
          const reader = new FileReader();
          reader.onload = (event) => {
            let text = event.target.result;
            if (ext === 'json') {
              try {
                const parsed = JSON.parse(text);
                text = parsed.text || parsed.content || JSON.stringify(parsed, null, 2);
              } catch (err) {
                setStatus('Error parsing JSON file', true);
                return;
              }
            }
            pushUndo(textInput.value);
            textInput.value = text;
            updateStats(text, false);
            setStatus(`Loaded file: ${file.name}`);
          };
          reader.readAsText(file);
        } else {
          setStatus('Supported formats: .txt, .md, .json', true);
        }
      }
    });
  }

  // --- Custom CSV Dictionary Uploader ---
  if (btnDictTrigger && dictUpload) {
    btnDictTrigger.addEventListener('click', () => {
      dictUpload.click();
    });

    dictUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvText = event.target.result;
          const lines = csvText.split(/\r?\n/);
          const mapping = {};
          
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              const val = parts[1].trim();
              if (key && val) {
                mapping[key] = val;
              }
            }
          });
          
          state.customDict = mapping;
          localStorage.setItem('ai_humanizer_custom_dict', JSON.stringify(mapping));
          
          const keysCount = Object.keys(mapping).length;
          if (dictStatus) {
            dictStatus.textContent = `${keysCount} active term maps`;
          }
          setStatus(`Successfully loaded ${keysCount} custom term mappings!`);
        };
        reader.readAsText(file);
      }
    });
  }

  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        pushUndo(textInput.value);
        textInput.value = text;
        updateStats(text, false);
        setStatus('Text pasted');
      }
    } catch (err) {
      setStatus('Could not read clipboard', true);
    }
  });

  btnClear.addEventListener('click', clearAll);

  btnCopy.addEventListener('click', () => {
    const out = textOutput.textContent;
    if (out) {
      navigator.clipboard.writeText(out);
      setStatus('Output copied to clipboard');
    }
  });

  btnFavorite.addEventListener('click', toggleFavorite);
  btnUndo.addEventListener('click', handleUndo);
  btnRedo.addEventListener('click', handleRedo);

  btnHumanize.addEventListener('click', triggerHumanize);

  btnClearHistory.addEventListener('click', () => {
    state.history = [];
    saveHistory();
    renderHistoryUI();
    setStatus('History cleared');
  });

  // --- Theme Toggle Action ---
  btnThemeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('ai_humanizer_theme', state.theme);
    
    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.querySelector('use').setAttribute('href', state.theme === 'dark' ? '#icon-sun' : '#icon-moon');
    }

    Dashboard.updateColors(state.theme === 'dark');
    
    // Redraw active charts under new colors
    if (state.activeRecord) {
      displayAnalysis(state.activeRecord.originalStats, state.activeRecord.humanizedStats);
    } else {
      gaugeChart.draw();
      radarChart.draw();
      distributionChart.draw();
    }
    
    setStatus(`Switched to ${state.theme} mode`);
  });

  // --- Export Download Functions ---
  btnExportTxt.addEventListener('click', () => {
    const textStr = textOutput.textContent;
    if (!textStr) return;

    const blob = new Blob([textStr], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `humanized_text_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus('TXT downloaded');
  });

  // PDF Trigger via Print formatting
  btnExportPdf.addEventListener('click', () => {
    window.print();
  });

  // --- Keyboard Shortcuts Listener ---
  window.addEventListener('keydown', (e) => {
    // Ctrl + Enter to Humanize
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      triggerHumanize();
    }
    // Ctrl + Z for Undo (on editor or window)
    if (e.ctrlKey && e.key === 'z') {
      if (document.activeElement === textInput) {
        // let native handle it unless we need our stack (our stack helps capture history)
        // We let native handle text area cursor history, but override standard for safety if needed
      } else {
        e.preventDefault();
        handleUndo();
      }
    }
    // Ctrl + Y for Redo
    if (e.ctrlKey && e.key === 'y') {
      if (document.activeElement !== textInput) {
        e.preventDefault();
        handleRedo();
      }
    }
    // Ctrl + S to export TXT
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      btnExportTxt.click();
    }
  });

  // --- Online / Offline Events ---
  window.addEventListener('online', () => {
    offlineBanner.classList.remove('visible');
    setStatus('Online mode active');
  });

  window.addEventListener('offline', () => {
    offlineBanner.classList.add('visible');
    setStatus('Working offline (heuristic engine active)', true);
  });

  // --- Dynamic Canvas Redraw on Resize ---
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (state.activeRecord) {
        displayAnalysis(state.activeRecord.originalStats, state.activeRecord.humanizedStats);
      } else {
        gaugeChart.draw();
        radarChart.draw();
        distributionChart.draw();
      }
    }, 150);
  });

  // --- Bootloader Setup ---
  loadState();
  renderHistoryUI();
  renderFavoritesUI();
  
  // Set initial status and check offline status
  if (!navigator.onLine) {
    offlineBanner.classList.add('visible');
  }

  // Pre-initialize empty charts
  gaugeChart.draw();
  radarChart.draw();
  distributionChart.draw();

  // Service Worker Registration for caching layout assets
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.warn('Service worker registration failed', err));
  }
});
