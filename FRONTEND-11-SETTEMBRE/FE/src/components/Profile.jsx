import { useState } from "react";
import { Pencil } from "lucide-react";
import PostItem from "./PostItem";

export default function Profile({
  profile,
  posts,
  onSave,
  onCreate,
  onPostDeleted,
  onPostUpdated,
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState(profile.photo);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    )
      return setError("Scegli una foto JPEG o PNG, massimo 2 MB.");
    setReading(true);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
      setReading(false);
    };
    reader.onerror = () => {
      setError("Impossibile leggere la foto.");
      setReading(false);
    };
    reader.readAsDataURL(file);
  }
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-100 text-xl text-neutral-500">
            {profile.photo ? (
              <img
                src={profile.photo}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              "JT"
            )}
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold tracking-tight">
              {profile.name}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">@{profile.username}</p>
            <button
              className="mt-3 flex items-center gap-1.5 text-xs font-medium"
              onClick={() => {
                setEditing((value) => !value);
                setName(profile.name);
                setPhoto(profile.photo);
                setError("");
              }}
            >
              <Pencil size={13} />
              Modifica profilo
            </button>
          </div>
        </div>
        <div className="mt-7 grid grid-cols-3 border-y border-neutral-100 py-5 text-center">
          <div>
            <strong className="block text-lg font-semibold">
              {posts.length}
            </strong>
            <span className="text-xs text-neutral-500">Post</span>
          </div>
          <div>
            <strong className="block text-lg font-semibold">1.284</strong>
            <span className="text-xs text-neutral-500">Follower</span>
          </div>
          <div>
            <strong className="block text-lg font-semibold">346</strong>
            <span className="text-xs text-neutral-500">Seguiti</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Follower e seguiti dimostrativi. Il conteggio dei post proviene dal
          feed.
        </p>
        {editing && (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return setError("Inserisci il nome.");
              const failure = onSave({ ...profile, name: name.trim(), photo });
              if (failure) setError(failure);
              else setEditing(false);
            }}
          >
            <label className="block">
              <span className="field-label">Nome</span>
              <input
                className="field"
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="field-label">Foto profilo</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={choosePhoto}
                className="w-full text-xs"
              />
            </label>
            <p className="text-xs text-neutral-500">
              Nome e foto sono salvati in questo browser.
            </p>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button className="primary-button" disabled={reading}>
              Salva profilo
            </button>
          </form>
        )}
      </section>
      <h2 className="text-sm font-semibold">I tuoi post</h2>
      {posts.length ? (
        posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            profile={profile}
            canManage
            onDeleted={onPostDeleted}
            onUpdated={onPostUpdated}
          />
        ))
      ) : (
        <div className="empty-state">
          <p>Non hai ancora pubblicato post.</p>
          <button onClick={onCreate} className="secondary-button mx-auto mt-4">
            Crea il primo post
          </button>
        </div>
      )}
    </div>
  );
}
