import { useEffect, useRef, useState } from "react";
import {
  Camera,
  FileText,
  Image,
  LoaderCircle,
  Plus,
  ScanText,
  Trash2,
  X,
} from "lucide-react";
import Modal from "./Modal";
import LocationPicker from "./LocationPicker";
import { buildPostFormData, createPost, validateFiles } from "../lib/posts";
import { extractDocument } from "../lib/documents";

function Thumbnail({ file }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let objectUrl;
    async function preview() {
      try {
        let blob = file;
        if (/\.hei[cf]$/i.test(file.name)) {
          const { default: convert } = await import("heic2any");
          const converted = await convert({
            blob: file,
            toType: "image/jpeg",
            quality: 0.7,
          });
          blob = Array.isArray(converted) ? converted[0] : converted;
        }
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    preview();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  return (
    <div className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-neutral-100">
      {failed ? (
        <p className="p-3 text-center text-xs text-neutral-500">
          Anteprima non disponibile
          <br />
          Il file originale verrà caricato.
        </p>
      ) : url ? (
        <img
          src={url}
          alt={`Anteprima ${file.name}`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <LoaderCircle size={20} className="animate-spin text-neutral-400" />
      )}
    </div>
  );
}

function CameraCapture({ onCapture, onClose }) {
  const video = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        video.current.srcObject = stream;
        await video.current.play();
      } catch {
        if (!disposed)
          setError(
            "Fotocamera non disponibile. Controlla i permessi del browser o carica una foto.",
          );
      }
    }
    start();
    return () => {
      disposed = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  function capture() {
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    canvas.getContext("2d").drawImage(video.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return setError("Scatto non riuscito. Riprova.");
        onCapture(
          new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }),
        );
        onClose();
      },
      "image/jpeg",
      0.9,
    );
  }
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 p-3">
      <video
        ref={video}
        muted
        playsInline
        onLoadedData={() => setReady(true)}
        className="max-h-72 w-full rounded-lg bg-neutral-950"
      />
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!ready}
          className="secondary-button"
          onClick={capture}
        >
          <Camera size={16} />
          Scatta foto
        </button>
        <button type="button" className="secondary-button" onClick={onClose}>
          Chiudi fotocamera
        </button>
      </div>
    </div>
  );
}

export default function CreatePostModal({ onClose, onCreated }) {
  const [tab, setTab] = useState("photo");
  const [attachments, setAttachments] = useState([]);
  const [caption, setCaption] = useState("");
  const [address, setAddress] = useState(null);
  const [ocrTexts, setOcrTexts] = useState({});
  const [ocrState, setOcrState] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [camera, setCamera] = useState(false);
  const fileInput = useRef(null);
  const ocrController = useRef(null);
  const submitting = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ocrController.current?.abort();
    };
  }, []);
  const busy = saving || Boolean(ocrState);

  function addFiles(files, kind = tab) {
    try {
      const added = validateFiles(attachments, files, kind);
      setAttachments((previous) => [...previous, ...added]);
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  }

  function removeFile(id) {
    setAttachments((previous) => previous.filter((item) => item.id !== id));
    setOcrTexts((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  async function extract(item) {
    if (ocrController.current || saving) return;
    const controller = new AbortController();
    ocrController.current = controller;
    setError("");
    setOcrState({
      id: item.id,
      progress: 0,
      label: "Preparazione del documento…",
    });
    try {
      const text = await extractDocument(item.file, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (alive.current && !controller.signal.aborted)
            setOcrState({ id: item.id, ...progress });
        },
      });
      if (alive.current && !controller.signal.aborted)
        setOcrTexts((previous) => ({ ...previous, [item.id]: text }));
    } catch (failure) {
      if (alive.current && failure.name !== "AbortError")
        setError(
          `Estrazione non riuscita per ${item.file.name}. Il PDF potrebbe essere protetto o danneggiato, oppure il download dei dati OCR non è disponibile. Puoi inserire il testo manualmente.`,
        );
    } finally {
      if (alive.current) setOcrState(null);
      ocrController.current = null;
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || ocrController.current) return;
    setError("");
    let body;
    try {
      const documentTexts = attachments.filter(
        (item) => item.kind === "document" && ocrTexts[item.id]?.trim(),
      );
      const ocr = documentTexts
        .map((item) =>
          documentTexts.length > 1
            ? `${item.file.name}\n${ocrTexts[item.id].trim()}`
            : ocrTexts[item.id].trim(),
        )
        .join("\n\n");
      body = buildPostFormData({ caption, address, attachments, ocr });
    } catch (failure) {
      setError(failure.message);
      return;
    }
    submitting.current = true;
    setSaving(true);
    setCamera(false);
    try {
      const post = await createPost(body);
      onCreated(post);
      onClose();
    } catch (failure) {
      if (alive.current) setError(failure.message);
    } finally {
      submitting.current = false;
      if (alive.current) setSaving(false);
    }
  }

  return (
    <Modal title="Crea un post" onClose={onClose} busy={saving} wide>
      <form onSubmit={submit} className="space-y-5">
        <fieldset
          disabled={saving}
          className="min-w-0 space-y-5"
          inert={saving ? true : undefined}
        >
          <label className="block">
            <span className="field-label">Didascalia</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              className="field min-h-24 resize-y"
              placeholder="Un momento, una storia, qualcosa da condividere…"
            />
          </label>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Allegati</h3>
              <span aria-live="polite" className="text-xs text-neutral-500">
                {attachments.length} / 5 file selezionati
              </span>
            </div>
            <div
              role="tablist"
              aria-label="Tipo di allegati"
              className="flex gap-1 rounded-xl bg-neutral-100 p-1"
            >
              {[
                ["photo", "Foto", Image],
                ["document", "Documenti", FileText],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`panel-${id}`}
                  id={`tab-${id}`}
                  onClick={() => {
                    setTab(id);
                    setCamera(false);
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm ${tab === id ? "bg-white font-medium text-neutral-900 shadow-sm" : "text-neutral-500"}`}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              className={`rounded-xl border p-4 ${tab === "photo" ? "border-pink-200" : "border-orange-200"}`}
            >
              <p className="mb-3 text-xs leading-5 text-neutral-500">
                {tab === "photo"
                  ? "JPEG, PNG e HEIC · massimo 10 MB per file. Le foto non vengono sottoposte a OCR."
                  : "PDF e TXT · massimo 10 MB per file. Avvia l’OCR sui PDF solo quando vuoi; per i TXT puoi importare il testo."}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attachments
                  .filter((item) => item.kind === tab)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="relative min-w-0 rounded-xl border border-neutral-200 bg-white p-2"
                    >
                      {item.kind === "photo" ? (
                        <Thumbnail file={item.file} />
                      ) : (
                        <div className="grid aspect-square place-items-center rounded-lg bg-orange-50/50">
                          <FileText
                            size={32}
                            strokeWidth={1.3}
                            className="text-orange-400"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        aria-label={`Rimuovi ${item.file.name}`}
                        disabled={busy}
                        onClick={() => removeFile(item.id)}
                        className="absolute right-3 top-3 rounded-full border border-neutral-200 bg-white p-1 text-neutral-500"
                      >
                        <X size={14} />
                      </button>
                      <p
                        className="mt-2 truncate text-xs font-medium"
                        title={item.file.name}
                      >
                        {item.file.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ))}
              </div>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={
                  tab === "photo"
                    ? ".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
                    : ".pdf,.txt,application/pdf,text/plain"
                }
                className="sr-only"
                tabIndex={-1}
                aria-label={
                  tab === "photo" ? "Carica foto" : "Carica documenti"
                }
                disabled={busy || attachments.length >= 5}
                onChange={(event) => {
                  addFiles(Array.from(event.target.files || []));
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="secondary-button mt-3 w-full justify-center border-dashed"
                disabled={busy || attachments.length >= 5}
                onClick={() => fileInput.current.click()}
              >
                <Plus size={16} />
                Aggiungi altri file
              </button>
              {tab === "photo" && (
                <button
                  type="button"
                  className="mt-3 flex items-center gap-2 text-xs text-neutral-600"
                  disabled={busy || attachments.length >= 5}
                  onClick={() => setCamera((value) => !value)}
                >
                  <Camera size={16} />
                  {camera ? "Chiudi fotocamera" : "Usa fotocamera"}
                </button>
              )}
              {camera && (
                <CameraCapture
                  onCapture={(file) => addFiles([file], "photo")}
                  onClose={() => setCamera(false)}
                />
              )}
            </div>
            {attachments.some((item) => item.kind !== tab) && (
              <p className="text-xs text-neutral-500">
                Conservati anche:{" "}
                {attachments
                  .filter((item) => item.kind !== tab)
                  .map((item) => item.file.name)
                  .join(", ")}
              </p>
            )}
          </section>
          {attachments
            .filter((item) => item.kind === "document")
            .map((item) => (
              <section
                key={item.id}
                className="space-y-3 rounded-xl border border-orange-200 p-4"
              >
                <h4 className="break-words text-sm font-medium">
                  {item.file.name}
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || Object.hasOwn(ocrTexts, item.id)}
                    onClick={() => extract(item)}
                    className="secondary-button"
                  >
                    <ScanText size={16} />
                    {/\.txt$/i.test(item.file.name)
                      ? "Importa testo"
                      : "Avvia OCR sul PDF"}
                  </button>
                  {!Object.hasOwn(ocrTexts, item.id) && (
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        setOcrTexts((previous) => ({
                          ...previous,
                          [item.id]: "",
                        }))
                      }
                    >
                      Scrivi testo
                    </button>
                  )}
                </div>
                {ocrState?.id === item.id && (
                  <div role="status" className="space-y-2">
                    <p className="text-xs text-neutral-500">{ocrState.label}</p>
                    <progress
                      value={ocrState.progress}
                      max="1"
                      className="h-1.5 w-full accent-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => ocrController.current?.abort()}
                      className="text-xs underline"
                    >
                      Annulla estrazione
                    </button>
                  </div>
                )}
                {Object.hasOwn(ocrTexts, item.id) && (
                  <>
                    <label className="block">
                      <span className="field-label">
                        Testo modificabile (facoltativo)
                      </span>
                      <textarea
                        className="field min-h-32"
                        value={ocrTexts[item.id]}
                        onChange={(event) =>
                          setOcrTexts((previous) => ({
                            ...previous,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-neutral-500"
                      disabled={busy}
                      onClick={() =>
                        setOcrTexts((previous) => {
                          const next = { ...previous };
                          delete next[item.id];
                          return next;
                        })
                      }
                    >
                      <Trash2 size={13} />
                      Rimuovi testo
                    </button>
                  </>
                )}
              </section>
            ))}
          <LocationPicker address={address} onChange={setAddress} />
        </fieldset>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || attachments.length === 0}
          className="primary-button w-full justify-center"
        >
          {saving && <LoaderCircle className="animate-spin" size={17} />}
          {saving ? "Pubblicazione in corso…" : "Pubblica post"}
        </button>
        {saving && (
          <p role="status" className="text-center text-xs text-neutral-500">
            Caricamento degli allegati. Attendi la conferma.
          </p>
        )}
      </form>
    </Modal>
  );
}
