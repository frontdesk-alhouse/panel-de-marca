import type { DimensionId } from "./types";

/**
 * Cada dimensión en lenguaje simple: qué es, por qué le importa al negocio y qué la sube.
 * Para quien abre el panel sin saber de marketing digital.
 */
export const DIMENSION_EXPLAIN: Record<DimensionId, { what: string; why: string; how: string }> = {
  visibilidad: {
    what: "Qué tanto te encuentran en Google y en los asistentes de IA cuando alguien busca lo que haces, sin pagar anuncios.",
    why: "Es tráfico que no cuesta por clic y que llega con intención: ya está buscando tu servicio.",
    how: "Páginas por servicio, búsquedas donde ya casi apareces en primera página, schema y que las IA puedan leer tu sitio.",
  },
  conversion: {
    what: "De cada 100 personas que entran al sitio, cuántas te dejan sus datos o te escriben.",
    why: "Más tráfico no sirve si nadie te contacta; subir la conversión multiplica todo lo demás sin gastar más.",
    how: "Medir bien cada formulario y WhatsApp, un mensaje claro arriba, menos campos y un botón visible en celular.",
  },
  inversion: {
    what: "Qué tan bien rinde lo que pagas en Google Ads y Meta Ads: cuánto te cuesta cada contacto.",
    why: "Es el dinero que sale cada mes; un objetivo mal puesto lo gasta en clics que nunca escriben.",
    how: "Objetivo de leads (no visitas), conversiones medidas, palabras negativas y pausar lo que no trae contactos.",
  },
  pipeline: {
    what: "Qué pasa con los contactos después de llegar: qué tan rápido respondes y cuántos se vuelven clientes.",
    why: "Responder tarde o no dar seguimiento tira los leads que ya pagaste.",
    how: "Responder en minutos, registrar cada prospecto en el CRM y darle siguiente paso.",
  },
  adquisicion: {
    what: "Cuánta gente llega al sitio y de dónde: si crece y si depende demasiado de anuncios.",
    why: "Depender solo de anuncios es caro y frágil; un tráfico sano mezcla orgánico, directo y redes.",
    how: "Contenido útil, SEO y redes que lleven al sitio.",
  },
  marca: {
    what: "Si la marca gana notoriedad: más gente la busca por nombre y la comunidad en redes interactúa.",
    why: "Una marca conocida cierra más fácil y paga menos por cada cliente.",
    how: "Publicar con constancia, contenido que se guarda y comparte, y presencia donde está tu cliente.",
  },
  experiencia: {
    what: "Qué tan rápido carga el sitio, si se entiende y si frustra a la gente (clics de enojo, regresos rápidos).",
    why: "Un sitio lento o confuso pierde visitas que ya ganaste y Google lo posiciona peor.",
    how: "Imágenes ligeras, menos scripts de terceros, botones que hacen lo que parecen.",
  },
};
