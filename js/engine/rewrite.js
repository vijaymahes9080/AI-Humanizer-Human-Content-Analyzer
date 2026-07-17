/**
 * AI Humanizer Pro - Upgraded Rewrite Engine Module
 * Implements client-side linguistic heuristics including clause swapping,
 * active-voice swapping, synonyms, contractions, and conversational injections.
 * Wraps modified words in HTML tags to enable interactive synonym context menus.
 */

const RewriteEngine = (() => {
  // A map of passive voice patterns to active voice
  const PASSIVE_TO_ACTIVE_IRREGULAR = {
    'written': { past: 'wrote', present: 'writes' },
    'done': { past: 'did', present: 'does' },
    'made': { past: 'made', present: 'makes' },
    'taken': { past: 'took', present: 'takes' },
    'given': { past: 'gave', present: 'gives' },
    'built': { past: 'built', present: 'builds' },
    'shown': { past: 'showed', present: 'shows' },
    'chosen': { past: 'chose', present: 'chooses' },
    'seen': { past: 'saw', present: 'sees' },
    'spent': { past: 'spent', present: 'spends' },
    'lost': { past: 'lost', present: 'loses' },
    'won': { past: 'won', present: 'wins' },
    'held': { past: 'held', present: 'holds' },
    'brought': { past: 'brought', present: 'brings' },
    'bought': { past: 'bought', present: 'buys' },
    'found': { past: 'found', present: 'finds' },
    'kept': { past: 'kept', present: 'keeps' },
    'told': { past: 'told', present: 'tells' },
    'heard': { past: 'heard', present: 'hears' },
    'spoken': { stroke: 'spoke', present: 'speaks' },
    'broken': { past: 'broke', present: 'breaks' },
    'eaten': { past: 'ate', present: 'eats' },
    'begun': { past: 'began', present: 'begins' },
    'grown': { past: 'grew', present: 'grows' },
    'thrown': { past: 'threw', present: 'throws' },
    'drawn': { past: 'drew', present: 'draws' },
    'forgotten': { past: 'forgot', present: 'forgets' },
    'stolen': { past: 'stole', present: 'steals' },
    'sent': { past: 'sent', present: 'sends' },
    'met': { past: 'met', present: 'meets' }
  };

  // Stiff transition replacements
  const TRANSITIONS_MAP = {
    'furthermore': ['also', 'what\'s more', 'plus', 'in addition'],
    'moreover': ['additionally', 'plus', 'what\'s more', 'on top of that'],
    'consequently': ['so', 'as a result', 'because of this'],
    'therefore': ['so', 'that\'s why', 'therefore'],
    'subsequently': ['after that', 'then', 'later'],
    'in addition': ['also', 'plus', 'besides'],
    'on the other hand': ['but then', 'however', 'mind you'],
    'in contrast': ['on the flip side', 'however', 'by comparison'],
    'nevertheless': ['still', 'even so', 'however', 'nonetheless'],
    'nonetheless': ['still', 'even so', 'however'],
    'thus': ['so', 'this is how', 'hence']
  };

  // Filler words and redundancies
  const FILLERS_MAP = {
    'in order to': 'to',
    'needless to say': 'obviously',
    'at the present time': 'now',
    'at this point in time': 'currently',
    'due to the fact that': 'because',
    'a large number of': 'many',
    'a small number of': 'a few',
    'for the purpose of': 'for',
    'in the event that': 'if',
    'with the exception of': 'except',
    'in the near future': 'soon',
    'by means of': 'by',
    'utilize': 'use',
    'facilitate': 'help',
    'concerning': 'about',
    'subsequent to': 'after',
    'prior to': 'before',
    'has the ability to': 'can',
    'is able to': 'can',
    'conduct an analysis of': 'analyze',
    'provide assistance to': 'help',
    'make a decision': 'decide',
    'perform an assessment of': 'assess',
    'with regard to': 'about',
    'in spite of the fact that': 'although',
    'serves to show': 'shows',
    'in a timely manner': 'quickly',
    'on a daily basis': 'daily',
    'for the most part': 'mostly'
  };

  // Synonym replacements for formal/robotic words
  const SYNONYMS_MAP = {
    'determine': ['find out', 'figure out', 'decide'],
    'foster': ['encourage', 'build', 'help grow', 'promote'],
    'implement': ['set up', 'start', 'put in place', 'use'],
    'optimize': ['improve', 'boost', 'tweak', 'sharpen'],
    'provide': ['give', 'offer', 'supply'],
    'assist': ['help', 'support'],
    'obtain': ['get', 'acquire', 'grab'],
    'purchase': ['buy'],
    'require': ['need', 'demand'],
    'numerous': ['many', 'plenty of', 'a lot of'],
    'additional': ['more', 'extra'],
    'terminate': ['end', 'stop', 'close'],
    'frequently': ['often', 'regularly'],
    'substantially': ['greatly', 'a lot', 'significantly'],
    'demonstrate': ['show', 'prove', 'point out'],
    'individual': ['person', 'someone'],
    'individuals': ['people', 'folks'],
    'utilization': ['use', 'usage'],
    'methodology': ['method', 'approach', 'way'],
    'subsequent': ['next', 'following'],
    'fundamental': ['basic', 'key', 'core'],
    'execute': ['do', 'run', 'carry out'],
    'encounter': ['meet', 'run into', 'face'],
    'commence': ['start', 'begin'],
    'endeavor': ['try', 'attempt', 'strive'],
    'remuneration': ['pay', 'salary'],
    'disseminate': ['spread', 'share', 'send out'],
    'verify': ['check', 'confirm'],
    'elucidate': ['explain', 'clear up'],
    'expedite': ['speed up', 'rush'],
    'requisite': ['needed', 'required']
  };

  // Creative/Storytelling synonym replacements
  const CREATIVE_SYNONYMS = {
    'determine': ['unravel', 'decipher', 'grasp'],
    'foster': ['kindle', 'nurture', 'cultivate'],
    'implement': ['sculpt', 'weave', 'forge'],
    'optimize': ['elevate', 'transcend', 'polish'],
    'provide': ['bestow', 'impart', 'grant'],
    'assist': ['guide', 'support'],
    'obtain': ['gather', 'glean', 'reap'],
    'purchase': ['acquire'],
    'require': ['crave', 'seek', 'call for'],
    'numerous': ['myriad', 'countless', 'endless'],
    'additional': ['further', 'untapped'],
    'terminate': ['dissolve', 'conclude'],
    'frequently': ['time and again', 'often'],
    'substantially': ['profoundly', 'deeply'],
    'demonstrate': ['mirror', 'paint', 'reveal'],
    'individual': ['soul', 'seeker'],
    'individuals': ['people', 'wanderers'],
    'utilization': ['harnessing', 'mastery'],
    'methodology': ['craft', 'artistry'],
    'fundamental': ['primal', 'core', 'cardinal']
  };

  // Casual contraction replacements
  const CONTRACTIONS = {
    'do not': "don't",
    'cannot': "can't",
    'does not': "doesn't",
    'is not': "isn't",
    'are not': "aren't",
    'was not': "wasn't",
    'were not': "weren't",
    'would not': "wouldn't",
    'should not': "shouldn't",
    'could not': "couldn't",
    'will not': "won't",
    'have not': "haven't",
    'has not': "hasn't",
    'had not': "hadn't",
    'it is': "it's",
    'that is': "that's",
    'there is': "there's",
    'what is': "what's",
    'who is': "who's",
    'here is': "here's",
    'i am': "i'm",
    'you are': "you're",
    'he is': "he's",
    'she is': "she's",
    'we are': "we're",
    'they are': "they're",
    'i will': "i'll",
    'you will': "you'll",
    'he will': "he'll",
    'she will': "she'll",
    'we will': "we'll",
    'they will': "they'll",
    'i have': "i've",
    'you have': "you've",
    'we have': "we've",
    'they have': "they've",
    'i would': "i'd",
    'you would': "you'd",
    'he would': "he'd",
    'she would': "she'd",
    'we would': "we'd",
    'they would': "they'd"
  };

  // Conversational phrase-level block overrides (e.g. Andy Stapleton benchmarks)
  const CONVERSATIONAL_BLOCKS = {
    'The implementation of regular physical exercise': 'Getting a sweat on a few times a week',
    'is significantly beneficial for overall cardiovascular health and mental well-being': 'does wonders for your heart and your mind',
    'It is important to note that individuals who engage in consistent workouts': 'It’s not just about hitting fitness goals—it’s the best way',
    'often experience a reduction in stress levels': 'to blow off steam, clear your head',
    'and an increase in daily productivity': 'and actually get more done during the day',
    'Therefore, establishing a routine is highly recommended': 'Once you find a routine that fits your lifestyle, you\'ll immediately notice the difference'
  };

  const INJECTIONS = ['actually', 'typically', 'essentially', 'generally', 'frankly', 'honestly'];

  /**
   * Protected Entity Extractor.
   * Finds URLs, emails, dates, numbers, references, markdown links, and proper nouns
   * and replaces them with unique tokens.
   */
  class EntityProtector {
    constructor() {
      this.tokens = [];
      this.tokenIndex = 0;
    }

    protect(text) {
      if (!text) return text;
      let protectedText = text;

      // 1. Protect Markdown Links [Text](URL)
      protectedText = protectedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => this.createToken(match));

      // 2. Protect URLs
      protectedText = protectedText.replace(/https?:\/\/[^\s$.?#].[^\s]*/gi, (match) => this.createToken(match));

      // 3. Protect Emails
      protectedText = protectedText.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (match) => this.createToken(match));

      // 4. Protect Citations (e.g. [1], (Smith, 2020))
      protectedText = protectedText.replace(/\[\d+\]/g, (match) => this.createToken(match));
      protectedText = protectedText.replace(/\(\b[A-Z][a-zA-Z]+(?:\s+et\s+al\.)?,\s+\d{4}\)/g, (match) => this.createToken(match));

      // 5. Protect Dates
      protectedText = protectedText.replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, (match) => this.createToken(match));
      protectedText = protectedText.replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, (match) => this.createToken(match));
      protectedText = protectedText.replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}\b/gi, (match) => this.createToken(match));

      // 6. Protect Numbers
      protectedText = protectedText.replace(/\b(?:\$|€|£)?\d+(?:\.\d+)?%?\b/g, (match) => this.createToken(match));

      // 7. Protect Capitalized Proper Nouns in the middle of sentences
      protectedText = protectedText.replace(/(?<![.!?\n]\s+)\b([A-Z][a-zA-Z]+)\b/g, (match, word) => {
        if (word === 'I' || word === 'A' || word === 'The' || word === 'And') return match;
        return this.createToken(match);
      });

      return protectedText;
    }

    createToken(originalText) {
      const tokenId = `__PROT_${this.tokenIndex}__`;
      this.tokens.push({ id: tokenId, val: originalText });
      this.tokenIndex++;
      return tokenId;
    }

    restore(text) {
      if (!text) return text;
      let restoredText = text;
      for (let i = this.tokens.length - 1; i >= 0; i--) {
        const token = this.tokens[i];
        restoredText = restoredText.split(token.id).join(token.val);
      }
      return restoredText;
    }
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Restructures subordinating clause sentences using swapping heuristics.
   * e.g., "Although A, B." -> "B, although A."
   */
  function swapSubordinateClauses(sentence) {
    const regex = /^(Although|Because|Since|While|If|When|As)\s+([^,]+?),\s+([^.!?]+?)([.!?])$/i;
    const match = sentence.trim().match(regex);
    if (match) {
      const conj = match[1].toLowerCase();
      let clause1 = match[2].trim();
      let clause2 = match[3].trim();
      const punctuation = match[4];

      // Casing adjustments
      clause2 = clause2.charAt(0).toUpperCase() + clause2.slice(1);
      if (!clause1.startsWith('__PROT_')) {
        clause1 = clause1.charAt(0).toLowerCase() + clause1.slice(1);
      }

      // Return clause-swapped string wrapping the connector in highlight span
      return `${clause2}, <span class="highlight-change" data-orig="${match[1]} [clause1], [clause2]" data-type="structure" data-syns="${conj}">${conj}</span> ${clause1}${punctuation}`;
    }
    return sentence;
  }

  /**
   * Restructures a single sentence using heuristics.
   * We append (?![^<>]*>) to lookaheads so we don't accidentally replace attributes inside HTML tags.
   */
  function rewriteSentence(sentence, options) {
    let s = sentence.trim();
    if (!s) return '';

    const strength = options.strength || 'balanced';
    const formality = options.formality || 'balanced';

    // 0. Phrase-level Conversational Blocks (Targeting typical AI structures in casual/creative modes)
    if (formality === 'casual' || formality === 'creative') {
      for (const [robotic, humanized] of Object.entries(CONVERSATIONAL_BLOCKS)) {
        const escapedRobotic = robotic.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
        const pattern = new RegExp(`\\b${escapedRobotic}\\b(?![^<>]*>)`, 'gi');
        if (pattern.test(s)) {
          s = s.replace(pattern, (match) => {
            return `<span class="highlight-change" data-orig="${match}" data-type="active-voice" data-syns="${humanized}">${humanized}</span>`;
          });
        }
      }
    }

    // 0b. Custom Dictionary Substitution (User uploaded CSV mappings)
    if (options.customDict && Object.keys(options.customDict).length > 0) {
      for (const [origWord, replacement] of Object.entries(options.customDict)) {
        const escapedOrig = origWord.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
        if (!escapedOrig) continue;
        const pattern = new RegExp(`\\b${escapedOrig}\\b(?![^<>]*>)`, 'gi');
        if (pattern.test(s)) {
          s = s.replace(pattern, (match) => {
            const cleanRep = replacement.trim();
            let casedRep = cleanRep;
            if (match.charAt(0) === match.charAt(0).toUpperCase()) {
              casedRep = casedRep.charAt(0).toUpperCase() + casedRep.slice(1);
            }
            return `<span class="highlight-change" data-orig="${match}" data-type="synonym" data-syns="${cleanRep}">${casedRep}</span>`;
          });
        }
      }
    }

    // 1. Clause Swapping (if starting with subordinating conjunctions)
    if (strength === 'heavy' && Math.random() < 0.65) {
      s = swapSubordinateClauses(s);
    }

    // 2. Conversational Injection (Only Casual/Balanced, at sentence starts)
    if (formality === 'casual' && Math.random() < 0.15 && !s.startsWith('<span')) {
      const injection = pickRandom(INJECTIONS);
      const capInj = injection.charAt(0).toUpperCase() + injection.slice(1);
      s = `<span class="highlight-change" data-orig="" data-type="injection" data-syns="${injection}">${capInj}</span>, ` + s.charAt(0).toLowerCase() + s.slice(1);
    }

    // 3. Stiff Transition replacements at sentence starts
    for (const [trans, replacements] of Object.entries(TRANSITIONS_MAP)) {
      // Avoid replacing inside existing span tags
      const pattern = new RegExp(`^${trans}\\b(,)?(?![^<>]*>)`, 'i');
      if (pattern.test(s)) {
        let rep = '';
        if (formality === 'casual') {
          rep = pickRandom(replacements.filter(r => r !== trans));
        } else if (formality === 'professional') {
          rep = trans; // keep standard
        } else {
          rep = replacements[0];
        }
        
        if (rep !== trans) {
          const capRep = rep.charAt(0).toUpperCase() + rep.slice(1);
          const synsList = [rep, ...replacements.filter(r => r !== rep)].join(',');
          s = s.replace(pattern, `<span class="highlight-change" data-orig="${trans}" data-type="transition" data-syns="${synsList}">${capRep}</span>$1`);
        }
        break; 
      }
    }

    // 4. Passive to Active voice heuristics
    if (strength !== 'light') {
      const beVerbs = '(is|was|are|were)';
      const pastParticipleRegex = '(\\b\\w+ed\\b|' + Object.keys(PASSIVE_TO_ACTIVE_IRREGULAR).join('|') + ')';
      const passivePattern = new RegExp(`\\b${beVerbs}\\s+${pastParticipleRegex}\\s+by\\s+([A-Za-z0-9_\\s]+?)(?=\\b|[.,?!;])(?![^<>]*>)`, 'i');
      
      const match = s.match(passivePattern);
      if (match) {
        const auxVerb = match[1].toLowerCase();
        const pastParticiple = match[2].toLowerCase();
        const agent = match[3].trim();
        const isPast = (auxVerb === 'was' || auxVerb === 'were');
        let activeVerb = '';
        
        if (PASSIVE_TO_ACTIVE_IRREGULAR[pastParticiple]) {
          activeVerb = isPast 
            ? PASSIVE_TO_ACTIVE_IRREGULAR[pastParticiple].past 
            : PASSIVE_TO_ACTIVE_IRREGULAR[pastParticiple].present;
        } else if (pastParticiple.endsWith('ed')) {
          activeVerb = isPast ? pastParticiple : (pastParticiple.slice(0, -2) + 's');
        }

        if (activeVerb) {
          const originalPassivePhrase = match[0];
          const splitIndex = s.indexOf(originalPassivePhrase);
          
          if (splitIndex !== -1) {
            const before = s.slice(0, splitIndex).trim();
            const after = s.slice(splitIndex + originalPassivePhrase.length).trim();
            let targetObj = before;
            let agentCapitalized = agent.charAt(0).toUpperCase() + agent.slice(1);
            
            if (before !== '') {
              let objectPhrase = targetObj;
              if (/^[A-Z]/.test(objectPhrase) && !/^(I|__PROT_)/.test(objectPhrase)) {
                objectPhrase = objectPhrase.charAt(0).toLowerCase() + objectPhrase.slice(1);
              }
              
              // Highlight the active verb and mark its passive origins
              s = `${agentCapitalized} <span class="highlight-change" data-orig="${originalPassivePhrase}" data-type="active-voice" data-syns="${activeVerb}">${activeVerb}</span> ${objectPhrase}${after ? ' ' + after : ''}`;
            }
          }
        }
      }
    }

    // 5. Filler words reduction
    for (const [redundancy, simple] of Object.entries(FILLERS_MAP)) {
      const escapedRedundancy = redundancy.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
      const pattern = new RegExp(`\\b${escapedRedundancy}\\b(?![^<>]*>)`, 'gi');
      if (pattern.test(s)) {
        if (formality === 'professional' && (redundancy === 'conduct an analysis of' || redundancy === 'prior to')) {
          continue;
        }
        s = s.replace(pattern, `<span class="highlight-change" data-orig="${redundancy}" data-type="filler" data-syns="${simple}">${simple}</span>`);
      }
    }

    // 6. Synonym replacements
    if (strength !== 'light') {
      const mergedMap = { ...SYNONYMS_MAP, ...(formality === 'creative' ? CREATIVE_SYNONYMS : {}) };
      for (const [word, synonyms] of Object.entries(mergedMap)) {
        const pattern = new RegExp(`\\b${word}\\b(?![^<>]*>)`, 'gi');
        if (pattern.test(s)) {
          const prob = strength === 'heavy' ? 0.8 : 0.5;
          if (Math.random() < prob) {
            let syn = '';
            if (formality === 'casual') {
              syn = synonyms[0];
            } else if (formality === 'professional') {
              syn = synonyms[synonyms.length - 1] || word;
            } else if (formality === 'creative') {
              // Prefer narrative elements
              syn = synonyms[0];
            } else {
              syn = pickRandom(synonyms);
            }
            
            if (syn !== word) {
              const synList = [syn, ...synonyms.filter(x => x !== syn)].join(',');
              s = s.replace(pattern, (match) => {
                let chosenSyn = syn;
                if (match.charAt(0) === match.charAt(0).toUpperCase()) {
                  chosenSyn = chosenSyn.charAt(0).toUpperCase() + chosenSyn.slice(1);
                }
                return `<span class="highlight-change" data-orig="${match}" data-type="synonym" data-syns="${synList}">${chosenSyn}</span>`;
              });
            }
          }
        }
      }
    }

    // 7. Contractions adjustment
    if (formality === 'casual' || formality === 'balanced') {
      for (const [full, shortened] of Object.entries(CONTRACTIONS)) {
        const pattern = new RegExp(`\\b${full}\\b(?![^<>]*>)`, 'gi');
        if (pattern.test(s)) {
          const prob = formality === 'casual' ? 0.95 : 0.55;
          if (Math.random() < prob) {
            s = s.replace(pattern, (match) => {
              let chosenShortened = shortened;
              if (match.charAt(0) === match.charAt(0).toUpperCase()) {
                chosenShortened = chosenShortened.charAt(0).toUpperCase() + chosenShortened.slice(1);
              }
              return `<span class="highlight-change" data-orig="${match}" data-type="contraction" data-syns="${shortened}">${chosenShortened}</span>`;
            });
          }
        }
      }
    }

    return s;
  }

  /**
   * Split long complex sentences.
   */
  function splitSentences(sentences, strength) {
    if (strength === 'light') return sentences;

    const result = [];
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 22) {
        const splitIndex = sentence.search(/,\s+(and|but|which)\b|;/i);
        if (splitIndex !== -1) {
          const part1 = sentence.slice(0, splitIndex).trim();
          const remainder = sentence.slice(splitIndex).trim();
          const conjMatch = remainder.match(/^,\s+(and|but|which)\b|^;/i);
          
          if (conjMatch) {
            let part2 = remainder.slice(conjMatch[0].length).trim();
            part2 = part2.charAt(0).toUpperCase() + part2.slice(1);
            
            let transitionText = '';
            if (conjMatch[1] && conjMatch[1].toLowerCase() === 'which') {
              part2 = 'This ' + part2.charAt(0).toLowerCase() + part2.slice(1);
              transitionText = 'This';
            } else if (conjMatch[1] && conjMatch[1].toLowerCase() === 'but') {
              part2 = 'However, ' + part2;
              transitionText = 'However';
            } else if (conjMatch[1] && conjMatch[1].toLowerCase() === 'and') {
              part2 = 'Also, ' + part2;
              transitionText = 'Also';
            }

            const ending1 = part1.match(/[.!?]$/) ? '' : '.';
            const ending2 = part2.match(/[.!?]$/) ? '' : '.';

            // Highlight the restructured start of sentence 2
            const wrappedPart2 = transitionText 
              ? `<span class="highlight-change" data-orig=", ${conjMatch[1]}" data-type="split" data-syns="${transitionText}">${transitionText}</span>` + part2.slice(transitionText.length)
              : part2;

            result.push(part1 + ending1);
            result.push(wrappedPart2 + ending2);
            return;
          }
        }
      }
      result.push(sentence);
    });

    return result;
  }

  /**
   * Merge short choppy sentences.
   */
  function mergeSentences(sentences, strength) {
    if (strength === 'light' || sentences.length < 2) return sentences;

    const result = [];
    for (let i = 0; i < sentences.length; i++) {
      const s1 = sentences[i].trim();
      const s2 = sentences[i+1] ? sentences[i+1].trim() : '';

      if (s2) {
        const w1 = s1.split(/\s+/);
        const w2 = s2.split(/\s+/);

        if (w1.length < 7 && w2.length < 7 && !s1.match(/[!?]$/) && !s2.match(/[!?]$/) && !s1.includes('<span') && !s2.includes('<span')) {
          const cleanS1 = s1.replace(/\.$/, '');
          let cleanS2 = s2.charAt(0).toLowerCase() + s2.slice(1);
          const strategy = Math.random();
          
          if (strategy < 0.35) {
            result.push(`${cleanS1}, <span class="highlight-change" data-orig="." data-type="merge" data-syns="and">and</span> ${cleanS2}`);
          } else if (strategy < 0.70) {
            result.push(`${cleanS1}, <span class="highlight-change" data-orig="." data-type="merge" data-syns="so">so</span> ${cleanS2}`);
          } else {
            const trans = pickRandom(['Indeed, ', 'Specifically, ', 'In fact, ']);
            result.push(s1);
            sentences[i+1] = `<span class="highlight-change" data-orig="" data-type="merge" data-syns="${trans.trim()}">${trans}</span>` + cleanS2;
            continue;
          }
          i++; // Skip merged sentence
          continue;
        }
      }
      result.push(s1);
    }
    return result;
  }

  /**
   * Main humanize function.
   * @param {string} text 
   * @param {Object} options 
   * @returns {Object} `{ text: string, html: string }`
   */
  function humanize(text, options = {}) {
    if (!text || !text.trim()) return { text: '', html: '' };

    const protector = new EntityProtector();
    const protectedText = protector.protect(text);

    const paragraphs = protectedText.split('\n');
    const humanizedParagraphs = paragraphs.map(p => {
      const cleanP = p.trim();
      if (!cleanP) return '';

      let sentences = cleanP.split(/(?<=[.!?])\s+(?=[A-Z0-9"']|$)/);

      // Sentence Splitting
      sentences = splitSentences(sentences, options.strength);

      // Sentence Merging
      sentences = mergeSentences(sentences, options.strength);

      // Rewrite sentence parts
      const rewrittenSentences = sentences.map(s => rewriteSentence(s, options));

      return rewrittenSentences.join(' ');
    });

    const processedHtml = humanizedParagraphs.join('\n');
    const finalHtml = protector.restore(processedHtml);
    
    // Strip tags to get clean text for copying/TXT download
    const finalTxt = finalHtml.replace(/<[^>]*>/g, '');

    return {
      text: finalTxt,
      html: finalHtml
    };
  }

  return {
    humanize
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RewriteEngine;
} else {
  window.RewriteEngine = RewriteEngine;
}
