import {
  Bell,
  Home,
  MessageCircle,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

const items = [
  ["home", "Home", Home],
  ["esplora", "Esplora", Search],
  ["notifiche", "Notifiche", Bell],
  ["profilo", "Profilo", UserRound],
];

export default function Sidebar({
  currentView,
  onNavigate,
  onSettings,
  onMessages,
  profile,
}) {
  return (
    <>
      <aside className="sidebar group">
        <button
          className="mb-10 flex items-center gap-3 p-2"
          onClick={() => onNavigate("home")}
          aria-label="The Social Network, torna alla home"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-900 font-semibold text-white">
            TS
          </span>
          <span className="sidebar-label text-base font-semibold tracking-tight">
            The Social Network
          </span>
        </button>
        <nav aria-label="Navigazione principale" className="space-y-2">
          {items.map(([id, label, Icon]) => (
            <button
              key={id}
              title={label}
              aria-label={label}
              aria-current={currentView === id ? "page" : undefined}
              onClick={() => onNavigate(id)}
              className={`sidebar-button ${currentView === id ? "bg-neutral-100 text-neutral-950" : "text-neutral-500 hover:bg-neutral-50"}`}
            >
              <Icon size={22} strokeWidth={1.7} className="shrink-0" />
              <span className="sidebar-label">{label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          <button
            className="sidebar-button"
            onClick={onMessages}
            aria-label="Vai a messaggi"
            title="Vai a messaggi"
          >
            <MessageCircle className="shrink-0" size={22} strokeWidth={1.7} />
            <span className="sidebar-label">Vai a messaggi</span>
          </button>
          <button
            className="sidebar-button"
            onClick={onSettings}
            aria-label="Impostazioni"
            title="Impostazioni"
          >
            <Settings className="shrink-0" size={22} strokeWidth={1.7} />
            <span className="sidebar-label">Impostazioni</span>
          </button>
          <button
            className="sidebar-button mt-4 border-t border-neutral-100 pt-5"
            onClick={() => onNavigate("profilo")}
            aria-label={`Profilo di ${profile.name}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-100 text-xs">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                "JT"
              )}
            </span>
            <span className="sidebar-label truncate">{profile.name}</span>
          </button>
        </div>
      </aside>
      <nav
        aria-label="Navigazione mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-neutral-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {items.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={currentView === id ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] ${currentView === id ? "text-neutral-950" : "text-neutral-500"}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button
          onClick={onMessages}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] text-neutral-500"
        >
          <MessageCircle size={20} />
          Messaggi
        </button>
        <button
          onClick={onSettings}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] text-neutral-500"
        >
          <Settings size={20} />
          Impostazioni
        </button>
      </nav>
    </>
  );
}
