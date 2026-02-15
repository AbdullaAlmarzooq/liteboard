import React, { useEffect, useMemo, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TicketEditor = ({
  value = "",
  onChange,
  placeholder = "Describe the ticket in detail",
  className = "",
}) => {
  const editorContainerRef = useRef(null);
  const quillInstanceRef = useRef(null);
  const syncingFromPropsRef = useRef(false);
  const onChangeRef = useRef(onChange);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        [{ color: [] }, { background: [] }],
        ["link"],
        ["clean"],
      ],
      clipboard: {
        matchVisual: false,
      },
    }),
    []
  );

  const formats = useMemo(() => [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "blockquote",
    "code-block",
    "color",
    "background",
    "link",
  ], []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorContainerRef.current || quillInstanceRef.current) return;
    // In React StrictMode/dev remounts, Quill may leave an orphan toolbar sibling.
    const prev = editorContainerRef.current.previousElementSibling;
    if (prev && prev.classList.contains("ql-toolbar")) {
      prev.remove();
    }

    const quill = new Quill(editorContainerRef.current, {
      theme: "snow",
      modules,
      formats,
      placeholder,
    });

    quillInstanceRef.current = quill;

    const initialValue = value || "";
    if (initialValue) {
      quill.clipboard.dangerouslyPasteHTML(initialValue);
    }

    const handleTextChange = () => {
      if (syncingFromPropsRef.current) return;
      const html = quill.root.innerHTML;
      if (typeof onChangeRef.current === "function") {
        onChangeRef.current(html === "<p><br></p>" ? "" : html);
      }
    };

    quill.on("text-change", handleTextChange);
    return () => {
      quill.off("text-change", handleTextChange);
      const toolbar = editorContainerRef.current?.previousElementSibling;
      if (toolbar && toolbar.classList.contains("ql-toolbar")) {
        toolbar.remove();
      }
      quillInstanceRef.current = null;
      if (editorContainerRef.current) {
        editorContainerRef.current.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (!quill) return;
    const next = value || "";
    const current = quill.root.innerHTML;
    if (current !== next) {
      syncingFromPropsRef.current = true;
      quill.clipboard.dangerouslyPasteHTML(next);
      syncingFromPropsRef.current = false;
    }
  }, [value]);

  return (
    <div
      className={`ticket-editor rounded-xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <div ref={editorContainerRef} />
      <style>{`
        .ticket-editor .ql-toolbar {
          border: 0;
          border-bottom: 1px solid #e2e8f0;
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
          background: #f8fafc;
        }
        .ticket-editor .ql-container {
          border: 0;
          min-height: 180px;
          font-size: 0.95rem;
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
        }
        .ticket-editor .ql-editor {
          min-height: 180px;
          color: #0f172a;
        }
        .dark .ticket-editor .ql-toolbar {
          background: #0f172a;
          border-bottom-color: #334155;
        }
        .dark .ticket-editor .ql-editor {
          color: #e2e8f0;
        }
        .dark .ticket-editor .ql-picker-label,
        .dark .ticket-editor .ql-stroke {
          color: #cbd5e1;
          stroke: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default TicketEditor;
