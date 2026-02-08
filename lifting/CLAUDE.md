# Lifting Plan App

Single-file static web app (`index.html`) — no build step, no dependencies.

## Architecture
- Everything lives in one HTML file: markup, CSS (`<style>`), and JS (`<script>`)
- Designed as an iOS home-screen PWA (standalone, OLED-black theme)
- Target device: iPhone 17 Pro (Dynamic Island, safe-area insets, sweaty-hand tap targets)

## Key patterns
- **Two sessions**: Session A (Wed, strength) and Session B (Sun, mobility)
- **Set tracking**: dots per exercise, persisted in `sessionStorage` (resets each browser session)
- **Weight logging**: free-text input per weighted exercise, persisted in `localStorage` (survives across sessions)
- **Rest timer**: full-screen overlay with SVG ring, audio beeps, haptic vibration, and Wake Lock API
- **Exercise details**: bottom-sheet modal with setup/execution/cues, swipe-down to dismiss
- **Auto-select**: picks session based on day of week (Wed=A, Sun=B, default=A)

## CSS conventions
- All colors via CSS custom properties in `:root`
- Pure black (`#000`) background for OLED power savings
- Session A accent: `--accent-a` (pink/red), Session B accent: `--accent-b` (blue)
- RPE badges: `rpe-high` (red), `rpe-med` (yellow), `rpe-low` (green)

## When editing
- Keep it a single file unless complexity warrants splitting
- All tap targets should be at least 32px for gym usability
- Test with iOS safe-area insets (top for Dynamic Island, bottom for home indicator)
- `sessionStorage` for ephemeral state (set completion), `localStorage` for persistent state (weights)
