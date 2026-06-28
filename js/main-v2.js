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

  /* ---- Fondo de llama del hero (port vanilla de "BackgroundGradientAnimation" de 21st.dev) ----
     5 blobs de gradiente cálido animados por CSS (transform) + 1 que sigue el mouse con easing
     vía requestAnimationFrame. El blur lo da el contenedor en CSS: no se anima ningún filtro por
     frame. Respeta prefers-reduced-motion (no engancha el seguimiento del puntero). */
  const hero = $('.hero');
  const flamePointer = $('.flame--pointer');
  if (hero && flamePointer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let curX = 0, curY = 0, tgX = 0, tgY = 0;
    const ease = () => {
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      flamePointer.style.transform = 'translate(' + Math.round(curX) + 'px,' + Math.round(curY) + 'px)';
      requestAnimationFrame(ease);
    };
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      tgX = e.clientX - r.left - r.width / 2;
      tgY = e.clientY - r.top - r.height / 2;
    }, { passive: true });
    requestAnimationFrame(ease);
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

  /* ---- Formulario de contacto → webhook n8n (con fallback a mailto) ---- */
  const form = $('#contact-form');
  const note = $('#form-note');
  const DESTINO = 'bettasoluciones.ventas@gmail.com';
  const WEBHOOK = 'https://bettasoluciones-n8nn.cx2wou.easypanel.host/webhook/lead-betta';
  if (form && note) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = form.nombre.value.trim();
      const email = form.email.value.trim();
      const telefono = form.telefono.value.trim();
      const mensaje = form.mensaje.value.trim();
      const largo = form.largo.value.trim();
      const ancho = form.ancho.value.trim();
      const alto = form.alto.value.trim();
      const cant_4kw = form.cant_4kw ? form.cant_4kw.value.trim() : '';
      const cant_6kw = form.cant_6kw ? form.cant_6kw.value.trim() : '';
      const cant_15kw = form.cant_15kw ? form.cant_15kw.value.trim() : '';
      const empresa_web = form.empresa_web ? form.empresa_web.value.trim() : '';
      /* Cotizador: si cargó cantidades, las anexamos al mensaje para que lleguen
         en el mail del lead sin tener que tocar el workflow de n8n. */
      const pedidoParts = [];
      if (cant_4kw && cant_4kw !== '0') pedidoParts.push(cant_4kw + 'x 4 kW');
      if (cant_6kw && cant_6kw !== '0') pedidoParts.push(cant_6kw + 'x 6 kW');
      if (cant_15kw && cant_15kw !== '0') pedidoParts.push(cant_15kw + 'x 15 kW');
      const pedido = pedidoParts.join(', ');
      const mensajeFull = pedido ? (mensaje + '\n\nEquipos solicitados: ' + pedido) : mensaje;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!nombre || !telefono || !mensaje) {
        note.textContent = 'Completá los campos obligatorios (*): nombre, teléfono y tu consulta.';
        note.className = 'form__note is-error';
        return;
      }
      if (!emailOk) {
        note.textContent = 'Ingresá un email válido: tiene que incluir @ y un dominio (ej: nombre@gmail.com).';
        note.className = 'form__note is-error';
        return;
      }
      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      note.textContent = 'Enviando…';
      note.className = 'form__note';
      try {
        /* Enviamos como form-encoded en modo no-cors: es una "petición simple"
           (sin preflight OPTIONS), así el POST siempre llega al webhook de n8n
           sin necesidad de configurar CORS del lado del servidor. La respuesta
           es opaca (no se puede leer), pero si no hubo error de red el envío llegó. */
        await fetch(WEBHOOK, {
          method: 'POST',
          mode: 'no-cors',
          body: new URLSearchParams({ nombre, email, telefono, mensaje: mensajeFull, largo, ancho, alto, cant_4kw, cant_6kw, cant_15kw, empresa_web }),
        });
        note.textContent = '¡Gracias! Recibimos tu consulta, te contactamos a la brevedad.';
        note.className = 'form__note is-ok';
        form.reset();
      } catch (err) {
        /* Si el webhook no responde, no perdemos la consulta: abrimos el correo. */
        const asunto = `Consulta web de ${nombre}`;
        const cuerpo = `Nombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono || '-'}\n\nConsulta:\n${mensajeFull}\n`;
        window.location.href = `mailto:${DESTINO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
        note.textContent = 'Abrimos tu correo para enviar la consulta. ¡Gracias!';
        note.className = 'form__note is-ok';
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }
})();
