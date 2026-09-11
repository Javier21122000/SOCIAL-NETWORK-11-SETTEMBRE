import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPostFormData, createPost, deletePost, getPosts, isOwnPost, request, updateCaption, validAddress, validateFiles } from './posts.js';

const file = (name, type = 'image/jpeg', content = 'binary bytes') => new File([content], name, { type, lastModified: 1 });
const address = { luogo: 'Roma', latitudine: 41.9028, longitudine: 12.4964 };

test('selection is cumulative across tabs, deduplicated and limited to five files', () => {
  const photo = file('foto.jpg');
  const existing = validateFiles([], [photo], 'photo');
  const documents = validateFiles(existing, [file('documento.pdf', 'application/pdf')], 'document');
  assert.equal([...existing, ...documents].length, 2);
  assert.deepEqual(validateFiles(existing, [photo], 'photo'), []);
  assert.throws(() => validateFiles(existing, Array.from({ length: 5 }, (_, index) => file(`${index}.png`, 'image/png')), 'photo'), /massimo 5/);
  assert.equal(existing.length, 1);
});

test('type, empty file and 10 MB validation match the selected flow', () => {
  assert.throws(() => validateFiles([], [file('scan.pdf', 'application/pdf')], 'photo'), /formato/);
  assert.throws(() => validateFiles([], [file('scan.jpg')], 'document'), /formato/);
  assert.throws(() => validateFiles([], [file('fake.png', 'text/html')], 'photo'), /formato/);
  assert.throws(() => validateFiles([], [file('empty.txt', 'text/plain', '')], 'document'), /vuoto/);
  assert.throws(() => validateFiles([], [file('big.jpg', 'image/jpeg', new Uint8Array(10 * 1024 * 1024 + 1))], 'photo'), /10 MB/);
  assert.equal(validateFiles([], [file('IMG.HEIC', '')], 'photo').length, 1);
});

test('FormData preserves every binary file and serializes a single numeric address', async () => {
  const attachments = [...validateFiles([], [file('foto.png', 'image/png')], 'photo'), ...validateFiles([], [file('note.txt', 'text/plain', 'documento')], 'document')];
  const body = buildPostFormData({ caption: ' Una storia ', address, attachments, ocr: ' Testo rivisto ' });
  assert.deepEqual(JSON.parse(body.get('indirizzo')), address);
  assert.equal(body.getAll('files').length, 2);
  assert.equal(body.getAll('files')[1].name, 'note.txt');
  assert.equal(await body.getAll('files')[1].text(), 'documento');
  assert.equal(body.get('didascalia'), 'Una storia');
  assert.equal(body.get('testoEstrattoOcr'), 'Testo rivisto');
  const photoOnly = buildPostFormData({ caption: '', address, attachments: attachments.slice(0, 1) });
  assert.equal(photoOnly.has('testoEstrattoOcr'), false);
  assert.match(new Request('http://localhost/posts', { method: 'POST', body }).headers.get('content-type'), /multipart\/form-data; boundary=/);
});

test('invalid and unconfirmed coordinates cannot be posted; zero coordinates are valid', () => {
  assert.equal(validAddress({ luogo: 'Origine', latitudine: 0, longitudine: 0 }), true);
  for (const value of [null, { ...address, latitudine: NaN }, { ...address, latitudine: '41' }, { ...address, latitudine: 91 }, { ...address, longitudine: -181 }, { ...address, luogo: ' ' }]) {
    assert.equal(validAddress(value), false);
    assert.throws(() => buildPostFormData({ caption: '', address: value, attachments: [{ file: file('foto.jpg') }] }), /coordinate/);
  }
});

test('profile excludes other owners and includes known or unassigned local posts', () => {
  const profile = { id: 'javier-id', name: 'Javier Torres', username: 'javiertorres' };
  assert.equal(isOwnPost({ profilo: { id: 'other', nome: 'Sofia' } }, profile), false);
  assert.equal(isOwnPost({ profilo: { id: 'javier-id' } }, profile), true);
  assert.equal(isOwnPost({ username: 'sofia' }, profile), false);
  assert.equal(isOwnPost({ id: 'local' }, profile, ['local']), true);
  assert.equal(isOwnPost({}, profile), true);
});

test('HTTP failures remain distinguishable from empty feeds and multipart incompatibility', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response('[]', { status: 200 }));
  assert.deepEqual(await getPosts(), []);
  globalThis.fetch = async () => new Response('oops', { status: 500 });
  await assert.rejects(getPosts(), /HTTP 500/);
  globalThis.fetch = async () => new Response('', { status: 415 });
  await assert.rejects(request('/posts', { method: 'POST', body: new FormData() }), /multipart/);
  await assert.rejects(request('/posts/1', { method: 'DELETE' }), /HTTP 415/);
  globalThis.fetch = async () => new Response('{}', { status: 200 });
  await assert.rejects(getPosts(), /non valido/);
});

test('creating a post requires the server to return the saved entity', async context => {
  const calls = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, method: options.method, isFormData: options.body instanceof FormData });
    return new Response(JSON.stringify({ id: 'nuovo', didascalia: 'ciao' }), { status: 201 });
  });
  const body = buildPostFormData({ caption: 'ciao', address, attachments: validateFiles([], [file('foto.jpg')], 'photo') });
  assert.deepEqual(await createPost(body), { id: 'nuovo', didascalia: 'ciao' });
  assert.deepEqual(calls, [{ url: 'http://localhost:8080/api/posts', method: 'POST', isFormData: true }]);
  globalThis.fetch = async () => new Response('', { status: 201 });
  await assert.rejects(createPost(body), /non ha restituito il post/);
});

test('deleting a post calls DELETE on the post URL and accepts an empty 204', async context => {
  const calls = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(`${options.method} ${url}`);
    return new Response(null, { status: 204 });
  });
  assert.equal(await deletePost('abc-123'), 'abc-123');
  assert.deepEqual(calls, ['DELETE http://localhost:8080/api/posts/abc-123']);
  await assert.rejects(deletePost(undefined), /identificativo/);
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Post non trovato: abc' }), { status: 404 });
  await assert.rejects(deletePost('abc'), /Post non trovato/);
});

test('editing a caption sends trimmed JSON and falls back to the local value', async context => {
  let sent;
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    sent = { url, method: options.method, type: options.headers['Content-Type'], body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ id: 'p1', didascalia: 'Nuova' }), { status: 200 });
  });
  assert.deepEqual(await updateCaption('p1', '  Nuova  '), { id: 'p1', didascalia: 'Nuova' });
  assert.deepEqual(sent, { url: 'http://localhost:8080/api/posts/p1', method: 'PUT', type: 'application/json', body: { didascalia: 'Nuova' } });
  globalThis.fetch = async () => new Response('', { status: 200 });
  assert.deepEqual(await updateCaption('p1', 'Solo locale'), { id: 'p1', didascalia: 'Solo locale' });
  await assert.rejects(updateCaption('p1', 'x'.repeat(2201)), /2200 caratteri/);
});
