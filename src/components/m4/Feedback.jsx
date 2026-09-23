// Temporary M4-only adapter. M5 owns the eventual global feedback primitives.
import { useEffect, useId, useRef } from "react";
import Button from "../common/Button";
export function Feedback({ error, success }) {
  if (!error && !success) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`my-4 rounded-input border p-3 text-sm ${error ? "border-danger text-danger bg-danger/10" : "border-success text-textPrimary bg-success/10"}`}
    >
      {error || success}
    </div>
  );
}
export function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-card border border-border bg-surface p-6 text-textPrimary shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          aria-label="ปิดหน้าต่าง"
          onClick={onClose}
        >
          ✕
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({ title, children, busy, error, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <p>{children}</p>
      <Feedback error={error} />
      <div className="mt-6 flex justify-end gap-3">
        <Button disabled={busy} variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button disabled={busy} variant="danger" onClick={onConfirm}>
          {busy ? "กำลังบันทึก…" : "ยืนยัน"}
        </Button>
      </div>
    </Modal>
  );
}
