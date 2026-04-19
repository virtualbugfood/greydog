# GREYDOG 🐕
**Search Decontaminator** -- a Chrome extension that strips the junk out of Google Search.

---

## What it does

Google Search has gotten bad. Every search is now a wall of AI summaries, sponsored listings, suggested chips, news carousels, and silent telemetry pings going back to Google's ad servers. GREYDOG removes all of it.

**Always on:**
+ AI Overview -- the big AI answer block at the top
+ Sponsored ads -- paid listings and shopping units
+ Search chips -- the filter/suggestion bars pushed above results

**Optional:**
+ People Also Ask boxes
+ Top Stories carousel
+ Knowledge Panel (right sidebar)
+ Related Searches footer

**Ghost Protocol (privacy options):**
+ Scramble Browser ID -- sends a randomized browser/OS signature each session instead of your real one
+ Kill Beacons -- hard-blocks Google Analytics, DoubleClick, and the silent telemetry pings Google fires in the background
+ Scramble Fingerprint -- adds invisible pixel noise to canvas rendering so sites can't fingerprint your device

---

## How it works

**Removing search bloat**

> When you load a Google Search page, GREYDOG runs before the page finishes rendering. It has a list of CSS selectors that match Google's AI Overview containers, ad units, and other junk. It finds those elements and removes them from the DOM immediately. It also injects a small CSS file that hides the known bad elements before they even paint, so there's no flash of content.
> Google dynamically injects some of this stuff after the initial load, so there's also a MutationObserver watching the page. Any time Google adds new nodes, GREYDOG checks them and removes anything that matches. This is how it catches the AI Overview when Google loads it in late via JavaScript.

**Blocking trackers**

> Chrome extensions can define network rules using the `declarativeNetRequest` API. GREYDOG ships with a list of rules that block outgoing requests to Google Analytics, DoubleClick, AdService, and Google's internal `gen_204` telemetry endpoint. These are blocked at the network level; the requests never leave your browser.
> On top of that, the content script overrides `navigator.sendBeacon()` in the page context. Google uses sendBeacon to fire analytics pings silently when you click links. The override intercepts those calls and drops them if they're going to a Google tracking domain.

**Scrambling your browser ID**

> Your browser sends a `User-Agent` header with every request that tells Google your exact browser, OS, and version. GREYDOG uses `declarativeNetRequest` to intercept requests to Google and swap that header out for a randomly picked one from a pool of common browsers and operating systems. It also tacks on `DNT: 1` (Do Not Track) and `Sec-GPC: 1` (Global Privacy Control) headers. The random identity is picked fresh each browser session.

**Canvas fingerprinting**

>Websites can silently identify your specific device by drawing invisible shapes to an offscreen canvas and reading back the pixel data. Because GPUs, drivers, and operating systems all render slightly differently, the pixel values form a unique fingerprint for your machine. GREYDOG patches `HTMLCanvasElement.toDataURL` and `CanvasRenderingContext2D.getImageData` in the page to add a tiny random ±1 value to pixel data before it gets returned. Invisible to the eye, but enough to break the fingerprint hash every session.

---

## Install

1. Download or clone this repo
2. Go to `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `greydog` folder
6. Done

---

## Notes

+ Google changes their class names occasionally. If something slips through, open an issue.
+ Ghost Protocol features work on a best-effort basis. They make tracking harder, not impossible. Use a VPN if you want real anonymity.
+ The extension only runs on `google.com/search`. It doesn't touch anything else.

---

## Built with

Vanilla JS, Chrome Manifest V3, `declarativeNetRequest` for beacon blocking, and a pixel dog.
