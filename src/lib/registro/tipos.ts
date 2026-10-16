/**
 * Contrato del Registro Municipal de Mascotas de San Pedro (hoy simulado en `registro-municipal-api/`).
 * Cuando el municipio abra su API real, solo cambian REGISTRO_API_URL y REGISTRO_API_KEY.
 */
export interface MascotaRegistro {
  folio: string;
  nombre: string;
  especie: "perro" | "gato";
  raza: string;
  color: string;
  tamano: "chico" | "mediano" | "grande";
  sexo: "macho" | "hembra";
  fecha_nacimiento: string;
  esterilizada: boolean;
  vacunas: { nombre: string; fecha: string }[];
  microchip: string | null;
  senas_particulares: string | null;
  foto_url: string;
  colonia: { clave: string; nombre: string };
  propietario: { nombre: string; telefono_enmascarado: string };
  fecha_registro: string;
  estatus: "activo" | "extraviado";
}

export interface CoincidenciaRegistro {
  mascota: MascotaRegistro;
  puntaje: number;
  motivos: string[];
}

export interface ColoniaRegistro {
  clave: string;
  nombre: string;
  lat: number;
  lng: number;
  codigo_postal: string | null;
  distrito: string | null;
}
