# Fricción del formulario: checklist

> El formulario es el último metro. Cada campo, paso o duda que no aporta a la respuesta del
> negocio es una razón para abandonar. La prueba que manda: **llenarlo en un teléfono, con una
> mano, con datos reales**.

Cada punto se marca **OK / Arreglar / No aplica**. Lo que el script `auditar_medicion.py` ya
cuenta va marcado con (script).

---

## 1. Campos

- [ ] Solo los campos que el negocio **usa para responder** el primer contacto. Típico: nombre,
      WhatsApp o teléfono, y un campo abierto o una opción de servicio. (script: número de campos)
- [ ] No se piden teléfono **y** correo como obligatorios a la vez; uno basta para responder.
- [ ] Nada de "¿cómo nos conociste?" obligatorio: eso lo contestan las UTMs.
- [ ] Requeridos solo los indispensables, y marcados. (script: requeridos)
- [ ] Opciones cerradas (select o botones) en vez de texto libre cuando el negocio necesita
      clasificar (servicio, sucursal, presupuesto por rango).
- [ ] Sin campos de presupuesto exacto o fecha exacta si no son necesarios para responder.

## 2. Móvil

- [ ] `type="tel"` para teléfono, `type="email"` para correo: abre el teclado correcto. (script)
- [ ] `autocomplete` correcto: `name`, `tel`, `email`, `postal-code`. El navegador rellena en
      un toque.
- [ ] `inputmode="numeric"` donde aplique; sin máscaras que peleen con el autocompletado.
- [ ] Teléfono de México: acepta 10 dígitos con o sin espacios; no exige `+52`.
- [ ] Campos y botón de al menos 44-48 px de alto; texto de 16 px o más (evita el zoom
      automático de iOS al enfocar) [O, recomendación de plataformas; por verificar el umbral
      exacto que uses].
- [ ] El teclado no tapa el botón de enviar; el botón se ve sin hacer scroll en el último campo.
- [ ] El formulario no está en un modal que se cierra al tocar fuera.

## 3. Etiquetas y errores

- [ ] Etiquetas visibles; el placeholder no sustituye a la etiqueta (desaparece al escribir).
- [ ] Errores en línea, junto al campo, en lenguaje humano: "Escribe 10 dígitos", no "Invalid".
- [ ] El mensaje de error no borra lo ya escrito.
- [ ] Mensaje de fallo (`.w-form-fail` en Webflow) redactado y con alternativa: "Escríbenos por
      WhatsApp".

## 4. Multipaso

- [ ] Se usa solo si el formulario es largo de verdad (5+ campos) o si las preguntas cambian
      según la respuesta.
- [ ] El primer paso es el más fácil (una elección con botones), no el que pide datos personales.
- [ ] Indicador de progreso ("Paso 2 de 3").
- [ ] Botón para volver sin perder respuestas.
- [ ] El evento de éxito se dispara **al final**, una vez (ver `framer.md`: el multipaso confunde
      a la medición automática).
- [ ] Mide `form_start` contra `generate_lead`: si arrancan muchos y terminan pocos, el problema
      está dentro del formulario.

## 5. Confianza y legal

- [ ] Aviso de privacidad enlazado junto al botón. En México, quien recaba datos personales debe
      poner a disposición su aviso de privacidad; la ley vigente se publicó en 2025 [O, alcance y
      requisitos por verificar con un abogado del cliente].
- [ ] Casilla de aceptación solo si el aviso o el tipo de dato lo exige; no premarcada.
- [ ] Qué pasa después: "Te respondemos por WhatsApp en menos de 2 horas hábiles" (solo si es
      cierto).
- [ ] Antispam sin castigar al humano: honeypot o reCAPTCHA invisible antes que acertijos.

## 6. Después de enviar

- [ ] Página de gracias (o mensaje) con siguiente paso, tiempo de respuesta y botón de WhatsApp.
- [ ] El lead llega a donde alguien lo ve hoy (correo revisado, CRM, WhatsApp), no a un buzón
      olvidado. Prueba: envía uno y mide cuánto tarda en recibir respuesta.
- [ ] Autorespuesta por correo opcional y breve.

## 7. Alternativas al formulario

- [ ] Botón de WhatsApp visible junto al formulario, medido (`whatsapp-telefono.md`).
- [ ] Teléfono como texto y como `tel:`.
- [ ] Si el negocio agenda citas, una agenda en línea puede sustituir al formulario.

## 8. Cómo reportarlo

Tabla en `templates/reporte-conversion.md`, sección Formulario: cada punto en "Arreglar" con
el cambio concreto (qué campo se quita, qué tipo de input se cambia) y quién lo hace. Sin
promesas de porcentaje: el efecto se mide comparando la tasa `generate_lead / sesiones` antes y
después con al menos 2 a 4 semanas de datos en cada lado.
