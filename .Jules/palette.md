## 2025-02-18 - Added ARIA labels to icon-only buttons
**Learning:** Icon-only interactive elements in React components (like `<button>`, `<a>`, and `<PDFDownloadLink>`) often lack screen-reader support and visual tooltips if `aria-label` and `title` are not explicitly added.
**Action:** When adding or reviewing icon-only buttons, consistently ensure `aria-label` and `title` are provided (often localized using `t()`) for full accessibility.
