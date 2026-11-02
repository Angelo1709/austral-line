// GRUPO MENTORES — el agente que organiza en campos el texto libre que escribió el mentor.
// Regla innegociable: nunca inventa un dato. Si no está en lo que escribió, queda en null, y
// cualquier dato que la IA "vea" pero que no esté sustentado en el texto se descarta solo.
import { generateObject, jsonSchema } from "ai";
import { esLinkedin } from "../_lib";

const modelo = "anthropic/claude-sonnet-5.5";

interface PerfilExtraido {
  empresa: string | null;
  cargo: string | null;
  industria: string | null;
  anios_experiencia: number | null;
  bio: string | null;
  areas_ayuda: string | null;
  linkedin_url: string | null;
  advertencia_spam: boolean;
  motivo_advertencia: string | null;
}

const esquemaPerfil = jsonSchema<PerfilExtraido>({
  type: "object",
  additionalProperties: false,
  properties: {
    empresa: { type: ["string", "null"] },
    cargo: { type: ["string", "null"] },
    industria: { type: ["string", "null"] },
    anios_experiencia: { type: ["integer", "null"] },
    bio: { type: ["string", "null"] },
    areas_ayuda: { type: ["string", "null"] },
    linkedin_url: { type: ["string", "null"] },
    advertencia_spam: { type: "boolean" },
    motivo_advertencia: { type: ["string", "null"] },
  },
  required: [
    "empresa", "cargo", "industria", "anios_experiencia", "bio",
    "areas_ayuda", "linkedin_url", "advertencia_spam", "motivo_advertencia",
  ],
});

const camposDeTexto = ["empresa", "cargo", "industria", "bio", "areas_ayuda", "linkedin_url"] as const;

const sinAcentos = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// No exigimos literalidad (la IA resume y reordena), pero si la mayoría de las palabras de un
// dato no aparecen en ningún lado del texto original, lo tratamos como no sustentado y lo descartamos.
function sustentadoEnElTexto(valor: string, textoOriginal: string) {
  const original = sinAcentos(textoOriginal);
  const palabras = sinAcentos(valor).split(/\s+/).filter((p) => p.length >= 4);
  if (palabras.length === 0) return original.includes(sinAcentos(valor));
  const encontradas = palabras.filter((p) => original.includes(p));
  return encontradas.length / palabras.length >= 0.6;
}

// Chequeo determinístico, sin IA, para spam obvio: texto vacío de contenido, caracteres repetidos
// o un pegote de links sin ninguna palabra propia. Se combina con lo que marque el modelo.
function spamHeuristico(texto: string): string | null {
  const limpio = texto.trim();
  if (limpio.length < 15) return "El texto es demasiado corto para describir un perfil.";
  if (/(.)\1{6,}/i.test(limpio)) return "Tiene una secuencia de caracteres repetida, sin contenido real.";
  const sinLinks = limpio.replace(/https?:\/\/\S+/gi, "").trim();
  if (/https?:\/\//i.test(limpio) && sinLinks.length < 20) return "Es casi todo links, sin contar nada sobre vos.";
  return null;
}

export interface Correccion {
  campo: string;
  valorDescartado: string;
  razon: string;
}

export type PropuestaPerfil = Record<(typeof camposDeTexto)[number], string | null> & { anios_experiencia: number | null };

export interface ResultadoOrganizar {
  propuesta: PropuestaPerfil;
  advertenciaSpam: boolean;
  motivoSpam: string | null;
  correcciones: Correccion[];
}

export async function organizarPerfilConIA(textoOriginal: string): Promise<ResultadoOrganizar> {
  const heuristica = spamHeuristico(textoOriginal);

  const { object } = await generateObject({
    model: modelo,
    schema: esquemaPerfil,
    system:
      "Organizás el perfil de un mentor de la materia Emprendimientos (Universidad Austral) a partir " +
      "de lo que ÉL MISMO escribió sobre sí para que los alumnos lo conozcan. Regla innegociable: " +
      "extraé solamente datos que el texto menciona explícitamente. Si un dato no aparece, devolvé " +
      "null; nunca lo inventes, completes con supuestos ni lo deduzcas de otro dato. Si el texto es " +
      "publicidad, spam, está vacío de sentido o no describe a una persona, marcá advertencia_spam en " +
      "true y explicá por qué en motivo_advertencia.",
    prompt: textoOriginal,
  });

  const correcciones: Correccion[] = [];
  const propuesta: ResultadoOrganizar["propuesta"] = {
    empresa: null, cargo: null, industria: null, bio: null, areas_ayuda: null, linkedin_url: null, anios_experiencia: null,
  };

  for (const campo of camposDeTexto) {
    const valor = object[campo];
    if (!valor) continue;
    if (!sustentadoEnElTexto(valor, textoOriginal)) {
      correcciones.push({ campo, valorDescartado: valor, razon: "no está sustentado en lo que escribiste; se descartó para no inventar" });
      continue;
    }
    propuesta[campo] = valor;
  }

  // LinkedIn: si pegaron "linkedin.com/in/..." sin el esquema, lo completamos; si no es un link
  // de LinkedIn válido, no inventamos uno, lo dejamos vacío.
  if (propuesta.linkedin_url) {
    const pegado = propuesta.linkedin_url;
    const conEsquema = /^[a-z][a-z0-9+.-]*:\/\//i.test(pegado) ? pegado : `https://${pegado}`;
    if (esLinkedin(conEsquema)) {
      if (conEsquema !== pegado) correcciones.push({ campo: "linkedin_url", valorDescartado: pegado, razon: "le faltaba https://, se completó solo" });
      propuesta.linkedin_url = conEsquema;
    } else {
      correcciones.push({ campo: "linkedin_url", valorDescartado: pegado, razon: "no es un link de LinkedIn válido" });
      propuesta.linkedin_url = null;
    }
  }

  const anios = object.anios_experiencia;
  if (anios != null) {
    const valido = Number.isInteger(anios) && anios >= 0 && anios <= 70;
    propuesta.anios_experiencia = valido ? anios : null;
    if (!valido) correcciones.push({ campo: "anios_experiencia", valorDescartado: String(anios), razon: "no es una cantidad de años válida" });
  }

  return {
    propuesta,
    advertenciaSpam: object.advertencia_spam || !!heuristica,
    motivoSpam: object.motivo_advertencia ?? heuristica,
    correcciones,
  };
}
