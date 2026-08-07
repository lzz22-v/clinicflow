export type PriorityType = 'normal' | 'elderly' | 'pregnant' | 'disability' | 'emergency';

export type TicketStatus = 'waiting' | 'called' | 'attending' | 'finished' | 'absent';

export interface Ticket {
  id: string;
  code: string;           // Ex: N001, P003
  patientName: string;
  priority: PriorityType;
  status: TicketStatus;
  room?: string;          // Sala onde será atendido (definido quando chamado)
  floor?: string;         // Andar da sala
  doctorName?: string;    // Nome do médico que chamou
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueState {
  waitingCount: number;
  attendingCount: number;
  lastCalledTicket: Ticket | null;
}