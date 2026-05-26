# CLAUDE.md: Project Rules & Guidelines

This file is automatically loaded by AI coding assistants. Read and adhere to the project standards and instructions below.

## Build and Dev Commands
- Run development server: `npm run dev`
- Production build compilation: `npm run build`
- Start built production app: `npm run start`

## Critical Project Rules
1. **CRITICAL CHANGELOG RULE** 📜:
   Whenever you implement a new feature, modify the design, fix a bug, or perform any codebase updates, you **MUST** immediately append a new version entry block to the top of `public/CHANGELOG.md` in the exact standard format below. This file is parsed dynamically in the UI.
   
   **Standard Format**:
   ```markdown
   ## [vVersion] - YYYY-MM-DD - Emoji - Tag - Title
   1. **Feature Title**：Detail description.
   2. **Another Feature**：Detail description.
   ```
   *Tags must be one of: LATEST, AESTHETICS, UPDATE, FEATURE, UI, MILESTONE, DATA.*

2. **React 19 / Leaflet Popup Rule** 🐛:
   Leaflet popups are highly sensitive to sudden React component unmounting inside the popup window. If you trigger voice listening states or toggle preview cards, any immediate DOM structure removals may trigger event bubbling which Leaflet interprets as an "outer click", causing popups to close. Use a short delay (`setTimeout(..., 50)`) when changing states that unmount elements to prevent the popup from closing.

3. **Color Theme Guideline** 🎨:
   Maintain the custom warm, light color palette ("light blue, warm light brown, cream") using high-contrast Taipei Sans typography.
