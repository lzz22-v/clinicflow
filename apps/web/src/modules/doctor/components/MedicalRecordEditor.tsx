"use client";

import dynamic from "next/dynamic";
import type { IAllProps } from "@tinymce/tinymce-react/lib/es2015/main/ts/components/Editor";
import type { ComponentType } from "react";

const TinyEditor = dynamic(
  () => import("@tinymce/tinymce-react").then((mod) => mod.Editor as ComponentType<IAllProps>),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
    ),
  }
);

interface MedicalRecordEditorProps {
  ticketId: string;
  initialValue: string;
  onInit: (editor: any) => void;
}

export function MedicalRecordEditor({ ticketId, initialValue, onInit }: MedicalRecordEditorProps) {
  return (
    <TinyEditor
      id={`medical-record-editor-${ticketId}`}
      apiKey="pf2t9sgabrg0fgdg3v8yg6v4zuyd5pechxdfyl0qo9koatqs"
      onInit={(_evt: any, editor: any) => onInit(editor)}
      initialValue={initialValue || "<p>Digite aqui as queixas, exame físico, hipótese diagnóstica e prescrição...</p>"}
      init={{
        height: 280,
        menubar: false,
        plugins: [
          "advlist", "autolink", "lists", "link", "image", "charmap", "preview",
          "anchor", "searchreplace", "visualblocks", "code", "fullscreen",
          "insertdatetime", "media", "table", "help", "wordcount",
        ],
        toolbar:
          "undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help",
        content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
      }}
    />
  );
}