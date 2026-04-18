import React, { useEffect, useMemo, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const TicketEditor = ({
  value = "",
  onChange,
  placeholder = "Describe the ticket in detail",
  className = "",
  readOnly = false,
  maxLength = null,
}) => {
  const editorContainerRef = useRef(null);
  const quillInstanceRef = useRef(null);
  const syncingFromPropsRef = useRef(false);
  const lastEmittedHtmlRef = useRef(value || "");
  const onChangeRef = useRef(onChange);
  const maxLengthRef = useRef(maxLength);
  const normalizeHtml = (html = "") =>
    String(html)
      .replace(/&nbsp;/g, " ")
      .replace(/\u200B/g, "")
      .trim();

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
    maxLengthRef.current = maxLength;
  }, [maxLength]);

  useEffect(() => {
    if (!editorContainerRef.current || quillInstanceRef.current) return;
    // In React StrictMode/dev remounts, Quill may leave an orphan toolbar sibling.
    const prev = editorContainerRef.current.previousElementSibling;
    if (prev && prev.classList.contains("ql-toolbar")) {
      prev.remove();
    }

    const quill = new Quill(editorContainerRef.current, {
      theme: "snow",
      modules: readOnly
        ? {
            toolbar: false,
            clipboard: {
              matchVisual: false,
            },
          }
        : modules,
      formats,
      placeholder,
      readOnly,
    });

    quillInstanceRef.current = quill;

    const initialValue = value || "";
    if (initialValue) {
      quill.clipboard.dangerouslyPasteHTML(initialValue);
    }
    lastEmittedHtmlRef.current = quill.root.innerHTML;

    const handleTextChange = () => {
      if (syncingFromPropsRef.current) return;

      const activeMaxLength = Number(maxLengthRef.current);
      if (Number.isFinite(activeMaxLength) && activeMaxLength > 0) {
        const plainText = quill.getText().replace(/\n$/, "");
        if (plainText.length > activeMaxLength) {
          const overflowCount = plainText.length - activeMaxLength;
          const deleteStartIndex = Math.max(0, quill.getLength() - 1 - overflowCount);
          quill.deleteText(deleteStartIndex, overflowCount, "silent");
        }
      }

      const html = quill.root.innerHTML;
      lastEmittedHtmlRef.current = html;
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
    const nextNorm = normalizeHtml(next);
    const currentNorm = normalizeHtml(current);
    const lastEmittedNorm = normalizeHtml(lastEmittedHtmlRef.current);

    if (nextNorm === currentNorm || nextNorm === lastEmittedNorm) return;

    syncingFromPropsRef.current = true;
    const currentSelection = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(next);
    if (currentSelection) {
      const maxIndex = Math.max(0, quill.getLength() - 1);
      quill.setSelection(
        Math.min(currentSelection.index, maxIndex),
        currentSelection.length,
        "silent"
      );
    }
    syncingFromPropsRef.current = false;
    lastEmittedHtmlRef.current = quill.root.innerHTML;
  }, [value]);

  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (!quill) return;
    quill.enable(!readOnly);
  }, [readOnly]);

  return (
    <div
      className={`ticket-editor ${readOnly ? "read-only" : ""} rounded-xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <div ref={editorContainerRef} />
      <style>{`
        .ticket-editor.read-only .ql-toolbar {
          display: none;
        }
        .ticket-editor.read-only .ql-container {
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
        }
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
