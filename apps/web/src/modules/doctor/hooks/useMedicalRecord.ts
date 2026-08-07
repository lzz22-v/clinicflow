import { useRef, useState } from "react";

export function useMedicalRecord() {
  const editorRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  const save = async (ticketId: string) => {
    if (!editorRef.current) return { ok: false };
    const content = editorRef.current.getContent();

    setSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/api/tickets/${ticketId}/record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicalRecord: content }),
      });
      return { ok: res.ok };
    } catch (err) {
      console.error("Erro ao salvar prontuário:", err);
      return { ok: false };
    } finally {
      setSaving(false);
    }
  };

  return { editorRef, saving, save };
}