/* Betta Soluciones v2 — interactividad. Vanilla JS, sin dependencias.
   Cada ítem/ícono interactivo tiene una función real. */
(() => {
  'use strict';
  /* Marca que el JS está activo: recién ahí ocultamos los reveal para animarlos.
     Si el JS falla, el contenido se ve igual (no queda invisible). */
  document.documentElement.classList.add('js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---- Año del footer ---- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Header con sombra al scrollear ---- */
  const hdr = $('.hdr');
  const onScroll = () => {
    if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 10);
    const totop = $('.totop');
    if (totop) {
      const show = window.scrollY > 600;
      totop.classList.toggle('show', show);
      totop.hidden = !show;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Menú móvil ---- */
  const burger = $('.nav__burger');
  const list = $('#nav-list');
  if (burger && list) {
    const close = () => { list.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', () => {
      const open = list.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    list.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---- Galería del producto ---- */
  const mainImg = $('#gallery-img');
  const thumbs = $$('.thumb');
  if (mainImg && thumbs.length) {
    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const src = thumb.getAttribute('data-src');
        if (!src || mainImg.getAttribute('src') === src) return;
        mainImg.style.opacity = '0';
        setTimeout(() => { mainImg.src = src; mainImg.style.opacity = '1'; }, 180);
        thumbs.forEach((t) => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });
  }

  /* ---- Tabs de modelos ---- */
  const tabs = $$('.tab');
  const panels = $$('.modelpanel');
  if (tabs.length && panels.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const id = tab.getAttribute('data-model');
        tabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
        panels.forEach((p) => p.classList.toggle('is-active', p.id === id));
      });
    });
  }

  /* ---- Reveal al scroll ---- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ---- Contadores animados ---- */
  const counters = $$('[data-count]');
  const runCount = (el) => {
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = 1200; const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const val = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = val.toLocaleString('es-AR') + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && counters.length) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  /* ---- Volver arriba ---- */
  const totop = $('.totop');
  if (totop) totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---- Formulario de contacto (mailto, sin backend todavía) ---- */
  const form = $('#contact-form');
  const note = $('#form-note');
  const DESTINO = 'bettasoluciones.ventas@gmail.com';
  if (form && note) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = form.nombre.value.trim();
      const email = form.email.value.trim();
      const telefono = form.telefono.value.trim();
      const mensaje = form.mensaje.value.trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!nombre || !emailOk || !mensaje) {
        note.textContent = 'Completá nombre, un email válido y tu consulta.';
        note.className = 'form__note is-error';
        return;
      }
      const asunto = `Consulta web de ${nombre}`;
      const cuerpo = `Nombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono || '-'}\n\nConsulta:\n${mensaje}\n`;
      window.location.href = `mailto:${DESTINO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
      note.textContent = 'Abrimos tu correo para enviar la consulta. ¡Gracias!';
      note.className = 'form__note is-ok';
      form.reset();
    });
  }
})();
