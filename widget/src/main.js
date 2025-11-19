import './style.css';

const DEFAULT_QUERY_PARAMS = ['walaArticleId', 'articleId', 'id'];

function readArticleId() {
  const url = new URL(window.location.href);
  for (const key of DEFAULT_QUERY_PARAMS) {
    const val = url.searchParams.get(key);
    if (val) return val;
  }

  const dataAttr = document.querySelector('[data-article-id]');
  if (dataAttr?.dataset?.articleId) return dataAttr.dataset.articleId;

  const meta = document.querySelector('meta[name="wala-article-id"]');
  if (meta?.content) return meta.content;

  return null;
}

function createContainer() {
  const existing = document.querySelector('#wala-widget');
  if (existing) return existing;
  const container = document.createElement('aside');
  container.id = 'wala-widget';
  container.innerHTML = `
    <div class="wala-header">
      <strong>World Anvil Assistant</strong>
    </div>
    <div class="wala-body">
      <div class="wala-row">
        <label>Article ID</label>
        <input id="wala-article-id" type="text" placeholder="auto-detected" />
      </div>
      <div class="wala-row">
        <label>Auth token</label>
        <input id="wala-auth" type="password" placeholder="Paste your token (never stored on server)" />
      </div>
      <div class="wala-row">
        <label>Prompt</label>
        <textarea id="wala-prompt" rows="3" placeholder="Ask about this article or your world"></textarea>
      </div>
      <div class="wala-actions">
        <button id="wala-submit">Ask assistant</button>
      </div>
      <div id="wala-status" class="wala-status"></div>
      <div id="wala-response" class="wala-response"></div>
    </div>
  `;
  document.body.appendChild(container);
  return container;
}

async function fetchPublicConfig(apiBase) {
  try {
    const res = await fetch(`${apiBase}/public-config`);
    if (!res.ok) return null;
    const body = await res.json();
    return body?.config || null;
  } catch (err) {
    return null;
  }
}

function renderResult(statusEl, responseEl, payload) {
  if (!payload?.ok) {
    statusEl.textContent = payload?.error || 'Assistant request failed';
    responseEl.innerHTML = '';
    return;
  }

  const { result } = payload;
  statusEl.textContent = `Generated at ${result.generatedAt}`;
  const refs = (result.aiResponse?.references || [])
    .map((ref) => `<li><a href="${ref.url}" target="_blank" rel="noreferrer">${ref.title || ref.id}</a></li>`) 
    .join('');
  responseEl.innerHTML = `
    <div class="wala-section">
      <strong>${result.aiResponse?.summary || 'No summary returned'}</strong>
    </div>
    <div class="wala-section">
      <div class="wala-label">References</div>
      <ul>${refs || '<li>No references returned</li>'}</ul>
    </div>
  `;
}

function hydrateInputs(container, detectedArticleId) {
  const articleInput = container.querySelector('#wala-article-id');
  const authInput = container.querySelector('#wala-auth');

  if (detectedArticleId) {
    articleInput.value = detectedArticleId;
  }

  const savedToken = window.localStorage.getItem('wala:authToken');
  if (savedToken) {
    authInput.value = savedToken;
  }
}

async function bootstrap() {
  const container = createContainer();
  const statusEl = container.querySelector('#wala-status');
  const responseEl = container.querySelector('#wala-response');
  const articleInput = container.querySelector('#wala-article-id');
  const promptInput = container.querySelector('#wala-prompt');
  const authInput = container.querySelector('#wala-auth');
  const submitBtn = container.querySelector('#wala-submit');

  const runtimeConfig = window.WALA_WIDGET_CONFIG || {};
  const apiBase = runtimeConfig.apiBase || '/api/wala';
  const detectedArticleId = runtimeConfig.articleId || readArticleId();

  hydrateInputs(container, detectedArticleId);
  const publicConfig = await fetchPublicConfig(apiBase);
  if (publicConfig?.worldId) {
    statusEl.textContent = `Connected to world ${publicConfig.worldId}`;
  }

  submitBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    const articleId = articleInput.value.trim() || detectedArticleId;
    const authToken = authInput.value.trim();

    if (!prompt) {
      statusEl.textContent = 'Please provide a prompt first.';
      return;
    }

    statusEl.textContent = 'Contacting assistant...';
    responseEl.innerHTML = '';

    if (authToken) {
      window.localStorage.setItem('wala:authToken', authToken);
    }

    try {
      const res = await fetch(`${apiBase}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'X-Wala-Auth-Token': authToken } : {}),
        },
        body: JSON.stringify({ prompt, articleId }),
      });

      const payload = await res.json();
      renderResult(statusEl, responseEl, payload);
    } catch (err) {
      statusEl.textContent = err.message || 'Request failed';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
