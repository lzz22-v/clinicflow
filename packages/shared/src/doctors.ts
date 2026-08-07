export interface Doctor {
  name: string;
  specialty: string;
  room: string;
}

export const SPECIALTIES = ["Clínica Geral", "Cardiologia", "Pediatria", "Ortopedia"] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const DOCTORS: Doctor[] = [
  { name: "Dr. Marcos Lima", specialty: "Clínica Geral", room: "Consultório 1 • 3º andar" },
  { name: "Dra. Patrícia Pereira", specialty: "Clínica Geral", room: "Consultório 2 • 3º andar" },
  { name: "Dr. Rafael Silva", specialty: "Clínica Geral", room: "Consultório 3 • 3º andar" },
  { name: "Dra. Ana Carvalho", specialty: "Cardiologia", room: "Consultório 4 • 3º andar" },
  { name: "Dr. Paulo Vieira", specialty: "Cardiologia", room: "Consultório 5 • 3º andar" },
  { name: "Dra. Beatriz Rosa", specialty: "Pediatria", room: "Consultório 6 • 3º andar" },
  { name: "Dr. Victor Araújo", specialty: "Pediatria", room: "Consultório 7 • 3º andar" },
  { name: "Dra. Marina Alves", specialty: "Pediatria", room: "Consultório 8 • 3º andar" },
  { name: "Dr. Pedro Santos", specialty: "Ortopedia", room: "Consultório 9 • 3º andar" },
  { name: "Dr. Samuel Sampaio", specialty: "Ortopedia", room: "Consultório 10 • 3º andar" },
];

// Agrupamento por especialidade — usado no dropdown dependente da Recepção
export const DOCTORS_BY_SPECIALTY: Record<string, Doctor[]> = DOCTORS.reduce((acc, doc) => {
  if (!acc[doc.specialty]) acc[doc.specialty] = [];
  acc[doc.specialty].push(doc);
  return acc;
}, {} as Record<string, Doctor[]>);

// Busca por nome — usado na tela do Médico (select "Médico logado")
export function findDoctorByName(name: string): Doctor | undefined {
  return DOCTORS.find((d) => d.name === name);
}