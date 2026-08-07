export interface PdfRecordData {
  patientName: string;
  patientCpf: string;
  specialty: string;
  doctorName: string;
  room?: string;
  content: string; // HTML salvo pelo TinyMCE
  date: string;
}

export async function generateRecordPdf(data: PdfRecordData) {
  if (typeof window === "undefined") return;

  // Importação dinâmica para garantir que rode apenas no browser
  const html2pdf = (await import("html2pdf.js")).default;

  // Cria um elemento temporário invisível estruturado para o PDF
  const element = document.createElement("div");
  element.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: 0 auto;">
      <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; color: #1e293b; font-size: 20px;">ClinicFlow — Prontuário Médico</h2>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Comprovante de Atendimento / Histórico Clínico</p>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          <strong>Data:</strong> ${data.date}
        </div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0;"><strong>Paciente:</strong> ${data.patientName}</td>
            <td style="padding: 4px 0;"><strong>CPF:</strong> ${data.patientCpf || "Não informado"}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Especialidade:</strong> ${data.specialty}</td>
            <td style="padding: 4px 0;"><strong>Médico:</strong> ${data.doctorName}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 20px;">
        <h4 style="font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; color: #334155;">Anotações / Prescrição:</h4>
        <div style="font-size: 14px; line-height: 1.6; margin-top: 10px;">
          ${data.content}
        </div>
      </div>

      <div style="margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 11px; color: #94a3b8;">
        Documento gerado eletronicamente via ClinicFlow • ${data.doctorName} (${data.specialty})
      </div>
    </div>
  `;

  const options = {
    margin: 10,
    filename: `Prontuario_${data.patientName.replace(/\s+/g, "_")}_${data.date.split(" ")[0].replace(/\//g, "-")}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const }
  };

  try {
    await html2pdf().from(element).set(options).save();
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    alert("Não foi possível gerar o PDF.");
  }
}