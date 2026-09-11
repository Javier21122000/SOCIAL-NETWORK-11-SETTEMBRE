import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, LoaderCircle, Plus, RefreshCw, Search } from "lucide-react";
import Sidebar from "./components/Sidebar";
import PostItem from "./components/PostItem";
import Profile from "./components/Profile";
import Messages from "./components/Messages";
import Modal from "./components/Modal";
import SettingsModal from "./components/SettingsModal";
import CreatePostModal from "./components/CreatePostModal";
import { getPosts, isOwnPost } from "./lib/posts";

const DEFAULT_PROFILE = {
  id: import.meta.env.VITE_PROFILE_ID || null,
  name: "Javier Torres",
  username: "javiertorres",
  photo: "",
};

function readStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState("home");
  const [profile, setProfile] = useState(() => {
    const saved = readStored("sociale.profile", DEFAULT_PROFILE);
    return saved &&
      typeof saved.name === "string" &&
      typeof saved.username === "string"
      ? { ...DEFAULT_PROFILE, ...saved }
      : DEFAULT_PROFILE;
  });
  const [publishedIds, setPublishedIds] = useState(() => {
    const saved = readStored("sociale.publishedIds", []);
    return Array.isArray(saved) ? saved : [];
  });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notice, setNotice] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [conversations, setConversations] = useState({});
  const chatRef = useRef(null);
  const headingRef = useRef(null);
  const requestRef = useRef(null);

  const loadPosts = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setFeedError("");
    try {
      const result = await getPosts(controller.signal);
      if (!controller.signal.aborted) setPosts(result);
    } catch (error) {
      if (!controller.signal.aborted) setFeedError(error.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial loading state is already true; defer to avoid a redundant effect render.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadPosts();
    });
    return () => {
      cancelled = true;
      requestRef.current?.abort();
    };
  }, [loadPosts]);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [currentView]);

  function navigate(view) {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showMessages() {
    if (window.matchMedia("(min-width: 1280px)").matches) {
      chatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      chatRef.current?.focus({ preventScroll: true });
    } else setMessagesOpen(true);
  }

  function published(post) {
    if (post?.id) {
      setPublishedIds((previous) => {
        const next = [...new Set([...previous, post.id])];
        try {
          localStorage.setItem("sociale.publishedIds", JSON.stringify(next));
        } catch {
          /* Session state remains available. */
        }
        return next;
      });
    }
    const notification = {
      id: crypto.randomUUID(),
      text: "Il tuo post è stato pubblicato.",
      date: new Date().toISOString(),
    };
    setNotifications((previous) => [notification, ...previous]);
    setNotice("Post pubblicato con successo.");
    navigate("home");
    void loadPosts();
  }

  // L'elenco locale viene aggiornato subito: il feed resta coerente senza ricaricare.
  function postDeleted(id) {
    setPosts((previous) => previous.filter((post) => post.id !== id));
    setPublishedIds((previous) => {
      const next = previous.filter((value) => value !== id);
      try {
        localStorage.setItem("sociale.publishedIds", JSON.stringify(next));
      } catch {
        /* Session state remains available. */
      }
      return next;
    });
    setNotice("Post eliminato.");
  }

  function postUpdated(updated) {
    setPosts((previous) =>
      previous.map((post) =>
        post.id === updated.id ? { ...post, ...updated } : post,
      ),
    );
    setNotice("Didascalia aggiornata.");
  }

  function saveProfile(next) {
    try {
      localStorage.setItem("sociale.profile", JSON.stringify(next));
      setProfile(next);
      return "";
    } catch {
      return "Spazio del browser insufficiente. Prova con una foto più piccola.";
    }
  }

  const ownPosts = posts.filter((post) =>
    isOwnPost(post, profile, publishedIds),
  );
  const filteredPosts = posts.filter((post) =>
    [
      post.didascalia,
      post.profilo?.nome,
      post.nomeUtente,
      post.indirizzo?.luogo,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const title = {
    home: "Il tuo feed",
    esplora: "Esplora",
    notifiche: "Notifiche",
    profilo: "Profilo",
  }[currentView];
  const messagesProps = {
    selected: selectedContact,
    onSelect: setSelectedContact,
    conversations,
    onSend: (id, text) =>
      setConversations((previous) => ({
        ...previous,
        [id]: [...(previous[id] || []), { id: crypto.randomUUID(), text }],
      })),
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar
        currentView={currentView}
        onNavigate={navigate}
        onSettings={() => setSettingsOpen(true)}
        onMessages={showMessages}
        profile={profile}
      />
      <div className="min-h-screen lg:pl-[76px] xl:grid xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-7 sm:px-8 lg:pb-12">
          <header className="mb-7 flex items-center justify-between border-b border-neutral-200 pb-5">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-semibold tracking-tight outline-none"
            >
              {title}
            </h1>
            <span className="text-xs text-neutral-400">
              The Social Network
            </span>
          </header>
          {notice && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm"
            >
              <span>{notice}</span>
              <button
                className="text-xs underline"
                onClick={() => setNotice("")}
              >
                Chiudi
              </button>
            </div>
          )}
          {feedError && (
            <div role="alert" className="error-message mb-5">
              <p>{feedError}</p>
              <button
                onClick={loadPosts}
                className="mt-3 flex items-center gap-2 text-xs font-medium"
                disabled={loading}
              >
                <RefreshCw size={14} />
                Riprova il caricamento
              </button>
            </div>
          )}
          {currentView === "home" && (
            <button
              onClick={() => setCreateOpen(true)}
              className="primary-button mx-auto mb-7 px-8 py-3.5 tracking-widest"
            >
              <Plus size={18} />
              POSTA
            </button>
          )}
          {currentView === "esplora" && (
            <label className="relative mb-6 block">
              <span className="sr-only">Cerca nei post</span>
              <Search
                className="absolute left-3 top-3 text-neutral-400"
                size={18}
              />
              <input
                className="field pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca per didascalia, persona o luogo"
              />
            </label>
          )}
          {loading && (
            <p
              role="status"
              className="mb-5 flex items-center justify-center gap-2 text-sm text-neutral-500"
            >
              <LoaderCircle size={17} className="animate-spin" />
              Caricamento dei post…
            </p>
          )}
          {["home", "esplora"].includes(currentView) && (
            <div className="space-y-5">
              {(currentView === "home" ? posts : filteredPosts).map(
                (post, index) => (
                  <PostItem
                    key={post.id || index}
                    post={post}
                    profile={profile}
                    canManage={isOwnPost(post, profile, publishedIds)}
                    onDeleted={postDeleted}
                    onUpdated={postUpdated}
                  />
                ),
              )}
              {!loading &&
                !feedError &&
                !(currentView === "home" ? posts : filteredPosts).length && (
                  <div className="empty-state">
                    <Plus
                      size={25}
                      strokeWidth={1.3}
                      className="mx-auto mb-4 text-neutral-400"
                    />
                    <h2 className="mb-2 text-base font-medium text-neutral-800">
                      {currentView === "home"
                        ? "Ogni storia inizia da un momento."
                        : "Nessun post trovato."}
                    </h2>
                    <p>
                      {currentView === "home"
                        ? "Condividi la prima foto o un documento."
                        : "Prova con un altro nome, luogo o parola."}
                    </p>
                  </div>
                )}
            </div>
          )}
          {currentView === "profilo" && (
            <Profile
              profile={profile}
              posts={ownPosts}
              onSave={saveProfile}
              onCreate={() => setCreateOpen(true)}
              onPostDeleted={postDeleted}
              onPostUpdated={postUpdated}
            />
          )}
          {currentView === "notifiche" && (
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {notifications.length ? (
                <ul className="divide-y divide-neutral-100">
                  {notifications.map((item) => (
                    <li key={item.id} className="flex gap-3 p-5">
                      <Bell size={18} className="mt-1 text-neutral-400" />
                      <div>
                        <p className="text-sm">{item.text}</p>
                        <time
                          dateTime={item.date}
                          className="text-xs text-neutral-400"
                        >
                          {new Date(item.date).toLocaleString("it-IT")}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-10 text-center">
                  <Bell size={26} className="mx-auto mb-4 text-neutral-300" />
                  <h2 className="text-sm font-medium">
                    Nessuna notifica per ora
                  </h2>
                  <p className="mt-2 text-xs text-neutral-500">
                    Qui trovi le conferme di pubblicazione di questa sessione.
                  </p>
                </div>
              )}
            </section>
          )}
        </main>
        <aside className="sticky top-0 hidden h-screen overflow-y-auto border-l border-neutral-200 bg-white p-5 pt-8 xl:block">
          <Messages {...messagesProps} focusRef={chatRef} />
        </aside>
      </div>
      {createOpen && (
        <CreatePostModal
          onClose={() => setCreateOpen(false)}
          onCreated={published}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {messagesOpen && (
        <Modal
          title="Le tue conversazioni"
          onClose={() => setMessagesOpen(false)}
        >
          <Messages {...messagesProps} />
        </Modal>
      )}
    </div>
  );
}
