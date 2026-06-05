export type Specialty =
  | "fonoaudiologo"
  | "terapeuta_ocupacional"
  | "fisioterapeuta"
  | "psicologo"
  | "musicoterapeuta"
  | "nutricionista"
  | "psicopedagogo"
  | "outro";

export interface SpecialtyMeta {
  value: Specialty;
  label: string;
  /** Vibrant accent color (hex) used for borders, dots and badges */
  color: string;
  /** Foreground over the accent color */
  fg: string;
}

export const SPECIALTIES: SpecialtyMeta[] = [
  { value: "fonoaudiologo", label: "Fonoaudiólogo(a)", color: "#FF7A00", fg: "#0A0A0A" }, // laranja
  {
    value: "terapeuta_ocupacional",
    label: "Terapeuta Ocupacional",
    color: "#1E90FF",
    fg: "#FFFFFF",
  }, // azul
  { value: "fisioterapeuta", label: "Fisioterapeuta", color: "#00C2A8", fg: "#0A0A0A" }, // teal
  { value: "psicologo", label: "Psicólogo(a)", color: "#9B5CFF", fg: "#FFFFFF" }, // roxo
  { value: "musicoterapeuta", label: "Musicoterapeuta", color: "#FF3D8B", fg: "#FFFFFF" }, // rosa
  { value: "nutricionista", label: "Nutricionista", color: "#22C55E", fg: "#0A0A0A" }, // verde
  { value: "psicopedagogo", label: "Psicopedagogo(a)", color: "#FFD60A", fg: "#0A0A0A" }, // amarelo
  { value: "outro", label: "Outro", color: "#94A3B8", fg: "#0A0A0A" },
];

export const specialtyMap = Object.fromEntries(SPECIALTIES.map((s) => [s.value, s])) as Record<
  Specialty,
  SpecialtyMeta
>;

export function specialtyOf(value?: string | null): SpecialtyMeta {
  if (!value) return specialtyMap.outro;
  return specialtyMap[value as Specialty] ?? specialtyMap.outro;
}
