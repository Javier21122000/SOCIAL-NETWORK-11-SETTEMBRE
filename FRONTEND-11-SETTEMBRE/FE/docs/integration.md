# Integrazione del social network

## Configurazione Google Maps

Usare `VITE_GOOGLE_MAPS_API_KEY` in `.env`. La chiave frontend deve essere limitata ai referrer del progetto e avere Maps JavaScript API, Places API (New) e Geocoding API abilitate. La configurazione esistente non viene sovrascritta.

La ricerca usa `AutocompleteSuggestion.fetchAutocompleteSuggestions`, un token di sessione e `Place.fetchFields`. La selezione aggiorna un solo oggetto `{ luogo, latitudine, longitudine }` per l'intero post. Il clic sulla mappa usa la geocodifica inversa. Se il servizio non restituisce un indirizzo, vengono conservati il punto e le coordinate con una descrizione esplicita. Le risposte obsolete non possono sovrascrivere l'ultima selezione.

Riferimento: [Google Places Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data).

## Contratto HTTP richiesto

`GET http://localhost:8080/api/posts` deve restituire un array di post (è supportato anche `content` per risposte paginate).

`POST http://localhost:8080/api/posts` invia `multipart/form-data`. Il browser imposta automaticamente il boundary; non aggiungere un header Content-Type manuale.

| Parte | Contenuto |
| --- | --- |
| `didascalia` | Stringa |
| `indirizzo` | Stringa JSON con `luogo`, `latitudine` e `longitudine` numeriche |
| `testoEstrattoOcr` | Testo modificato dall'utente; omesso se vuoto |
| `files` | Parte ripetuta per ogni file binario originale, con nome file e MIME type |

Il totale di foto e documenti è compreso fra 1 e 5, massimo 10 MB per file. Le foto accettano JPEG, PNG e HEIC/HEIF; i documenti PDF e TXT. Il tipo è ricavabile da MIME ed estensione: il backend deve mantenere separate le collezioni `foto` e `documenti` nella risposta e pubblicare gli URL dei file salvati. Per più documenti, il singolo campo OCR è aggregato con i nomi dei documenti come intestazioni. Per persistere un OCR distinto per ciascun documento occorre estendere concordemente il contratto con metadati per file.

Il backend nel workspace ora accetta sia `multipart/form-data` sia il precedente JSON. Il controller riceve `didascalia`, `indirizzo`, `testoEstrattoOcr` facoltativo e `files`, deserializza l'indirizzo, valida e salva gli allegati. Il testo OCR aggregato viene associato ai documenti del post.

Il server deve inoltre applicare la validazione dei file e permettere upload complessivi di almeno 50 MB più overhead multipart. Il client mostra gli errori HTTP, incluso 415, conservando la bozza. Se una richiesta scade o perde la connessione, controllare il feed prima di ripubblicare: non esiste un contratto di idempotenza lato server.

## OCR e anteprime

Le foto non avviano mai Tesseract. Le anteprime HEIC sono convertite localmente in JPEG, mentre il file inviato resta l'originale. L'OCR PDF viene avviato dal pulsante dedicato: PDF.js rasterizza tutte le pagine in sequenza e Tesseract riconosce italiano e inglese. I TXT vengono letti solo con «Importa testo». Sono disponibili progressi, annullamento e modifica manuale. Worker, stream fotocamera e URL temporanei sono rilasciati alla chiusura.

Tesseract scarica i propri dati linguistici al primo utilizzo; la conversione HEIC e il riconoscimento possono fallire per file danneggiati o formati non decodificabili, senza perdere gli allegati.

Riferimenti: [Tesseract.js: limiti del supporto PDF](https://github.com/naptha/tesseract.js/blob/master/docs/faq.md), [PDF.js: rendering delle pagine](https://mozilla.github.io/pdf.js/examples/).

## Profilo e messaggi

Il profilo è locale al browser. `VITE_PROFILE_ID` permette di indicare un ID profilo già esistente; in alternativa si confrontano username/nome e ID dei post pubblicati da questa sessione/browser. I post privi di autore sono attribuiti al profilo locale, coerentemente con l'app senza autenticazione. Follower e seguiti sono dimostrativi. Le chat sono demo locali e le notifiche mostrano le conferme di pubblicazione della sessione.

## Verifiche

`node --test src/lib/posts.test.js` verifica accumulo e limite degli allegati, formati, dimensioni, integrità dei binari nel FormData, coordinate, filtro dei post per autore ed errori HTTP. `npm run lint` e `npm run build` verificano il progetto. Il convertitore HEIC e il worker PDF sono caricati separatamente su richiesta e producono bundle più grandi del limite di avviso predefinito di Vite.
