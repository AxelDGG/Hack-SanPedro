export type Especie = "perro" | "gato";
export type Tamano = "chico" | "mediano" | "grande";
export type Sexo = "macho" | "hembra";
export type EstatusMascota = "activo" | "extraviado";

export type Colonia = {
  clave: string;
  nombre: string;
  lat: number;
  lng: number;
  codigo_postal: string | null;
  distrito: string | null;
  /** Sólo presente (true) cuando el centro es aproximado. */
  aprox?: true;
};

export type Vacuna = { nombre: string; fecha: string };

/** Mascota tal como se guarda en data/mascotas.json (la foto es sólo el nombre del archivo). */
export type MascotaRegistro = {
  folio: string;
  nombre: string;
  especie: Especie;
  raza: string;
  color: string;
  tamano: Tamano;
  sexo: Sexo;
  fecha_nacimiento: string;
  esterilizada: boolean;
  vacunas: Vacuna[];
  microchip: string | null;
  senas_particulares: string | null;
  foto: string;
  colonia: { clave: string; nombre: string };
  propietario: { nombre: string; telefono_enmascarado: string };
  fecha_registro: string;
  estatus: EstatusMascota;
};

/** Mascota tal como la devuelve la API. */
export type Mascota = Omit<MascotaRegistro, "foto"> & { foto_url: string };

export type AvisoPropietario = {
  id: string;
  folio: string;
  canal: "sms";
  estatus: "enviado";
  simulacion: true;
  enviado_at: string;
  mensaje: string;
  referencia_externa: string | null;
};

export type Extravio = {
  id: string;
  folio: string;
  estatus: "registrado";
  lat: number;
  lng: number;
  fecha: string;
  referencia_externa: string | null;
  registrado_at: string;
};
