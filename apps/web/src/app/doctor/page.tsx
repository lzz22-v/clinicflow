//C:\clinic-queue-system\apps\web\src\app\doctor\page.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MedicalRecordEditor } from "../../modules/doctor/components/MedicalRecordEditor";
import { useMedicalRecord } from "../../modules/doctor/hooks/useMedicalRecord";
import { DOCTORS } from "@clinic/shared";
import { generateRecordPdf } from "../../modules/doctor/utils/generateRecordPdf";

export default function DoctorPage() {
  const [selectedDoctorName, setSelectedDoctorName] = useState("Dr. Marcos Lima");
  const [queue, setQueue] = useState<any[]>([]);
  const [time, setTime] = useState("");
  const [medicalRecordText, setMedicalRecordText] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Estados do Modal de Histórico
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { editorRef, saving, save } = useMedicalRecord();
  const currentDoctor = DOCTORS.find(d => d.name === selectedDoctorName) || DOCTORS[0];

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
    const interval = setInterval(fetchTickets, 5000);

    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  const specialtyQueue = queue.filter(t => t.specialty === currentDoctor.specialty);

  const waitingPatients = specialtyQueue.filter(t => {
    const status = (t.status || "aguardando").toLowerCase();
    return status === "aguardando" || status === "waiting";
  });

  const currentAttending = specialtyQueue.find(t => {
    const status = (t.status || "").toLowerCase();
    return status.includes("atend") || status === "calling";
  });

  useEffect(() => {
    if (currentAttending && currentAttending.medicalRecord) {
      setMedicalRecordText(currentAttending.medicalRecord);
    } else {
      setMedicalRecordText("");
    }
  }, [currentAttending?.id]);

  const handleCallPatient = async (isRecall = false) => {
    const targetPatient = currentAttending || waitingPatients[0];
    if (!targetPatient) {
      alert("Não há pacientes aguardando na fila.");
      return;
    }

    setLoadingAction(true);
    try {
      const res = await fetch(`http://localhost:3001/api/tickets/${targetPatient.id}/call`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorName: currentDoctor.name,
          room: currentDoctor.room
        })
      });

      if (res.ok) {
        fetchTickets();
      } else {
        alert("Erro ao chamar o paciente.");
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleFinishConsultation = async () => {
    if (!currentAttending) return;

    setLoadingAction(true);
    try {
      const res = await fetch(`http://localhost:3001/api/tickets/${currentAttending.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Finalizado" })
      });

      if (res.ok) {
        // Gera o PDF automaticamente caso haja algo digitado no prontuário atual
        if (medicalRecordText && medicalRecordText.trim() !== "") {
          await generateRecordPdf({
            patientName: currentAttending.patientName,
            patientCpf: currentAttending.patientCpf || "",
            specialty: currentDoctor.specialty,
            doctorName: currentDoctor.name,
            content: medicalRecordText,
            date: new Date().toLocaleString('pt-BR')
          });
        }

        setMedicalRecordText("");
        fetchTickets();
      }
    } catch (err) {
      console.error("Erro ao finalizar:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveMedicalRecord = async () => {
    if (!currentAttending) {
      alert("Nenhum paciente em atendimento no momento para salvar o prontuário.");
      return;
    }

    const { ok } = await save(currentAttending.id);
    if (ok) {
      alert("Prontuário salvo com sucesso!");
      fetchTickets();
    } else {
      alert("Erro ao salvar o prontuário no servidor.");
    }
  };

  // ----- FUNÇÕES DO HISTÓRICO E PDF -----
  
  const fetchPatientHistory = async (cpf: string) => {
    if (!cpf) {
      setPatientHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      // Remove a pontuação se houver para não conflitar, caso o backend exija dígitos
      const cleanCpf = cpf.replace(/\D/g, '');
      const res = await fetch(`http://localhost:3001/api/tickets/patient/${cleanCpf}/history`);
      if (res.ok) {
        const data = await res.json();
        setPatientHistory(data);
      } else {
        setPatientHistory([]);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      setPatientHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    if (currentAttending?.patientCpf) {
      fetchPatientHistory(currentAttending.patientCpf);
    } else {
      setPatientHistory([]);
    }
    setShowHistoryModal(true);
  };

  const handleDownloadHistoryPdf = (record: any) => {
    generateRecordPdf({
      patientName: record.patientName,
      patientCpf: record.patientCpf,
      specialty: record.specialty || "Não informada",
      doctorName: record.doctorName || "Não informado",
      content: record.content,
      date: new Date(record.createdAt).toLocaleString('pt-BR')
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800">
      {/* BARRA SUPERIOR DE TELAS */}
      <header className="bg-white border-b h-14 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TELAS:</span>
          <nav className="flex items-center gap-2">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg transition-colors">
              Dashboard Recepção
            </Link>
            <Link href="/ticket" className="text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg transition-colors">
              Ticket Térmico
            </Link>
            <Link href="/doctor" className="text-sm font-semibold bg-blue-600 text-white px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
              Painel Médico
            </Link>
            <Link href="/tv" className="text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg transition-colors">
              Sala de Espera (TV)
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Médico logado:</span>
          <select
            value={selectedDoctorName}
            onChange={(e) => setSelectedDoctorName(e.target.value)}
            className="text-xs border rounded p-1 bg-slate-50 font-medium"
          >
            {DOCTORS.map(d => (
              <option key={d.name} value={d.name}>{d.name} ({d.specialty})</option>
            ))}
          </select>
        </div>
      </header>

      {/* CABEÇALHO DO PERFIL DO MÉDICO */}
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
            {currentDoctor.name.split(" ").pop()?.[0] || "M"}
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 leading-tight">{currentDoctor.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentDoctor.specialty} • {currentDoctor.room}
            </p>
          </div>
        </div>
        <div className="text-blue-600 font-mono font-bold text-lg">
          {time || "18:32:50"}
        </div>
      </div>

      {/* CORPO PRINCIPAL */}
      <div className="flex-1 overflow-auto p-6 flex gap-6">

        {/* COLUNA ESQUERDA: FILA DA ESPECIALIDADE */}
        <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              FILA — {currentDoctor.specialty.toUpperCase()}
            </span>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {waitingPatients.length} aguard.
            </span>
          </div>

          <div className="flex-1 overflow-auto space-y-2">
            {waitingPatients.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                <p className="text-xs font-medium">Fila vazia</p>
              </div>
            ) : (
              waitingPatients.map((t) => (
                <div key={t.id} className="p-3 bg-slate-50 hover:bg-blue-50/50 border rounded-lg transition-colors flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-blue-600 bg-white px-2 py-0.5 rounded border">{t.code}</span>
                    <p className="text-xs font-semibold text-slate-800 mt-1 truncate max-w-[140px]">{t.patientName}</p>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">{t.priority}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: PAINEL DE ATENDIMENTO E PRONTUÁRIO */}
        <div className="flex-1 flex flex-col gap-6 overflow-auto">

          {/* CARD: PACIENTE EM ATENDIMENTO */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">PACIENTE EM ATENDIMENTO</span>
              </div>
              <div className="flex items-center gap-3">
                {currentAttending && (
                  <button
                    onClick={handleOpenHistory}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    📂 Histórico & Prontuários Anteriores
                  </button>
                )}
                <span className="text-xs text-slate-400 font-mono">{time ? time.substring(0, 5) : "--:--"}</span>
              </div>
            </div>

            {currentAttending ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 font-mono">
                      {currentAttending.code}
                    </span>
                    {currentAttending.priority !== 'normal' && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                        ⚠️ {currentAttending.priority}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-3">{currentAttending.patientName}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    CPF: {currentAttending.patientCpf || "Não informado"} • {currentAttending.specialty}
                  </p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {currentDoctor.room}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCallPatient(true)}
                    disabled={loadingAction}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-xs"
                  >
                    🔄 Rechamar
                  </button>
                  <button
                    onClick={() => handleCallPatient(false)}
                    disabled={loadingAction || waitingPatients.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
                  >
                    📢 Chamar Paciente
                  </button>
                  <button
                    onClick={handleFinishConsultation}
                    disabled={loadingAction}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
                  >
                    ✓ Finalizar
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <p className="text-sm font-medium">Nenhum paciente chamado no momento.</p>
                <button
                  onClick={() => handleCallPatient(false)}
                  disabled={waitingPatients.length === 0}
                  className="mt-3 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Chamar Próximo da Fila
                </button>
              </div>
            )}
          </div>

          {/* CAIXA DE PRONTUÁRIO COM TINYMCE */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-semibold text-sm text-slate-800">Prontuário / Anotações da Consulta (TinyMCE)</h3>
              <span className="text-xs text-slate-400">Editor Rico Integrado</span>
            </div>

            <div className="flex-1 flex flex-col">
              {currentAttending ? (
                <MedicalRecordEditor
                  key={currentAttending.id}
                  ticketId={currentAttending.id}
                  initialValue={medicalRecordText}
                  onInit={(editor) => { editorRef.current = editor; }}
                />
              ) : (
                <div className="h-[280px] rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                  Selecione/chame um paciente para habilitar o prontuário.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 mt-4 border-t">
              <button
                onClick={handleSaveMedicalRecord}
                disabled={saving || !currentAttending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? "Salvando..." : "Salvar Prontuário"}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL DE HISTÓRICO DO PACIENTE */}
      {showHistoryModal && currentAttending && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Histórico de Atendimentos</h3>
                <p className="text-xs text-slate-500">Paciente: <span className="font-semibold">{currentAttending.patientName}</span></p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-auto space-y-4 flex-1">
              {!currentAttending.patientCpf ? (
                <div className="py-10 text-center text-slate-500 text-sm">
                  O CPF deste paciente não foi informado. Não é possível buscar o histórico.
                </div>
              ) : loadingHistory ? (
                <div className="py-10 text-center text-slate-500 text-sm animate-pulse">
                  Buscando histórico médico no sistema...
                </div>
              ) : patientHistory.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">
                  Nenhum registro de consulta anterior encontrado para este paciente.
                </div>
              ) : (
                patientHistory.map((record) => (
                  <div key={record.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b pb-2">
                      <span className="font-bold text-blue-600">
                        Data: {new Date(record.createdAt).toLocaleString('pt-BR')}
                      </span>
                      <span>{record.doctorName} ({record.specialty || "Geral"})</span>
                    </div>
                    
                    {/* Renderização segura do conteúdo HTML gerado pelo TinyMCE */}
                    <div 
                      className="text-sm text-slate-700 max-h-48 overflow-y-auto prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: record.content }}
                    />

                    <div className="pt-3 mt-1 border-t flex justify-end">
                      <button
                        onClick={() => handleDownloadHistoryPdf(record)}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        📄 Baixar PDF do Registro
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg text-xs transition-colors"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}