// Background Service Worker

const USER_AGENTS = [
  // Windows Chrome variants
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  // Mac Chrome/Firefox/Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
  // Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

let currentUA = null;
let uaSpoofingEnabled = false;
let blockTrackersEnabled = false;

// Pick a random UA at startup
function pickRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Load settings on startup
chrome.storage.sync.get({
  spoofUserAgent: false,
  blockTrackers: false,
}, (settings) => {
  uaSpoofingEnabled = settings.spoofUserAgent;
  blockTrackersEnabled = settings.blockTrackers;
  if (uaSpoofingEnabled) {
    currentUA = pickRandomUA();
    registerUARule();
  }
  updateTrackerRules(blockTrackersEnabled);
});

// Listen for settings changes from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PRIVACY_SETTINGS_UPDATED') {
    uaSpoofingEnabled = msg.settings.spoofUserAgent;
    blockTrackersEnabled = msg.settings.blockTrackers;

    if (uaSpoofingEnabled) {
      currentUA = pickRandomUA();
      registerUARule();
    } else {
      removeUARule();
    }
    updateTrackerRules(blockTrackersEnabled);
  }
});

// ── Spoofing ──────────────
const UA_RULE_ID = 100;

function registerUARule() {
  if (!currentUA) return;
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [UA_RULE_ID],
    addRules: [{
      id: UA_RULE_ID,
      priority: 2,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'User-Agent', operation: 'set', value: currentUA },
          { header: 'DNT', operation: 'set', value: '1' },
          { header: 'Sec-GPC', operation: 'set', value: '1' },
        ]
      },
      condition: {
        urlFilter: '||google.com^',
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script']
      }
    }]
  });
}

function removeUARule() {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [UA_RULE_ID]
  });
}

// ── Toggle static tracker rules on/off ───────────────────────────────────────
function updateTrackerRules(enabled) {
  chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? ['tracker_rules'] : [],
    disableRulesetIds: enabled ? [] : ['tracker_rules'],
  });
}
