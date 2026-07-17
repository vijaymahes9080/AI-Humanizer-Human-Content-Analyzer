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

  // --- Core State ---
  let state = {
    theme: 'dark',
    history: [],
    favorites: [],
    undoStack: [],
    redoStack: [],
    activeRecord: null
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

  // --- Humanize Core Trigger ---
  function triggerHumanize() {
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

    setStatus('Processing text heuristics...');
    
    // Save current input to Undo stack before rewriting
    pushUndo(inputVal);

    const options = {
      strength: selectStrength.value,
      formality: selectFormality.value
    };

    // Calculate metrics of original stiff text
    const origStats = Analyzer.analyze(inputVal);

    // Run custom rule-based rewrite pipeline
    const rewritten = RewriteEngine.humanize(inputVal, options);
    
    // Calculate metrics of rewritten human-like text
    const humStats = Analyzer.analyze(rewritten.text);

    // Apply HTML typing/fade emulation
    animateTextDisplay(rewritten.html);

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

  function showSynonymDropdown(el) {
    closeActiveDropdown();

    const orig = el.getAttribute('data-orig');
    const type = el.getAttribute('data-type');
    const synsAttr = el.getAttribute('data-syns');
    if (!synsAttr) return;

    const synonyms = synsAttr.split(',');
    const currentVal = el.textContent.trim().toLowerCase();

    // Create dropdown menu element
    const dropdown = document.createElement('div');
    dropdown.className = 'synonym-dropdown';

    // Header
    const header = document.createElement('div');
    header.className = 'synonym-dropdown-header';
    header.textContent = orig ? `Original: ${orig}` : 'Alternatives';
    dropdown.appendChild(header);

    // List of alternatives
    synonyms.forEach(syn => {
      const cleanSyn = syn.trim();
      if (!cleanSyn) return;

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

      dropdown.appendChild(item);
    });

    document.body.appendChild(dropdown);
    const rect = el.getBoundingClientRect();
    
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 6;

    if (left + 160 > window.innerWidth) {
      left = window.innerWidth - 170;
    }
    
    // Add dropdown to document body, then inspect its height for accurate placement
    const dropdownHeight = dropdown.offsetHeight;
    if (top + dropdownHeight > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - dropdownHeight - 6;
    }

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
    
    activeDropdown = dropdown;

    document.addEventListener('click', closeActiveDropdown);
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
