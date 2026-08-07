//C:\clinic-queue-system\apps\web\src\app\reception\page.tsx

"use client";

import { useState, useEffect } from "react";
import { useCreateTicket } from "../../modules/reception/hooks/useCreateTicket";
import { SPECIALTIES, DOCTORS_BY_SPECIALTY } from "@clinic/shared";
import { generateThermalTicketPdf } from "../../modules/reception/utils/generateThermalTicketPdf";

type Priority = "Normal" | "Idoso" | "Gestante" | "Emergência";

export default function ReceptionPage() {
  const [patientName, setPatientName] = useState("");
  const [patientCpf, setPatientCpf] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [doctor, setDoctor] = useState("");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [queue, setQueue] = useState<any[]>([]);
  const [time, setTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const { createTicket, isLoading } = useCreateTicket();

  const fetchTickets = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/tickets");
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      }
    } catch (err) {
      console.error("Erro ao buscar fila:", err);
    }
  };

  useEffect(() => {
    fetchTickets();
    
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR'));
      setCurrentDate(now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setPatientCpf(formatted);

    if (formatted.length === 14) {
      try {
        const res = await fetch(`http://localhost:3001/api/tickets/patient/${encodeURIComponent(formatted)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.patientName) {
            setPatientName(data.patientName);
          }
        }
      } catch (err) {
        console.error("Paciente não encontrado no histórico:", err);
      }
    }
  };

  const handleGenerateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticket = await createTicket({
      patientName,
      patientCpf,
      specialty,
      doctor,
      priority: priority.toLowerCase() as any,
    });

    // Se o ticket foi gerado com sucesso no backend
    if (ticket) {
      // 1. Dispara a geração/impressão do Ticket Térmico
      await generateThermalTicketPdf({
        code: ticket.code || "---",
        patientName: patientName,
        specialty: specialty,
        doctorName: doctor,
        priority: priority,
        date: new Date().toLocaleString('pt-BR')
      });

      // 2. Atualiza a fila e limpa o formulário
      fetchTickets();
      setPatientName("");
      setPatientCpf("");
      setSpecialty("");
      setDoctor("");
      setPriority("Normal");
    }
  };

  const handleReset = async () => {
    if (!confirm("Tem certeza que deseja limpar toda a fila?")) return;

    try {
      const res = await fetch("http://localhost:3001/api/tickets/reset", {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Fila reiniciada com sucesso!");
        fetchTickets(); 
      } else {
        alert("Erro ao reiniciar fila no servidor.");
      }
    } catch (err) {
      console.error("Erro ao comunicar com backend:", err);
      alert("Não foi possível conectar ao servidor.");
    }
  };

  const totalCount = queue.length;
  const waitingCount = queue.filter(t => {
    const s = (t.status || "aguardando").toLowerCase();
    return s === "aguardando" || s === "waiting";
  }).length;
  const attendingCount = queue.filter(t => (t.status || "").toLowerCase().includes("atend")).length;
  const finishedCount = queue.filter(t => (t.status || "").toLowerCase().includes("finalizado")).length;

  const getPriorityStyle = (pri: string) => {
    switch (pri.toLowerCase()) {
      case "emergência": return "text-red-600 bg-red-50 border-red-200";
      case "gestante": return "text-green-600 bg-green-50 border-green-200";
      case "idoso": return "text-orange-500 bg-orange-50 border-orange-200";
      default: return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const getStatusStyle = (status: string = "Aguardando") => {
    switch (status.toLowerCase()) {
      case "em atendimento": 
      case "attending": return "text-orange-500";
      case "finalizado": return "text-green-500";
      default: return "text-blue-500";
    }
  };

  const renderPriorityIcon = (pri: string) => {
    switch (pri.toLowerCase()) {
      case "idoso":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case "gestante":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case "emergência":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r flex flex-col justify-between">
        <div>
          <div className="h-16 flex items-center px-6 border-b">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mr-3">C</div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-slate-800">ClinicFlow</h1>
              <p className="text-xs text-slate-500">Sistema de Gestão</p>
            </div>
          </div>
          
          <nav className="p-4 space-y-1">
            <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-600 rounded-lg font-medium cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg> 
              Dashboard
            </div>
            {["Pacientes", "Médicos", "Histórico"].map(item => (
              <div key={item} className="flex items-center gap-3 p-3 text-slate-500 hover:bg-slate-50 rounded-lg font-medium cursor-pointer transition-colors">
                <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                </svg> 
                {item}
              </div>
            ))}
          </nav>
        </div>

        {/* RESUMO DO DIA */}
        <div className="p-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h3 className="text-sm font-bold text-blue-600 mb-3">Resumo do Dia</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between text-slate-600"><span>Total</span> <span className="font-bold">{totalCount}</span></li>
              <li className="flex justify-between text-slate-600"><span>Aguardando</span> <span className="font-bold text-blue-600">{waitingCount}</span></li>
              <li className="flex justify-between text-slate-600"><span>Em Atend.</span> <span className="font-bold text-orange-500">{attendingCount}</span></li>
              <li className="flex justify-between text-slate-600"><span>Finalizados</span> <span className="font-bold text-green-500">{finishedCount}</span></li>
            </ul>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-blue-600 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg> 
            {time}
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-500 capitalize">{currentDate}</span>
            <button 
              onClick={handleReset} 
              className="text-red-500 text-sm font-medium border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reiniciar Senhas
            </button>
          </div>
        </header>

        {/* DASHBOARD GRID */}
        <div className="flex-1 overflow-auto p-8 flex gap-8">
          
          {/* COLUNA ESQUERDA: CADASTRO */}
          <div className="w-[400px] shrink-0 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-fit">
            <h2 className="font-semibold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-blue-500">
                <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </span> 
              Cadastro Rápido
            </h2>
            
            <form onSubmit={handleGenerateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">CPF do Paciente</label>
                <input 
                  value={patientCpf} 
                  onChange={handleCpfChange} 
                  placeholder="000.000.000-00" 
                  maxLength={14}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-slate-50 font-mono" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome do Paciente</label>
                <input 
                  value={patientName} 
                  onChange={(e) => setPatientName(e.target.value)} 
                  placeholder="Nome completo" 
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-slate-50" 
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Especialidade</label>
                <select 
                  value={specialty} 
                  onChange={(e) => {
                    setSpecialty(e.target.value);
                    setDoctor(""); // Reseta o médico ao trocar a especialidade
                  }} 
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-slate-50"
                  required
                >
                  <option value="" disabled>Selecionar...</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Médico</label>
                <select 
                  value={doctor} 
                  onChange={(e) => setDoctor(e.target.value)} 
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-slate-50"
                  required
                  disabled={!specialty}
                >
                  <option value="" disabled>{specialty ? "Selecionar médico..." : "Selecione a especialidade primeiro"}</option>
                  {specialty && DOCTORS_BY_SPECIALTY[specialty]?.map(d => (
                    <option key={d.name} value={d.name}>{d.name} ({d.room})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Nível de Prioridade</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["Normal", "Idoso", "Gestante", "Emergência"] as Priority[]).map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setPriority(pri)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border flex justify-center items-center gap-2 transition-all ${
                        priority === pri 
                          ? "border-blue-500 bg-blue-50 text-blue-700" 
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {renderPriorityIcon(pri)}
                      {pri}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-blue-500 text-white font-medium p-4 rounded-xl hover:bg-blue-600 transition-colors mt-4 flex justify-center items-center gap-2 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {isLoading ? "Processando..." : "Gerar Senha e Imprimir Ticket"}
              </button>
            </form>
          </div>

          {/* COLUNA DIREITA: FILA */}
          <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-semibold text-lg text-slate-800">Fila Geral do Dia</h2>
              <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{totalCount}</span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-4 font-medium pl-2">Senha</th>
                    <th className="pb-4 font-medium">Paciente</th>
                    <th className="pb-4 font-medium">Especialidade / Médico</th>
                    <th className="pb-4 font-medium">Hora</th>
                    <th className="pb-4 font-medium">Prioridade</th>
                    <th className="pb-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Nenhum paciente na fila.</td>
                    </tr>
                  ) : (
                    queue.map((t: any) => {
                      const ticketCode = t.code || `A00${t.id}`;
                      
                      const ticketSpecialty = t.specialty || "Não informada";
                      const ticketDoctor = t.doctorName || "Não designado";
                      const ticketCpf = t.patientCpf || t.patient_cpf || "CPF não informado";
                      
                      // Busca o consultório do médico cadastrado se houver
                      let doctorRoom = t.room;
                      if (!doctorRoom && ticketDoctor !== "Não designado") {
                        for (const specDocs of Object.values(DOCTORS_BY_SPECIALTY)) {
                          const foundDoc = specDocs.find(d => d.name === ticketDoctor);
                          if (foundDoc) {
                            doctorRoom = foundDoc.room;
                            break;
                          }
                        }
                      }
                      doctorRoom = doctorRoom || "Consultório • 3º andar";

                      const rawTime = t.createdAt || t.created_at || t.time;
                      const ticketTime = rawTime 
                        ? new Date(rawTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                      const status = t.status || "Aguardando";
                      const pri = t.priority ? (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) : "Normal";

                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-4 pl-2">
                            <span className="bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-md text-sm border border-blue-100">
                              {ticketCode}
                            </span>
                          </td>
                          <td className="py-4">
                            <p className="font-semibold text-slate-800 text-sm">{t.patientName}</p>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">{ticketCpf}</p>
                          </td>
                          <td className="py-4">
                            <p className="text-sm text-slate-700">{ticketSpecialty}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{ticketDoctor} • <span className="text-slate-400">{doctorRoom}</span></p>
                          </td>
                          <td className="py-4 text-sm text-slate-600">{ticketTime}</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${getPriorityStyle(pri)}`}>
                              {renderPriorityIcon(pri)}
                              {pri}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full bg-current ${getStatusStyle(status)}`}></div>
                              <span className={`text-xs font-semibold ${getStatusStyle(status)}`}>{status}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}