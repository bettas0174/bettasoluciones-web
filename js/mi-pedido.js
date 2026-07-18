/* Betta Soluciones — Mi pedido (checkout). Vanilla JS, sin dependencias.
   Arma el pedido (por cantidad o por m³), calcula totales + IVA, y dispara
   el pago: total por Mercado Pago, o total con 10% OFF por transferencia.
   La plata y las credenciales viven SOLO en n8n; acá solo se manda el pedido. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---- Datos de negocio (fuente: MEMORIA.md) ---- */
  const IVA = 0.21;             /* 21% */
  const DESC_TRANSFER = 0.10;   /* 10% OFF si paga el total por transferencia (1 solo pago) */
  const MODELOS = {
    m4:  { nombre: 'Betta W-4000 · 4 kW',  kw: 4,  kcal: 5000,  neto: 590000 },
    m6:  { nombre: 'Betta W-6000',         kw: 6,  kcal: 6700,  neto: 688000 },
    m15: { nombre: 'Betta 15 kW',          kw: 15, kcal: 16000, neto: 1380000 },
    /* Soldadora: neto 188.000 + IVA (envío incluido). Se compra por cantidad,
       no entra en el cálculo por m³ (sin kcal). */
    sol: { nombre: 'Soldadora de Plásticos C1500', neto: 188000 },
    /* Repuestos: se compran por cantidad, no entran en el cálculo por m³ (sin kcal). */
    ra:  { nombre: 'Resistencia blindada aletada 2000 W (4/6 kW)', neto: 96000 },
    rb:  { nombre: 'Cartucho resistencia completo 15 kW',          neto: 390000 },
    rc:  { nombre: 'Repuesto resistencias soldadora C1500',        neto: 56000 },
  };
  const WEBHOOK = 'https://bettasoluciones-n8nn.cx2wou.easypanel.host/webhook/crear-pedido';

  const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const money = (n) => fmt.format(Math.round(n));

  /* ---- Estado del carrito ---- */
  const cant = { m4: 0, m6: 0, m15: 0, sol: 0, ra: 0, rb: 0, rc: 0 };

  /* ---- Año del footer + header con sombra ---- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  const hdr = $('.hdr');
  window.addEventListener('scroll', () => { if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 10); }, { passive: true });

  /* ---- Menú móvil (mismo patrón que main-v2) ---- */
  const burger = $('.nav__burger');
  const list = $('#nav-list');
  if (burger && list) {
    burger.addEventListener('click', () => {
      const open = list.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    list.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => list.classList.remove('open')));
  }

  /* ---- Steppers de cantidad (− / input / +) ---- */
  $$('.qty').forEach((box) => {
    const key = box.getAttribute('data-model');
    const input = $('.qty__input', box);
    const setVal = (v) => {
      v = Math.max(0, Math.min(99, Math.round(v || 0)));
      cant[key] = v; input.value = v; render();
    };
    $('.qty__minus', box).addEventListener('click', () => setVal(cant[key] - 1));
    $('.qty__plus', box).addEventListener('click', () => setVal(cant[key] + 1));
    input.addEventListener('input', () => setVal(parseInt(input.value, 10)));
  });

  /* ---- Calculadora por m³ ---- */
  const calcBtn = $('#calc-btn');
  const calcOut = $('#calc-out');
  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      const largo = parseFloat($('#calc-largo').value) || 0;
      const ancho = parseFloat($('#calc-ancho').value) || 0;
      const alto = parseFloat($('#calc-alto').value) || 0;
      if (largo <= 0 || ancho <= 0 || alto <= 0) {
        calcOut.innerHTML = '<p class="calc__hint is-error">Completá largo, ancho y alto (en metros) para calcular.</p>';
        return;
      }
      const m3 = largo * ancho * alto;
      const calorias = m3 * 30; /* Córdoba: calorías necesarias = m³ × 30 */
      const opciones = Object.entries(MODELOS).filter(([, m]) => m.kcal).map(([key, m]) => {
        const u = Math.max(1, Math.ceil(calorias / m.kcal));
        return { key, m, u };
      });
      calcOut.innerHTML =
        '<p class="calc__hint">Tu espacio: <strong>' + m3.toLocaleString('es-AR', { maximumFractionDigits: 1 }) +
        ' m³</strong> → necesitás aprox. <strong>' + Math.round(calorias).toLocaleString('es-AR') +
        ' kcal/h</strong>. Elegí una opción:</p>' +
        '<div class="calc__opts">' +
        opciones.map((o) =>
          '<button type="button" class="calc__opt" data-apply="' + o.key + '" data-u="' + o.u + '">' +
          '<strong>' + o.u + '×</strong> ' + o.m.nombre + '</button>'
        ).join('') + '</div>';
      $$('.calc__opt', calcOut).forEach((b) => {
        b.addEventListener('click', () => {
          const key = b.getAttribute('data-apply');
          const u = parseInt(b.getAttribute('data-u'), 10);
          cant[key] = u;
          const box = $('.qty[data-model="' + key + '"]');
          if (box) $('.qty__input', box).value = u;
          render();
          $('#resumen').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    });
  }

  /* ---- Cálculo de totales ---- */
  function totales() {
    let neto = 0, unidades = 0;
    for (const key of Object.keys(MODELOS)) {
      neto += MODELOS[key].neto * cant[key];
      unidades += cant[key];
    }
    const iva = neto * IVA;
    const total = neto + iva;                          /* total con IVA (lo que cobra Mercado Pago) */
    const totalTransfer = total * (1 - DESC_TRANSFER); /* total con 10% OFF (transferencia) */
    return { neto, iva, total, totalTransfer, unidades };
  }

  /* ---- Render del resumen + estado de botones ---- */
  function render() {
    const t = totales();
    const lines = $('#resumen-lines');
    if (lines) {
      const rows = Object.keys(MODELOS)
        .filter((k) => cant[k] > 0)
        .map((k) => {
          const m = MODELOS[k];
          const sub = m.neto * cant[k];
          return '<li><span>' + cant[k] + '× ' + m.nombre + '</span><strong>' + money(sub) + '</strong></li>';
        });
      lines.innerHTML = rows.length
        ? rows.join('')
        : '<li class="resumen__empty">Todavía no agregaste equipos. Usá los + de arriba o la calculadora.</li>';
    }
    $('#r-neto').textContent = money(t.neto);
    $('#r-iva').textContent = money(t.iva);
    $('#r-total').textContent = money(t.total);
    $('#r-mp').textContent = money(t.total);
    $('#r-transfer').textContent = money(t.totalTransfer);
    const ah = $('#r-ahorro'); if (ah) ah.textContent = money(t.total - t.totalTransfer);

    const hay = t.unidades > 0;
    $$('.pay-btn').forEach((b) => { b.disabled = !hay; });
  }

  /* ---- Validación de datos del cliente ---- */
  function datosCliente() {
    const f = $('#datos-form');
    const nombre = f.nombre.value.trim();
    const email = f.email.value.trim();
    const telefono = f.telefono.value.trim();
    const empresa = f.empresa.value.trim();
    const localidad = f.localidad.value.trim();
    const cuit = f.cuit.value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!nombre || !telefono) return { ok: false, msg: 'Completá tu nombre y teléfono.' };
    if (!emailOk) return { ok: false, msg: 'Ingresá un email válido (ej: nombre@gmail.com).' };
    return { ok: true, data: { nombre, email, telefono, empresa, localidad, cuit } };
  }

  /* ---- Disparar el pago ---- */
  const note = $('#pago-note');
  async function enviarPedido(metodo, btn) {
    const t = totales();
    if (t.unidades <= 0) { setNote('Agregá al menos un equipo antes de pagar.', 'error'); return; }
    const dc = datosCliente();
    if (!dc.ok) { setNote(dc.msg, 'error'); $('#datos').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    const body = new URLSearchParams({
      metodo,
      cant_4kw: String(cant.m4), cant_6kw: String(cant.m6), cant_15kw: String(cant.m15),
      cant_soldadora: String(cant.sol),
      cant_rep_a: String(cant.ra), cant_rep_b: String(cant.rb), cant_rep_c: String(cant.rc),
      neto: String(Math.round(t.neto)),
      iva: String(Math.round(t.iva)),
      total: String(Math.round(t.total)),
      total_transferencia: String(Math.round(t.totalTransfer)),
      a_cobrar: String(Math.round(metodo === 'mercadopago' ? t.total : t.totalTransfer)),
      nombre: dc.data.nombre, email: dc.data.email, telefono: dc.data.telefono,
      empresa: dc.data.empresa, localidad: dc.data.localidad, cuit: dc.data.cuit,
    });

    const prev = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando…'; }
    setNote('Generando tu pedido…', '');
    try {
      /* Petición "simple" (form-encoded, sin headers custom): no dispara preflight.
         n8n responde con Access-Control-Allow-Origin para que podamos leer el init_point. */
      const res = await fetch(WEBHOOK, { method: 'POST', body });
      const data = await res.json().catch(() => ({}));

      if (metodo === 'mercadopago') {
        if (data && data.init_point) {
          setNote('Redirigiendo a Mercado Pago…', 'ok');
          window.location.href = data.init_point; /* checkout de MP */
          return;
        }
        throw new Error('sin init_point');
      } else {
        /* Transferencia: el pedido quedó registrado; mostramos los datos bancarios. */
        mostrarTransferencia(t);
      }
    } catch (err) {
      if (metodo === 'transferencia') {
        /* Aún si el webhook falló, no bloqueamos: mostramos los datos y un fallback. */
        mostrarTransferencia(t, true);
      } else {
        setNote('No pudimos iniciar el pago online. Probá de nuevo o escribinos por WhatsApp.', 'error');
      }
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = prev; }
    }
  }

  function setNote(msg, kind) {
    if (!note) return;
    note.textContent = msg;
    note.className = 'pago-note' + (kind ? ' is-' + kind : '');
  }

  /* ---- Pantalla de transferencia ---- */
  function mostrarTransferencia(t, fallo) {
    const modal = $('#transfer-modal');
    if (!modal) return;
    $('#transfer-monto').textContent = money(t.totalTransfer);
    const aviso = $('#transfer-aviso');
    if (aviso) aviso.style.display = fallo ? 'block' : 'none';
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  const tClose = $('#transfer-close');
  if (tClose) tClose.addEventListener('click', () => {
    $('#transfer-modal').classList.remove('open');
    document.body.style.overflow = '';
  });

  /* ---- Copiar al portapapeles (alias / CBU) ---- */
  $$('.copy').forEach((b) => {
    b.addEventListener('click', async () => {
      const val = b.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(val);
        const old = b.textContent; b.textContent = '¡Copiado!';
        setTimeout(() => { b.textContent = old; }, 1500);
      } catch (e) { /* el navegador puede bloquearlo; el dato igual está visible */ }
    });
  });

  /* ---- Botones de pago ---- */
  const btnMp = $('#pay-mp');
  const btnTr = $('#pay-transfer');
  if (btnMp) btnMp.addEventListener('click', () => enviarPedido('mercadopago', btnMp));
  if (btnTr) btnTr.addEventListener('click', () => enviarPedido('transferencia', btnTr));

  render();
})();
