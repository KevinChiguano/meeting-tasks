"use client";

import * as React from "react";
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  Kanban,
  Settings,
  Bell,
  HelpCircle,
  Search,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import DashboardView from "@/frontend/views/DashboardView";
import UploadView from "@/frontend/views/UploadView";
import MeetingDetailView from "@/frontend/views/MeetingDetailView";
import TaskBoardView from "@/frontend/views/TaskBoardView";
import SettingsView from "@/frontend/views/SettingsView";

export type ViewType = "dashboard" | "upload" | "detail" | "board" | "settings";

export default function ClientPage() {
  const [currentView, setCurrentView] = React.useState<ViewType>("dashboard");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [meetings, setMeetings] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [helpModalOpen, setHelpModalOpen] = React.useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] =
    React.useState(false);
  const [prevMeetingsCount, setPrevMeetingsCount] = React.useState(0);

  const fetchMeetings = React.useCallback(async () => {
    try {
      const res = await fetch("/api/meetings?_cb=" + Date.now(), {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMeetings(data.data);

        const count = data.data.length;
        if (prevMeetingsCount > 0 && count > prevMeetingsCount) {
          setHasUnreadNotifications(true);
        }
        setPrevMeetingsCount(count);
      }
    } catch (err) {
      console.error("Error fetching meetings in layout:", err);
    }
  }, [prevMeetingsCount]);

  React.useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  React.useEffect(() => {
    const hasActiveJobs = meetings.some(
      (m) => m.status === "pending" || m.status === "processing",
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(fetchMeetings, 10000);
    return () => clearInterval(interval);
  }, [meetings, fetchMeetings]);

  React.useEffect(() => {
    // Sincronizar vista con el hash de la URL
    const syncViewWithHash = () => {
      const hash = window.location.hash.replace("#", "") as ViewType;
      const validViews: ViewType[] = [
        "dashboard",
        "upload",
        "detail",
        "board",
        "settings",
      ];
      if (validViews.includes(hash)) {
        setCurrentView(hash);
      } else {
        // Redirigir por defecto al hash #dashboard si está vacío o no es válido
        window.location.hash = "dashboard";
      }
    };

    syncViewWithHash();
    window.addEventListener("hashchange", syncViewWithHash);
    return () => window.removeEventListener("hashchange", syncViewWithHash);
  }, []);

  const navigateTo = React.useCallback((view: ViewType) => {
    window.location.hash = view;
    setSidebarOpen(false); // Cerrar sidebar en móvil al navegar
  }, []);

  const filteredMeetings = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    return meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.project &&
          m.project.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [searchQuery, meetings]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "upload", label: "Subir Audio", icon: UploadCloud },
    { id: "detail", label: "Detalle de Reunión", icon: FileText },
    { id: "board", label: "Tablero de Tareas", icon: Kanban },
    { id: "settings", label: "Configuración", icon: Settings },
  ] as const;

  return (
    <div className="flex min-h-screen bg-background text-on-background overflow-hidden relative">
      {/* Backdrop overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col h-full w-[260px] p-4 fixed left-0 top-0 z-50 bg-surface-container-low/95 md:bg-surface-container-low/60 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 ease-in-out md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between mb-10 px-2 mt-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary shadow-lg shadow-indigo-500/20">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary leading-tight tracking-tight">
                Reuniones
              </h1>
              <p className="text-[10px] text-on-surface-variant/70 tracking-wider uppercase font-bold">
                Productividad
              </p>
            </div>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg hover:bg-white/5 md:hidden text-on-surface-variant hover:text-on-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ease-in-out text-base w-full text-left",
                  isActive
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-white/5 font-medium",
                )}
              >
                <Icon
                  className={cn("w-5 h-5", isActive ? "fill-current/20" : "")}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[260px] h-screen overflow-y-auto flex flex-col relative w-full">
        {/* Top bar */}
        <header className="flex justify-between items-center w-full px-6 h-16 shrink-0 sticky top-0 z-40 bg-surface/60 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            {/* Hamburger menu trigger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 md:hidden text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Toggle Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-primary/80 capitalize">
              {navItems.find((item) => item.id === currentView)?.label ||
                currentView}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar reuniones o proyectos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-container border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-64 focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-on-surface-variant/50"
              />

              {/* Search results dropdown */}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-high border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in max-h-60 overflow-y-auto">
                  {filteredMeetings.length > 0 ? (
                    filteredMeetings.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          localStorage.setItem("selected_meeting_id", m.id);
                          setSearchQuery("");
                          navigateTo("detail");
                        }}
                        className="p-3 hover:bg-white/5 border-b border-white/5 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                            {m.title}
                          </p>
                          <p className="text-xs text-on-surface-variant/70 truncate">
                            {m.project || "Sin Proyecto"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-[9px] font-bold px-2.5 py-0.5 rounded-full border shrink-0",
                            m.status === "completed" &&
                              "bg-green-500/10 text-green-400 border-green-500/20",
                            m.status === "processing" &&
                              "bg-blue-500/10 text-blue-400 border-blue-500/20",
                            m.status === "pending" &&
                              "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                            m.status === "failed" &&
                              "bg-red-500/10 text-red-400 border-red-500/20",
                          )}
                        >
                          {m.status === "completed" && "Completado"}
                          {m.status === "processing" && "Procesando"}
                          {m.status === "pending" && "En Cola"}
                          {m.status === "failed" && "Fallido"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-xs text-center text-on-surface-variant/60">
                      No se encontraron resultados
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setHasUnreadNotifications(false);
                  }}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors relative"
                  aria-label="Notificaciones"
                >
                  <Bell className="w-5 h-5 text-on-surface-variant" />
                  {hasUnreadNotifications && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  )}
                </button>

                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-surface-container-high border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                      <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <span className="font-bold text-sm">
                          Notificaciones de IA
                        </span>
                        <button
                          onClick={() => setNotificationsOpen(false)}
                          className="text-xs text-primary hover:underline font-semibold"
                        >
                          Cerrar
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                        {meetings.length > 0 ? (
                          [...meetings]
                            .reverse()
                            .slice(0, 5)
                            .map((m) => (
                              <div
                                key={m.id}
                                onClick={() => {
                                  localStorage.setItem(
                                    "selected_meeting_id",
                                    m.id,
                                  );
                                  setNotificationsOpen(false);
                                  navigateTo("detail");
                                }}
                                className="p-4 hover:bg-white/5 cursor-pointer flex gap-3 items-start transition-colors"
                              >
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                    m.status === "completed" && "bg-green-400",
                                    m.status === "processing" &&
                                      "bg-blue-400 animate-pulse",
                                    m.status === "pending" && "bg-yellow-400",
                                    m.status === "failed" && "bg-red-400",
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold truncate">
                                    {m.title}
                                  </p>
                                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                                    {m.status === "completed" &&
                                      "Transcripción e IA completadas."}
                                    {m.status === "processing" &&
                                      "Transcribiendo audio..."}
                                    {m.status === "pending" &&
                                      "En cola de espera..."}
                                    {m.status === "failed" &&
                                      "Error al procesar audio."}
                                  </p>
                                  <span className="text-[9px] text-outline mt-1 block">
                                    {new Date(
                                      m.created_at || m.updated_at,
                                    ).toLocaleDateString("es-ES", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="p-6 text-xs text-center text-on-surface-variant/60">
                            No hay reuniones recientes
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setHelpModalOpen(true)}
                className="p-2 rounded-full hover:bg-white/5 transition-colors"
                aria-label="Ayuda"
              >
                <HelpCircle className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
          </div>
        </header>

        {/* View Router */}
        <div className="flex-1 relative">
          {currentView === "dashboard" && (
            <DashboardView navigateTo={navigateTo} />
          )}
          {currentView === "upload" && <UploadView navigateTo={navigateTo} />}
          {currentView === "detail" && <MeetingDetailView />}
          {currentView === "board" && <TaskBoardView />}
          {currentView === "settings" && <SettingsView />}
        </div>
      </main>

      {/* Help Modal Overlay */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-2xl max-w-lg w-full p-8 border border-white/10 shadow-2xl relative space-y-6">
            <button
              onClick={() => setHelpModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold">Guía de Uso</h3>
            </div>

            <div className="space-y-4 text-sm text-on-surface-variant overflow-y-auto max-h-96 pr-2">
              <div className="space-y-1">
                <h4 className="font-bold text-on-surface text-base">
                  🎙️ ¿Cómo subir una nueva reunión?
                </h4>
                <p>
                  Ve a la pestaña <strong>Subir Audio</strong>, arrastra tu
                  archivo (soporta MP3, WAV, M4A, MP4) y selecciona el proyecto
                  y los participantes. El procesamiento por IA se iniciará
                  automáticamente en segundo plano.
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-on-surface text-base">
                  🧠 ¿Cómo procesa la IA las tareas?
                </h4>
                <p>
                  Utilizamos el motor <strong>Gemini 2.5 Flash</strong>. La IA
                  no solo transcribe el audio, sino que analiza el contexto para
                  extraer accionables, fechas límites y asignar responsables de
                  manera autónoma.
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-on-surface text-base">
                  📊 Tablero de Tareas Kanban
                </h4>
                <p>
                  En la pestaña <strong>Tablero de Tareas</strong> puedes ver el
                  progreso del trabajo extraído. Puedes arrastrar tareas entre
                  las columnas para cambiar su estado o editarlas manualmente.
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-on-surface text-base">
                  🔔 Notificaciones en Tiempo Real
                </h4>
                <p>
                  La campana de la barra superior te avisará cuando una reunión
                  termine de procesarse, indicando si finalizó correctamente o
                  si ocurrió algún error.
                </p>
              </div>
            </div>

            <button
              onClick={() => setHelpModalOpen(false)}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
