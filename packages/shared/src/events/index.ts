export const QUEUE_EVENTS = {
  // Eventos emitidos pela recepção/médicos para o servidor
  TICKET_CREATE: 'ticket:create',
  TICKET_CALL: 'ticket:call',
  TICKET_START_ATTENDANCE: 'ticket:start-attendance',
  TICKET_COMPLETE: 'ticket:complete',
  TICKET_MARK_ABSENT: 'ticket:mark-absent',

  // Eventos emitidos pelo servidor para o painel da TV e recepção
  QUEUE_UPDATED: 'queue:updated',
  TICKET_CALLED: 'ticket:called', // Dispara o som na TV
} as const;

export type QueueEvents = typeof QUEUE_EVENTS[keyof typeof QUEUE_EVENTS];