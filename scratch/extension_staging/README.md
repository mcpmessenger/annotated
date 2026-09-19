# Annotated — Web Annotation Layer

A Manifest V3 Chrome extension prototype based on the Annotated.com product specification.

## Install unpacked

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `annotated-extension` directory.
5. Open a normal web page, select text, and click the Annotated extension icon to open the side panel.

## Included prototype flows

- Comment-first annotation composer with a 1,000-character guardrail.
- Yellow highlighter metaphor and anchored quote preview.
- Required intent taxonomy: Hot Take, Fact Check, Steelmanning, Receipts, and Explainer.
- Screenshot/video attachment affordance with QuickTime-style clip timeline preview.
- Local persistence via `chrome.storage.local`.
- Page-specific annotation feed and highlight rendering.
- Permalink-ready publishing model and open Annotated profile context.

This is a local prototype: X publishing, account sync, live screenshot capture, and hosted permalink resolution are represented in the UI but require a backend/integration layer for production.
