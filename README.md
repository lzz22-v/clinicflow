<div align="center">
# 🏥 ClinicFlow — Sistema de Gestão de Consultórios em Tempo Real
 
Painel de recepção, atendimento médico e sala de espera sincronizados em tempo real via WebSockets — sem F5, sem polling manual.
 
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
 
</div>
---
 
## 📋 Sobre o projeto
 
O **ClinicFlow** é um sistema de gestão de filas para consultórios e clínicas, dividido em três telas independentes que conversam entre si em tempo real: **Recepção**, **Painel Médico** e **Sala de Espera (TV)**. Quando a recepção gera uma senha, ela aparece instantaneamente na fila do médico certo. Quando o médico chama um paciente, o telão da sala de espera dispara o alerta sonoro e visual no mesmo instante — tudo orquestrado via WebSockets, sem depender de atualização manual de página.
 
## ✨ Funcionalidades
 
### 🖥️ Dashboard da Recepção
- Cadastro rápido com autopreenchimento por CPF (busca automática do nome do paciente)
- Seleção de especialidade com dropdown de médico dependente
- Classificação por níveis de prioridade (Normal, Idoso, Gestante, Emergência) com identificação visual
- Emissão de ticket para impressora térmica (58mm/80mm)
- Resumo do dia em tempo real (aguardando, em atendimento, finalizados)
- Reinício controlado da fila de senhas
### 🩺 Painel do Médico
- Fila filtrada automaticamente pela especialidade do médico logado
- Controles de atendimento: **Chamar**, **Rechamar** e **Finalizar** consulta
- Editor de prontuário rico (TinyMCE) integrado à tela de atendimento, com autosave do rascunho da consulta em andamento
- **Histórico clínico do paciente**, agregando todos os atendimentos anteriores — independentemente de terem sido feitos por médicos ou especialidades diferentes
### 📺 Sala de Espera (TV)
- Exibição em alto contraste da senha chamada, com nome do paciente, sala, andar e médico
- Histórico visual das últimas chamadas
- Relógio digital sincronizado
- Alerta sonoro (chime) disparado via evento WebSocket no instante da chamada
## 🗄️ Persistência de dados: fila do dia × histórico permanente do paciente
 
Um dos pontos centrais da arquitetura é a separação clara entre dois tipos de dado, propositalmente guardados em tabelas diferentes:
 
| | `tickets` | `medical_records` |
|---|---|---|
| **O que é** | A fila de atendimento do dia | O prontuário clínico permanente |
| **Ciclo de vida** | Efêmero — pode ser limpo a qualquer momento pelo reset diário da recepção | Permanente — nunca é apagado automaticamente |
| **Indexado por** | Senha/atendimento individual | **CPF do paciente** |
| **Sobrevive a um reset de fila?** | Não (é o que é resetado) | **Sim** |
 
Isso significa que, mesmo depois de a recepção reiniciar as senhas do dia seguinte, **o histórico clínico de cada paciente continua acessível** — basta consultar por CPF. Quando uma consulta é finalizada, o conteúdo do prontuário (redigido no editor rico) é copiado do rascunho do ticket para um registro permanente em `medical_records`, vinculado ao paciente e não ao ticket que a originou.
 
```
Consulta em andamento          Consulta finalizada
┌──────────────────┐  finaliza  ┌────────────────────────┐
│  tickets          │ ─────────▶│  medical_records         │
│  medicalRecord     │  copia    │  content (por paciente)  │
│  (rascunho, por     │           │  patientCpf, specialty,  │
│   ticket ativo)      │           │  doctorName, createdAt   │
└──────────────────┘            └────────────────────────┘
        ↑ apagado no reset da fila      ↑ permanece após o reset
```
 
## 🔌 Arquitetura em tempo real
 
Toda ação relevante passa pela API REST, é persistida no banco via Drizzle e, **só após a confirmação da escrita**, dispara um evento WebSocket — evitando telas dessincronizadas do banco.
 
| Evento | Quem emite | Quem escuta | Gatilho |
|---|---|---|---|
| `ticket:created` | Recepção | Painel do Médico | Nova senha gerada |
| `ticket:called` | Médico | Sala de Espera (TV), Recepção | Chamar/Rechamar paciente |
| `ticket:record-updated` | Médico | Painel do Médico | Rascunho de prontuário salvo |
| `ticket:status-updated` | Médico | Recepção, TV | Atendimento finalizado |
| `tickets:reset` | Recepção | Médico, TV | Reinício da fila do dia |
 
## 🛠️ Stack tecnológica
 
| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 14 (App Router) · React 18 · Tailwind CSS |
| **Editor de prontuário** | TinyMCE (isolado via `next/dynamic`, sem SSR) |
| **Backend** | Node.js · TypeScript · Express |
| **ORM / Banco** | Drizzle ORM · PostgreSQL (Supabase) |
| **Tempo real** | Socket.io |
| **Monorepo** | pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`) |
 
## 📁 Estrutura do projeto
 
```
clinic-queue-system/
├── apps/
│   ├── api/              # Backend Node.js + Express + Drizzle + Socket.io
│   │   └── src/
│   │       ├── db/schema/    # Definição das tabelas (tickets, medical_records)
│   │       ├── db/migrations/
│   │       └── routes/       # Rotas REST (tickets.ts)
│   └── web/               # Frontend Next.js
│       └── src/
│           ├── app/           # Rotas: /reception, /doctor, /waiting-room
│           └── modules/       # Componentes e hooks por módulo
├── packages/
│   └── shared/            # Tipos, eventos e dados compartilhados entre front e back
│       └── src/doctors.ts     # Fonte única de verdade: médicos/especialidades/salas
└── pnpm-workspace.yaml
```
 
## 🚀 Como rodar localmente
 
### Pré-requisitos
- Node.js 20+
- pnpm
- Uma instância PostgreSQL (recomendado: [Supabase](https://supabase.com))
### 1. Clone e instale as dependências
 
```bash
git clone <https://github.com/lzz22-v/clinicflow>
cd clinic-queue-system
pnpm install
```
 
### 2. Configure as variáveis de ambiente
 
Crie `apps/api/.env` a partir do `apps/api/.env.example`, preenchendo `DATABASE_URL` com a connection string do seu banco PostgreSQL.
 
### 3. Rode as migrations
 
```bash
cd apps/api
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```
 
### 4. Suba o backend
 
```bash
# em apps/api
npm run dev
# 🚀 Servidor rodando na porta 3001
```
 
### 5. Suba o frontend
 
Em um novo terminal:
 
```bash
cd apps/web
npm run dev
# ▲ Next.js — Local: http://localhost:3000
```
 
### 6. Acesse as telas
 
| Tela | URL |
|---|---|
| Recepção | `http://localhost:3000/reception` |
| Painel Médico | `http://localhost:3000/doctor` |
| Sala de Espera (TV) | `http://localhost:3000/waiting-room` |
 
## 🗺️ Roadmap
 
- [ ] Exportação do prontuário finalizado em PDF (geração client-side a partir do conteúdo do editor)
- [ ] Conectar o histórico do paciente à interface do Painel Médico com dados reais
- [ ] Reset de fila com filtro por data (hoje remove todos os tickets sem distinção)
- [ ] Cadastro de pacientes desacoplado da tabela de tickets
---
 
<div align="center">
Feito com 💙 para tornar a gestão de filas de clínicas mais simples e transparente.
</div>
 
