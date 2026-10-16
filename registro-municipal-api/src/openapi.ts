/** Especificación OpenAPI 3.1 del registro simulado. */
export function especificacionOpenApi(origen: string) {
  const ref = (nombre: string) => ({ $ref: `#/components/schemas/${nombre}` });
  const error = (descripcion: string) => ({
    description: descripcion,
    content: { "application/json": { schema: ref("Error") } },
  });
  const json = (descripcion: string, schema: object) => ({
    description: descripcion,
    content: { "application/json": { schema } },
  });
  const noAutorizado = error("Falta X-Api-Key o es inválida.");
  const folioParam = {
    name: "folio",
    in: "path",
    required: true,
    schema: { type: "string", examples: ["SPGG-M-2024-00224"] },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Registro municipal de mascotas — San Pedro Garza García (SIMULACIÓN)",
      version: "1.0.0",
      description:
        "Simulación — no es un servicio oficial del municipio. API de prueba para el proyecto CallejerOS: " +
        "catálogo de colonias, consulta de mascotas registradas (datos ficticios), búsqueda de coincidencias, " +
        "avisos al propietario (SMS simulado) y reporte de extravíos. Todas las respuestas incluyen el " +
        "encabezado `X-Simulacion: true`. El estado de avisos y extravíos vive en memoria.",
    },
    servers: [{ url: origen }],
    security: [{ ApiKey: [] }],
    tags: [
      { name: "Servicio" },
      { name: "Catálogos" },
      { name: "Mascotas" },
      { name: "Avisos" },
      { name: "Extravíos" },
    ],
    paths: {
      "/salud": {
        get: {
          tags: ["Servicio"],
          summary: "Estado del servicio",
          security: [],
          responses: {
            "200": json("Servicio disponible.", {
              type: "object",
              required: ["ok", "servicio", "version", "simulacion"],
              properties: {
                ok: { const: true },
                servicio: { const: "registro-municipal-mascotas" },
                version: { type: "string", examples: ["1.0.0"] },
                simulacion: { const: true },
              },
            }),
          },
        },
      },
      "/v1/colonias": {
        get: {
          tags: ["Catálogos"],
          summary: "Catálogo de colonias de San Pedro Garza García",
          responses: {
            "200": json("Lista completa ordenada por nombre.", {
              type: "object",
              required: ["data", "total"],
              properties: { data: { type: "array", items: ref("Colonia") }, total: { type: "integer" } },
            }),
            "401": noAutorizado,
          },
        },
      },
      "/v1/mascotas": {
        get: {
          tags: ["Mascotas"],
          summary: "Buscar mascotas registradas",
          parameters: [
            { name: "especie", in: "query", schema: { type: "string", enum: ["perro", "gato"] } },
            { name: "colonia", in: "query", description: "Clave de colonia (COL-###).", schema: { type: "string" } },
            {
              name: "q",
              in: "query",
              description: "Texto libre; busca en nombre, raza, color y folio (sin distinguir acentos).",
              schema: { type: "string" },
            },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
          ],
          responses: {
            "200": json("Página de resultados y total de coincidencias.", {
              type: "object",
              required: ["data", "total"],
              properties: { data: { type: "array", items: ref("Mascota") }, total: { type: "integer" } },
            }),
            "400": error("Parámetros inválidos."),
            "401": noAutorizado,
          },
        },
      },
      "/v1/mascotas/{folio}": {
        get: {
          tags: ["Mascotas"],
          summary: "Consultar una mascota por folio",
          parameters: [folioParam],
          responses: {
            "200": json("Mascota.", ref("Mascota")),
            "401": noAutorizado,
            "404": error("Folio inexistente."),
          },
        },
      },
      "/v1/mascotas/microchip/{numero}": {
        get: {
          tags: ["Mascotas"],
          summary: "Consultar una mascota por número de microchip",
          parameters: [{ name: "numero", in: "path", required: true, schema: { type: "string", pattern: "^\\d{15}$" } }],
          responses: {
            "200": json("Mascota.", ref("Mascota")),
            "401": noAutorizado,
            "404": error("Microchip no registrado."),
          },
        },
      },
      "/v1/mascotas/coincidencias": {
        post: {
          tags: ["Mascotas"],
          summary: "Buscar mascotas registradas parecidas a un animal reportado",
          description:
            "Puntaje 0..1: promedio ponderado de los criterios enviados (raza 0.25, color 0.30, tamaño 0.10, " +
            "sexo 0.10, ubicación 0.25; la ubicación decae a la mitad cada 1.5 km desde el centro de la colonia " +
            "registrada). La especie es filtro obligatorio. Mascotas reportadas como extraviadas suman +0.10. " +
            "Sólo se devuelven resultados con puntaje >= 0.35, ordenados de mayor a menor.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["especie"],
                  properties: {
                    especie: { type: "string", enum: ["perro", "gato"] },
                    raza: { type: "string", examples: ["criollo"] },
                    color: { type: "string", examples: ["café claro"] },
                    tamano: { type: "string", enum: ["chico", "mediano", "grande"] },
                    sexo: { type: "string", enum: ["macho", "hembra"] },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    colonia: { type: "string", description: "Clave de colonia (COL-###)." },
                    limite: { type: "integer", minimum: 1, maximum: 50, default: 5 },
                  },
                },
              },
            },
          },
          responses: {
            "200": json("Coincidencias ordenadas por puntaje.", {
              type: "object",
              required: ["data"],
              properties: {
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["mascota", "puntaje", "motivos"],
                    properties: {
                      mascota: ref("Mascota"),
                      puntaje: { type: "number", minimum: 0.35, maximum: 1 },
                      motivos: {
                        type: "array",
                        items: { type: "string" },
                        examples: [["Misma raza", "Color parecido", "Registrada a 600 m"]],
                      },
                    },
                  },
                },
              },
            }),
            "400": error("Cuerpo inválido."),
            "401": noAutorizado,
          },
        },
      },
      "/v1/avisos-propietario": {
        post: {
          tags: ["Avisos"],
          summary: "Enviar un aviso (SMS simulado) al propietario de una mascota",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["folio", "mensaje"],
                  properties: {
                    folio: { type: "string" },
                    mensaje: { type: "string", maxLength: 480 },
                    referencia_externa: { type: "string", description: "URL del reporte en la app." },
                  },
                },
              },
            },
          },
          responses: {
            "202": json("Aviso aceptado (no se envía ningún SMS real).", {
              type: "object",
              required: ["id", "folio", "canal", "estatus", "simulacion", "enviado_at"],
              properties: {
                id: { type: "string" },
                folio: { type: "string" },
                canal: { const: "sms" },
                estatus: { const: "enviado" },
                simulacion: { const: true },
                enviado_at: { type: "string", format: "date-time" },
              },
            }),
            "400": error("Cuerpo inválido."),
            "401": noAutorizado,
            "404": error("Folio inexistente."),
          },
        },
        get: {
          tags: ["Avisos"],
          summary: "Avisos enviados (más recientes primero; en memoria)",
          responses: {
            "200": json("Lista de avisos.", {
              type: "object",
              required: ["data", "total"],
              properties: { data: { type: "array", items: ref("Aviso") }, total: { type: "integer" } },
            }),
            "401": noAutorizado,
          },
        },
      },
      "/v1/extravios": {
        post: {
          tags: ["Extravíos"],
          summary: "Reportar una mascota registrada como extraviada",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["folio", "lat", "lng", "fecha"],
                  properties: {
                    folio: { type: "string" },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    fecha: { type: "string", format: "date-time" },
                    referencia_externa: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": json("Extravío registrado; la mascota pasa a estatus \"extraviado\".", {
              type: "object",
              required: ["id", "folio", "estatus"],
              properties: { id: { type: "string" }, folio: { type: "string" }, estatus: { const: "registrado" } },
            }),
            "400": error("Cuerpo inválido."),
            "401": noAutorizado,
            "404": error("Folio inexistente."),
          },
        },
      },
      "/v1/extravios/{folio}": {
        delete: {
          tags: ["Extravíos"],
          summary: "Cerrar el extravío (la mascota vuelve a estatus \"activo\")",
          parameters: [folioParam],
          responses: {
            "200": json("Estatus actualizado.", {
              type: "object",
              properties: { folio: { type: "string" }, estatus: { const: "activo" } },
            }),
            "401": noAutorizado,
            "404": error("Folio inexistente."),
          },
        },
      },
      "/fotos/{archivo}": {
        get: {
          tags: ["Servicio"],
          summary: "Ilustración de una mascota (SVG)",
          security: [],
          parameters: [{ name: "archivo", in: "path", required: true, schema: { type: "string", examples: ["perro-3.svg"] } }],
          responses: {
            "200": { description: "Imagen SVG.", content: { "image/svg+xml": {} } },
            "404": error("Archivo inexistente."),
          },
        },
      },
    },
    components: {
      securitySchemes: { ApiKey: { type: "apiKey", in: "header", name: "X-Api-Key" } },
      schemas: {
        Error: { type: "object", required: ["error"], properties: { error: { type: "string" } } },
        Colonia: {
          type: "object",
          required: ["clave", "nombre", "lat", "lng", "codigo_postal", "distrito"],
          properties: {
            clave: { type: "string", examples: ["COL-001"] },
            nombre: { type: "string" },
            lat: { type: "number" },
            lng: { type: "number" },
            codigo_postal: { type: ["string", "null"] },
            distrito: { type: ["string", "null"] },
            aprox: { const: true, description: "Sólo aparece cuando el centro es aproximado." },
          },
        },
        Mascota: {
          type: "object",
          required: [
            "folio", "nombre", "especie", "raza", "color", "tamano", "sexo", "fecha_nacimiento", "esterilizada",
            "vacunas", "microchip", "senas_particulares", "foto_url", "colonia", "propietario", "fecha_registro",
            "estatus",
          ],
          properties: {
            folio: { type: "string", examples: ["SPGG-M-2024-00224"] },
            nombre: { type: "string" },
            especie: { type: "string", enum: ["perro", "gato"] },
            raza: { type: "string" },
            color: { type: "string" },
            tamano: { type: "string", enum: ["chico", "mediano", "grande"] },
            sexo: { type: "string", enum: ["macho", "hembra"] },
            fecha_nacimiento: { type: "string", format: "date" },
            esterilizada: { type: "boolean" },
            vacunas: {
              type: "array",
              items: {
                type: "object",
                required: ["nombre", "fecha"],
                properties: { nombre: { type: "string" }, fecha: { type: "string", format: "date" } },
              },
            },
            microchip: { type: ["string", "null"], pattern: "^\\d{15}$" },
            senas_particulares: { type: ["string", "null"] },
            foto_url: { type: "string", format: "uri" },
            colonia: {
              type: "object",
              required: ["clave", "nombre"],
              properties: { clave: { type: "string" }, nombre: { type: "string" } },
            },
            propietario: {
              type: "object",
              required: ["nombre", "telefono_enmascarado"],
              properties: {
                nombre: { type: "string", examples: ["María G."] },
                telefono_enmascarado: { type: "string", examples: ["81••••4521"] },
              },
            },
            fecha_registro: { type: "string", format: "date" },
            estatus: { type: "string", enum: ["activo", "extraviado"] },
          },
        },
        Aviso: {
          type: "object",
          required: ["id", "folio", "canal", "estatus", "simulacion", "enviado_at", "mensaje", "referencia_externa"],
          properties: {
            id: { type: "string" },
            folio: { type: "string" },
            canal: { const: "sms" },
            estatus: { const: "enviado" },
            simulacion: { const: true },
            enviado_at: { type: "string", format: "date-time" },
            mensaje: { type: "string" },
            referencia_externa: { type: ["string", "null"] },
          },
        },
      },
    },
  };
}
