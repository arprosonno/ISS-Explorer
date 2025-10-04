/* script.js
   - Cupola panorama (procedural) with horizontal panning and hotspots
   - Weightless demo: spawn drifting floating objects (click/tap)
   - Catch the Astronaut game: 3 lives, names, fun facts, scoring, accuracy & rating
*/

document.addEventListener('DOMContentLoaded', ()=> {
  /* ---------- Helpers ---------- */
  const $ = sel => document.querySelector(sel);
  const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));

  /* ---------- Cupola Panorama ---------- */
  const panorama = $('#panorama');
  const panWrap = $('#panoramaWrap');
  // We'll create a synthetic panoramic background using canvas dataURL (so no external images)
  function makePanoramaDataURL(width=3600, height=800) {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const ctx = c.getContext('2d');

    // gradient sky
    const g = ctx.createLinearGradient(0,0,0,height);
    g.addColorStop(0, '#00162a'); g.addColorStop(1, '#001b22');
    ctx.fillStyle = g; ctx.fillRect(0,0,width,height);

    // stars
    for(let i=0;i<900;i++){
      const x = Math.random()*width;
      const y = Math.random()*height*0.8;
      const r = Math.random()*1.2;
      ctx.fillStyle = `rgba(255,255,255,${0.04+Math.random()*0.9})`;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }

    // add three "landmarks" spaced along panorama for hotspots: earth glow, dock, robotic arm
    // Earth glow (left)
    const grad1 = ctx.createRadialGradient(width*0.12, height*0.6, 20, width*0.12, height*0.6, 420);
    grad1.addColorStop(0, 'rgba(0,120,180,0.8)'); grad1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad1; ctx.fillRect(0,0,width,height);

    // docking glow (center)
    const grad2 = ctx.createRadialGradient(width*0.52, height*0.48, 10, width*0.52, height*0.48, 280);
    grad2.addColorStop(0, 'rgba(255,160,100,0.7)'); grad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad2; ctx.fillRect(0,0,width,height);

    // robotic arm faint highlight (right)
    const grad3 = ctx.createRadialGradient(width*0.85, height*0.5, 10, width*0.85, height*0.5, 260);
    grad3.addColorStop(0, 'rgba(180,255,200,0.45)'); grad3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad3; ctx.fillRect(0,0,width,height);

    // subtle grid lines (simulate interior reflection)
    ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1;
    for(let x=0;x<width;x+=200){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke();}
    for(let y=0;y<height;y+=150){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke();}

    return c.toDataURL();
  }

  // set panorama background
  const pURL = makePanoramaDataURL();
  panorama.style.backgroundImage = `url(${pURL})`;

  // panorama width is wide (CSS set to 300% for desktop). We'll allow horizontal panning by transforming translateX.
  let panState = {dragging:false, startX:0, startOffset:0, offset:0};
  const maxOffset = () => {
    const wrapW = panWrap.clientWidth;
    const imageW = panorama.clientWidth;
    return Math.max(0, imageW - wrapW);
  };

  // pointer events for smooth cross-device panning
  panWrap.addEventListener('pointerdown', e => {
    panState.dragging = true;
    panState.startX = e.clientX;
    panState.startOffset = panState.offset;
    panWrap.setPointerCapture(e.pointerId);
  });
  window.addEventListener('pointermove', e => {
    if(!panState.dragging) return;
    const dx = e.clientX - panState.startX;
    const imageW = panorama.clientWidth;
    const wrapW = panWrap.clientWidth;
    const max = maxOffset();
    // map dx (pixels) to panorama movement with sensitivity
    const sensitivity = 1.0;
    let newOffset = panState.startOffset - dx * (imageW / wrapW) * sensitivity;
    newOffset = clamp(newOffset, 0, max);
    panState.offset = newOffset;
    panorama.style.transform = `translateX(${ -panState.offset }px)`;
    updateHotspots();
  });
  window.addEventListener('pointerup', e => {
    panState.dragging = false;
  });

  // hotspots definitions mapped to panorama percentage positions (0..1)
  const hotspots = [
    {id:'hp-earth', pct:0.12, label:'Earth observation', visible:false},
    {id:'hp-dock', pct:0.52, label:'Docking & visiting vehicles', visible:false},
    {id:'hp-arm', pct:0.85, label:'Robotic arm operations', visible:false}
  ];
  function updateHotspots(){
    const wrapW = panWrap.clientWidth;
    const imageW = panorama.clientWidth;
    const visibleLeft = panState.offset;
    const visibleRight = panState.offset + wrapW;
    hotspots.forEach(h => {
      const px = Math.round(h.pct * imageW);
      const el = document.getElementById(h.id);
      // if hotspot px is inside visible area show it
      if(px >= visibleLeft + 40 && px <= visibleRight - 40){
        el.style.display = 'block';
        const relX = (px - visibleLeft) / wrapW * 100;
        el.style.left = relX + '%';
        el.style.top = '40%';
      } else {
        el.style.display = 'none';
      }
    });
  }
  // initial layout after images load: wait a tick
  setTimeout(()=> {
    updateHotspots();
    // center panorama moderately
    panState.offset = panorama.clientWidth * 0.25;
    panorama.style.transform = `translateX(${ -panState.offset }px)`;
    updateHotspots();
  }, 120);

  /* ---------- Weightlessness demo ---------- */
  const weightArea = $('#weightArea');
  const shapes = ['🛠','📦','🛰','⚙️','🔩','🔭','🧪','🍎','🥤'];
  function spawnFloating(x,y){
    const el = document.createElement('div');
    el.className = 'floating';
    el.textContent = shapes[Math.floor(Math.random() * shapes.length)];
    const w = weightArea.clientWidth, h = weightArea.clientHeight;
    const left = clamp((x !== undefined) ? (x - weightArea.getBoundingClientRect().left) : Math.random()* (w-40), 8, w-40);
    const top = clamp((y !== undefined) ? (y - weightArea.getBoundingClientRect().top) : Math.random()* (h-40), 8, h-40);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.fontSize = (18 + Math.random()*28) + 'px';
    weightArea.appendChild(el);

    // random velocity
    let vx = (Math.random()-0.5) * 60;
    let vy = (Math.random()-0.5) * 40;
    let rot = (Math.random()-0.5) * 40;
    let last = performance.now();
    // animate
    function step(now){
      const dt = (now - last)/1000; last = now;
      const curLeft = parseFloat(el.style.left), curTop = parseFloat(el.style.top);
      let nx = curLeft + vx * dt;
      let ny = curTop + vy * dt;
      // bounce edges
      if(nx < 4 || nx > w-36) vx = -vx;
      if(ny < 4 || ny > h-36) vy = -vy;
      el.style.left = (curLeft + vx * dt) + 'px';
      el.style.top = (curTop + vy * dt) + 'px';
      el.style.transform = `rotate(${rot * (now/1000)}deg)`;
      if(el.parentElement) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    // allow drag nudging (pointer)
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      const sX = e.clientX, sY = e.clientY;
      const origLeft = parseFloat(el.style.left), origTop = parseFloat(el.style.top);
      function moveHandler(ev){
        el.style.left = (origLeft + (ev.clientX - sX)) + 'px';
        el.style.top = (origTop + (ev.clientY - sY)) + 'px';
      }
      function upHandler(ev){
        el.releasePointerCapture && el.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', moveHandler);
        window.removeEventListener('pointerup', upHandler);
      }
      window.addEventListener('pointermove', moveHandler);
      window.addEventListener('pointerup', upHandler);
    });

    // auto-remove after 10s
    setTimeout(()=> el.remove(), 10000);
  }

  weightArea.addEventListener('click', e => spawnFloating(e.clientX, e.clientY));
  weightArea.addEventListener('touchstart', e => {
    const t = e.touches[0];
    spawnFloating(t.clientX, t.clientY);
  });

  /* ---------- Catch the Astronaut Game ---------- */
  const gameArea = $('#gameArea');
  const startBtn = $('#startBtn');
  const pauseBtn = $('#pauseBtn');
  const resetBtn = $('#resetBtn');
  const scoreEl = $('#score');
  const caughtEl = $('#caught');
  const missedEl = $('#missed');
  const livesEl = $('#lives');
  const timerEl = $('#timer');
  const difficultySel = $('#difficulty');

  // astronaut pool (fictional safe names + fun facts)
  const astronauts = [
    {name:'Alex Rivera', fact:'Robotics specialist who loves microgravity experiments.'},
    {name:'Maya Singh', fact:'Plant scientist running growth experiments on the ISS.'},
    {name:'Luca Rossi', fact:'Photographer of Earth from orbit.'},
    {name:'Nadia Chen', fact:'Fluid physics researcher studying droplets.'},
    {name:'Diego Alvarez', fact:'Designs tools for spacewalks.'},
    {name:'Sara Okoye', fact:'Biomedical researcher focused on bone health.'}
  ];

  let game = {
    running:false, score:0, caught:0, missed:0, lives:3, timeLeft:60,
    spawnInterval:1400, spawnTimer:null, gameTimer:null, speedMultiplier:1
  };

  function resetGame(){
    game.running = false; game.score=0; game.caught=0; game.missed=0; game.lives=3; game.timeLeft = 60;
    clearInterval(game.spawnTimer); clearInterval(game.gameTimer);
    // remove any lingering astros
    document.querySelectorAll('.astro').forEach(n=>n.remove());
    updateHUD();
  }

  function updateHUD(){
    scoreEl.textContent = game.score;
    caughtEl.textContent = game.caught;
    missedEl.textContent = game.missed;
    livesEl.textContent = '❤'.repeat(Math.max(0, game.lives));
    timerEl.textContent = game.timeLeft;
  }

  function spawnAstronaut(){
    if(!game.running) return;
    const el = document.createElement('div');
    el.className = 'astro';
    // choose emoji or object
    const pool = ['👨‍🚀','👩‍🚀','🛰','🧪'];
    const pick = pool[Math.floor(Math.random()*pool.length)];
    el.textContent = pick;

    const gw = gameArea.clientWidth, gh = gameArea.clientHeight;
    const size = 24 + Math.random()*36;
    el.style.fontSize = size + 'px';
    // spawn at a random position near left or right edges and float across
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const startY = 20 + Math.random()*(gh-60);
    el.style.top = startY + 'px';
    if(side === 'left'){
      el.style.left = '-60px';
    } else {
      el.style.left = (gw + 60) + 'px';
    }
    gameArea.appendChild(el);

    // meta
    const meta = astronauts[Math.floor(Math.random()*astronauts.length)];
    el.dataset.name = meta.name; el.dataset.fact = meta.fact;

    // movement velocity depends on difficulty and speed multiplier
    const baseSpeed = 60 + Math.random()*80;
    const diff = parseInt(difficultySel.value,10) || 2;
    const dir = (side === 'left') ? 1 : -1;
    let vx = baseSpeed * dir * (1 + (diff-1)*0.45) * game.speedMultiplier;
    let vy = (Math.random()-0.5) * 20;

    let last = performance.now();
    function move(now){
      if(!el.parentElement) return;
      const dt = (now - last)/1000; last = now;
      let curLeft = parseFloat(el.style.left);
      let curTop = parseFloat(el.style.top);
      curLeft += vx * dt;
      curTop += vy * dt;
      el.style.left = curLeft + 'px';
      el.style.top = curTop + 'px';
      // if crosses bounds -> missed
      if(curLeft < -120 || curLeft > gw + 120){
        game.missed += 1;
        // penalize lives only for actual astronaut emoji (not science icons)
        if(['👨‍🚀','👩‍🚀'].includes(el.textContent)){
          game.lives -= 1;
          if(game.lives < 0) game.lives = 0;
        }
        updateHUD();
        el.remove();
        return;
      }
      requestAnimationFrame(move);
    }
    requestAnimationFrame(move);

    // click to catch
    el.addEventListener('click', (e)=>{
      if(!game.running) return;
      game.score += 10;
      game.caught += 1;
      updateHUD();
      showCatchPopup(el.dataset.name, el.dataset.fact, e.clientX, e.clientY);
      el.remove();
    });
  }

  function showCatchPopup(name, fact, x, y){
    const p = document.createElement('div');
    p.style.position='fixed'; p.style.left=(x-120)+'px'; p.style.top=(y-80)+'px';
    p.style.background='linear-gradient(180deg, rgba(0,0,0,0.7), rgba(255,255,255,0.02))';
    p.style.padding='8px 12px'; p.style.borderRadius='10px'; p.style.zIndex=99999;
    p.style.fontWeight=800; p.style.color='#d7fff0';
    p.innerHTML = `<div>Caught: ${name}</div><div style="font-weight:400; font-size:0.9rem; margin-top:6px">${fact}</div>`;
    document.body.appendChild(p);
    setTimeout(()=> p.style.opacity = 0.01, 1600);
    setTimeout(()=> p.remove(), 2300);
  }

  function startGame(){
    resetGame();
    game.running = true;
    game.speedMultiplier = 1;
    // spawn interval variable by difficulty
    const diff = parseInt(difficultySel.value,10) || 2;
    let interval = 1400 - (diff-1)*350;
    interval = Math.max(450, interval);
    game.spawnInterval = interval;
    game.spawnTimer = setInterval(spawnAstronaut, game.spawnInterval);
    game.gameTimer = setInterval(()=>{
      game.timeLeft -= 1;
      if(game.timeLeft % 10 === 0) game.speedMultiplier *= 1.06;
      updateHUD();
      if(game.timeLeft <= 0 || game.lives <= 0){
        endGame();
      }
    }, 1000);
    // immediate spawn to start
    spawnAstronaut();
    updateHUD();
  }

  function pauseGame(){
    game.running = !game.running;
    if(!game.running){
      clearInterval(game.spawnTimer); clearInterval(game.gameTimer);
      pauseBtn.textContent = 'Resume';
      // remove any moving astros (they stay, but stop spawning)
    } else {
      // resume: restore timers
      const diff = parseInt(difficultySel.value,10) || 2;
      game.spawnInterval = Math.max(450, 1400 - (diff-1)*350);
      game.spawnTimer = setInterval(spawnAstronaut, game.spawnInterval);
      game.gameTimer = setInterval(()=>{
        game.timeLeft -= 1;
        if(game.timeLeft % 10 === 0) game.speedMultiplier *= 1.06;
        updateHUD();
        if(game.timeLeft <= 0 || game.lives <= 0) endGame();
      }, 1000);
      pauseBtn.textContent = 'Pause';
    }
  }

  function endGame(){
    game.running = false;
    clearInterval(game.spawnTimer); clearInterval(game.gameTimer);
    // compute accuracy and rating
    const attempts = game.caught + game.missed;
    const accuracy = attempts ? Math.round((game.caught / attempts) * 100) : 0;
    let rating = '';
    if(game.score >= 250 && accuracy >= 70) rating = 'EVA-ready: Excellent reflexes';
    else if(game.score >= 150 && accuracy >= 55) rating = 'Highly capable: Good reflexes';
    else if(game.score >= 80 && accuracy >= 40) rating = 'Trainable: Reasonable reflexes';
    else rating = 'Ground trainee: Practice more to improve reflexes';

    // show modal-like overlay
    const overlay = document.createElement('div');
    overlay.style.position='fixed'; overlay.style.inset=0; overlay.style.background='rgba(0,0,0,0.6)';
    overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center';
    overlay.style.zIndex = 99999;
    const box = document.createElement('div');
    box.style.background='#01141a'; box.style.padding='18px'; box.style.borderRadius='12px';
    box.style.border='1px solid rgba(255,255,255,0.04)'; box.style.maxWidth='520px'; box.style.color='#d8fff0';
    box.innerHTML = `<div style="font-weight:900; font-size:18px; margin-bottom:8px">Result — Score ${game.score} • Accuracy ${accuracy}%</div>
      <div style="margin-bottom:10px">${rating}</div>
      <div style="font-size:0.95rem; opacity:0.9; margin-bottom:14px">Caught ${game.caught} — Missed ${game.missed} — Time left ${game.timeLeft}s</div>
      <div style="display:flex; gap:8px; justify-content:center">
        <button id="replay" style="background:var(--accent); border:none; padding:8px 12px; border-radius:9px; font-weight:800; cursor:pointer">Play Again</button>
        <button id="closer" style="background:transparent; color:var(--accent); border:1px solid rgba(255,255,255,0.04); padding:8px 12px; border-radius:9px; cursor:pointer">Close</button>
      </div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('replay').addEventListener('click', ()=>{
      overlay.remove();
      startGame();
    });
    document.getElementById('closer').addEventListener('click', ()=>{
      overlay.remove();
      resetGame();
    });
  }

  // buttons
  startBtn.addEventListener('click', ()=> startGame());
  pauseBtn.addEventListener('click', ()=> pauseGame());
  resetBtn.addEventListener('click', ()=> resetGame());

  // keyboard shortcuts
  window.addEventListener('keydown', e => {
    if(e.key === ' ') { e.preventDefault(); startGame(); }
    if(e.key === 'p') pauseGame();
  });

  // initial HUD
  updateHUD();

  /* ---------- small UI helpers ---------- */
  $('#btnCupola').addEventListener('click', ()=> document.querySelector('#cupola').scrollIntoView({behavior:'smooth'}));
  $('#btnGame').addEventListener('click', ()=> document.querySelector('#game').scrollIntoView({behavior:'smooth'}));

  // resize handler to update hotspot positions when layout changes
  window.addEventListener('resize', ()=> setTimeout(updateHotspots, 140));
});
