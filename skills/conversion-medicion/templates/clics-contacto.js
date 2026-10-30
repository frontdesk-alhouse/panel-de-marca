/*
  conversion-medicion · clics a WhatsApp, teléfono, correo y agenda externa (listener delegado)
  Dónde: Custom Code del SITIO, antes de </body> (Webflow: Footer · Framer: End of <body>).
  Requiere: GA4 instalado (gtag directo o GTM). Píxel de Meta opcional (evento Contact).
  Placeholders a reemplazar:
    {{DOMINIOS_AGENDA}}  dominios de agenda externa separados por coma, p. ej. calendly.com,cal.com
                         ('' si no hay agenda)
  Ubicación del botón: agrega data-ubicacion="hero" (o footer, flotante...) al enlace o a un
  contenedor. Si no existe, se deduce del <header>, <footer> o <section id> más cercano.
  Si ya mides estos clics con un disparador de GTM, no pegues este script (contarías doble).
  Pégalo envuelto en <script> ... </script> en el campo de Custom Code.
*/
(function () {
  var DOMINIOS_AGENDA = '{{DOMINIOS_AGENDA}}'.split(',').map(function (d) { return d.trim(); })
    .filter(function (d) { return d && d.indexOf('{{') !== 0; });
  var ultimoClic = { href: '', t: 0 };

  function enviarEvento(nombre, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', nombre, params);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: nombre }, params));
    }
  }

  function tipoDeEnlace(href) {
    var h = href.toLowerCase();
    if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|wa\.link|web\.whatsapp\.com)\//.test(h) || h.indexOf('whatsapp://') === 0) return 'whatsapp';
    if (h.indexOf('tel:') === 0) return 'phone';
    if (h.indexOf('mailto:') === 0) return 'email';
    for (var i = 0; i < DOMINIOS_AGENDA.length; i++) {
      if (h.indexOf(DOMINIOS_AGENDA[i].toLowerCase()) !== -1) return 'agenda';
    }
    return null;
  }

  function ubicacion(enlace) {
    var marcado = enlace.closest('[data-ubicacion]');
    if (marcado) return marcado.getAttribute('data-ubicacion');
    if (enlace.closest('header, nav')) return 'header';
    if (enlace.closest('footer')) return 'footer';
    var seccion = enlace.closest('section[id]');
    return seccion ? seccion.id : 'pagina';
  }

  document.addEventListener('click', function (evento) {
    var enlace = evento.target.closest && evento.target.closest('a[href]');
    if (!enlace) return;
    var href = enlace.getAttribute('href') || '';
    var tipo = tipoDeEnlace(href);
    if (!tipo) return;
    // Evita doble conteo por doble toque en menos de 1 s.
    var ahora = Date.now();
    if (ultimoClic.href === href && ahora - ultimoClic.t < 1000) return;
    ultimoClic = { href: href, t: ahora };

    // Sin el número ni el correo completos en parámetros: solo el tipo de enlace y la ubicación.
    var params = { ubicacion: ubicacion(enlace), pagina: window.location.pathname };
    if (tipo === 'whatsapp' || tipo === 'agenda') params.link_domain = (enlace.hostname || tipo);
    enviarEvento('contact_' + tipo, params);
    if (typeof window.fbq === 'function') {
      window.fbq('track', tipo === 'agenda' ? 'Schedule' : 'Contact');
    }
  }, true);
})();
