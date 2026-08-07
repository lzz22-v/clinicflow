import { useState } from 'react';

// Tipagem dos dados que vamos enviar para a API
interface CreateTicketPayload {
  patientName: string;
  patientCpf?: string;
  priority: 'normal' | 'elderly' | 'pregnant' | 'disability' | 'emergency';
  specialty?: string;
  doctor?: string;
}

// Tipagem da resposta que esperamos da API
interface TicketResponse {
  id: string;
  code: string;
  patientName: string;
  patientCpf?: string | null;
  priority: string;
  status: string;
  room: string | null;
  doctorName: string | null;
  createdAt: string;
}

export function useCreateTicket() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTicket = async (data: CreateTicketPayload): Promise<TicketResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Apontando para o nosso backend rodando localmente
      const response = await fetch('http://localhost:3001/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao comunicar com o servidor e gerar a senha.');
      }

      const newTicket: TicketResponse = await response.json();
      return newTicket;
    } catch (err: any) {
      console.error("Erro no hook useCreateTicket:", err);
      setError(err.message || 'Ocorreu um erro inesperado ao conectar com a API.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createTicket,
    isLoading,
    error,
  };
}