//C:\clinic-queue-system\apps\web\src\app\tv\page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { DOCTORS_BY_SPECIALTY } from "@clinic/shared";

export default function TvPanelPage() {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [queue, setQueue] = useState<any[]>([]);
  const [currentCall, setCurrentCall] = useState<any | null>(null);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(true); // Bloqueio do navegador
  
  // id do paciente atualmente exibido no card principal (troca quando muda de paciente)
  const lastDisplayedId = useRef<string | null>(null);
  // chave (id + updatedAt) do último anúncio de voz que REALMENTE tocou.
  // Só é atualizada depois que o áudio toca de fato — nunca enquanto isMuted for true.
  // Isso garante que: (a) uma chamada que chegou antes do usuário desmutar ainda
  // vai tocar assim que ele desmutar, e (b) um "Rechamar" (mesmo id, updatedAt novo)
  // sempre gera um novo anúncio.
  const lastAnnouncedKey = useRef<string | null>(null);
  // guarda o ticket mais recente pendente de anúncio, pra poder tocar na hora
  // em que o usuário clica em "ativar áudio", sem esperar o próximo polling
  const pendingCallRef = useRef<any | null>(null);
  // O polling (useEffect com deps=[]) roda numa closure fixada no momento do mount,
  // então uma leitura direta de `isMuted` ali dentro fica "congelada" pra sempre em
  // `true`, mesmo depois do setIsMuted(false). Usamos um ref sincronizado como fonte
  // de verdade pra leitura dentro do polling — refs não sofrem desse problema.
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Relógio
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca de Dados (Polling para tempo real)
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/tickets");
        if (res.ok) {
          const data = await res.json();
          setQueue(data);
          processCallQueue(data);
        }
      } catch (err) {
        console.error("Erro ao buscar fila na TV:", err);
      }
    };

    fetchTickets();
    const interval = setInterval(fetchTickets, 3000); // Atualiza a cada 3 segundos
    return () => clearInterval(interval);
  }, []);

  // O campo `room` do médico vem como uma string composta, ex: "Consultório 1 • 3º andar".
  // Extrair dígitos/substrings da string inteira (como era feito antes) mistura o número
  // da sala com o do andar. Aqui separamos os dois pedaços de forma explícita.
  const parseRoomInfo = (roomString?: string) => {
    const raw = (roomString || "").trim();
    const parts = raw.split("•").map(p => p.trim()).filter(Boolean);

    // Primeira parte = "Consultório N" / "Sala N"; segunda parte = "Xº andar" (se existir)
    const roomLabel = parts[0] || raw || "Consultório";
    const floorSource = parts[1] || raw;

    const roomNumberMatch = roomLabel.match(/\d+/);
    const roomNumber = roomNumberMatch ? roomNumberMatch[0] : "---";

    const floorMatch = floorSource.match(/(\d+)\s*º?\s*andar/i);
    const floorLabel = floorMatch ? `${floorMatch[1]}º` : (/t[eé]rreo/i.test(floorSource) ? "Térreo" : "---");

    return { roomLabel, roomNumber, floorLabel };
  };

  // Função para saber se um status representa "paciente sendo chamado / em atendimento"
  // IMPORTANTE: o backend só seta 'calling' (via PATCH /:id/call). Nunca seta 'attending'
  // nem nada com "atend" no meio — isso precisa ser reconhecido explicitamente aqui,
  // do mesmo jeito que já é feito em doctor/page.tsx.
  const isBeingAttended = (status: string) => {
    const s = (status || "").toLowerCase();
    return s.includes("atend") || s === "attending" || s === "calling";
  };

  // Toca o anúncio (chime + voz) para um ticket e só marca como anunciado
  // DEPOIS que o play() do chime confirmar sucesso (ver playAudioNotification)
  const announceCall = (ticket: any, key: string) => {
    playAudioNotification(ticket, () => {
      lastAnnouncedKey.current = key;
      pendingCallRef.current = null;
    });
  };

  // Função para processar quem está sendo chamado agora
  const processCallQueue = (allTickets: any[]) => {
    // Pega todos os tickets que estão sendo chamados / em atendimento (tolerante a variações)
    const attending = allTickets.filter(t => isBeingAttended(t.status));
    
    if (attending.length === 0) return;

    // Ordena para pegar o que foi chamado por último de forma segura
    const latestCall = attending.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || a.time || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || b.time || 0).getTime();
      return timeB - timeA;
    })[0];

    // Chave que muda tanto ao trocar de paciente quanto ao "Rechamar" o mesmo paciente
    // (rechamar mantém o id, mas atualiza o updatedAt no backend)
    const callKey = `${latestCall.id}:${latestCall.updatedAt || latestCall.createdAt || ""}`;

    // Atualiza a exibição do card principal sempre que o paciente mostrado mudar
    if (latestCall.id !== lastDisplayedId.current) {
      lastDisplayedId.current = latestCall.id;

      // Atualiza o histórico
      const historyList = allTickets
        .filter(t => t.id !== latestCall.id && ((t.status || "").toLowerCase().match(/atend|finalizado/) || (t.status || "").toLowerCase() === "calling"))
        .sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || a.time || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || b.time || 0).getTime();
          return timeB - timeA;
        })
        .slice(0, 3);
      setCallHistory(historyList);
    }
    setCurrentCall(latestCall);

    // Se essa chamada específica (id + updatedAt) ainda não foi anunciada em voz alta...
    if (callKey !== lastAnnouncedKey.current) {
      pendingCallRef.current = { ticket: latestCall, key: callKey };

      // ...só toca se o áudio já estiver liberado. Lê do ref (não do state) porque
      // esta função vive dentro de um polling cuja closure não recebe atualizações
      // do state depois do mount — ver comentário do isMutedRef acima.
      if (!isMutedRef.current) {
        announceCall(latestCall, callKey);
      }
    }
  };

  // Função que toca o Chime e depois a Voz.
  // onSuccess só é chamado se o play() realmente for aceito pelo navegador —
  // se for bloqueado, quem chamou (announceCall) não marca a chamada como anunciada,
  // então ela continua pendente e será tentada de novo (próximo poll ou próximo clique).
  const playAudioNotification = (ticket: any, onSuccess?: () => void) => {
    const ticketCode = ticket.code || `A00${ticket.id}`;
    const patientName = ticket.patientName || "Paciente";
    
    // Descobre o consultório (string bruta, pode vir como "Consultório 1 • 3º andar")
    let rawRoom = ticket.room || "Consultório";
    if (ticket.doctorName) {
       for (const specDocs of Object.values(DOCTORS_BY_SPECIALTY)) {
         const found = (specDocs as any[]).find(d => d.name === ticket.doctorName);
         if (found) rawRoom = found.room;
       }
    }
    // Só o consultório é falado — o andar não é necessário na chamada de voz
    const { roomLabel } = parseRoomInfo(rawRoom);

    const audio = new Audio('/chime.mp3');

    // Toca o Chime
    audio.play()
      .then(() => {
        onSuccess?.();
        // Leitura da senha começa 4s depois do INÍCIO do chime — não depende mais
        // de esperar o áudio inteiro terminar (audio.onended), que gerava mais atraso.
        setTimeout(() => {
          speakText(`Paciente ${patientName}, senha ${ticketCode}. Compareça ao ${roomLabel}.`);
        }, 4000);
      })
      .catch(e => {
        console.log("Áudio bloqueado pelo navegador", e);
        // Se o navegador recusou o play mesmo com isMuted=false (ex: perdeu a permissão
        // após muito tempo sem interação), reabre o overlay pra o usuário reativar.
        // A chamada NÃO é marcada como anunciada (onSuccess não roda), então assim que
        // o áudio for reativado ela toca automaticamente, sem precisar recarregar a página.
        setIsMuted(true);
      });
  };

  // Text to Speech
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9; // Velocidade um pouco mais lenta para ficar claro
      utterance.pitch = 1;

      // Tenta pegar a melhor voz em português disponível.
      // IMPORTANTE: vozes "Online"/"Natural" (ex: Microsoft Natural) dependem de uma
      // chamada de rede pra nuvem antes de tocar — isso é o que causa o atraso de
      // alguns segundos antes da leitura começar. Priorizamos vozes locais
      // (localService: true), que respondem quase instantaneamente.
      const voices = window.speechSynthesis.getVoices();
      const ptBrVoices = voices.filter(v => v.lang === 'pt-BR');
      const localVoice = ptBrVoices.find(v => v.localService);

      if (localVoice) {
        utterance.voice = localVoice;
      } else if (ptBrVoices.length > 0) {
        utterance.voice = ptBrVoices[0];
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  // Para liberar o áudio no navegador
  const handleUnlockAudio = () => {
    setIsMuted(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices(); 
    }

    // Se já havia uma chamada pendente de anúncio (chegou enquanto estava mudo),
    // toca ela imediatamente em vez de esperar o próximo ciclo de polling (até 3s).
    if (pendingCallRef.current) {
      const { ticket, key } = pendingCallRef.current;
      announceCall(ticket, key);
    }
  };

  // Lógica de exibição do Card Principal
  const displayCode = currentCall?.code || "---";
  const displayName = currentCall?.patientName || "Aguardando chamada...";
  const displayDoctor = currentCall?.doctorName || "---";
  
  let rawDisplayRoom = currentCall?.room || "---";
  if (currentCall?.doctorName) {
     for (const specDocs of Object.values(DOCTORS_BY_SPECIALTY)) {
       const found = (specDocs as any[]).find(d => d.name === currentCall.doctorName);
       if (found) rawDisplayRoom = found.room;
     }
  }
  const { roomNumber: displayRoomNumber, floorLabel: displayFloor } = parseRoomInfo(rawDisplayRoom);

  // Estatísticas corrigidas e tolerantes a variações
  const waitingCount = queue.filter(t => {
    const s = (t.status || "aguardando").toLowerCase();
    return s === "aguardando" || s === "waiting";
  }).length;

  const attendingCount = queue.filter(t => isBeingAttended(t.status)).length;

  return (
    <div className="min-h-screen bg-[#070D1F] font-sans text-white flex flex-col relative overflow-hidden">
      
      {/* ALERTA DE BLOQUEIO DE ÁUDIO */}
      {isMuted && (
        <div className="absolute inset-0 z-50 bg-[#070D1F]/90 backdrop-blur-sm flex items-center justify-center">
          <button 
            onClick={handleUnlockAudio}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-2xl shadow-xl transition-transform hover:scale-105 flex items-center gap-4"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            Clique aqui para ativar o Painel de Voz
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="h-20 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">C</div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-wide">CLINICFLOW</h1>
            <p className="text-slate-400 text-xs tracking-widest mt-1">PAINEL DE CHAMADAS</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          Sistema ativo 
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1"></span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 pt-2 flex gap-8">
        
        {/* ESQUERDA: CHAMADA ATUAL */}
        <div className="flex-1 flex flex-col">
          <h2 className="text-slate-400 text-sm font-semibold tracking-widest mb-4">ÚLTIMA SENHA CHAMADA</h2>
          
          <div className="flex-1 bg-gradient-to-br from-[#1A3A7A] to-[#0D2254] rounded-[2rem] border border-blue-500/20 shadow-2xl flex flex-col items-center justify-center p-12 relative overflow-hidden">
            {/* Efeito de brilho de fundo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-blue-400/20 blur-[100px] rounded-full pointer-events-none"></div>

            <h1 className="text-[12rem] font-bold leading-none tracking-tight text-white mb-6 drop-shadow-lg">
              {displayCode}
            </h1>
            
            <h2 className="text-4xl font-bold text-white mb-12 text-center drop-shadow-md">
              {displayName}
            </h2>

            <div className="flex items-center gap-16 text-center mt-auto">
              <div>
                <p className="text-blue-200/70 text-sm font-bold tracking-widest mb-2">SALA</p>
                <p className="text-3xl font-bold">{displayRoomNumber}</p>
              </div>
              
              <div className="w-px h-12 bg-white/10"></div>
              
              <div>
                <p className="text-blue-200/70 text-sm font-bold tracking-widest mb-2">ANDAR</p>
                <p className="text-3xl font-bold">{displayFloor}</p>
              </div>
              
              <div className="w-px h-12 bg-white/10"></div>
              
              <div>
                <p className="text-blue-200/70 text-sm font-bold tracking-widest mb-2">MÉDICO</p>
                <p className="text-2xl font-medium mt-1">{displayDoctor}</p>
              </div>
            </div>
          </div>
        </div>

        {/* DIREITA: SIDEBAR */}
        <aside className="w-[420px] flex flex-col gap-6">
          
          {/* RELÓGIO */}
          <div className="bg-[#10182E] rounded-3xl border border-white/5 p-8 flex flex-col items-center justify-center shadow-lg h-[160px]">
            <div className="text-5xl font-bold tracking-wider tabular-nums flex items-baseline">
              {currentTime.split(':')[0]}:{currentTime.split(':')[1]}
              <span className="text-2xl text-slate-500 ml-1">:{currentTime.split(':')[2]}</span>
            </div>
            <p className="text-slate-400 mt-2 text-sm capitalize">{currentDate}</p>
          </div>

          {/* HISTÓRICO */}
          <div className="bg-[#10182E] rounded-3xl border border-white/5 p-6 flex-1 shadow-lg flex flex-col">
            <h3 className="text-slate-400 text-sm font-semibold tracking-widest mb-6">ÚLTIMAS CHAMADAS</h3>
            
            <div className="space-y-4">
              {callHistory.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Nenhum histórico ainda.</p>
              ) : (
                callHistory.map((call) => (
                  <div key={call.id} className="bg-[#18233F] rounded-2xl p-4 flex items-center gap-4">
                    <div className="text-2xl font-bold text-white w-20">
                      {call.code || `A00${call.id}`}
                    </div>
                    <div>
                      <p className="font-semibold text-white truncate max-w-[200px]">{call.patientName}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {call.room || "Consultório"} • {new Date(call.updatedAt || call.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ESTATÍSTICAS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#10182E] rounded-3xl border border-white/5 p-6 flex flex-col items-center justify-center shadow-lg">
              <span className="text-4xl font-bold text-orange-500">{attendingCount}</span>
              <span className="text-slate-400 text-xs font-semibold tracking-widest mt-2">EM ATEND.</span>
            </div>
            <div className="bg-[#10182E] rounded-3xl border border-white/5 p-6 flex flex-col items-center justify-center shadow-lg">
              <span className="text-4xl font-bold text-blue-400">{waitingCount}</span>
              <span className="text-slate-400 text-xs font-semibold tracking-widest mt-2">AGUARDANDO</span>
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}