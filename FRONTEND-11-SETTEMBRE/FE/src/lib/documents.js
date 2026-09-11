function checkAborted(signal) {
  if (signal.aborted) throw new DOMException('Operazione annullata', 'AbortError');
}

function abortable(promise, signal) {
  checkAborted(signal);
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Operazione annullata', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

// PDF.js rasterizes each page: Tesseract accepts images, not PDF binaries.
export async function extractDocument(file, { signal, onProgress }) {
  if (/\.txt$/i.test(file.name)) {
    const text = await file.text();
    checkAborted(signal);
    return text;
  }
  let worker;
  let loadingTask;
  let pageNumber = 1;
  let pageCount = 1;
  let release = () => {};
  const stop = () => { void worker?.terminate().catch(() => {}); void loadingTask?.destroy().catch(() => {}); };
  signal.addEventListener('abort', stop, { once: true });
  try {
    const [pdfjs, workerSource, tesseract] = await Promise.all([
      import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'), import('tesseract.js'),
    ]);
    checkAborted(signal);
    pdfjs.GlobalWorkerOptions.workerSrc = workerSource.default;
    loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
    // Reject password-protected PDFs without opening a hidden password prompt.
    loadingTask.onPassword = () => { void loadingTask.destroy(); };
    const pdf = await abortable(loadingTask.promise, signal);
    pageCount = pdf.numPages;
    onProgress({ progress: 0, label: `Preparazione OCR · ${pageCount} pagine` });
    const workerPromise = tesseract.createWorker('ita+eng', 1, { logger: info => {
      if (!signal.aborted && info.status === 'recognizing text') onProgress({ progress: (pageNumber - 1 + info.progress) / pageCount, label: `OCR · pagina ${pageNumber} di ${pageCount}` });
    } }, { user_words_suffix: '' });
    // A worker may finish initializing after cancellation: terminate it as well.
    workerPromise.then(value => { if (signal.aborted) void value.terminate(); }, () => {});
    worker = await abortable(workerPromise, signal);
    const output = [];
    for (pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      checkAborted(signal);
      const page = await abortable(pdf.getPage(pageNumber), signal);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 2400 / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const render = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      release = () => { render.cancel(); canvas.width = 0; canvas.height = 0; page.cleanup(); };
      await abortable(render.promise, signal);
      const result = await abortable(worker.recognize(canvas), signal);
      output.push(`Pagina ${pageNumber}\n${result.data.text.trim()}`);
      onProgress({ progress: pageNumber / pageCount, label: `Pagina ${pageNumber} di ${pageCount} completata` });
      release(); release = () => {};
    }
    return output.join('\n\n');
  } finally {
    signal.removeEventListener('abort', stop);
    release();
    await worker?.terminate().catch(() => {});
    await loadingTask?.destroy().catch(() => {});
  }
}
