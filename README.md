# NEON DASH

A fast-paced, neon-soaked arcade survival game built with vanilla HTML5 Canvas and JavaScript. No frameworks, no dependencies — just pure browser gaming.

![Neon Dash](https://img.shields.io/badge/status-playable-00f0ff) ![License](https://img.shields.io/badge/license-MIT-ff2e97) ![No Dependencies](https://img.shields.io/badge/dependencies-none-ffd500)

---

## 🎮 Gameplay

Move, collect, and chain pickups to survive as long as possible in a glowing neon void.

- **Collect golden orbs** to score points.
- **Chain pickups quickly** to build your combo multiplier (up to **x8**).
- **Dodge red hazards** — one hit and it's game over.
- **The longer you survive**, the faster and more aggressive the hazards become.

Your best score is saved locally in your browser.

---

## 🕹️ Controls

| Action | Keys |
|--------|------|
| Move | `W` `A` `S` `D` or `←` `↑` `↓` `→` |
| Move (alternative) | Move your **mouse** or **touch** and drag |
| Start / Restart | Click the on-screen button |

The game automatically switches between keyboard and mouse control depending on your last input.

---

## ✨ Features

- **Smooth physics** — acceleration, friction, and soft wall bouncing
- **Combo system** — chain orb pickups to multiply your score
- **Dynamic difficulty** — spawn rates and hazard speed scale with survival time
- **Magnet effect** — orbs are pulled toward you when you get close
- **Particle effects** — explosions, ripples, and a glowing player trail
- **Neon aesthetic** — CRT-style grid, shimmering title, glowing UI
- **Persistent high score** — saved via `localStorage`
- **Fully responsive** — works on desktop, tablet, and mobile
- **Zero dependencies** — single HTML file, no build step

---

## 📁 Project Structure

```
neon-dash/
├── index.html      # Main HTML structure
├── style.css       # All styling and animations
├── script.js       # Game logic, rendering, and input
└── README.md       # You are here
```

If you prefer a single-file version, you can inline `style.css` and `script.js` into `index.html` — the game works either way.

---

## 🚀 Getting Started

### Play Locally

1. Clone or download this repository.
2. Open `index.html` in any modern browser.
3. Click **Begin** and start dashing.

That's it — no server, no install, no build tools required.

### Run via Local Server (optional)

If you want to serve it locally:

```bash
# Python 3
python -m http.server 8000

# Node.js (with npx)
npx serve
```

Then visit `http://localhost:8000`.

---

## 🧠 How It Works

- **Canvas rendering** with `requestAnimationFrame` for a smooth game loop.
- **Delta-time based updates** so gameplay speed is consistent across refresh rates.
- **Entity arrays** for orbs, hazards, particles, and ripples — updated and culled each frame.
- **State machine** for `MENU`, `PLAYING`, and `DEAD` states.
- **Combo timer** decays over time; pick up another orb before it hits zero to keep the chain alive.
- **Difficulty ramp** reduces spawn intervals and increases hazard speed as `elapsed` time grows.

---

## 🎯 Tips & Strategy

- **Don't rush.** The magnet effect pulls orbs toward you — let them come.
- **Stay mobile.** Hazards drift toward your position, so camping is dangerous.
- **Chain early.** The first few seconds are easy — use them to build a high combo.
- **Watch the edges.** Hazards enter from off-screen and can catch you by surprise.
- **Use mouse control** for precise dodging in tight situations.

---

## 🛠️ Customization

Want to tweak the game? Here are some easy knobs to turn in `script.js`:

| Variable | Default | What it does |
|----------|---------|--------------|
| `COMBO_WINDOW` | `1.8` | Seconds to keep combo alive |
| `COMBO_MAX` | `8` | Maximum combo multiplier |
| `ACCEL` | `2400` | Player acceleration |
| `MAX_SPEED` | `900` | Player speed cap |
| `FRICTION` | `0.86` | Player slowdown factor |
| `orbInterval` | formula | Time between orb spawns |
| `hazardInterval` | formula | Time between hazard spawns |

Colors, fonts, and UI styling live in `style.css`.

---

## 🌐 Browser Support

Works in all modern browsers that support:

- HTML5 Canvas
- `requestAnimationFrame`
- CSS `backdrop-filter` (for HUD blur)
- `localStorage` (for high score persistence)

Tested in Chrome, Firefox, Safari, and Edge.

---

## 📜 License

MIT — free to use, modify, and distribute. See `LICENSE` for details.

---

## 🙌 Credits

Built as a self-contained arcade experiment in vanilla JavaScript. Inspired by neon aesthetics, minimalist arcade loops, and the joy of a good combo chain.

---

**Enjoy the dash. Stay in the light. ✦**