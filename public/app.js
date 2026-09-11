(() => {
  'use strict';

  const slides = [...document.querySelectorAll('.slide')];
  const deck = document.getElementById('deck');
  const prevButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const overviewButton = document.getElementById('overviewButton');
  const fullscreenButton = document.getElementById('fullscreenButton');
  const closeOverview = document.getElementById('closeOverview');
  const overview = document.getElementById('overview');
  const overviewGrid = document.getElementById('overviewGrid');
  const currentLabel = document.getElementById('current');
  const totalLabel = document.getElementById('total');
  const progress = document.getElementById('progress');
  const shortcutHint = document.getElementById('shortcutHint');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 0;
  let demoTimers = [];
  let touchStartX = null;
  let currentDemo = null;
  const AUTO_DELAY = 900;

  const twoDigits = value => String(value).padStart(2, '0');

  function indexFromHash() {
    const match = location.hash.match(/#\/?(\d+)/);
    if (!match) return 0;
    return Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1));
  }

  function clearDemoTimers() {
    demoTimers.forEach(clearTimeout);
    demoTimers = [];
  }

  function later(callback, delay) {
    const timer = setTimeout(callback, reducedMotion ? Math.min(delay, 30) : delay);
    demoTimers.push(timer);
  }

  function updateOverviewSelection() {
    [...overviewGrid.children].forEach((item, i) => item.classList.toggle('current', i === current));
  }

  function showSlide(nextIndex, updateHash = true) {
    const bounded = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (bounded === current && slides[bounded].classList.contains('active')) {
      runSlideDemo(slides[bounded]);
      return;
    }

    clearDemoTimers();
    current = bounded;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === current);
      slide.classList.toggle('past', i < current);
      slide.classList.toggle('future', i > current);
      slide.setAttribute('aria-hidden', String(i !== current));
      slide.inert = i !== current;
    });

    currentLabel.textContent = twoDigits(current + 1);
    totalLabel.textContent = twoDigits(slides.length);
    progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    prevButton.disabled = current === 0;
    nextButton.disabled = current === slides.length - 1;
    updateOverviewSelection();

    if (updateHash) history.replaceState(null, '', `#/${current + 1}`);
    document.title = `${slides[current].dataset.title} — DSA`;
    runSlideDemo(slides[current]);
  }

  function next() { showSlide(current + 1); }
  function previous() { showSlide(current - 1); }

  function openOverview() {
    overview.classList.add('open');
    overview.setAttribute('aria-hidden', 'false');
    updateOverviewSelection();
    const activeItem = overviewGrid.querySelector('.current');
    if (activeItem) activeItem.focus();
  }

  function hideOverview() {
    overview.classList.remove('open');
    overview.setAttribute('aria-hidden', 'true');
    overviewButton.focus();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      // Fullscreen can be unavailable in embedded browsers; presentation remains usable.
    }
  }

  function buildOverview() {
    slides.forEach((slide, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overview-item';
      button.dataset.number = twoDigits(i + 1);
      button.innerHTML = `<span>${slide.dataset.title || `Slide ${i + 1}`}</span>`;
      button.addEventListener('click', () => {
        hideOverview();
        showSlide(i);
      });
      overviewGrid.appendChild(button);
    });
  }

  const SLOT_HASH_DEMOS = new Set(['probing', 'hashSearch', 'division', 'midsquare', 'multiplicative', 'quadratic', 'double']);
  const KEY_LABEL_DEMOS = new Set([...SLOT_HASH_DEMOS, 'chaining']);
  const LAST_STEP_FINISH = new Set(['probing', 'quadratic', 'double']);

  const defaults = {
    linear: ['14, 7, 21, 4, 18', '4'],
    binary: ['3, 8, 12, 17, 23, 31, 42', '31'],
    interpolation: ['10, 20, 30, 40, 50, 60, 70, 80, 90', '70'],
    probing: ['12, 23, 34', '11'],
    hashSearch: ['12, 23, 34, 45, 9', '11', '34'],
    division: ['23, 47, 8, 15', '11'],
    midsquare: ['21, 3, 44, 7', '11'],
    multiplicative: ['15, 61, 8, 30', '11'],
    quadratic: ['12, 23, 34', '11'],
    double: ['12, 23, 34', '11'],
    chaining: ['12, 23, 34', '11']
  };

  function setupDemos() {
    document.querySelectorAll('[data-demo]').forEach(panel => {
      const name = panel.dataset.demo;
      const hash = KEY_LABEL_DEMOS.has(name);
      const fields = name === 'hashSearch'
        ? `<label class="array-input-label" for="${name}-values">Keys (comma or space separated)
            <input id="${name}-values" name="values" type="text" maxlength="100" autocomplete="off" spellcheck="false" required value="${defaults[name][0]}">
          </label>
          <label for="${name}-size">Table size (2–13)
            <input id="${name}-size" name="size" type="text" inputmode="numeric" maxlength="6" required value="${defaults[name][1]}">
          </label>
          <label for="${name}-target">Search for
            <input id="${name}-target" name="target" type="text" inputmode="numeric" maxlength="6" required value="${defaults[name][2]}">
          </label>`
        : `<label class="array-input-label" for="${name}-values">${hash ? 'Keys' : 'Array'} (comma or space separated)
            <input id="${name}-values" name="values" type="text" maxlength="100" autocomplete="off" spellcheck="false" required value="${defaults[name][0]}">
          </label>
          <label for="${name}-target">${hash ? 'Table size (2–13)' : 'Target'}
            <input id="${name}-target" name="target" type="text" inputmode="numeric" maxlength="6" required value="${defaults[name][1]}">
          </label>`;
      const hint = name === 'hashSearch'
        ? 'Up to 12 keys build the table first (silently), then the search probes slot by slot for the target key.'
        : hash ? 'Up to 12 keys. Negative keys use a non-negative modulo; duplicate keys are skipped.'
          : 'Up to 12 integers, from -9999 to 9999.' + (name === 'linear' ? '' : ' Enter values in ascending order.');
      panel.innerHTML = `<form class="demo-inputs">${fields}
        <button class="replay" type="submit">Run simulation</button>
        <button class="replay reset-demo" type="button">Reset example</button>
      </form>
      <p class="input-hint">${hint}</p>
      <div class="demo-array live-array" role="group" aria-label="${hash ? 'Hash table' : 'Array values and zero-based indices'}"></div>
      <p class="demo-status" aria-live="polite"></p>
      <div class="demo-controls">
        <button class="replay step-back" type="button">⏮ Bước trước</button>
        <button class="replay pause-toggle" type="button">⏸ Tạm dừng</button>
        <button class="replay step-forward" type="button">⏭ Bước tiếp</button>
      </div>`;
      panel.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        runSlideDemo(panel.closest('.slide'));
      });
      panel.querySelector('.reset-demo').addEventListener('click', () => {
        panel.querySelector('[name=values]').value = defaults[name][0];
        panel.querySelector('[name=target]').value = defaults[name][defaults[name].length - 1];
        if (name === 'hashSearch') panel.querySelector('[name=size]').value = defaults[name][1];
        runSlideDemo(panel.closest('.slide'));
      });
      panel.querySelector('form').addEventListener('input', () => {
        clearDemoTimers();
        currentDemo = null;
        panel.querySelector('.demo-status').textContent = 'Input changed. Press Enter or Run simulation to start.';
        updateControls(panel, null);
      });
      panel.querySelector('.pause-toggle').addEventListener('click', () => togglePause(panel));
      panel.querySelector('.step-forward').addEventListener('click', () => {
        if (!currentDemo || currentDemo.panel !== panel) return;
        clearDemoTimers();
        currentDemo.paused = true;
        stepForward(currentDemo);
        updateControls(panel, currentDemo);
      });
      panel.querySelector('.step-back').addEventListener('click', () => {
        if (!currentDemo || currentDemo.panel !== panel) return;
        clearDemoTimers();
        currentDemo.paused = true;
        stepBackward(currentDemo);
        updateControls(panel, currentDemo);
      });
      updateControls(panel, null);
    });
  }

  function drawValues(panel, values, selected = -1, found = false, low = 0, high = values.length - 1) {
    const array = panel.querySelector('.live-array');
    array.style.gridTemplateColumns = `repeat(${values.length}, minmax(0, 1fr))`;
    array.replaceChildren(...values.map((value, i) => {
      const cell = document.createElement('div');
      cell.className = 'demo-cell';
      cell.classList.toggle('checking', i === selected && !found);
      cell.classList.toggle('found', i === selected && found);
      cell.classList.toggle('rejected', i < low || i > high);
      const number = document.createElement('span');
      number.textContent = value === null ? '—' : String(value);
      const index = document.createElement('small');
      index.textContent = String(i);
      cell.append(number, index);
      return cell;
    }));
  }

  function drawBuckets(panel, buckets, highlighted = -1) {
    const array = panel.querySelector('.live-array');
    array.style.gridTemplateColumns = `repeat(${buckets.length}, minmax(0, 1fr))`;
    array.replaceChildren(...buckets.map((chain, i) => {
      const cell = document.createElement('div');
      cell.className = 'demo-cell bucket-cell';
      cell.classList.toggle('checking', i === highlighted);
      const number = document.createElement('span');
      number.textContent = chain.length ? chain.join(' → ') : '—';
      const index = document.createElement('small');
      index.textContent = String(i);
      cell.append(number, index);
      return cell;
    }));
  }

  function updateControls(panel, demo) {
    const pauseBtn = panel.querySelector('.pause-toggle');
    const fwdBtn = panel.querySelector('.step-forward');
    const backBtn = panel.querySelector('.step-back');
    if (!pauseBtn || !fwdBtn || !backBtn) return;
    const finished = !!(demo && demo.finished);
    pauseBtn.disabled = !demo || finished;
    pauseBtn.textContent = demo && demo.paused ? '▶ Chạy tiếp' : '⏸ Tạm dừng';
    fwdBtn.disabled = !demo || finished;
    backBtn.disabled = !demo || demo.index < 0;
  }

  function draw(demo, stepIndex) {
    const step = stepIndex >= 0 ? demo.result.steps[stepIndex] : null;
    if (demo.name === 'chaining') {
      drawBuckets(demo.panel, step ? step.buckets : demo.initialBuckets, step ? step.pos : -1);
      demo.status.textContent = step ? step.message : 'Empty buckets. Insertion starts now…';
      return;
    }
    const isHash = SLOT_HASH_DEMOS.has(demo.name);
    const arr = isHash ? (step ? step.slots : demo.initialSlots) : demo.values;
    drawValues(demo.panel, arr, step ? step.pos : -1, step ? step.found : false, step ? step.low : 0, step ? step.high : arr.length - 1);
    demo.status.textContent = step
      ? step.message
      : (demo.name === 'hashSearch' ? 'Table built. Probing for the target starts now…' : 'Ready. Starting simulation…');
  }

  function finish(demo) {
    demo.finished = true;
    demo.status.textContent = LAST_STEP_FINISH.has(demo.name)
      ? demo.result.steps.at(-1).message + ' Simulation complete.'
      : demo.result.message;
    updateControls(demo.panel, demo);
  }

  function stepForward(demo) {
    if (demo.index + 1 >= demo.result.steps.length) { finish(demo); return; }
    demo.index += 1;
    draw(demo, demo.index);
  }

  function stepBackward(demo) {
    demo.finished = false;
    demo.index = Math.max(-1, demo.index - 1);
    draw(demo, demo.index);
  }

  function autoTick(demo) {
    if (!demo || demo.paused || demo.finished) return;
    if (demo.index + 1 >= demo.result.steps.length) { finish(demo); return; }
    demo.index += 1;
    draw(demo, demo.index);
    updateControls(demo.panel, demo);
    later(() => autoTick(demo), AUTO_DELAY);
  }

  function togglePause(panel) {
    if (!currentDemo || currentDemo.panel !== panel || currentDemo.finished) return;
    clearDemoTimers();
    currentDemo.paused = !currentDemo.paused;
    updateControls(panel, currentDemo);
    if (!currentDemo.paused) later(() => autoTick(currentDemo), AUTO_DELAY);
  }

  function runSlideDemo(slide) {
    clearDemoTimers();
    const panel = slide.querySelector('[data-demo]');
    if (!panel) return;
    const status = panel.querySelector('.demo-status');
    status.classList.remove('input-error');
    currentDemo = null;
    try {
      const name = panel.dataset.demo;
      const heading = slide.querySelector('h2');
      let result, values, initialSlots, initialBuckets;
      if (name === 'hashSearch') {
        const keys = DSADemo.parseList(panel.querySelector('[name=values]').value);
        const size = DSADemo.integer(panel.querySelector('[name=size]').value);
        const target = DSADemo.integer(panel.querySelector('[name=target]').value);
        result = DSADemo.hashSearch(keys, size, target);
        initialSlots = result.slots;
        heading.textContent = `Search for ${target} · h(k) = k mod ${size}`;
      } else if (name === 'probing') {
        const keys = DSADemo.parseList(panel.querySelector('[name=values]').value);
        const size = DSADemo.integer(panel.querySelector('[name=target]').value);
        result = DSADemo.probing(keys, size);
        initialSlots = Array(size).fill(null);
        heading.textContent = `Linear probing · h(k) = k mod ${size}`;
      } else if (name === 'division' || name === 'midsquare' || name === 'multiplicative') {
        const keys = DSADemo.parseList(panel.querySelector('[name=values]').value);
        const size = DSADemo.integer(panel.querySelector('[name=target]').value);
        result = DSADemo.hashFunction(name, keys, size);
        initialSlots = Array(size).fill(null);
        const titles = { division: `Division method · h(k) = k mod ${size}`, midsquare: `Mid-square method · m = ${size}`, multiplicative: `Multiplicative method · m = ${size}` };
        heading.textContent = titles[name];
      } else if (name === 'quadratic' || name === 'double') {
        const keys = DSADemo.parseList(panel.querySelector('[name=values]').value);
        const size = DSADemo.integer(panel.querySelector('[name=target]').value);
        result = DSADemo.probeSequence(keys, size, name);
        initialSlots = Array(size).fill(null);
        heading.textContent = name === 'quadratic' ? `Quadratic probing · (h + i²) mod ${size}` : `Double hashing · (h1 + i·h2) mod ${size}`;
      } else if (name === 'chaining') {
        const keys = DSADemo.parseList(panel.querySelector('[name=values]').value);
        const size = DSADemo.integer(panel.querySelector('[name=target]').value);
        result = DSADemo.chaining(keys, size);
        initialBuckets = Array.from({ length: size }, () => []);
        heading.textContent = `Separate chaining · h(k) = k mod ${size}`;
      } else {
        values = DSADemo.parseList(panel.querySelector('[name=values]').value);
        const target = DSADemo.integer(panel.querySelector('[name=target]').value);
        result = DSADemo.search(name, values, target);
        heading.textContent = `Find ${target}`;
      }
      currentDemo = { panel, status, name, result, values, initialSlots, initialBuckets, index: -1, paused: false, finished: false };
      draw(currentDemo, -1);
      updateControls(panel, currentDemo);
      // Schedule one step at a time: Pause/Step buttons, replay, edits and slide changes all take control of the run.
      later(() => autoTick(currentDemo), AUTO_DELAY);
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('input-error');
      updateControls(panel, null);
    }
  }

  prevButton.addEventListener('click', previous);
  nextButton.addEventListener('click', next);
  overviewButton.addEventListener('click', openOverview);
  closeOverview.addEventListener('click', hideOverview);
  fullscreenButton.addEventListener('click', toggleFullscreen);

  document.querySelectorAll('[data-replay]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      runSlideDemo(slides[current]);
    });
  });

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, button, [contenteditable]')) return;
    if (overview.classList.contains('open')) {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'o') hideOverview();
      return;
    }
    if (['ArrowRight', 'PageDown', 'Enter'].includes(event.key) || event.key === ' ') {
      event.preventDefault();
      next();
    } else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      previous();
    } else if (event.key === 'Home') {
      showSlide(0);
    } else if (event.key === 'End') {
      showSlide(slides.length - 1);
    } else if (event.key.toLowerCase() === 'o') {
      openOverview();
    } else if (event.key.toLowerCase() === 'f') {
      toggleFullscreen();
    }
  });

  deck.addEventListener('click', event => {
    if (event.target.closest('button, a, code, pre, table, form, input, label, textarea, select')) return;
    const rect = deck.getBoundingClientRect();
    if (event.clientX > rect.left + rect.width * .62) next();
    else if (event.clientX < rect.left + rect.width * .38) previous();
  });

  deck.addEventListener('touchstart', event => {
    if (event.target.closest('form, input, button, label, textarea, select')) { touchStartX = null; return; }
    touchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });

  deck.addEventListener('touchend', event => {
    if (touchStartX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) next(); else previous();
  }, { passive: true });

  window.addEventListener('hashchange', () => showSlide(indexFromHash(), false));
  setTimeout(() => shortcutHint.classList.add('hide'), 6500);

  setupDemos();
  buildOverview();
  current = indexFromHash();
  slides.forEach(slide => slide.classList.remove('active'));
  showSlide(current, false);

  /* Lightweight canvas particle field */
  const canvas = document.getElementById('particles');
  const context = canvas.getContext('2d');
  const colors = ['50,230,226', '168,121,255', '255,92,168', '255,200,87'];
  let particles = [];
  let animationFrame = null;

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.max(24, Math.min(72, Math.round((innerWidth * innerHeight) / 26000)));
    particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 1.8 + .4,
      vx: (Math.random() - .5) * .18,
      vy: (Math.random() - .5) * .18,
      color: colors[i % colors.length],
      alpha: Math.random() * .45 + .15
    }));
  }

  function drawParticles() {
    context.clearRect(0, 0, innerWidth, innerHeight);
    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < -8) particle.x = innerWidth + 8;
      if (particle.x > innerWidth + 8) particle.x = -8;
      if (particle.y < -8) particle.y = innerHeight + 8;
      if (particle.y > innerHeight + 8) particle.y = -8;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      context.fillStyle = `rgba(${particle.color},${particle.alpha})`;
      context.fill();
    }
    animationFrame = requestAnimationFrame(drawParticles);
  }

  resizeCanvas();
  if (!reducedMotion) drawParticles();
  else {
    drawParticles();
    cancelAnimationFrame(animationFrame);
  }
  window.addEventListener('resize', resizeCanvas, { passive: true });
})();
