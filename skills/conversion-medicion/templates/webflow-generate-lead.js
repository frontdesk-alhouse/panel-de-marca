/*
  conversion-medicion · generate_lead en el ÉXITO de formularios nativos de Webflow
  Dónde: Site Settings → Custom Code → Footer (antes de </body>), o en la página del formulario.
  Requiere: GA4 instalado (gtag directo o GTM). Píxel de Meta y Google Ads son opcionales.
  Placeholders a reemplazar:
    {{AW_SEND_TO}}  etiqueta de conversión de Google Ads, p. ej. AW-123456789/AbCdEfGh ('' si importas desde GA4)
    {{VALOR_LEAD}}  valor estimado por lead en MXN (0 si no hay un valor razonable)
  Si el formulario usa Redirect URL, usa gracias-generate-lead.js en su lugar.
  Pégalo envuelto en <script> ... </script> en el campo de Custom Code.
*/
(function () {
  var AW_SEND_TO = '{{AW_SEND_TO}}';
  var VALOR_LEAD = Number('{{VALOR_LEAD}}') || 0;
  var MONEDA = 'MXN';
  var enviados = new WeakSet();

  function enviarEvento(nombre, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', nombre, params);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: nombre }, params));
    }
  }

  function nombreFormulario(bloqueExito) {
    var contenedor = bloqueExito.closest('.w-form');
    var form = contenedor ? contenedor.querySelector('form') : null;
    if (!form) return { nombre: 'sin-nombre', id: '' };
    return {
      nombre: form.getAttribute('data-name') || form.getAttribute('name') || 'sin-nombre',
      id: form.id || ''
    };
  }

  function visible(el) {
    return el.offsetParent !== null || window.getComputedStyle(el).display !== 'none';
  }

  function registrarLead(bloqueExito) {
    if (enviados.has(bloqueExito) || !visible(bloqueExito)) return;
    enviados.add(bloqueExito);
    var f = nombreFormulario(bloqueExito);
    var params = { form_name: f.nombre, form_id: f.id };
    if (VALOR_LEAD > 0) { params.value = VALOR_LEAD; params.currency = MONEDA; }
    enviarEvento('generate_lead', params);
    if (AW_SEND_TO && AW_SEND_TO.indexOf('{{') !== 0 && typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', { send_to: AW_SEND_TO });
    }
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {}, { eventID: 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) });
    }
  }

  function observar(bloqueExito) {
    if (bloqueExito.__cmObservado) return;
    bloqueExito.__cmObservado = true;
    new MutationObserver(function () { registrarLead(bloqueExito); })
      .observe(bloqueExito, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  function iniciar() {
    document.querySelectorAll('.w-form-done').forEach(observar);
    // Formularios que aparecen después (modales, CMS, tabs):
    new MutationObserver(function () {
      document.querySelectorAll('.w-form-done').forEach(observar);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
