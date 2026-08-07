import { Router } from 'express';
import { db } from '../db';
import { tickets, medicalRecords } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// Normaliza CPF para conter apenas dígitos, garantindo consistência
// entre o que é salvo e o que é buscado.
function normalizeCpf(cpf: string | undefined | null): string | undefined {
  if (!cpf) return undefined;
  return cpf.replace(/\D/g, '');
}

// 1. Rota para Gerar Nova Senha
router.post('/', async (req, res) => {
  try {
    const { patientName, patientCpf, priority, doctor, specialty } = req.body;

    if (!patientName || !priority) return res.status(400).json({ error: 'Dados incompletos.' });

    const lastTickets = await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(1);
    let sequence = 1;
    if (lastTickets.length > 0) {
      const lastNum = parseInt(lastTickets[0].code.substring(1), 10);
      if (!isNaN(lastNum)) sequence = lastNum + 1;
    }

    const code = `${priority === 'normal' ? 'N' : 'P'}${String(sequence).padStart(3, '0')}`;

    const [newTicket] = await db.insert(tickets).values({
      code,
      patientName,
      patientCpf: normalizeCpf(patientCpf), // sempre grava só dígitos
      priority,
      specialty,
      doctorName: doctor,
      status: 'waiting'
    }).returning();

    req.app.get('io').emit('ticket:created', newTicket);
    return res.status(201).json(newTicket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar senha.' });
  }
});

// 2. Rota para Listar Senhas
router.get('/', async (req, res) => {
  try {
    const allTickets = await db.select().from(tickets).orderBy(desc(tickets.createdAt));
    return res.json(allTickets);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar senhas.' });
  }
});

// 3. Rota para Buscar Paciente por CPF (Autopreenchimento)
router.get('/patient/:cpf', async (req, res) => {
  try {
    const cleanCpf = normalizeCpf(req.params.cpf);

    if (!cleanCpf || cleanCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    const [foundTicket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.patientCpf, cleanCpf)) // corrigido: usa cleanCpf, não o cru
      .orderBy(desc(tickets.createdAt))
      .limit(1);

    if (!foundTicket) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    return res.json({ patientName: foundTicket.patientName });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar paciente.' });
  }
});

// 4. Rota para Chamar/Atualizar Status
router.patch('/:id/call', async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorName, room } = req.body;

    if (!doctorName || !room) return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });

    const [updatedTicket] = await db
      .update(tickets)
      .set({ status: 'calling', doctorName, room, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();

    if (!updatedTicket) return res.status(404).json({ error: 'Senha não encontrada.' });

    req.app.get('io').emit('ticket:called', updatedTicket);
    return res.json(updatedTicket);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar senha.' });
  }
});

// 5. Rota para Salvar/Atualizar o Prontuário (rascunho da consulta em andamento)
router.patch('/:id/record', async (req, res) => {
  try {
    const { id } = req.params;
    const { medicalRecord } = req.body;

    if (typeof medicalRecord !== 'string') {
      return res.status(400).json({ error: 'Conteúdo do prontuário inválido.' });
    }

    const [updatedTicket] = await db
      .update(tickets)
      .set({ medicalRecord, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();

    if (!updatedTicket) return res.status(404).json({ error: 'Senha não encontrada.' });

    req.app.get('io').emit('ticket:record-updated', updatedTicket);
    return res.json(updatedTicket);
  } catch (error) {
    console.error('Erro ao salvar prontuário:', error);
    return res.status(500).json({ error: 'Erro ao salvar prontuário.' });
  }
});

// 6. Rota para Atualizar Status (ex: Finalizar Consulta)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status é obrigatório.' });

    const [existingTicket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    if (!existingTicket) return res.status(404).json({ error: 'Senha não encontrada.' });

    const isFinishing = status.toLowerCase() === 'finalizado';

    if (isFinishing && existingTicket.patientCpf && existingTicket.medicalRecord) {
      await db.insert(medicalRecords).values({
        sourceTicketId: existingTicket.id,
        patientCpf: existingTicket.patientCpf,
        patientName: existingTicket.patientName,
        specialty: existingTicket.specialty,
        doctorName: existingTicket.doctorName,
        content: existingTicket.medicalRecord,
      });
    }

    const [updatedTicket] = await db
      .update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();

    req.app.get('io').emit('ticket:status-updated', updatedTicket);
    return res.json(updatedTicket);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

// 7. Rota para buscar o HISTÓRICO de prontuários de um paciente por CPF
router.get('/patient/:cpf/history', async (req, res) => {
  try {
    const cleanCpf = normalizeCpf(req.params.cpf);

    if (!cleanCpf || cleanCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    const history = await db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.patientCpf, cleanCpf)) // corrigido: usa cleanCpf, não o cru
      .orderBy(desc(medicalRecords.createdAt));

    return res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

// 8. Rota para Reiniciar (Limpar) a Fila
router.delete('/reset', async (req, res) => {
  try {
    await db.delete(tickets).execute();
    req.app.get('io').emit('tickets:reset');
    return res.status(200).json({ message: 'Fila reiniciada com sucesso.' });
  } catch (error) {
    console.error('Erro ao reiniciar fila:', error);
    return res.status(500).json({ error: 'Erro ao reiniciar fila.' });
  }
});

export { router as ticketsRouter };