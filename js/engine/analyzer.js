/**
 * AI Humanizer Pro - Analyzer Module
 * Provides comprehensive client-side text analysis, metrics calculation, 
 * and linguistic diagnostics.
 */

const Analyzer = (() => {
  // Common stop words to exclude from repeated word analysis
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'in', 'to', 
    'by', 'of', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 
    'before', 'after', 'above', 'below', 'up', 'down', 'from', 'is', 'am', 'are', 
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 
    'did', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'my', 'your', 
    'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'as', 
    'if', 'then', 'than', 'so', 'very', 'just', 'too', 'also', 'any', 'some'
  ]);

  // Transition words and phrases
  const TRANSITION_WORDS = [
    'however', 'therefore', 'furthermore', 'moreover', 'consequently', 'thus', 
    'hence', 'nonetheless', 'nevertheless', 'as a result', 'in addition', 
    'on the other hand', 'in contrast', 'meanwhile', 'subsequently', 'further', 
    'likewise', 'similarly', 'alternatively', 'because', 'although', 'even though', 
    'though', 'whereas', 'while', 'besides', 'additionally', 'specifically', 
    'for example', 'for instance', 'in fact', 'indeed', 'to summarize', 'in conclusion'
  ];

  // Common passive voice markers (auxiliary verb + past participle helper)
  const IRREGULAR_PAST_PARTICIPLES = [
    'done', 'seen', 'gone', 'taken', 'known', 'written', 'given', 'shown', 
    'made', 'built', 'chosen', 'run', 'spent', 'lost', 'won', 'held', 
    'brought', 'bought', 'thought', 'felt', 'found', 'kept', 'told', 
    'heard', 'spoken', 'broken', 'fallen', 'eaten', 'drunk', 'begun', 
    'sung', 'flown', 'grown', 'thrown', 'drawn', 'forgotten', 'hidden', 
    'ridden', 'shaken', 'stolen', 'slain', 'sworn', 'torn', 'worn', 'woven',
    'sent', 'left', 'met', 'set', 'cut', 'put', 'read', 'shut', 'spread'
  ];

  /**
   * Counts syllables in a single word using English rules.
   * @param {string} word 
   * @returns {number}
   */
  function countSyllables(word) {
    word = word.toLowerCase().trim();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  /**
   * Helper to clean and split text into sentences.
   * Keeps abbreviations like "e.g.", "i.e.", "Dr." intact.
   * @param {string} text 
   * @returns {string[]}
   */
  function getSentences(text) {
    if (!text || !text.trim()) return [];
    
    // Replace abbreviations temporarily to prevent wrong splitting
    const tempText = text
      .replace(/e\.g\./gi, 'eg_tmp')
      .replace(/i\.e\./gi, 'ie_tmp')
      .replace(/Dr\./g, 'Dr_tmp')
      .replace(/Mr\./g, 'Mr_tmp')
      .replace(/Mrs\./g, 'Mrs_tmp')
      .replace(/Ms\./g, 'Ms_tmp')
      .replace(/Prof\./g, 'Prof_tmp')
      .replace(/Ph\.D\./g, 'PhD_tmp')
      .replace(/A\.M\./gi, 'AM_tmp')
      .replace(/P\.M\./gi, 'PM_tmp')
      .replace(/U\.S\./gi, 'US_tmp');

    // Split on sentence terminals: . ? ! followed by space or end of string
    const split = tempText.split(/(?<=[.!?])\s+(?=[A-Z0-9"']|$)/);
    
    // Restore abbreviations
    return split.map(s => s
      .replace(/eg_tmp/g, 'e.g.')
      .replace(/ie_tmp/g, 'i.e.')
      .replace(/Dr_tmp/g, 'Dr.')
      .replace(/Mr_tmp/g, 'Mr.')
      .replace(/Mrs_tmp/g, 'Mrs.')
      .replace(/Ms_tmp/g, 'Ms.')
      .replace(/Prof_tmp/g, 'Prof.')
      .replace(/PhD_tmp/g, 'Ph.D.')
      .replace(/AM_tmp/g, 'A.M.')
      .replace(/PM_tmp/g, 'P.M.')
      .replace(/US_tmp/g, 'U.S.')
      .trim()
    ).filter(s => s.length > 0);
  }

  /**
   * Get clean words from text.
   * @param {string} text 
   * @returns {string[]}
   */
  function getWords(text) {
    if (!text) return [];
    // Match word characters, strip punctuation except internal apostrophes/hyphens
    const words = text.match(/\b[A-Za-z0-9'-]+\b/g);
    return words ? words.filter(w => isNaN(w)) : [];
  }

  /**
   * Estimates passive voice count.
   * Checks for forms of "to be" followed by a past participle.
   * @param {string} text 
   * @returns {number}
   */
  function countPassiveVoice(text) {
    if (!text) return 0;
    const beVerbs = '\\b(is|am|are|was|were|be|been|being)\\b';
    const regularPastParticiple = '\\b\\w+ed\\b';
    const irregularPPPattern = '\\b(' + IRREGULAR_PAST_PARTICIPLES.join('|') + ')\\b';
    
    // Pattern: to-be-verb + optional word (e.g. adverb) + past participle
    const pattern = new RegExp(`${beVerbs}(?:\\s+\\w+){0,2}\\s+(${regularPastParticiple}|${irregularPPPattern})`, 'gi');
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Main analysis function.
   * @param {string} text 
   * @returns {Object} Metric results
   */
  function analyze(text) {
    if (!text || !text.trim()) {
      return getEmptyAnalysis();
    }

    const charCount = text.length;
    const charNoSpaces = text.replace(/\s/g, '').length;
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    const paragraphCount = paragraphs.length;
    
    const sentences = getSentences(text);
    const sentenceCount = sentences.length || 1; // avoid division by zero
    
    const words = getWords(text);
    const wordCount = words.length || 1;

    // Calculate Average sentence and word lengths
    const avgSentenceLength = wordCount / sentenceCount;
    const totalWordCharLength = words.reduce((sum, w) => sum + w.length, 0);
    const avgWordLength = totalWordCharLength / wordCount;

    // Syllables calculation (for readability scoring)
    let totalSyllables = 0;
    let complexWordsCount = 0; // words with >= 3 syllables
    
    words.forEach(w => {
      const syl = countSyllables(w);
      totalSyllables += syl;
      if (syl >= 3) {
        complexWordsCount++;
      }
    });

    // Flesch-Kincaid Reading Ease
    // Formula: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
    let fleschEase = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyllables / wordCount);
    fleschEase = Math.max(0, Math.min(100, fleschEase));

    // Gunning Fog Index
    // Formula: 0.4 * ((words / sentences) + 100 * (complex words / words))
    let gunningFog = 0.4 * ((wordCount / sentenceCount) + 100 * (complexWordsCount / wordCount));
    gunningFog = Math.max(0, Math.min(25, gunningFog));

    // Readability Level Mapping
    let readabilityLevel = 'General';
    if (fleschEase >= 90) readabilityLevel = 'Very Easy (5th Grade)';
    else if (fleschEase >= 80) readabilityLevel = 'Easy (6th Grade)';
    else if (fleschEase >= 70) readabilityLevel = 'Fairly Easy (7th Grade)';
    else if (fleschEase >= 60) readabilityLevel = 'Standard (8th-9th Grade)';
    else if (fleschEase >= 50) readabilityLevel = 'Fairly Difficult (10th-12th Grade)';
    else if (fleschEase >= 30) readabilityLevel = 'Difficult (College)';
    else readabilityLevel = 'Very Confusing (Graduate)';

    // Vocabulary Diversity (Type-Token Ratio: TTR)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const vocabDiversity = (uniqueWords.size / wordCount) * 100;

    // Repeated words ranking (excluding stop words)
    const wordFreq = {};
    words.forEach(w => {
      const cleanW = w.toLowerCase();
      if (!STOP_WORDS.has(cleanW) && cleanW.length > 2) {
        wordFreq[cleanW] = (wordFreq[cleanW] || 0) + 1;
      }
    });
    const repeatedWords = Object.entries(wordFreq)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // Repeated Phrases (2-word & 3-word n-grams)
    const phrases2 = {};
    const phrases3 = {};
    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i].toLowerCase();
      const w2 = words[i+1].toLowerCase();
      if (w1.length > 1 && w2.length > 1) {
        const p2 = `${w1} ${w2}`;
        phrases2[p2] = (phrases2[p2] || 0) + 1;
      }
      if (i < words.length - 2) {
        const w3 = words[i+2].toLowerCase();
        if (w3.length > 1) {
          const p3 = `${w1} ${w2} ${w3}`;
          phrases3[p3] = (phrases3[p3] || 0) + 1;
        }
      }
    }

    const repeatedPhrases = [
      ...Object.entries(phrases2).filter(([_, val]) => val > 1),
      ...Object.entries(phrases3).filter(([_, val]) => val > 1)
    ]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([phrase, count]) => ({ phrase, count }));

    // Passive voice estimation
    const passiveCount = countPassiveVoice(text);
    const passiveVoicePct = Math.min(100, (passiveCount / sentenceCount) * 100);

    // Transition density
    let transitionCount = 0;
    const lowerText = text.toLowerCase();
    TRANSITION_WORDS.forEach(tw => {
      const regex = new RegExp(`\\b${tw}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) transitionCount += matches.length;
    });
    const transitionDensity = (transitionCount / sentenceCount) * 100;

    // Sentence variety (Standard deviation of sentence word counts)
    const sentenceLengths = sentences.map(s => getWords(s).length).filter(l => l > 0);
    let sentenceVariety = 0;
    if (sentenceLengths.length > 1) {
      const avgLen = sentenceLengths.reduce((s, l) => s + l, 0) / sentenceLengths.length;
      const variance = sentenceLengths.reduce((s, l) => s + Math.pow(l - avgLen, 2), 0) / sentenceLengths.length;
      sentenceVariety = Math.sqrt(variance);
    }
    // Scale variety to a score out of 100 (a variance standard deviation of ~8-12 is highly dynamic and natural)
    const varietyScore = Math.min(100, (sentenceVariety / 10) * 100);

    // Formality estimation
    // Formal indicators: passive voice, complex words, transition density, lack of contractions
    const contractionMatches = lowerText.match(/\b\w+['’](s|d|t|re|ve|ll|m)\b/g);
    const contractionCount = contractionMatches ? contractionMatches.length : 0;
    const contractionRate = (contractionCount / wordCount) * 100;
    
    // Higher score = more formal
    let formality = 50 + (passiveVoicePct * 0.2) + (complexWordsCount / wordCount * 100 * 0.4) + (transitionDensity * 0.1) - (contractionRate * 3.0);
    formality = Math.max(0, Math.min(100, formality));

    // Writing Style Classification
    let writingStyle = 'Balanced';
    if (formality > 70) {
      writingStyle = transitionDensity > 30 ? 'Academic / Scholarly' : 'Formal / Business';
    } else if (formality < 35) {
      writingStyle = 'Conversational / Informal';
    } else {
      writingStyle = varietyScore > 65 ? 'Creative / Narrative' : 'Professional Standard';
    }

    // Grammar consistency heuristic
    // Check capitalization of sentences, mismatched brackets, double spaces
    let grammarIssues = 0;
    sentences.forEach(s => {
      if (s.length > 0 && s[0] !== s[0].toUpperCase() && !/^[0-9"'(]/.test(s)) {
        grammarIssues++; // Sentence doesn't start with capital letter
      }
    });
    const doubleSpaces = (text.match(/ {2,}/g) || []).length;
    grammarIssues += doubleSpaces;
    const quotesMatch = (text.match(/"/g) || []).length % 2 !== 0 ? 1 : 0;
    grammarIssues += quotesMatch;
    
    const grammarScore = Math.max(0, 100 - (grammarIssues * 5));

    // Lexical Richness (Type-Token Ratio & complex vocabulary percentage)
    const lexicalRichness = Math.max(0, Math.min(100, (vocabDiversity * 0.7) + (complexWordsCount / wordCount * 100 * 0.3)));

    // Coherence Estimate
    // Connective words density + sentence length flow consistency
    const coherenceEstimate = Math.max(0, Math.min(100, 40 + (transitionDensity * 0.8) + (100 - Math.abs(avgSentenceLength - 16) * 3)));

    // Natural Flow Estimate
    // Flow is highest with high sentence variety, optimal sentence lengths (12-18 words), good transition density, and low passive voice
    let flowScore = 50;
    flowScore += (varietyScore * 0.3); // variety helps rhythm
    flowScore -= Math.abs(avgSentenceLength - 15) * 1.5; // penalize too short or too long sentences
    flowScore += Math.min(25, transitionDensity * 0.5); // transitions help flow
    flowScore -= (passiveVoicePct * 0.2); // passive voice disrupts flow
    flowScore = Math.max(0, Math.min(100, flowScore));

    // Perplexity estimation (predictability index)
    // Human text has high perplexity (unpredictable), AI has low perplexity (rigidly structured)
    let estimatedPerplexity = 35;
    estimatedPerplexity += (sentenceVariety * 2.5); // Sentence length variation makes rhythm unpredictable
    estimatedPerplexity += (vocabDiversity * 0.4);  // Lexical diversity increases unpredictability
    estimatedPerplexity += (complexWordsCount / wordCount * 100 * 0.2); // Complex vocabulary increases perplexity
    estimatedPerplexity -= Math.max(0, (transitionDensity - 12) * 0.7); // Formulaic transitions decrease perplexity
    estimatedPerplexity -= (repeatedPhrases.length * 1.5); // Repeated patterns decrease perplexity
    const perplexityScore = Math.max(12, Math.min(98, estimatedPerplexity));

    return {
      charCount,
      charNoSpaces,
      wordCount,
      sentenceCount,
      paragraphCount,
      avgSentenceLength,
      avgWordLength,
      vocabDiversity,
      repeatedWords,
      repeatedPhrases,
      readabilityScore: fleschEase, // 0 - 100
      readabilityLevel,
      gunningFog,
      passiveVoicePct,
      transitionDensity,
      grammarScore,
      sentenceVariety: varietyScore,
      flowScore,
      writingStyle,
      formalityScore: formality,
      lexicalRichness,
      coherenceEstimate,
      burstiness: sentenceVariety, // raw standard deviation
      perplexityScore,
      // Helper data for charts
      sentenceLengths
    };
  }

  /**
   * Helper to return empty state analysis structure.
   */
  function getEmptyAnalysis() {
    return {
      charCount: 0,
      charNoSpaces: 0,
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      avgSentenceLength: 0,
      avgWordLength: 0,
      vocabDiversity: 0,
      repeatedWords: [],
      repeatedPhrases: [],
      readabilityScore: 0,
      readabilityLevel: 'N/A',
      gunningFog: 0,
      passiveVoicePct: 0,
      transitionDensity: 0,
      grammarScore: 0,
      sentenceVariety: 0,
      flowScore: 0,
      writingStyle: 'N/A',
      formalityScore: 0,
      lexicalRichness: 0,
      coherenceEstimate: 0,
      burstiness: 0,
      perplexityScore: 0,
      sentenceLengths: []
    };
  }

  return {
    analyze,
    getSentences,
    getWords,
    countSyllables
  };
})();

// Export if in module context, or append to global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Analyzer;
} else {
  window.Analyzer = Analyzer;
}
