import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  busy = false,
  children,
  wide = false,
}) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={busy}
      className={`modal ${wide ? "max-w-2xl" : "max-w-lg"}`}
      onCancel={(event) => {
        if (event.target !== ref.current) return;
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) {
          const rect = ref.current.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Chiudi"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </header>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
