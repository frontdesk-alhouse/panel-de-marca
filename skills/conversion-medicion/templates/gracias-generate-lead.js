/*
  conversion-medicion · generate_lead al llegar a la página de gracias
  Sirve para Framer (navegación sin recarga) y para Webflow con Redirect URL.
  Dónde:
    Framer  → Site Settings → Custom Code → End of <body> (código del SITIO, no de la página).
    Webflow → Custom Code de la página /gracias (antes de </body>) o del sitio.
  Requiere: GA4 instalado (gtag directo o GTM). Píxel de Meta y Google Ads son opcionales.
  Placeholders a reemplazar:
    {{RUTAS_GRACIAS}}  rutas separadas por coma, p. ej. /gracias,/gracias-cotizacion
    {{AW_SEND_TO}}     AW-123456789/AbCdEfGh ('' si importas desde GA4)
    {{VALOR_LEAD}}     valor estimado por lead en MXN (0 si no aplica)
  Alternativa sin código: en GA4 crea el evento generate_lead desde page_view con
  page_location que contiene /gracias. Usa UNA de las dos vías, no ambas.
  Pégalo envuelto en <script> ... </script> en el campo de Custom Code.
*/
(function () {
  var RUTAS_GRACIAS = '{{RUTAS_GRACIAS}}'.split(',').map(function (r) { return r.trim().replace(/\/$/, ''); });
  var AW_SEND_TO = '{{AW_SEND_TO}}';
  var VALOR_LEAD = Number('{{VALOR_LEAD}}') || 0;
  var MONEDA = 'MXN';

  function enviarEvento(nombre, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', nombre, params);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: nombre }, params));
    }
  }

  function yaContado(clave) {
    try {
      if (sessionStorage.getItem(clave)) return true;
      sessionStorage.setItem(clave, '1');
    } catch (e) { /* almacenamiento bloqueado: se cuenta igual */ }
    return false;
  }

  function revisarRuta() {
    var ruta = window.location.pathname.replace(/\/$/, '');
    if (RUTAS_GRACIAS.indexOf(ruta) === -1) return;
    var formulario = new URLSearchParams(window.location.search).get('f') || ruta.replace(/^\//, '');
    // Una vez por ruta y sesión: recargar /gracias no cuenta doble.
    if (yaContado('cm-lead-' + ruta + '-' + formulario)) return;
    var params = { form_name: formulario };
    if (VALOR_LEAD > 0) { params.value = VALOR_LEAD; params.currency = MONEDA; }
    enviarEvento('generate_lead', params);
    if (AW_SEND_TO && AW_SEND_TO.indexOf('{{') !== 0 && typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', { send_to: AW_SEND_TO });
    }
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {}, { eventID: 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) });
    }
  }

  // Navegación sin recarga (Framer y otros sitios SPA).
  ['pushState', 'replaceState'].forEach(function (metodo) {
    var original = history[metodo];
    history[metodo] = function () {
      var resultado = original.apply(this, arguments);
      setTimeout(revisarRuta, 0);
      return resultado;
    };
  });
  window.addEventListener('popstate', revisarRuta);

  revisarRuta();
})();
