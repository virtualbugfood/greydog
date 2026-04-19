const DEFAULT_SETTINGS = {
  removeAIOverview: true,
  removeAds: true,
  removePeopleAlsoAsk: false,
  removeKnowledgePanel: false,
  removeTopStories: false,
  removeSuggestedSearches: true,
  removeRelatedSearches: false,
  spoofUserAgent: false,
  blockTrackers: false,
  spoofCanvas: false,
};

// ── Clock ─────────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const el = document.getElementById('lcdTime');
  if (el) el.textContent = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
}
updateClock();
setInterval(updateClock, 15000);

// ── Load settings ─────────────────────────────────────────────────────────────
chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
  const merged = Object.assign({}, DEFAULT_SETTINGS, stored);
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const chk = document.getElementById('chk-' + key);
    if (chk) chk.classList.toggle('on', !!merged[key]);
  });
});

chrome.storage.local.get({ totalBloatRemoved: 0, totalSearchesCleaned: 0 }, (data) => {
  document.getElementById('totalCount').textContent = data.totalBloatRemoved;
  document.getElementById('searchCount').textContent = data.totalSearchesCleaned;
});

// ── Toggle handler ────────────────────────────────────────────────────────────
function handleToggle(id, isPrivacy) {
  const chk = document.getElementById('chk-' + id);
  if (!chk) return;
  chk.classList.toggle('on');

  const settings = {};
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const c = document.getElementById('chk-' + key);
    settings[key] = c ? c.classList.contains('on') : DEFAULT_SETTINGS[key];
  });

  chrome.storage.sync.set(settings, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', settings }).catch(() => {});
    });
    if (isPrivacy) {
      chrome.runtime.sendMessage({
        type: 'PRIVACY_SETTINGS_UPDATED',
        settings: { spoofUserAgent: settings.spoofUserAgent, blockTrackers: settings.blockTrackers, spoofCanvas: settings.spoofCanvas }
      }).catch(() => {});
    }
    const flash = document.getElementById('savedFlash');
    flash.classList.add('show');
    setTimeout(() => flash.classList.remove('show'), 900);
  });
}

// ── Wire events ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.toggle-row').forEach((row) => {
    const id = row.dataset.id;
    const isPrivacy = row.dataset.group === 'privacy';
    if (id) row.addEventListener('click', () => handleToggle(id, isPrivacy));
  });

  document.getElementById('reloadBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.reload(tabs[0].id);
    });
    window.close();
  });
});
