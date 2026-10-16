"use client";

import { motion } from "motion/react";
import { Pencil, Sparkles } from "lucide-react";
import { CONDICIONES, SEXOS, TAMANOS, type Condicion, type TipoReporte } from "@/lib/constants";
import { entrarArriba } from "@/lib/motion";
import type { DatosReporte } from "./estado";
import { CampoTexto, ChipsRapidos, Grupo, Opciones, Pregunta } from "./controles";

const COLORES = ["Negro", "Blanco", "Café", "Gris", "Dorado", "Atigrado", "Manchas"];
const RAZAS_PERRO = ["Mestizo", "Chihuahua", "Schnauzer", "Labrador", "Golden Retriever", "Pastor Alemán", "French Poodle", "Pug", "Husky", "Pitbull", "Yorkshire", "Salchicha"];
const RAZAS_GATO = ["Doméstico", "Siamés", "Persa", "Angora", "Bengalí"];

/** Urgencia en palabras: más fácil que una escala del 1 al 5. */
const URGENCIA_SIMPLE: [string, string][] = [
  ["2", "Está bien"],
  ["3", "Necesita ayuda"],
  ["5", "¡Urgente!"],
];
const cubeta = (u: number) => (u <= 2 ? "2" : u === 3 ? "3" : "5");

interface Props {
  tipo: TipoReporte | null;
  confirmacion: boolean;
  datos: DatosReporte;
  /** La IA o el registro ya llenaron los datos: se muestran como resumen para confirmar con un toque. */
  prellenado: "ia" | "registro" | "publicacion" | null;
  /** Mientras no corrija, se ve el resumen y el botón de abajo dice "Sí, así es". */
  corrigiendo: boolean;
  onCorregir: () => void;
  onCambio: <K extends keyof DatosReporte>(campo: K, valor: DatosReporte[K]) => void;
}

export function PasoDatos({ tipo, confirmacion, datos, prellenado, corrigiendo, onCorregir, onCambio }: Props) {
  const perdido = tipo === "perdido";

  function alternarCondicion(c: Condicion) {
    const actuales = new Set(datos.condiciones);
    if (actuales.has(c)) actuales.delete(c);
    else {
      actuales.add(c);
      // "Sano" excluye "flaco" y "herido" (y viceversa); "cachorro" combina con todo.
      if (c === "sano") {
        actuales.delete("herido");
        actuales.delete("flaco");
      }
      if (c === "herido" || c === "flaco") actuales.delete("sano");
    }
    onCambio("condiciones", [...actuales]);
  }

  const condiciones = (
    <Grupo titulo="¿Cómo se ve?">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(CONDICIONES) as Condicion[]).map((c) => {
          const activo = datos.condiciones.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={activo}
              onClick={() => alternarCondicion(c)}
              className={`min-h-14 rounded-2xl font-display text-lg font-medium ring-2 transition ${
                activo ? "bg-terracota text-white ring-terracota" : "bg-white text-tinta ring-arena-oscura"
              }`}
            >
              {CONDICIONES[c].label}
            </button>
          );
        })}
      </div>
    </Grupo>
  );

  const notas = (
    <Grupo titulo="Algo más" ayuda="Opcional · puedes dictarlo">
      <CampoTexto
        valor={datos.notas}
        onCambio={(v) => onCambio("notas", v)}
        multilinea
        maxLength={500}
        etiqueta="Notas"
        placeholder={perdido ? "Ej. Es miedosa, no la persigan" : "Ej. Está debajo de un carro, se deja acercar"}
      />
    </Grupo>
  );

  if (confirmacion) {
    return (
      <div className="flex flex-col gap-5">
        <Pregunta titulo="¿Cómo lo viste hoy?" ayuda="Así sabemos si necesita ayuda pronto." />
        {condiciones}
        {notas}
      </div>
    );
  }

  const nombre = perdido && (
    <Grupo titulo="¿Cómo se llama?">
      <CampoTexto
        valor={datos.apodo}
        onCambio={(v) => onCambio("apodo", v)}
        maxLength={40}
        etiqueta="Nombre"
        placeholder="Ej. Luna"
        testId="nombre-mascota"
      />
    </Grupo>
  );

  // Resumen: lo que llenó la IA (o el registro) en letras grandes, con "Sí, así es" o "Corregir".
  if (prellenado && !corrigiendo) {
    const lineas = [
      datos.especie === "gato" ? "Gato" : "Perro",
      datos.tamano && TAMANOS[datos.tamano].label,
      datos.color,
      datos.raza,
      datos.sexo && SEXOS[datos.sexo].label,
      datos.collar === true ? "Con collar" : datos.collar === false ? "Sin collar" : null,
    ].filter(Boolean);
    const fuente =
      prellenado === "registro" ? "el registro municipal" : prellenado === "publicacion" ? "el mensaje del grupo" : "la foto";

    return (
      <div className="flex flex-col gap-5">
        <Pregunta titulo={perdido ? "¿Así es tu mascota?" : "¿Así se ve?"} ayuda={`Lo llenamos con ${fuente}.`} />
        {nombre}
        <motion.div
          variants={entrarArriba}
          initial="oculto"
          animate="visible"
          className="rounded-3xl bg-white p-5 ring-2 ring-arena-oscura"
          data-testid="resumen-datos"
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-salvia">
            <Sparkles className="size-4" /> {prellenado === "ia" ? "La IA lo describió así" : "Datos encontrados"}
          </p>
          <p className="font-display text-2xl leading-snug font-semibold">{lineas.join(" · ")}</p>
          {datos.rasgos && <p className="mt-2 text-lg text-tinta-suave">{datos.rasgos}</p>}
        </motion.div>
        {!perdido && tipo === "callejero" && (
          <Grupo titulo="¿Necesita ayuda urgente?">
            <Opciones
              nombre="urgencia"
              opciones={URGENCIA_SIMPLE}
              valor={cubeta(datos.urgencia)}
              onCambio={(v) => onCambio("urgencia", Number(v))}
            />
          </Grupo>
        )}
        <button
          type="button"
          onClick={onCorregir}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white font-display text-lg font-medium ring-2 ring-arena-oscura"
          data-testid="corregir-datos"
        >
          <Pencil className="size-5" /> No, quiero corregir algo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Pregunta titulo={perdido ? "Cuéntanos de tu mascota" : "¿Cómo es?"} ayuda="Toca las opciones; escribir es opcional." />
      {nombre}

      <Grupo titulo="¿Es perro o gato?">
        <Opciones
          nombre="especie"
          opciones={[
            ["perro", "Perro"],
            ["gato", "Gato"],
          ]}
          valor={datos.especie}
          onCambio={(v) => onCambio("especie", v)}
        />
      </Grupo>

      <Grupo titulo="Tamaño">
        <Opciones
          nombre="tamano"
          opciones={[
            ["chico", "Chico"],
            ["mediano", "Mediano"],
            ["grande", "Grande"],
          ]}
          valor={datos.tamano}
          onCambio={(v) => onCambio("tamano", v)}
        />
      </Grupo>

      <Grupo titulo="Color">
        <ChipsRapidos opciones={COLORES} valor={datos.color} onCambio={(v) => onCambio("color", v)} />
        <CampoTexto valor={datos.color} onCambio={(v) => onCambio("color", v)} maxLength={60} etiqueta="Color" placeholder="Ej. café con pecho blanco" />
      </Grupo>

      <Grupo titulo="Raza" ayuda="Si no sabes, déjalo en Mestizo">
        <CampoTexto valor={datos.raza} onCambio={(v) => onCambio("raza", v)} maxLength={60} etiqueta="Raza" placeholder="Ej. Mestizo" />
        <div className="flex flex-wrap gap-2">
          {(datos.especie === "gato" ? RAZAS_GATO : RAZAS_PERRO).slice(0, 6).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onCambio("raza", r)}
              className={`min-h-11 rounded-full px-4 text-base font-bold ring-2 ${
                datos.raza === r ? "bg-tinta text-white ring-tinta" : "bg-white ring-arena-oscura"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </Grupo>

      {perdido && (
        <>
          <Grupo titulo="¿Macho o hembra?">
            <Opciones
              nombre="sexo"
              opciones={[
                ["macho", "Macho"],
                ["hembra", "Hembra"],
              ]}
              valor={datos.sexo}
              onCambio={(v) => onCambio("sexo", v)}
            />
          </Grupo>
          <Grupo titulo="¿Traía collar?">
            <Opciones
              nombre="collar"
              opciones={[
                [true, "Sí"],
                [false, "No"],
              ]}
              valor={datos.collar}
              onCambio={(v) => onCambio("collar", v)}
            />
          </Grupo>
        </>
      )}

      <Grupo titulo="Señas particulares" ayuda="Opcional">
        <CampoTexto
          valor={datos.rasgos}
          onCambio={(v) => onCambio("rasgos", v)}
          maxLength={140}
          etiqueta="Señas particulares"
          placeholder="Ej. mancha en el ojo, cola corta, collar rojo"
        />
      </Grupo>

      {!perdido && condiciones}
      {tipo === "callejero" && (
        <Grupo titulo="¿Necesita ayuda urgente?">
          <Opciones
            nombre="urgencia"
            opciones={URGENCIA_SIMPLE}
            valor={cubeta(datos.urgencia)}
            onCambio={(v) => onCambio("urgencia", Number(v))}
          />
        </Grupo>
      )}
      {notas}
    </div>
  );
}
