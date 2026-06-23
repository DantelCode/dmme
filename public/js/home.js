document.addEventListener('DOMContentLoaded', () => {
  let index = 0;

  const slides = document.getElementById('slides');
  const dots = Array.from(document.querySelectorAll('.dot'));
  const profileToggle = document.getElementById('profileToggle');
  const themeToggle = document.getElementById('themeToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebarClose');
  const btnClear = document.getElementById('btnClear');
  const btnRandom = document.getElementById('btnRandom');
  const btnCopyLink = document.getElementById('btnCopyLink');
  const btnOpenModal = document.getElementById('btnOpenModal');
  const btnCloseModal = document.getElementById('btnCloseModal');

  function go(i) {
    index = i;
    if (slides) {
      slides.classList.remove('pos-0','pos-1','pos-2');
      slides.classList.add(`pos-${i}`);
    }
    dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
    // persist selected mode for public profile preview
    try {
      const slide = slides ? slides.querySelectorAll('.slide')[i] : null;
      let mode = 'default';
      let text = '';
      let tagClass = '';
      if (i === 0) {
        mode = 'default';
        const inp = document.getElementById('customInput');
        text = inp ? inp.value || inp.placeholder || '' : '';
      } else if (slide) {
        mode = (i === 1) ? 'confessions' : '3words';
        const tag = slide.querySelector('span');
        const p = slide.querySelector('p');
        tagClass = tag ? tag.className || '' : '';
        text = p ? p.textContent.trim() : (tag ? tag.textContent.trim() : '');
      }
      const token = (document.querySelector('meta[name="csrf-token"]') || {}).content || null;
      fetch('/dashboard/mode/update', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ mode, text, tagClass })
      }).then(() => {}).catch(() => {});
    } catch (e) {
      console.warn('Could not persist mode', e);
    }
  }

  // touch / swipe support for mobile
  if (slides && 'ontouchstart' in window) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    const THRESHOLD = 50; // px

    slides.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
      }
    }, { passive: true });

    slides.addEventListener('touchmove', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      // if vertical scroll is stronger, don't treat as swipe
      if (Math.abs(dy) > Math.abs(dx)) return;
      if (Math.abs(dx) > 10) touchMoved = true;
    }, { passive: true });

    slides.addEventListener('touchend', (e) => {
      if (!touchMoved) return;
      const touch = (e.changedTouches && e.changedTouches[0]);
      if (!touch) return;
      const deltaX = touchStartX - touch.clientX;
      if (deltaX > THRESHOLD) {
        // swipe left -> next
        go(Math.min(index + 1, dots.length - 1));
      } else if (deltaX < -THRESHOLD) {
        // swipe right -> prev
        go(Math.max(index - 1, 0));
      }
    }, { passive: true });
  }

  dots.forEach((d, idx) => d.addEventListener('click', () => go(idx)));

  if (profileToggle) profileToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
  // theme toggle: flip body class and update SVG icon
  function updateThemeIcon(){
    const moon = document.getElementById('icon-moon');
    const sun = document.getElementById('icon-sun');
    const isLight = document.body.classList.contains('light');
    if (moon) moon.classList.toggle('hidden', isLight);
    if (sun) sun.classList.toggle('hidden', !isLight);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', async () => {
      // toggle UI first
      document.body.classList.toggle('light');
      updateThemeIcon();
      // persist preference
      const theme = document.body.classList.contains('light') ? 'light' : 'dark';
      const token = (document.querySelector('meta[name="csrf-token"]') || {}).content || null;
      try {
        const res = await fetch('/dashboard/theme/update', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
          body: JSON.stringify({ theme })
        });
        if (!res.ok) throw new Error('Failed to save theme');
      } catch (err) {
        // revert UI on failure
        document.body.classList.toggle('light');
        updateThemeIcon();
        console.error(err);
        alert('Could not save theme preference.');
      }
    });
    themeToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); themeToggle.click(); }
    });
  }
  // ensure icon matches initial theme
  updateThemeIcon();
  if (sidebarClose) sidebarClose.addEventListener('click', () => sidebar.classList.remove('active'));

  if (btnClear) btnClear.addEventListener('click', () => {
    const el = document.getElementById('customInput'); if (el) el.value = '';
  });

  // persist custom input when editing while on first slide
  const customInputEl = document.getElementById('customInput');
  if (customInputEl) {
    let saveTimer = null;
    const saveCustom = () => {
      if (index !== 0) return;
      const text = customInputEl.value || customInputEl.placeholder || '';
      const token = (document.querySelector('meta[name="csrf-token"]') || {}).content || null;
      fetch('/dashboard/mode/update', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ mode: 'default', text, tagClass: '' })
      }).catch(()=>{});
    };
    customInputEl.addEventListener('input', () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(saveCustom, 800);
    });
    customInputEl.addEventListener('blur', saveCustom);
  }

  if (btnRandom) btnRandom.addEventListener('click', () => {
    const msgs = ["You are amazing","Keep going 🔥","People admire you","You're underrated"];
    const el = document.getElementById('customInput'); if (el) el.value = msgs[Math.floor(Math.random() * msgs.length)];
  });

  if (btnCopyLink) btnCopyLink.addEventListener('click', () => {
    const linkEl = document.getElementById('link'); if (linkEl) { navigator.clipboard.writeText(linkEl.innerText); alert('Copied!'); }
  });

  if (btnOpenModal) btnOpenModal.addEventListener('click', () => {
    const modal = document.getElementById('modal'); if (modal) modal.classList.add('active');
  });

  if (btnCloseModal) btnCloseModal.addEventListener('click', () => {
    const modal = document.getElementById('modal'); if (modal) modal.classList.remove('active');
  });

  // Sidebar toggles: notifications and pause link
  const CSRF_TOKEN = (document.querySelector('meta[name="csrf-token"]') || {}).content || null;
  const notifToggle = document.getElementById('notifToggle');
  const pauseToggle = document.getElementById('pauseToggle');
  const deleteForm = document.getElementById('deleteForm');

  if (notifToggle) {
    notifToggle.addEventListener('click', async () => {
      const current = notifToggle.getAttribute('aria-checked') === 'true';
      const next = !current;
      // optimistic UI
      notifToggle.setAttribute('aria-checked', String(next));
      try {
        const res = await fetch('/dashboard/notifications', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': CSRF_TOKEN
          },
          body: JSON.stringify({ enabled: next })
        });
        if (!res.ok) throw new Error('Failed');
      } catch (e) {
        alert('Could not update notification setting.');
        notifToggle.setAttribute('aria-checked', String(current));
      }
    });
  }

  if (pauseToggle) {
    pauseToggle.addEventListener('click', async () => {
      const current = pauseToggle.getAttribute('aria-checked') === 'true';
      const next = !current;
      pauseToggle.setAttribute('aria-checked', String(next));
      try {
        const type = next ? 'forever' : 'resume';
        const res = await fetch('/dashboard/pause', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': CSRF_TOKEN
          },
          body: JSON.stringify({ type })
        });
        if (!res.ok) throw new Error('Failed');
      } catch (e) {
        alert('Could not update pause setting.');
        pauseToggle.setAttribute('aria-checked', String(current));
      }
    });
  }

  if (deleteForm) {
    deleteForm.addEventListener('submit', (e) => {
      if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        e.preventDefault();
      }
    });
  }

  // Make images non-draggable to avoid ghost image while dragging
  document.querySelectorAll('img').forEach(img => {
    try { img.setAttribute('draggable', 'false'); } catch (e) {}
    img.addEventListener('dragstart', (ev) => ev.preventDefault());
  });

});
