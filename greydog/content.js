// Content Script with bloat counter

const DEFAULT_SETTINGS = {
  removeAIOverview: true,
  removeAds: true,
  removePeopleAlsoAsk: false,
  removeKnowledgePanel: false,
  removeTopStories: false,
  removeSuggestedSearches: true,
  removeRelatedSearches: false,
};

let settings = { ...DEFAULT_SETTINGS };
let sessionCount = 0;

const BLOAT_SELECTORS = {
  aiOverview: [
    ".YzccNd", ".M8OgIe", ".vx3okc", ".jNVrwb",
    ".cLjAic", ".ezO2md",
    "[jscontroller='MF9ugh']",
    "div[id^='aiob']",
    ".Wt5Tfe.UqcIvb",
    "div:has(> [aria-label='AI Overview'])",
    "div:has(> [aria-label='Generative AI'])",
    "[data-chunk-index]",
    ".Gx5Zad.xpd.EtOod.pkphOe",
  ],
  ads: [
    "#tads", "#tadsb", "#bottomads",
    ".commercial-unit-desktop-top",
    ".commercial-unit-desktop-rhs",
    ".ads-ad", ".uEierd", ".pla-unit",
    ".cu-container", "[data-text-ad]",
    ".v5yQqb", ".mnr-c.pla-unit",
    "div[aria-label='Ads']", "div[aria-label='Ad']",
    ".rHBa4c",
  ],
  peopleAlsoAsk: [
    ".related-question-pair", ".UJB5N",
    ".ifM9O", "[jscontroller='Sh2T3b']",
  ],
  knowledgePanel: [
    "#rhs", ".kp-wholepage", ".knavi", "[id='rhs_block']",
  ],
  topStories: [
    ".JJZKK", ".So9e7d", "[jscontroller='iWOeTd']",
    ".ftSUBd", "g-section-with-header", ".eejeod", ".WJvYod",
  ],
  suggestedSearches: [
    ".kVEXCb", ".HwtpBd", ".y6Uyqe", ".nYOa3", ".AB4Wff",
  ],
  relatedSearches: [
    "#brs", ".card-section[id='brs']", ".AJdHBb",
  ],
};

function removeElements(selectors) {
  let count = 0;
  selectors.forEach((sel) => {
    try {
      document.querySelectorAll(sel).forEach((el) => {
        el.remove();
        count++;
      });
    } catch (e) {}
  });
  return count;
}

function removeAIOverviewDeep() {
  let count = 0;
  document.querySelectorAll("h2, h3, [role='heading']").forEach((heading) => {
    const text = heading.textContent.trim().toLowerCase();
    if (text === "ai overview" || text.startsWith("ai overview") || text.includes("generative ai")) {
      let parent = heading.parentElement;
      for (let i = 0; i < 6; i++) {
        if (!parent) break;
        if (parent.id === "search" || parent.id === "main" || parent.tagName === "BODY") break;
        parent.remove();
        count++;
        break;
      }
    }
  });
  document.querySelectorAll("[aria-label]").forEach((el) => {
    const label = el.getAttribute("aria-label") || "";
    if (label.toLowerCase().includes("ai overview") || label.toLowerCase().includes("generative ai")) {
      el.remove();
      count++;
    }
  });
  return count;
}

function removeAdsByLabel() {
  let count = 0;
  document.querySelectorAll("span, div").forEach((el) => {
    const text = el.textContent.trim();
    if (text === "Sponsored" || text === "Ad" || text === "Ads") {
      let parent = el.parentElement;
      for (let i = 0; i < 8; i++) {
        if (!parent || parent.id === "search" || parent.tagName === "BODY") break;
        const style = window.getComputedStyle(parent);
        if (style.display === "block" || style.display === "flex" || (parent.tagName === "DIV" && i > 2)) {
          parent.remove();
          count++;
          break;
        }
        parent = parent.parentElement;
      }
    }
  });
  return count;
}

function cleanPage() {
  let removed = 0;
  if (settings.removeAIOverview) {
    removed += removeElements(BLOAT_SELECTORS.aiOverview);
    removed += removeAIOverviewDeep();
  }
  if (settings.removeAds) {
    removed += removeElements(BLOAT_SELECTORS.ads);
    removed += removeAdsByLabel();
  }
  if (settings.removePeopleAlsoAsk) removed += removeElements(BLOAT_SELECTORS.peopleAlsoAsk);
  if (settings.removeKnowledgePanel) removed += removeElements(BLOAT_SELECTORS.knowledgePanel);
  if (settings.removeTopStories) removed += removeElements(BLOAT_SELECTORS.topStories);
  if (settings.removeSuggestedSearches) removed += removeElements(BLOAT_SELECTORS.suggestedSearches);
  if (settings.removeRelatedSearches) removed += removeElements(BLOAT_SELECTORS.relatedSearches);

  if (removed > 0) {
    sessionCount += removed;
    // Increment persistent total counter
    chrome.storage.local.get({ totalBloatRemoved: 0, totalSearchesCleaned: 0 }, (data) => {
      chrome.storage.local.set({
        totalBloatRemoved: data.totalBloatRemoved + removed,
      });
    });
  }
}

// Track cleaned searches
let pageTracked = false;
function trackSearch() {
  if (!pageTracked) {
    pageTracked = true;
    chrome.storage.local.get({ totalSearchesCleaned: 0 }, (data) => {
      chrome.storage.local.set({ totalSearchesCleaned: data.totalSearchesCleaned + 1 });
    });
  }
}

chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
  settings = { ...DEFAULT_SETTINGS, ...stored };
  cleanPage();
  trackSearch();
});

const observer = new MutationObserver(() => {
  clearTimeout(observer._timer);
  observer._timer = setTimeout(cleanPage, 120);
});
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("load", () => {
  setTimeout(cleanPage, 300);
  setTimeout(cleanPage, 800);
  setTimeout(cleanPage, 1500);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SETTINGS_UPDATED") {
    settings = msg.settings;
    cleanPage();
  }
});

// ── PRIVACY NOISE FEATURES ────────────────────────────────────────────────────

const PRIVACY_DEFAULTS = {
  spoofUserAgent: false,
  blockTrackers: false,
  spoofCanvas: false,
};

chrome.storage.sync.get(PRIVACY_DEFAULTS, (privacySettings) => {
  if (privacySettings.spoofCanvas) enableCanvasSpoof();
  if (privacySettings.blockTrackers) blockBeacons();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PRIVACY_SETTINGS_UPDATED') {
    if (msg.settings.spoofCanvas) enableCanvasSpoof();
    if (msg.settings.blockTrackers) blockBeacons();
  }
});

// ── Canvas fingerprint spoofing ───────────────────────────────────────────────
function enableCanvasSpoof() {
  const script = document.createElement('script');
  script.textContent = `(function() {
    const NOISE = () => (Math.random() * 0.02) - 0.01; // ±1% invisible noise

    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i]     = Math.min(255, Math.max(0, imageData.data[i]     + NOISE() * 255));
          imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + NOISE() * 255));
          imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + NOISE() * 255));
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return origToDataURL.call(this, type, quality);
    };

    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
      const imageData = origGetImageData.call(this, sx, sy, sw, sh);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i]     = Math.min(255, Math.max(0, imageData.data[i]     + (Math.random() > 0.5 ? 1 : -1)));
        imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + (Math.random() > 0.5 ? 1 : -1)));
        imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + (Math.random() > 0.5 ? 1 : -1)));
      }
      return imageData;
    };
  })();`;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// ── Block tracking beacons / sendBeacon ──────────────────────────────────────
function blockBeacons() {
  const script = document.createElement('script');
  script.textContent = `(function() {
    const origSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data) {
      if (/google|doubleclick|gstatic|googleapis/.test(url)) {
        return true; // Pretend it succeeded, send nothing
      }
      return origSendBeacon(url, data);
    };

    // Also suppress ping attributes on links
    document.addEventListener('click', function(e) {
      const a = e.target.closest('a[ping]');
      if (a) a.removeAttribute('ping');
    }, true);
  })();`;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}
