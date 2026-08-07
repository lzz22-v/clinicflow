import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';

// Definição da tabela de Atendimentos / Senhas (Tickets)
export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),

  code: varchar('code', { length: 10 }).notNull(),
  patientCpf: varchar('patient_cpf', { length: 14 }),
  patientName: varchar('patient_name', { length: 100 }).notNull(),
  priority: varchar('priority', { length: 20 }).notNull(),
  specialty: varchar('specialty', { length: 100 }),
  status: varchar('status', { length: 20 }).default('waiting').notNull(),
  room: varchar('room', { length: 50 }),
  floor: varchar('floor', { length: 50 }),
  doctorName: varchar('doctor_name', { length: 100 }),

  // Rascunho do prontuário DA CONSULTA ATUAL (enquanto o atendimento está em andamento)
  medicalRecord: text('medical_record'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Histórico permanente de prontuários — um registro por consulta finalizada.
// Sobrevive mesmo que o ticket de origem seja apagado (ex: reset diário da fila),
// por isso NÃO tem uma foreign key com "cascade delete" para tickets.
export const medicalRecords = pgTable('medical_records', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Referência ao ticket que originou esta consulta (apenas para rastreabilidade;
  // não é usada para exclusão em cascata)
  sourceTicketId: uuid('source_ticket_id'),

  // Identificação do paciente (mesmo padrão usado em "tickets")
  patientCpf: varchar('patient_cpf', { length: 14 }).notNull(),
  patientName: varchar('patient_name', { length: 100 }).notNull(),

  // Contexto da consulta
  specialty: varchar('specialty', { length: 100 }),
  doctorName: varchar('doctor_name', { length: 100 }),

  // Conteúdo do prontuário no momento em que a consulta foi finalizada
  content: text('content').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tipagens automáticas
export type InferTicket = typeof tickets.$inferSelect;
export type InferNewTicket = typeof tickets.$inferInsert;
export type InferMedicalRecord = typeof medicalRecords.$inferSelect;
export type InferNewMedicalRecord = typeof medicalRecords.$inferInsert;