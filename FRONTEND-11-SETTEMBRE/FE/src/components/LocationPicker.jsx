import { useEffect, useId, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { MapPin, Search } from "lucide-react";
import { validAddress } from "../lib/posts";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
const hasKey = MAPS_KEY && !/dummy|placeholder|your_google/i.test(MAPS_KEY);
const INITIAL_CENTER = { lat: 41.9028, lng: 12.4964 };

function RecenterMap({ address }) {
  const map = useMap();
  const lat = address?.latitudine;
  const lng = address?.longitudine;
  useEffect(() => {
    if (map && Number.isFinite(lat) && Number.isFinite(lng)) {
      map.panTo({ lat, lng });
      map.setZoom(15);
    }
  }, [map, lat, lng]);
  return null;
}

function GoogleLocation({ address, onChange }) {
  const places = useMapsLibrary("places");
  const geocoding = useMapsLibrary("geocoding");
  const status = useApiLoadingStatus();
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const token = useRef(null);
  const sequence = useRef(0);
  const listId = useId();

  useEffect(
    () => () => {
      sequence.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (!places || searchTerm.trim().length < 3) return;
    const requestId = sequence.current;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setBusy(true);
      try {
        token.current ??= new places.AutocompleteSessionToken();
        const result =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: searchTerm,
            sessionToken: token.current,
            language: "it",
          });
        if (!cancelled && requestId === sequence.current) {
          setSuggestions(
            result.suggestions.filter((item) => item.placePrediction),
          );
          setActive(-1);
        }
      } catch {
        if (!cancelled && requestId === sequence.current)
          setError(
            "Ricerca indirizzi non disponibile. Puoi selezionare un punto sulla mappa o inserire le coordinate manualmente.",
          );
      } finally {
        if (!cancelled && requestId === sequence.current) setBusy(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [places, searchTerm]);

  function commit(location, luogo) {
    const next = { luogo, latitudine: location.lat, longitudine: location.lng };
    if (!validAddress(next))
      throw new Error("Coordinate del luogo non valide.");
    onChange(next);
    setQuery(luogo);
    setSearchTerm("");
    setSuggestions([]);
  }

  async function selectSuggestion(suggestion) {
    const requestId = ++sequence.current;
    setBusy(true);
    setError("");
    setSuggestions([]);
    setSearchTerm("");
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ["location", "formattedAddress", "displayName"],
      });
      if (requestId !== sequence.current) return;
      if (!place.location) throw new Error();
      commit(
        place.location.toJSON(),
        place.formattedAddress || place.displayName,
      );
      token.current = null;
    } catch {
      if (requestId === sequence.current)
        setError(
          "Impossibile recuperare le coordinate. Seleziona un altro suggerimento.",
        );
    } finally {
      if (requestId === sequence.current) setBusy(false);
    }
  }

  async function selectPoint(event) {
    const location = event.detail.latLng;
    if (
      !location ||
      !Number.isFinite(location.lat) ||
      !Number.isFinite(location.lng)
    )
      return;
    const requestId = ++sequence.current;
    const fallback = `Punto sulla mappa (${location.lat.toFixed(5)}, ${location.lng.toFixed(5)})`;
    setBusy(true);
    setError("");
    try {
      commit(location, fallback);
      if (!geocoding) throw new Error();
      const result = await new geocoding.Geocoder().geocode({ location });
      if (requestId !== sequence.current) return;
      const label = result.results[0]?.formatted_address;
      if (label) commit(location, label);
      else
        setError(
          "Indirizzo non trovato: il punto e le coordinate sono stati salvati.",
        );
    } catch {
      if (requestId === sequence.current)
        setError(
          "Indirizzo non disponibile: il punto e le coordinate sono stati salvati.",
        );
    } finally {
      if (requestId === sequence.current) setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setSuggestions([]);
            setSearchTerm("");
          }
        }}
      >
        <label htmlFor={`${listId}-input`} className="field-label">
          Cerca un indirizzo
        </label>
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-3 text-neutral-400"
          />
          <input
            id={`${listId}-input`}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls={listId}
            aria-activedescendant={
              active >= 0 ? `${listId}-${active}` : undefined
            }
            value={query}
            className="field pl-10"
            placeholder="Via, città o nome del luogo"
            onChange={(event) => {
              sequence.current += 1;
              setBusy(false);
              setQuery(event.target.value);
              setSearchTerm(event.target.value);
              setSuggestions([]);
              setActive(-1);
              setError("");
              onChange(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && suggestions.length) {
                event.preventDefault();
                setActive((index) => (index + 1) % suggestions.length);
              }
              if (event.key === "ArrowUp" && suggestions.length) {
                event.preventDefault();
                setActive(
                  (index) => (index <= 0 ? suggestions.length : index) - 1,
                );
              }
              if (event.key === "Enter") {
                event.preventDefault();
                if (active >= 0) selectSuggestion(suggestions[active]);
              }
              if (event.key === "Escape" && suggestions.length) {
                event.preventDefault();
                event.stopPropagation();
                setSuggestions([]);
              }
            }}
          />
        </div>
        {suggestions.length > 0 && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
            <ul id={listId} role="listbox" aria-label="Indirizzi suggeriti">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.placePrediction.placeId}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={active === index}
                  className={`rounded-lg ${active === index ? "bg-neutral-100" : ""}`}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className="w-full px-3 py-3 text-left text-sm hover:bg-neutral-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion.placePrediction.text.toString()}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end border-t border-neutral-100 px-3 py-2">
              <img
                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                alt="Powered by Google"
                width="120"
                height="14"
              />
            </div>
          </div>
        )}
      </div>
      {["FAILED", "AUTH_FAILURE"].includes(status) ? (
        <p role="alert" className="error-message">
          Google Maps non è disponibile. Inserisci la posizione manualmente.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <Map
            defaultCenter={INITIAL_CENTER}
            defaultZoom={5}
            onClick={selectPoint}
            className="h-56 w-full"
            gestureHandling="cooperative"
            disableDefaultUI
            clickableIcons={false}
          >
            <RecenterMap address={address} />
            {validAddress(address) && (
              <Marker
                position={{ lat: address.latitudine, lng: address.longitudine }}
              />
            )}
          </Map>
        </div>
      )}
      <p role="status" className="text-xs text-neutral-500">
        {busy
          ? "Ricerca della posizione…"
          : "Seleziona un suggerimento oppure fai clic sulla mappa."}
      </p>
      {error && (
        <p role="alert" className="text-xs text-amber-800">
          {error}
        </p>
      )}
      <ManualLocation
        onChange={(value) => {
          sequence.current += 1;
          setBusy(false);
          setError("");
          commit(
            { lat: value.latitudine, lng: value.longitudine },
            value.luogo,
          );
        }}
      />
    </div>
  );
}

function ManualLocation({ onChange }) {
  const [draft, setDraft] = useState({
    luogo: "",
    latitudine: "",
    longitudine: "",
  });
  const [error, setError] = useState("");
  return (
    <details className="rounded-xl border border-neutral-200 p-3">
      <summary className="cursor-pointer text-xs text-neutral-600">
        Inserisci indirizzo e coordinate manualmente
      </summary>
      <div className="mt-3 space-y-3">
        <label className="block text-xs">
          Luogo
          <input
            value={draft.luogo}
            onChange={(event) =>
              setDraft({ ...draft, luogo: event.target.value })
            }
            className="field mt-1"
            placeholder="Indirizzo completo"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {["latitudine", "longitudine"].map((key) => (
            <label key={key} className="block text-xs capitalize">
              {key}
              <input
                type="number"
                step="any"
                min={key === "latitudine" ? -90 : -180}
                max={key === "latitudine" ? 90 : 180}
                value={draft[key]}
                onChange={(event) =>
                  setDraft({ ...draft, [key]: event.target.value })
                }
                className="field mt-1"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            const value = {
              luogo: draft.luogo,
              latitudine: Number(draft.latitudine),
              longitudine: Number(draft.longitudine),
            };
            if (
              !draft.latitudine.trim() ||
              !draft.longitudine.trim() ||
              !validAddress(value)
            )
              return setError("Inserisci un luogo e coordinate valide.");
            setError("");
            onChange(value);
          }}
        >
          Usa questa posizione
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}

export default function LocationPicker({ address, onChange }) {
  const [loadError, setLoadError] = useState(false);
  return (
    <section className="space-y-3 border-t border-neutral-100 pt-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MapPin size={17} />
        Posizione del post
      </h3>
      {hasKey && !loadError ? (
        <APIProvider
          apiKey={MAPS_KEY}
          language="it"
          region="IT"
          onError={() => setLoadError(true)}
        >
          <GoogleLocation address={address} onChange={onChange} />
        </APIProvider>
      ) : (
        <>
          <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-500">
            La mappa non è disponibile. Puoi inserire la posizione manualmente.
          </p>
          <ManualLocation onChange={onChange} />
        </>
      )}
      {validAddress(address) && (
        <div aria-live="polite" className="rounded-xl bg-neutral-50 p-3">
          <p className="text-sm font-medium">{address.luogo}</p>
          <p className="mt-1 font-mono text-xs text-neutral-500">
            Latitudine: {address.latitudine.toFixed(6)} · Longitudine:{" "}
            {address.longitudine.toFixed(6)}
          </p>
        </div>
      )}
    </section>
  );
}
