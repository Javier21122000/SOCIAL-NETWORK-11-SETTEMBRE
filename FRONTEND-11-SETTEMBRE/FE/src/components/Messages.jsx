import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";

const contacts = [
  {
    id: "sofia",
    name: "Sofia Bianchi",
    preview: "Ci vediamo domani?",
    online: true,
  },
  { id: "marco", name: "Marco Rossi", preview: "Hai visto il nuovo progetto?" },
  { id: "elena", name: "Elena Verdi", preview: "Grazie per la condivisione" },
  { id: "luca", name: "Luca Conti", preview: "Foto bellissime!" },
];

export default function Messages({
  focusRef,
  selected,
  onSelect,
  conversations,
  onSend,
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const contact = contacts.find((item) => item.id === selected);
  return (
    <section
      ref={focusRef}
      tabIndex={-1}
      aria-label="Messaggi"
      className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
    >
      <h2 className="text-lg font-semibold tracking-tight">Messaggi</h2>
      <p className="mb-5 mt-1 text-xs text-neutral-400">
        Conversazioni demo · invio solo locale
      </p>
      {contact ? (
        <div>
          <button
            className="mb-4 flex items-center gap-2 text-xs text-neutral-500"
            onClick={() => onSelect(null)}
          >
            <ArrowLeft size={15} />
            Tutte le conversazioni
          </button>
          <h3 className="border-b border-neutral-100 pb-3 text-sm font-semibold">
            {contact.name}
          </h3>
          <div
            className="max-h-96 min-h-48 space-y-3 overflow-y-auto py-4"
            role="log"
            aria-label={`Conversazione con ${contact.name}`}
          >
            <p className="mr-5 rounded-xl bg-neutral-100 p-3 text-sm">
              {contact.preview}
            </p>
            {(conversations[contact.id] || []).map((message) => (
              <p
                key={message.id}
                className="ml-5 break-words rounded-xl bg-neutral-900 p-3 text-sm text-white"
              >
                {message.text}
              </p>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              onSend(contact.id, draft.trim());
              setDraft("");
            }}
          >
            <input
              aria-label="Scrivi un messaggio"
              className="field min-w-0"
              placeholder="Messaggio…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
            />
            <button
              aria-label="Invia messaggio locale"
              disabled={!draft.trim()}
              className="icon-button"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <>
          <input
            aria-label="Cerca nei messaggi"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field mb-4 bg-neutral-50"
            placeholder="Cerca una persona"
          />
          {contacts
            .filter((item) =>
              item.name.toLowerCase().includes(query.toLowerCase()),
            )
            .map((item) => (
              <button
                key={item.id}
                className="flex w-full items-center gap-3 rounded-xl py-3 text-left hover:bg-neutral-50"
                onClick={() => {
                  onSelect(item.id);
                  setDraft("");
                }}
              >
                <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-medium">
                  {item.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                  {item.online && (
                    <span
                      aria-label="Online"
                      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    {conversations[item.id]?.at(-1)?.text || item.preview}
                  </span>
                </span>
              </button>
            ))}
        </>
      )}
    </section>
  );
}
