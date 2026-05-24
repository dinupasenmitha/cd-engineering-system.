/* =========================================================
   CD Engineering — Calculator Module (Enhanced)
   ========================================================= */
window.APP = window.APP || {};

APP.Calculator = (function () {
  let expression = '';
  let history = [];
  const MAX_HISTORY = 8;

  function input(val) {
    const display = document.getElementById('calc-display');
    const exprDisplay = document.getElementById('calc-expression');
    if (!display) return;

    if (val === 'C') {
      expression = '';
      if (exprDisplay) exprDisplay.textContent = '';
    } else if (val === 'BS') {
      // Backspace
      if (expression === 'Error') expression = '';
      else expression = expression.slice(0, -1);
    } else if (val === '=') {
      try {
        if (expression) {
          const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
          const result = new Function('return ' + sanitized)();
          const rounded = String(Math.round(result * 100) / 100);
          // Save to history
          history.unshift({ expr: expression, result: rounded });
          if (history.length > MAX_HISTORY) history.pop();
          if (exprDisplay) exprDisplay.textContent = expression + ' =';
          expression = rounded;
          renderHistory();
        }
      } catch (e) {
        expression = 'Error';
        if (exprDisplay) exprDisplay.textContent = 'Invalid expression';
      }
    } else if (val === '%') {
      try {
        if (expression) {
          const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
          const result = new Function('return ' + sanitized)();
          expression = String(Math.round(result) / 100);
        }
      } catch (e) {
        expression = 'Error';
      }
    } else {
      if (expression === 'Error') expression = '';
      expression += val;
    }

    display.textContent = expression || '0';
  }

  function copyResult() {
    const display = document.getElementById('calc-display');
    if (!display || !display.textContent || display.textContent === '0') return;
    navigator.clipboard.writeText(display.textContent).then(() => {
      APP.toast('Copied to clipboard', 'info');
    }).catch(() => {
      // Fallback
      const t = document.createElement('textarea');
      t.value = display.textContent;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      APP.toast('Copied to clipboard', 'info');
    });
  }

  function clearHistory() {
    history = [];
    renderHistory();
  }

  function renderHistory() {
    const el = document.getElementById('calc-history');
    if (!el) return;
    if (history.length === 0) {
      el.innerHTML = '<div style="text-align:center;color:var(--gray-400);font-size:12px;padding:12px">No history yet</div>';
      return;
    }
    el.innerHTML = history.map((h, i) => `
      <div class="calc-history-item" onclick="APP.Calculator.loadFromHistory(${i})" title="Click to load">
        <span class="calc-history-expr">${h.expr}</span>
        <span class="calc-history-result">= ${h.result}</span>
      </div>
    `).join('');
  }

  function loadFromHistory(index) {
    if (history[index]) {
      expression = history[index].result;
      const display = document.getElementById('calc-display');
      const exprDisplay = document.getElementById('calc-expression');
      if (display) display.textContent = expression;
      if (exprDisplay) exprDisplay.textContent = history[index].expr + ' =';
    }
  }

  function toggle() {
    const widget = document.getElementById('calc-widget');
    if (widget) {
      widget.classList.toggle('open');
      if (widget.classList.contains('open')) renderHistory();
    }
  }

  // ── Keyboard Support ─────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    const widget = document.getElementById('calc-widget');
    if (!widget || !widget.classList.contains('open')) return;

    // Don't interfere if user is typing in a form field
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      // Exception: allow Escape to close the calculator
      if (e.key === 'Escape') toggle();
      return;
    }

    const keyMap = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '+': '+', '-': '-', '*': '*', '/': '/',
      '.': '.', '%': '%',
      'Enter': '=', '=': '=',
      'Backspace': 'BS',
      'Escape': 'C', 'c': 'C', 'C': 'C'
    };

    if (keyMap[e.key]) {
      e.preventDefault();
      input(keyMap[e.key]);
      
      // Visual feedback: find the button and add a temporary active class
      const btn = Array.from(widget.querySelectorAll('button')).find(b => {
        const val = b.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        return val === keyMap[e.key];
      });
      if (btn) {
        btn.style.transform = 'scale(0.95)';
        btn.style.filter = 'brightness(1.2)';
        setTimeout(() => {
          btn.style.transform = '';
          btn.style.filter = '';
        }, 100);
      }
    }
  });

  return { input, copyResult, clearHistory, renderHistory, loadFromHistory, toggle };
})();
