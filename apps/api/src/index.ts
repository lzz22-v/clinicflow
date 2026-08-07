import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { ticketsRouter } from './routes/tickets'; // Importa o router que corrigiremos abaixo

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configuração do Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

app.use(cors());
app.use(express.json());

// Montagem da rota de tickets
app.use('/api/tickets', ticketsRouter);

// Rota de Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

// Compartilha a instância do socket.io
app.set('io', io);

// Gerenciamento de WebSockets
io.on('connection', (socket) => {
  console.log(`🔌 Novo dispositivo conectado: ${socket.id}`);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});