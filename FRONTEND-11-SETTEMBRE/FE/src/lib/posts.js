export const API_URL = 'http://localhost:8080/api';
export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_CAPTION = 2200;

const formats = {
  photo: { jpg: ['image/jpeg', 'image/jpg'], jpeg: ['image/jpeg'], png: ['image/png'], heic: ['image/heic', 'image/heif'], heif: ['image/heif', 'image/heic'] },
  document: { pdf: ['application/pdf'], txt: ['text/plain'] },
};

export function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function validateFiles(existing, incoming, kind) {
  const unique = incoming.filter((file, index) => !existing.some(item => fileKey(item.file) === fileKey(file)) && incoming.findIndex(other => fileKey(other) === fileKey(file)) === index);
  if (existing.length + unique.length > MAX_FILES) throw new Error('Puoi allegare al massimo 5 file in totale. I file già scelti sono stati conservati.');
  for (const file of unique) {
    const extension = file.name.split('.').pop().toLowerCase();
    const allowed = formats[kind]?.[extension];
    if (!allowed || (file.type && file.type !== 'application/octet-stream' && !allowed.includes(file.type))) {
      throw new Error(`${file.name}: formato non valido. ${kind === 'photo' ? 'Scegli JPEG, PNG o HEIC.' : 'Scegli PDF o TXT.'}`);
    }
    if (file.size === 0) throw new Error(`${file.name}: il file è vuoto.`);
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name}: il limite è 10 MB per file.`);
  }
  return unique.map(file => ({ id: fileKey(file), file, kind }));
}

export function validAddress(address) {
  return Boolean(address && typeof address.luogo === 'string' && address.luogo.trim() &&
    Number.isFinite(address.latitudine) && Math.abs(address.latitudine) <= 90 &&
    Number.isFinite(address.longitudine) && Math.abs(address.longitudine) <= 180);
}

export function buildPostFormData({ caption, address, attachments, ocr }) {
  if (!attachments.length || attachments.length > MAX_FILES) throw new Error('Seleziona da 1 a 5 file.');
  if (!validAddress(address)) throw new Error('Seleziona un indirizzo con coordinate valide.');
  const body = new FormData();
  body.append('didascalia', caption.trim());
  body.append('indirizzo', JSON.stringify({ luogo: address.luogo.trim(), latitudine: address.latitudine, longitudine: address.longitudine }));
  if (ocr?.trim()) body.append('testoEstrattoOcr', ocr.trim());
  attachments.forEach(({ file }) => body.append('files', file, file.name));
  // Do not set Content-Type: fetch adds the multipart boundary.
  return body;
}

export async function request(path, options = {}) {
  let response;
  try {
    const timeout = AbortSignal.timeout(60000);
    response = await fetch(`${API_URL}${path}`, { ...options, signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(error.name === 'TimeoutError' ? 'La richiesta è scaduta. Controlla il feed prima di ripubblicare.' : 'Connessione al server non riuscita. Verifica che il backend sia attivo e che consenta le richieste da questo sito.');
  }
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    if (response.status === 415 && options.body instanceof FormData) {
      throw new Error('Il server non accetta gli allegati multipart (HTTP 415). L’endpoint /api/posts deve supportare multipart/form-data.');
    }
    const detail = typeof data?.message === 'string' ? data.message.slice(0, 250) : '';
    if (response.status === 404) throw new Error(detail || 'Risorsa non trovata: il post potrebbe essere già stato eliminato.');
    throw new Error(`Richiesta non riuscita (HTTP ${response.status}). ${detail || 'Riprova tra poco.'}`);
  }
  return data;
}

// POST /api/posts · multipart/form-data → 201 con il post creato
export async function createPost(body, signal) {
  const post = await request('/posts', { method: 'POST', body, signal });
  if (!post?.id) throw new Error('Il server non ha restituito il post creato.');
  return post;
}

// DELETE /api/posts/{id} → 204 senza corpo
export async function deletePost(id, signal) {
  if (!id) throw new Error('Post senza identificativo: aggiorna il feed e riprova.');
  await request(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE', signal });
  return id;
}

// PUT /api/posts/{id} · application/json → 200 con il post aggiornato
export async function updateCaption(id, didascalia, signal) {
  if (!id) throw new Error('Post senza identificativo: aggiorna il feed e riprova.');
  const caption = didascalia.trim();
  if (caption.length > MAX_CAPTION) throw new Error(`La didascalia può contenere al massimo ${MAX_CAPTION} caratteri.`);
  const post = await request(`/posts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ didascalia: caption }),
    signal,
  });
  // Il backend risponde con il post aggiornato; in mancanza si applica la modifica locale.
  return post?.id ? post : { id, didascalia: caption };
}

export async function getPosts(signal) {
  const data = await request('/posts', { signal });
  const posts = Array.isArray(data) ? data : data?.content;
  if (!Array.isArray(posts)) throw new Error('Il server ha restituito un elenco di post non valido.');
  return posts;
}

export function isOwnPost(post, profile, publishedIds = []) {
  if (publishedIds.includes(post.id)) return true;
  const ownerId = post.profilo?.id ?? post.profiloId;
  if (ownerId && profile.id) return String(ownerId) === String(profile.id);
  const username = post.profilo?.utente?.username ?? post.username;
  if (username) return username.toLowerCase() === profile.username.toLowerCase();
  const name = post.profilo?.nome ?? post.nomeUtente;
  if (name) return name.toLowerCase() === profile.name.toLowerCase();
  // In this unauthenticated, single-profile app, unassigned posts belong to the local profile.
  return !ownerId;
}

export function mediaUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value, `${API_URL.replace(/\/api$/, '')}/`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
