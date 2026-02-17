// AI Edit Overlay - dev時のみ注入されるインラインAI編集UI

export {};

declare global {
  interface Window {
    __REDLINE_CONFIG?: {
      apiBase?: string;
      filePath?: string;
      articleSelector?: string;
    };
  }
}

const API_BASE = window.__REDLINE_CONFIG?.apiBase ?? '';
const filePath = window.__REDLINE_CONFIG?.filePath ?? '';

// --- Active panel tracking (suppress HMR while panels open) ---
let activePanels = 0;
let pendingReload = false;

function trackPanelOpen() {
  activePanels++;
}

function trackPanelClose() {
  activePanels--;
  if (activePanels <= 0 && pendingReload) {
    pendingReload = false;
    location.reload();
  }
}

// Exposed for HMR script to call
(window as any).__REDLINE_SHOULD_RELOAD = () => {
  if (activePanels > 0) {
    pendingReload = true;
    return false; // suppress reload
  }
  return true; // allow reload
};

// --- Helper ---
const clearChildren = (el: HTMLElement) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

// --- Tailwind class maps ---
const tw = {
  btn: 'absolute z-[10000] bg-violet-500 text-white border-none rounded-lg px-3.5 py-1.5 text-sm font-semibold cursor-pointer shadow-lg touch-manipulation active:bg-violet-600',
  inline: 'relative my-2 border-2 border-violet-500 rounded-lg bg-gray-800 p-3 z-[9999] shadow-lg',
  textarea: 'w-full min-h-[60px] border border-gray-600 rounded-md p-2 text-sm resize-y box-border font-inherit bg-gray-900 text-gray-100 focus:outline-none focus:border-violet-500',
  actions: 'flex gap-2 mt-2',
  actionBtn: 'flex-1 py-2 border-none rounded-md text-sm font-semibold cursor-pointer touch-manipulation',
  submit: 'bg-violet-500 text-white disabled:bg-violet-700 disabled:cursor-not-allowed',
  cancel: 'bg-gray-700 text-gray-100',
  loading: 'flex items-center gap-2 p-3 text-violet-400 text-sm',
  spinner: 'size-4 border-2 border-gray-700 border-t-violet-400 rounded-full animate-spin',
  diff: 'my-2 border-2 border-violet-500 rounded-lg overflow-hidden bg-gray-800 z-[9999] relative shadow-lg',
  diffHeader: 'bg-gray-900 px-3 py-2 text-xs text-gray-400 border-b border-gray-700',
  diffContent: 'px-3 py-2 text-sm leading-relaxed text-gray-100',
  diffDel: 'bg-red-900 line-through text-red-200 px-1 rounded-sm block',
  diffIns: 'bg-green-900 text-green-200 px-1 rounded-sm block',
  diffSame: 'block',
  diffActions: 'flex gap-2 px-3 py-2 border-t border-gray-700',
  apply: 'bg-green-600 text-white',
  reject: 'bg-gray-700 text-gray-100',
  highlight: 'bg-violet-400/25 text-inherit border-b-2 border-violet-400 rounded-sm',
} as const;

// --- Floating Button ---
let floatingBtn: HTMLButtonElement | null = null;
let currentSelectedText = '';
let currentRange: Range | null = null;

function removeFloatingBtn() {
  if (floatingBtn) {
    floatingBtn.remove();
    floatingBtn = null;
  }
}

function showFloatingBtn(rect: DOMRect) {
  removeFloatingBtn();
  const btn = document.createElement('button');
  btn.className = tw.btn;
  btn.textContent = 'AI Edit';
  const btnWidth = 80; // approximate button width
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - btnWidth - 8);
  btn.style.left = `${Math.max(8, left)}px`;
  btn.style.top = `${rect.bottom + window.scrollY + 6}px`;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentRange && currentSelectedText) {
      showInlineEditor(currentRange, currentSelectedText);
    }
    removeFloatingBtn();
  });
  document.body.appendChild(btn);
  floatingBtn = btn;
}

// --- Selection Handling ---
const articleSelector = window.__REDLINE_CONFIG?.articleSelector ?? '#article-body';
const articleBody = document.querySelector(articleSelector);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

document.addEventListener('selectionchange', () => {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    dismissTimer = setTimeout(() => {
      const sel2 = window.getSelection();
      if (!sel2 || sel2.isCollapsed) {
        removeFloatingBtn();
        currentSelectedText = '';
        currentRange = null;
      }
      dismissTimer = null;
    }, 200);
    return;
  }

  const range = sel.getRangeAt(0);
  if (!articleBody?.contains(range.commonAncestorContainer)) {
    removeFloatingBtn();
    return;
  }

  const text = sel.toString().trim();
  if (text.length < 5) {
    removeFloatingBtn();
    return;
  }

  currentSelectedText = text;
  currentRange = range.cloneRange();
  showFloatingBtn(range.getBoundingClientRect());
});

// --- Highlight ---
function highlightRange(range: Range): HTMLElement[] {
  const marks: HTMLElement[] = [];
  try {
    const mark = document.createElement('mark');
    mark.className = tw.highlight;
    range.surroundContents(mark);
    marks.push(mark);
  } catch {
    const treeWalker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
    );
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = treeWalker.nextNode())) {
      if (range.intersectsNode(node)) {
        textNodes.push(node as Text);
      }
    }
    for (const textNode of textNodes) {
      const mark = document.createElement('mark');
      mark.className = tw.highlight;
      textNode.parentNode?.insertBefore(mark, textNode);
      mark.appendChild(textNode);
      marks.push(mark);
    }
  }
  return marks;
}

function removeHighlights(marks: HTMLElement[]) {
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  }
}

// --- Inline Editor ---
function positionContainer(container: HTMLElement, rect: DOMRect) {
  const gap = 8;
  const margin = 8;
  const top = rect.bottom + window.scrollY + gap;
  const maxWidth = Math.min(480, window.innerWidth - margin * 2);
  const left = Math.min(
    Math.max(margin, rect.left + window.scrollX),
    window.innerWidth - maxWidth - margin,
  );
  container.style.position = 'absolute';
  container.style.top = `${top}px`;
  container.style.left = `${left}px`;
  container.style.width = `${maxWidth}px`;
  container.style.zIndex = '10000';
}

function showInlineEditor(range: Range, selectedText: string) {
  const marks = highlightRange(range);
  const rangeRect = range.getBoundingClientRect();

  const container = document.createElement('div');
  container.className = tw.inline;
  positionContainer(container, rangeRect);

  const textarea = document.createElement('textarea');
  textarea.className = tw.textarea;
  textarea.placeholder = '編集指示を入力...（例: もっと簡潔に）';

  const actions = document.createElement('div');
  actions.className = tw.actions;

  const submitBtn = document.createElement('button');
  submitBtn.className = `${tw.actionBtn} ${tw.submit}`;
  submitBtn.textContent = '送信';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = `${tw.actionBtn} ${tw.cancel}`;
  cancelBtn.textContent = 'Cancel';

  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);

  container.appendChild(textarea);
  container.appendChild(actions);

  document.body.appendChild(container);

  textarea.focus();
  trackPanelOpen();

  const cleanup = () => {
    removeHighlights(marks);
    container.remove();
    trackPanelClose();
  };

  cancelBtn.addEventListener('click', cleanup);
  submitBtn.addEventListener('click', () => {
    const instruction = textarea.value.trim();
    if (!instruction) return;
    submitEdit(container, selectedText, instruction, marks);
  });
}


// --- Submit Edit ---
async function submitEdit(
  container: HTMLElement,
  selectedText: string,
  instruction: string,
  marks: HTMLElement[],
) {
  clearChildren(container);
  container.className = tw.inline;

  const loading = document.createElement('div');
  loading.className = tw.loading;
  const spinner = document.createElement('div');
  spinner.className = tw.spinner;
  const loadingText = document.createElement('span');
  loadingText.textContent = 'Claude Code processing...';
  loading.appendChild(spinner);
  loading.appendChild(loadingText);
  container.appendChild(loading);

  try {
    const res = await fetch(`${API_BASE}/api/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, selectedText, instruction }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(container, data.error || 'Unknown error');
      return;
    }

    showDiff(container, data, marks);
  } catch {
    showError(container, 'API connection failed. Is the server running?', marks);
  }
}

// --- Error display ---
function showError(container: HTMLElement, message: string, marks?: HTMLElement[]) {
  clearChildren(container);
  container.className = tw.inline;

  const errorMsg = document.createElement('div');
  errorMsg.className = 'text-red-500 px-3 py-2 text-sm';
  errorMsg.textContent = message;

  const actions = document.createElement('div');
  actions.className = tw.actions;
  const closeBtn = document.createElement('button');
  closeBtn.className = `${tw.actionBtn} ${tw.reject}`;
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    if (marks) removeHighlights(marks);
    container.remove();
    trackPanelClose();
  });
  actions.appendChild(closeBtn);

  container.appendChild(errorMsg);
  container.appendChild(actions);
}

// --- Diff Display ---
function showDiff(
  container: HTMLElement,
  data: { id: string; original: string; modified: string; startLine: number; endLine: number; filePath: string },
  marks: HTMLElement[],
) {
  clearChildren(container);
  container.className = tw.diff;

  const header = document.createElement('div');
  header.className = tw.diffHeader;
  header.textContent = `L${data.startLine}-${data.endLine}`;

  const content = document.createElement('div');
  content.className = tw.diffContent;
  buildDiffDom(content, data.original, data.modified);

  const actions = document.createElement('div');
  actions.className = tw.diffActions;

  const applyBtn = document.createElement('button');
  applyBtn.className = `${tw.actionBtn} ${tw.apply}`;
  applyBtn.textContent = 'Apply';

  const rejectBtn = document.createElement('button');
  rejectBtn.className = `${tw.actionBtn} ${tw.reject}`;
  rejectBtn.textContent = 'Reject';

  actions.appendChild(applyBtn);
  actions.appendChild(rejectBtn);

  container.appendChild(header);
  container.appendChild(content);
  container.appendChild(actions);

  applyBtn.addEventListener('click', async () => {
    applyBtn.disabled = true;
    applyBtn.textContent = 'Applying...';
    try {
      const res = await fetch(`${API_BASE}/api/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: data.filePath,
          startLine: data.startLine,
          endLine: data.endLine,
          modified: data.modified,
        }),
      });
      if (res.ok) {
        removeHighlights(marks);
        clearChildren(container);
        container.className = tw.inline;
        const successMsg = document.createElement('div');
        successMsg.className = 'p-3 text-green-500 font-semibold text-center';
        successMsg.textContent = 'Applied!';
        container.appendChild(successMsg);
        setTimeout(() => {
          container.remove();
          trackPanelClose();
        }, 2000);
      } else {
        const errData = await res.json().catch(() => ({ error: 'Apply failed' }));
        showError(container, errData.error || 'Apply failed', marks);
      }
    } catch {
      showError(container, 'API connection failed', marks);
    }
  });

  rejectBtn.addEventListener('click', () => {
    removeHighlights(marks);
    container.remove();
    trackPanelClose();
  });
}

// --- DOM-based diff rendering ---
function buildDiffDom(parent: HTMLElement, original: string, modified: string) {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');

  let i = 0;
  let j = 0;

  while (i < origLines.length || j < modLines.length) {
    const origLine = i < origLines.length ? origLines[i] : undefined;
    const modLine = j < modLines.length ? modLines[j] : undefined;

    if (origLine === modLine) {
      const span = document.createElement('span');
      span.className = tw.diffSame;
      span.textContent = origLine!;
      parent.appendChild(span);
      i++;
      j++;
    } else if (origLine !== undefined && modLine !== undefined) {
      const del = document.createElement('span');
      del.className = tw.diffDel;
      del.textContent = origLine;
      parent.appendChild(del);
      const ins = document.createElement('span');
      ins.className = tw.diffIns;
      ins.textContent = modLine;
      parent.appendChild(ins);
      i++;
      j++;
    } else if (origLine !== undefined) {
      const del = document.createElement('span');
      del.className = tw.diffDel;
      del.textContent = origLine;
      parent.appendChild(del);
      i++;
    } else if (modLine !== undefined) {
      const ins = document.createElement('span');
      ins.className = tw.diffIns;
      ins.textContent = modLine;
      parent.appendChild(ins);
      j++;
    }
  }
}

console.log('[AI Edit] Overlay loaded for', filePath);
