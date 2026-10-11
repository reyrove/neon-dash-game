(() => {
  // ============ CANVAS ============
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ============ STATE ============
  const STATE = { MENU: 0, PLAYING: 1, DEAD: 2 };
  let state = STATE.MENU;

  let score = 0;
  let combo = 1;
  let comboTimer = 0;
  const COMBO_WINDOW = 1.8;
  const COMBO_MAX = 8;

  let best = parseInt(localStorage.getItem('neonDashBest') || '0', 10);
  document.getElementById('best').textContent = best;

  const player = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    r: 14,
    targetX: 0, targetY: 0,
    trail: [],
    hue: 175,
    pulse: 0,
  };

  const ACCEL = 2400;
  const MAX_SPEED = 900;
  const FRICTION = 0.86;

  let useMouse = false;
  let mouseX = 0, mouseY = 0;

  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    keys[e.key] = true;
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
    useMouse = false;
  });
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
    keys[e.key] = false;
  });
  canvas.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    useMouse = true;
  });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    mouseX = t.clientX;
    mouseY = t.clientY;
    useMouse = true;
  }, { passive: false });

  // ============ ENTITIES ============
  let orbs = [];
  let hazards = [];
  let particles = [];
  let ripples = [];
  let stars = [];

  let elapsed = 0;
  let spawnTimer = 0;
  let hazardTimer = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function initStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 0.8 + 0.2,
        r: Math.random() * 1.5 + 0.3,
      });
    }
  }
  initStars();
  window.addEventListener('resize', initStars);

  function spawnOrb() {
    let x, y, tries = 0;
    do {
      x = rand(80, W - 80);
      y = rand(80, H - 80);
      tries++;
    } while (Math.hypot(x - player.x, y - player.y) < 180 && tries < 20);

    orbs.push({
      x, y,
      r: 10,
      life: 0,
      maxLife: 8,
      wobble: Math.random() * Math.PI * 2,
      spawnAnim: 0,
    });
  }

  function spawnHazard() {
    const edge = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const speed = rand(150, 280) + elapsed * 4;

    if (edge === 0) { x = -40; y = rand(0, H); vx = speed; vy = rand(-60, 60); }
    else if (edge === 1) { x = W + 40; y = rand(0, H); vx = -speed; vy = rand(-60, 60); }
    else if (edge === 2) { x = rand(0, W); y = -40; vx = rand(-60, 60); vy = speed; }
    else { x = rand(0, W); y = H + 40; vx = rand(-60, 60); vy = -speed; }

    const r = rand(10, 22);
    hazards.push({
      x, y, vx, vy, r,
      life: 0,
      maxLife: 12,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: rand(-3, 3),
    });
  }

  function spawnParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.3, speed);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1,
        r: rand(2, 5),
        color,
      });
    }
  }

  function addRipple(x, y, color) {
    ripples.push({ x, y, r: 5, maxR: 90, life: 0, maxLife: 0.7, color });
  }

  // ============ RESET ============
  function reset() {
    score = 0;
    combo = 1;
    comboTimer = 0;
    elapsed = 0;
    spawnTimer = 0;
    hazardTimer = 0;
    orbs = [];
    hazards = [];
    particles = [];
    ripples = [];

    player.x = W / 2;
    player.y = H / 2;
    player.vx = 0;
    player.vy = 0;
    player.trail = [];
    player.pulse = 0;
    player.hue = 175;

    mouseX = W / 2;
    mouseY = H / 2;
    useMouse = false;

    for (let i = 0; i < 3; i++) spawnOrb();

    updateHUD();
  }

  // ============ UPDATE ============
  function update(dt) {
    if (state !== STATE.PLAYING) return;

    elapsed += dt;
    spawnTimer -= dt;
    hazardTimer -= dt;

    const orbInterval = Math.max(0.5, 1.4 - elapsed * 0.015);
    const hazardInterval = Math.max(0.35, 1.2 - elapsed * 0.012);

    if (spawnTimer <= 0) {
      spawnOrb();
      spawnTimer = orbInterval * rand(0.8, 1.2);
    }
    if (hazardTimer <= 0 && elapsed > 2) {
      spawnHazard();
      if (elapsed > 15 && Math.random() < 0.3) spawnHazard();
      hazardTimer = hazardInterval * rand(0.8, 1.2);
    }

    // ---- Player movement ----
    if (useMouse) {
      const dx = mouseX - player.x;
      const dy = mouseY - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const pull = Math.min(dist * 8, ACCEL * 1.4);
        player.vx += (dx / dist) * pull * dt;
        player.vy += (dy / dist) * pull * dt;
      }
    } else {
      let ax = 0, ay = 0;
      if (keys['a'] || keys['arrowleft']) ax -= 1;
      if (keys['d'] || keys['arrowright']) ax += 1;
      if (keys['w'] || keys['arrowup']) ay -= 1;
      if (keys['s'] || keys['arrowdown']) ay += 1;
      const len = Math.hypot(ax, ay);
      if (len > 0) {
        ax /= len; ay /= len;
        player.vx += ax * ACCEL * dt;
        player.vy += ay * ACCEL * dt;
      }
    }

    player.vx *= Math.pow(FRICTION, dt * 60);
    player.vy *= Math.pow(FRICTION, dt * 60);
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > MAX_SPEED) {
      player.vx = (player.vx / speed) * MAX_SPEED;
      player.vy = (player.vy / speed) * MAX_SPEED;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    const pad = player.r;
    if (player.x < pad) { player.x = pad; player.vx = Math.abs(player.vx) * 0.4; }
    if (player.x > W - pad) { player.x = W - pad; player.vx = -Math.abs(player.vx) * 0.4; }
    if (player.y < pad) { player.y = pad; player.vy = Math.abs(player.vy) * 0.4; }
    if (player.y > H - pad) { player.y = H - pad; player.vy = -Math.abs(player.vy) * 0.4; }

    player.trail.push({ x: player.x, y: player.y, life: 0.4 });
    if (player.trail.length > 20) player.trail.shift();
    for (const t of player.trail) t.life -= dt;
    player.trail = player.trail.filter(t => t.life > 0);

    player.pulse *= Math.pow(0.9, dt * 60);

    // ---- Combo timer ----
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 1;
        updateHUD();
      }
    }

    // ---- Orbs ----
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.life += dt;
      o.wobble += dt * 3;
      o.spawnAnim = Math.min(1, o.spawnAnim + dt * 4);

      const dx = player.x - o.x;
      const dy = player.y - o.y;
      const d = Math.hypot(dx, dy);

      if (d < 120) {
        const pull = (1 - d / 120) * 400;
        o.x += (dx / d) * pull * dt;
        o.y += (dy / d) * pull * dt;
      }

      if (d < player.r + o.r) {
        combo = Math.min(COMBO_MAX, combo + 1);
        comboTimer = COMBO_WINDOW;
        const gained = 10 * combo;
        score += gained;
        player.pulse = 1;

        spawnParticles(o.x, o.y, '#ffd500', 18, 400);
        spawnParticles(o.x, o.y, '#ff2e97', 10, 300);
        addRipple(o.x, o.y, '#ffd500');
        orbs.splice(i, 1);
        updateHUD();
        flashCombo();
        continue;
      }

      if (o.life > o.maxLife) orbs.splice(i, 1);
    }

    // ---- Hazards ----
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.life += dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.spin += h.spinSpeed * dt;

      const dx = player.x - h.x;
      const dy = player.y - h.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 400) {
        h.vx += (dx / d) * 40 * dt;
        h.vy += (dy / d) * 40 * dt;
      }

      if (d < player.r + h.r * 0.8) {
        die();
        return;
      }

      if (h.x < -100 || h.x > W + 100 || h.y < -100 || h.y > H + 100) {
        hazards.splice(i, 1);
        continue;
      }
      if (h.life > h.maxLife) hazards.splice(i, 1);
    }

    // ---- Particles ----
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }

    // ---- Ripples ----
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.life += dt;
      if (r.life > r.maxLife) { ripples.splice(i, 1); continue; }
      r.r = 5 + (r.maxR - 5) * (r.life / r.maxLife);
    }
  }

  function die() {
    state = STATE.DEAD;
    spawnParticles(player.x, player.y, '#ff2e97', 50, 700);
    spawnParticles(player.x, player.y, '#00f0ff', 30, 500);
    addRipple(player.x, player.y, '#ff2e97');

    const isNewBest = score > best;
    if (isNewBest) {
      best = score;
      localStorage.setItem('neonDashBest', best.toString());
      document.getElementById('best').textContent = best;
      document.getElementById('newBest').classList.remove('hidden');
    } else {
      document.getElementById('newBest').classList.add('hidden');
    }

    document.getElementById('finalScore').textContent = score;

    setTimeout(() => {
      document.getElementById('gameOverScreen').classList.remove('hidden');
    }, 500);
  }

  function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = 'x' + combo;
  }

  function flashCombo() {
    const el = document.getElementById('combo');
    el.classList.remove('combo-active');
    void el.offsetWidth;
    el.classList.add('combo-active');
  }

  // ============ RENDER ============
  function render() {
    ctx.fillStyle = 'rgba(5, 1, 15, 0.28)';
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      const flick = 0.5 + Math.sin(elapsed * 3 + s.x) * 0.3;
      ctx.fillStyle = `rgba(120, 200, 255, ${s.z * flick})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    const offset = (elapsed * 20) % gridSize;
    for (let x = -offset; x < W + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = -offset; y < H + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    for (const r of ripples) {
      const alpha = 1 - r.life / r.maxLife;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = 3 * alpha + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const o of orbs) {
      const lifeRatio = o.life / o.maxLife;
      const alpha = lifeRatio > 0.85 ? (1 - lifeRatio) / 0.15 : 1;
      const wobble = Math.sin(o.wobble) * 2;
      const scale = o.spawnAnim * (1 + Math.sin(o.wobble * 2) * 0.1);

      ctx.save();
      ctx.globalAlpha = alpha;

      const grad = ctx.createRadialGradient(o.x, o.y + wobble, 0, o.x, o.y + wobble, o.r * 4);
      grad.addColorStop(0, 'rgba(255, 213, 0, 0.9)');
      grad.addColorStop(0.4, 'rgba(255, 46, 151, 0.4)');
      grad.addColorStop(1, 'rgba(255, 46, 151, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(o.x, o.y + wobble, o.r * 4 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd500';
      ctx.shadowColor = '#ffd500';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(o.x, o.y + wobble, o.r * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fffbe0';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(o.x - 2, o.y + wobble - 2, o.r * 0.4 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    for (const h of hazards) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.spin);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, h.r * 3);
      grad.addColorStop(0, 'rgba(255, 46, 151, 0.7)');
      grad.addColorStop(1, 'rgba(255, 46, 151, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, h.r * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff2e97';
      ctx.shadowColor = '#ff2e97';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      const spikes = 6;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i / (spikes * 2)) * Math.PI * 2;
        const rad = i % 2 === 0 ? h.r : h.r * 0.6;
        const px = Math.cos(angle) * rad;
        const py = Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2a0018';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, h.r * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    for (let i = 0; i < player.trail.length; i++) {
      const t = player.trail[i];
      const ratio = i / player.trail.length;
      const alpha = t.life / 0.4 * ratio * 0.6;
      ctx.fillStyle = `hsla(${player.hue}, 100%, 60%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, player.r * ratio * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state !== STATE.DEAD) {
      const p = player;
      const pulseR = p.r + p.pulse * 12;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseR * 3);
      grad.addColorStop(0, `hsla(${p.hue}, 100%, 60%, 0.8)`);
      grad.addColorStop(0.5, `hsla(${p.hue}, 100%, 50%, 0.3)`);
      grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulseR * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e0ffff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(p.x - 4, p.y - 4, p.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (combo > 1 && state === STATE.PLAYING) {
      ctx.save();
      ctx.font = '900 18px "Segoe UI", sans-serif';
      ctx.fillStyle = '#ff2e97';
      ctx.shadowColor = '#ff2e97';
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText(`x${combo} COMBO`, W / 2, 70);

      const barW = 200;
      const barH = 4;
      const bx = W / 2 - barW / 2;
      const by = 82;
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 46, 151, 0.2)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#ff2e97';
      ctx.fillRect(bx, by, barW * (comboTimer / COMBO_WINDOW), barH);
      ctx.restore();
    }
  }

  // ============ GAME LOOP ============
  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  // ============ UI ============
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    reset();
    state = STATE.PLAYING;
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.add('hidden');
    reset();
    state = STATE.PLAYING;
  });

  reset();
  state = STATE.MENU;
  requestAnimationFrame(loop);
})();