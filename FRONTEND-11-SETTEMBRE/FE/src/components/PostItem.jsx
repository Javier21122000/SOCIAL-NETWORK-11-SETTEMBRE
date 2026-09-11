import { useEffect, useRef, useState } from "react";
import {
  Check,
  FileText,
  LoaderCircle,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { MAX_CAPTION, deletePost, mediaUrl, updateCaption } from "../lib/posts";

function Photo({ src }) {
  return (
    <img
      src={src}
      alt="Foto del post"
      loading="lazy"
      className="max-h-[560px] w-full object-contain"
      onError={(event) => {
        event.currentTarget.hidden = true;
        event.currentTarget.nextElementSibling.hidden = false;
      }}
    />
  );
}

function initials(name) {
  const parts = name.split(" ").filter(Boolean);
  return parts.length
    ? parts
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("")
    : "?";
}

export default function PostItem({
  post,
  profile,
  canManage = false,
  onUpdated,
  onDeleted,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(post.didascalia || "");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const menuRef = useRef(null);
  const editorRef = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);
  // Il menu contestuale si chiude con un clic fuori o con Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const name =
    post.profilo?.nome || post.nomeUtente || post.username || profile.name;
  let address = post.indirizzo;
  if (typeof address === "string") {
    try {
      address = JSON.parse(address);
    } catch {
      address = null;
    }
  }
  const photos = Array.isArray(post.foto)
    ? post.foto
    : Array.isArray(post.fotoUrls)
      ? post.fotoUrls
      : [];
  const documents = Array.isArray(post.documenti) ? post.documenti : [];
  const date = post.createdAt ? new Date(post.createdAt) : null;
  const manageable = canManage && Boolean(post.id);

  async function saveCaption(event) {
    event.preventDefault();
    if (pending) return;
    setPending("save");
    setError("");
    try {
      const updated = await updateCaption(post.id, draft);
      onUpdated?.(updated);
      if (alive.current) setEditing(false);
    } catch (failure) {
      if (alive.current) setError(failure.message);
    } finally {
      if (alive.current) setPending("");
    }
  }

  async function remove() {
    if (pending) return;
    setPending("delete");
    setError("");
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
      // Senza onDeleted la card resta montata: lo stato va comunque ripristinato.
      if (alive.current) {
        setPending("");
        setConfirming(false);
      }
    } catch (failure) {
      if (alive.current) {
        setError(failure.message);
        setPending("");
        setConfirming(false);
      }
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <header className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-medium">
          {initials(name)}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{name}</h3>
          {address?.luogo && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
              <MapPin size={12} className="shrink-0" />
              {address.luogo}
            </p>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {date && !Number.isNaN(date.getTime()) && (
            <time
              className="text-xs text-neutral-400"
              dateTime={date.toISOString()}
            >
              {date.toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
              })}
            </time>
          )}
          {manageable && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                className="icon-button h-8 w-8"
                aria-label="Azioni sul post"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                disabled={Boolean(pending)}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirming(false);
                      setError("");
                      setDraft(post.didascalia || "");
                      setEditing(true);
                    }}
                  >
                    <Pencil size={15} />
                    Modifica didascalia
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(false);
                      setError("");
                      setConfirming(true);
                    }}
                  >
                    <Trash2 size={15} />
                    Elimina post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      {confirming && (
        <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Eliminare questo post? Foto, documenti e testo estratto vengono
            rimossi definitivamente.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="primary-button bg-red-700 px-4 py-2 text-xs hover:bg-red-600"
              disabled={Boolean(pending)}
              onClick={remove}
            >
              {pending === "delete" ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              {pending === "delete" ? "Eliminazione…" : "Sì, elimina"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={Boolean(pending)}
              onClick={() => setConfirming(false)}
            >
              Annulla
            </button>
          </div>
        </div>
      )}
      {photos.length > 0 && (
        <div
          aria-label="Foto del post, scorri orizzontalmente"
          tabIndex={0}
          className="mx-4 flex snap-x snap-mandatory overflow-x-auto rounded-xl border border-pink-200 bg-neutral-50"
        >
          {photos.map((photo, index) => {
            const url = mediaUrl(
              typeof photo === "string" ? photo : photo.urlFile || photo.url,
            );
            return (
              <div
                className="grid min-w-full snap-center place-items-center"
                key={photo.id || index}
              >
                {url ? (
                  <>
                    <Photo src={url} />
                    <p hidden className="p-8 text-sm text-neutral-500">
                      Anteprima non disponibile.{" "}
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Apri la foto
                      </a>
                    </p>
                  </>
                ) : (
                  <p className="p-8 text-sm text-neutral-500">
                    Foto non disponibile
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {documents.map((document, index) => {
        const url = mediaUrl(
          typeof document === "string"
            ? document
            : document.urlFile || document.url,
        );
        const isPdf = url && /\.pdf(?:[?#]|$)/i.test(url);
        const isImage = url && /\.(jpe?g|png|webp)(?:[?#]|$)/i.test(url);
        return (
          <section key={document.id || index} className="m-4">
            <div
              tabIndex={0}
              aria-label="Documento e testo estratto, scorri orizzontalmente"
              className="flex snap-x snap-mandatory overflow-x-auto rounded-xl border border-orange-200"
            >
              <div className="min-w-full snap-center bg-orange-50/30 p-4">
                {isImage && (
                  <img
                    src={url}
                    alt="Anteprima documento"
                    className="max-h-96 w-full object-contain"
                  />
                )}
                {isPdf && (
                  <object
                    type="application/pdf"
                    data={url}
                    aria-label="Anteprima PDF"
                    className="h-80 w-full"
                  >
                    <p className="text-sm text-neutral-500">
                      Apri il PDF per visualizzarlo.
                    </p>
                  </object>
                )}
                {!isImage && !isPdf && (
                  <FileText size={32} className="my-6 text-orange-400" />
                )}
                <p className="mt-3 text-sm font-medium">
                  {document.nome || document.name || `Documento ${index + 1}`}
                </p>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs underline underline-offset-4"
                  >
                    Apri documento
                  </a>
                )}
              </div>
              <div className="max-h-96 min-w-full snap-center overflow-y-auto bg-orange-50/20 p-6">
                <h4 className="mb-3 text-sm font-semibold">
                  Testo del documento
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                  {document.testoEstrattoOcr ||
                    post.testoEstrattoOcr ||
                    "Nessun testo estratto per questo documento."}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Scorri verso destra per leggere il testo →
            </p>
          </section>
        );
      })}
      {!documents.length && post.testoEstrattoOcr && (
        <div className="m-4 rounded-xl border border-orange-200 p-4">
          <h4 className="mb-2 text-sm font-semibold">Testo estratto</h4>
          <p className="whitespace-pre-wrap text-sm text-neutral-600">
            {post.testoEstrattoOcr}
          </p>
        </div>
      )}
      {editing ? (
        <form onSubmit={saveCaption} className="space-y-3 px-4 pb-5 pt-4">
          <label className="block">
            <span className="field-label">Didascalia</span>
            <textarea
              ref={editorRef}
              value={draft}
              maxLength={MAX_CAPTION}
              disabled={Boolean(pending)}
              onChange={(event) => setDraft(event.target.value)}
              className="field min-h-24 resize-y"
              placeholder="Scrivi la nuova didascalia…"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="primary-button px-4 py-2 text-xs"
              disabled={Boolean(pending) || draft === (post.didascalia || "")}
            >
              {pending === "save" ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {pending === "save" ? "Salvataggio…" : "Salva didascalia"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={Boolean(pending)}
              onClick={() => {
                setEditing(false);
                setDraft(post.didascalia || "");
                setError("");
              }}
            >
              <X size={14} />
              Annulla
            </button>
            <span className="text-[11px] text-neutral-400">
              {draft.length} / {MAX_CAPTION}
            </span>
          </div>
        </form>
      ) : (
        post.didascalia && (
          <p className="whitespace-pre-wrap break-words px-4 pb-5 pt-4 text-sm leading-6 text-neutral-700">
            {post.didascalia}
          </p>
        )
      )}
      {error && (
        <p role="alert" className="error-message mx-4 mb-4">
          {error}
        </p>
      )}
    </article>
  );
}
