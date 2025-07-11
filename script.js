// Regex Pattern Matcher (Subset) - No built-in RegExp used
// Supported: ., *, +, ?, [abc], ^, $

// Parse the pattern into tokens
function parsePattern(pattern) {
    const tokens = [];
    let i = 0;
    while (i < pattern.length) {
        let char = pattern[i];
        if (char === '.') {
            tokens.push({ type: 'dot' });
            i++;
        } else if (char === '[') {
            let j = i + 1;
            let chars = '';
            while (j < pattern.length && pattern[j] !== ']') {
                chars += pattern[j++];
            }
            if (pattern[j] !== ']') throw new Error('Unclosed [ in pattern');
            tokens.push({ type: 'class', chars });
            i = j + 1;
        } else if (char === '*') {
            if (tokens.length === 0) throw new Error('Nothing to repeat before *');
            tokens[tokens.length - 1] = { ...tokens[tokens.length - 1], repeat: '*' };
            i++;
        } else if (char === '+') {
            if (tokens.length === 0) throw new Error('Nothing to repeat before +');
            tokens[tokens.length - 1] = { ...tokens[tokens.length - 1], repeat: '+' };
            i++;
        } else if (char === '?') {
            if (tokens.length === 0) throw new Error('Nothing to repeat before ?');
            tokens[tokens.length - 1] = { ...tokens[tokens.length - 1], repeat: '?' };
            i++;
        } else if (char === '^') {
            tokens.push({ type: 'start' });
            i++;
        } else if (char === '$') {
            tokens.push({ type: 'end' });
            i++;
        } else {
            tokens.push({ type: 'char', value: char });
            i++;
        }
    }
    return tokens;
}

// Recursive matching function
function matchHere(tokens, tIdx, str, sIdx) {
    // End of pattern
    if (tIdx === tokens.length) return sIdx === str.length;

    const token = tokens[tIdx];

    // Start anchor
    if (token.type === 'start') {
        if (sIdx !== 0) return false;
        return matchHere(tokens, tIdx + 1, str, sIdx);
    }
    // End anchor
    if (token.type === 'end') {
        return sIdx === str.length && tIdx === tokens.length - 1;
    }

    // Handle repeaters: *, +, ?
    if (token.repeat === '*') {
        // Try 0 or more
        let i = sIdx;
        while (i <= str.length && matchSingle(token, str, i)) {
            if (matchHere(tokens, tIdx + 1, str, i + 1)) return true;
            i++;
        }
        // Try zero occurrence
        return matchHere(tokens, tIdx + 1, str, sIdx);
    }
    if (token.repeat === '+') {
        // Must match at least one
        if (!matchSingle(token, str, sIdx)) return false;
        let i = sIdx + 1;
        while (i <= str.length && matchSingle(token, str, i)) {
            if (matchHere(tokens, tIdx + 1, str, i + 1)) return true;
            i++;
        }
        return matchHere(tokens, tIdx + 1, str, i);
    }
    if (token.repeat === '?') {
        // Try one occurrence
        if (matchSingle(token, str, sIdx)) {
            if (matchHere(tokens, tIdx + 1, str, sIdx + 1)) return true;
        }
        // Or zero occurrence
        return matchHere(tokens, tIdx + 1, str, sIdx);
    }

    // Normal match
    if (matchSingle(token, str, sIdx)) {
        return matchHere(tokens, tIdx + 1, str, sIdx + 1);
    }
    return false;
}

function matchSingle(token, str, sIdx) {
    if (sIdx >= str.length) return false;
    if (token.type === 'dot') return true;
    if (token.type === 'char') return str[sIdx] === token.value;
    if (token.type === 'class') return token.chars.includes(str[sIdx]);
    return false;
}

function regexMatch(pattern, str) {
    let tokens;
    try {
        tokens = parsePattern(pattern);
    } catch (e) {
        return { error: e.message };
    }
    // If pattern starts with ^, only match at start
    if (tokens.length > 0 && tokens[0].type === 'start') {
        const matched = matchHere(tokens, 0, str, 0);
        return { matched };
    }
    // Otherwise, try every position
    for (let i = 0; i <= str.length; i++) {
        if (matchHere(tokens, 0, str, i)) return { matched: true };
    }
    return { matched: false };
}

// UI Handling
const form = document.getElementById('regex-form');
const patternInput = document.getElementById('pattern');
const testStringInput = document.getElementById('test-string');
const resultDiv = document.getElementById('result');
const clearBtn = document.getElementById('clear-btn');
const historyList = document.getElementById('history-list');
let history = [];

function updateHistory(pattern, testStr, matched, error) {
    if (!pattern && !testStr) return;
    const entry = {
        pattern,
        testStr,
        result: error ? 'error' : matched ? 'match' : 'no-match',
        error: error || null
    };
    history.unshift(entry);
    if (history.length > 10) history = history.slice(0, 10);
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyList.innerHTML = '<li class="empty">No history yet.</li>';
        return;
    }
    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item ' + item.result;
        li.innerHTML = `<span class="pat">/<b>${item.pattern.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</b>/</span> <span class="str">"${item.testStr.replace(/</g,'&lt;').replace(/>/g,'&gt;')}"</span> <span class="res">${item.error ? '❌ Error' : item.result === 'match' ? '✅ Match' : '❌ No match'}</span>`;
        historyList.appendChild(li);
    });
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    const pattern = patternInput.value.trim();
    const testStr = testStringInput.value;
    if (!pattern) {
        resultDiv.textContent = 'Please enter a pattern.';
        resultDiv.className = '';
        return;
    }
    const { matched, error } = regexMatch(pattern, testStr);
    if (error) {
        resultDiv.textContent = 'Pattern error: ' + error;
        resultDiv.className = 'no-match';
    } else if (matched) {
        resultDiv.textContent = 'Match! 🎉';
        resultDiv.className = 'match';
    } else {
        resultDiv.textContent = 'No match.';
        resultDiv.className = 'no-match';
    }
    updateHistory(pattern, testStr, matched, error);
});

clearBtn.addEventListener('click', function() {
    patternInput.value = '';
    testStringInput.value = '';
    resultDiv.textContent = '';
    resultDiv.className = '';
    patternInput.focus();
    history = [];
    renderHistory();
});

// Initial render
renderHistory(); 