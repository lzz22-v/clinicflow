export interface ThermalTicketData {
  code: string;
  patientName: string;
  specialty: string;
  doctorName: string;
  priority: string;
  date: string;
}

export async function generateThermalTicketPdf(data: ThermalTicketData) {
  if (typeof window === "undefined") return;

  const html2pdf = (await import("html2pdf.js")).default;

  // Criamos o HTML simulando o visual de um cupom térmico (preto e branco, monospace)
  const element = document.createElement("div");
  element.innerHTML = `
    <div style="width: 260px; padding: 10px; font-family: 'Courier New', Courier, monospace; text-align: center; color: #000; background: #fff;">
      <h2 style="margin: 0; font-size: 18px; font-weight: bold;">ClinicFlow</h2>
      <p style="margin: 5px 0 10px 0; font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
        Ticket de Atendimento
      </p>
      
      <p style="margin: 0; font-size: 12px; text-transform: uppercase;">Senha</p>
      <h1 style="font-size: 48px; margin: 5px 0; font-weight: bold; letter-spacing: 2px;">
        ${data.code}
      </h1>
      
      <div style="font-size: 16px; font-weight: bold; text-transform: uppercase; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 15px 0;">
        ${data.priority === 'Normal' ? 'Atendimento Normal' : `Prioridade: ${data.priority}`}
      </div>
      
      <div style="text-align: left; font-size: 12px; margin-bottom: 15px; line-height: 1.5;">
        <p style="margin: 2px 0;"><strong>Paciente:</strong><br/>${data.patientName}</p>
        <p style="margin: 2px 0; margin-top: 6px;"><strong>Especialidade:</strong><br/>${data.specialty}</p>
        <p style="margin: 2px 0; margin-top: 6px;"><strong>Médico:</strong><br/>${data.doctorName}</p>
      </div>
      
      <p style="margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px;">
        Aguarde ser chamado no painel.<br/>
        Emissão: ${data.date}
      </p>
    </div>
  `;

  // Configuração para impressora térmica: Largura de 80mm e Altura automática/dinâmica
  const options = {
    margin: 2,
    filename: `Ticket_${data.code}.pdf`,
    image: { type: "jpeg" as const, quality: 1.0 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { 
      unit: "mm" as const, 
      format: [80, 150] as [number, number], // 80mm de largura por 150mm de altura
      orientation: "portrait" as const 
    }
  };

  try {
    // Para abrir direto a janela de impressão no navegador, ao invés de apenas baixar:
    // Nós geramos o blob, abrimos num iframe escondido e acionamos o print().
    // Mas para manter a simplicidade e garantir que funciona em qualquer navegador, 
    // faremos o download do arquivo que o recepcionista pode mandar imprimir.
    await html2pdf().from(element).set(options).save();
  } catch (err) {
    console.error("Erro ao gerar Ticket:", err);
  }
}