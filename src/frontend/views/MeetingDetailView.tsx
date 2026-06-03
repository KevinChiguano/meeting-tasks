import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  Calendar,
  Clock,
  RotateCcw,
  Settings,
  Maximize,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Play,
  ArrowRightLeft,
  Sparkles,
  Plus,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Hourglass,
  Loader2,
} from "lucide-react";
import { cn } from "@/frontend/lib/utils";

export default function MeetingDetailView() {
  const [projects, setProjects] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // States for filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("all");

  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Loaded active meeting
  const [activeMeeting, setActiveMeeting] = useState<any>(null);

  // Helper safe parser for meeting members (handles pre-parsed arrays and stringified JSON)
  const getMeetingMembers = (meeting: any) => {
    if (!meeting || !meeting.members) return [];
    if (Array.isArray(meeting.members)) return meeting.members;
    try {
      return JSON.parse(meeting.members);
    } catch (_) {
      if (typeof meeting.members === 'string') {
        return [meeting.members];
      }
      return [];
    }
  };

  // Determinar dinámicamente el estado global de la reunión según las tareas asociadas
  const getMeetingStatus = () => {
    if (!activeMeeting) return { label: "", className: "" };
    
    if (activeMeeting.status === "processing") {
      return { 
        label: "PROCESANDO", 
        className: "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse" 
      };
    }
    if (activeMeeting.status === "failed") {
      return { 
        label: "FALLIDO", 
        className: "bg-red-500/10 text-red-400 border-red-500/20" 
      };
    }
    if (activeMeeting.status === "pending") {
      return { 
        label: "EN COLA", 
        className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse" 
      };
    }

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;

    if (total > 0 && completed === total) {
      return { 
        label: "COMPLETADO", 
        className: "bg-green-500/10 text-green-400 border-green-500/20" 
      };
    } else {
      const pendingCount = total - completed;
      return { 
        label: `TAREAS PENDIENTES (${pendingCount} ${pendingCount === 1 ? 'RESTANTE' : 'RESTANTES'})`, 
        className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" 
      };
    }
  };

  const meetingStatusInfo = getMeetingStatus();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMsg("");
      try {
        // 1. Fetch Projects
        const projRes = await fetch("/api/projects");
        const projData = await projRes.json();
        if (projData.success) {
          setProjects(projData.data);
        }

        // 2. Fetch Members
        const memRes = await fetch("/api/members");
        const memData = await memRes.json();
        if (memData.success) {
          setMembers(memData.data);
        }

        // 3. Fetch Meetings
        const mtgRes = await fetch("/api/meetings?_cb=" + Date.now(), { cache: "no-store" });
        const mtgData = await mtgRes.json();
        if (mtgData.success) {
          setMeetings(mtgData.data);

          // Determine starting meeting ID: check localStorage first
          const savedMeetingId = localStorage.getItem("selected_meeting_id");

          let initialMeeting = null;

          if (savedMeetingId) {
            initialMeeting = mtgData.data.find(
              (m: any) => m.id === savedMeetingId,
            );
            // clean up localStorage so it doesn't stick forever
            localStorage.removeItem("selected_meeting_id");
            localStorage.removeItem("selected_project_name");
          }

          if (!initialMeeting && mtgData.data.length > 0) {
            initialMeeting = mtgData.data[0];
          }

          if (initialMeeting) {
            setActiveMeeting(initialMeeting);
            setSelectedMeetingId(initialMeeting.id);
            if (initialMeeting.project) {
              setSelectedProjectId(initialMeeting.project);
            }
          }
        }
      } catch (err: any) {
        console.error("Error loading data in MeetingDetailView:", err);
        setErrorMsg(
          "Error al conectar con la base de datos. Por favor, recarga.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Fetch tasks when selected meeting changes
  useEffect(() => {
    if (!selectedMeetingId || selectedMeetingId === "all") {
      setTasks([]);
      return;
    }

    async function loadTasks() {
      setIsTasksLoading(true);
      try {
        const res = await fetch(`/api/tasks?meetingId=${selectedMeetingId}&_cb=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.success) {
          setTasks(data.data);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setIsTasksLoading(false);
      }
    }

    // Also update activeMeeting info
    const mtg = meetings.find((m) => m.id === selectedMeetingId);
    if (mtg) {
      setActiveMeeting(mtg);
    }

    loadTasks();
  }, [selectedMeetingId, meetings]);

  // Handle Project Filter Change
  const handleProjectFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const projVal = e.target.value;
    setSelectedProjectId(projVal);

    // Auto-select the first meeting belonging to this project
    const filtered = meetings.filter(
      (m) => projVal === "all" || m.project === projVal,
    );
    if (filtered.length > 0) {
      setSelectedMeetingId(filtered[0].id);
    } else {
      setSelectedMeetingId("");
      setActiveMeeting(null);
      setTasks([]);
    }
  };

  // Handle Assignee Change for a Task (Optimistic UI Pattern)
  const handleAssigneeChange = async (taskId: string, newAssignee: string) => {
    setSuccessMsg("");
    const previousTasks = [...tasks];

    // Optimistically update the UI assignee
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, assignee: newAssignee } : t,
      ),
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: taskId,
          assignee: newAssignee,
        }),
      });

      const result = await res.json();
      if (result.success) {
        showToast("Asignado correctamente.");
      } else {
        // Rollback on failure
        setTasks(previousTasks);
        setErrorMsg(result.message || "Error al actualizar asignado.");
      }
    } catch (err) {
      console.error(err);
      // Rollback on network error
      setTasks(previousTasks);
      setErrorMsg("Error de red al actualizar la tarea.");
    }
  };

  // Handle Due Date Change for a Task (Optimistic UI Pattern)
  const handleDueDateChange = async (taskId: string, newDueDate: string) => {
    setSuccessMsg("");
    const previousTasks = [...tasks];

    // Optimistically update UI due date
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, dueDate: newDueDate } : t,
      ),
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: taskId,
          dueDate: newDueDate,
        }),
      });

      const result = await res.json();
      if (result.success) {
        showToast("Fecha límite guardada.");
      } else {
        setTasks(previousTasks);
        setErrorMsg(result.message || "Error al actualizar la fecha.");
      }
    } catch (err) {
      console.error(err);
      setTasks(previousTasks);
      setErrorMsg("Error de red al actualizar la fecha.");
    }
  };

  // Handle Status Toggle for a Task
  const handleStatusToggle = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    const previousTasks = [...tasks];

    // Optimistic toggle
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: taskId,
          status: nextStatus,
        }),
      });

      const result = await res.json();
      if (result.success) {
        showToast("Estado actualizado.");
      } else {
        setTasks(previousTasks);
      }
    } catch (err) {
      console.error(err);
      setTasks(previousTasks);
    }
  };

  // Create a new manual task for this meeting
  const handleAddNewTask = async () => {
    if (!selectedMeetingId) return;
    showToast("Crea tareas adicionales subiendo más audios o agrégalas en el Task Board.");
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3500);
  };

  const handleDeleteMeeting = async () => {
    if (!activeMeeting) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la reunión "${activeMeeting.title}"? Se borrarán permanentemente todas las tareas asociadas.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/meetings?id=${activeMeeting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Reunión eliminada con éxito.");
        
        // Remove from local meetings state
        const updatedMeetings = meetings.filter((m) => m.id !== activeMeeting.id);
        setMeetings(updatedMeetings);

        // Update selected meeting and active meeting
        if (updatedMeetings.length > 0) {
          const nextMeeting = updatedMeetings[0];
          setSelectedMeetingId(nextMeeting.id);
          setActiveMeeting(nextMeeting);
        } else {
          setSelectedMeetingId("");
          setActiveMeeting(null);
          setTasks([]);
        }
      } else {
        showError(data.message || "Error al eliminar la reunión.");
      }
    } catch (err) {
      console.error(err);
      showError("Error de red al eliminar la reunión.");
    }
  };

  // Helper to format timestamps
  const formatDate = (dateStr: any) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (_) {
      return dateStr;
    }
  };

  // Meetings filtered by project selection
  const filteredMeetings = meetings.filter(
    (m) => selectedProjectId === "all" || m.project === selectedProjectId,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-on-surface-variant font-medium">
          Cargando base de datos de reuniones...
        </p>
      </div>
    );
  }

  // Active meeting specific members
  const activeMeetingMembers = getMeetingMembers(activeMeeting);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-green-400">
          <CheckCircle2 className="w-5 h-5 animate-pulse" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-500 text-white font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-red-400">
          <AlertCircle className="w-5 h-5 animate-pulse" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* FILTER BAR PANEL */}
      <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-center justify-between border border-white/10 shrink-0 bg-surface-container-low/40">
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {/* Project Filter */}
          <div className="space-y-1 w-full sm:w-60">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">
              Filtrar por Proyecto
            </label>
            <select
              value={selectedProjectId}
              onChange={handleProjectFilterChange}
              className="w-full bg-white/5 border border-white/10 text-sm rounded-xl px-4 py-2.5 text-on-surface focus:outline-none focus:border-primary cursor-pointer appearance-none animate-fade-in"
            >
              <option value="all" className="bg-surface">
                Todos los Proyectos
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.name} className="bg-surface">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Meeting Filter */}
          <div className="space-y-1 w-full sm:w-80">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">
              Seleccionar Reunión
            </label>
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-sm rounded-xl px-4 py-2.5 text-on-surface focus:outline-none focus:border-primary cursor-pointer appearance-none"
              disabled={filteredMeetings.length === 0}
            >
              {filteredMeetings.length === 0 ? (
                <option className="bg-surface">
                  No hay reuniones registradas
                </option>
              ) : (
                filteredMeetings.map((m) => (
                  <option key={m.id} value={m.id} className="bg-surface">
                    {m.title} ({formatDate(m.created_at)})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-end">
          {activeMeeting && (
            <button
              onClick={handleDeleteMeeting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium border border-red-500/20 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Reunión
            </button>
          )}
          <button
            onClick={() => {
              // Trigger reload
              fetch("/api/meetings?_cb=" + Date.now(), { cache: "no-store" })
                .then((r) => r.json())
                .then((d) => {
                  if (d.success) setMeetings(d.data);
                  showToast("Reuniones sincronizadas.");
                });
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 glass-card hover:bg-white/10 rounded-xl text-sm text-on-surface font-medium border border-white/5 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Sincronizar
          </button>
        </div>
      </div>

      {/* BLANK STATE IF NO MEETING */}
      {!activeMeeting ? (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto border border-white/10">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-on-surface">
              Ninguna Reunión Encontrada
            </h3>
            <p className="text-on-surface-variant mt-2 max-w-md">
              No hay reuniones que coincidan con los filtros seleccionados o la
              tabla está vacía. Dirígete a la pestaña de subir para procesar un
              nuevo audio.
            </p>
          </div>
        </div>
      ) : (
        /* ACTIVE MEETING DETAILS GRID */
        <div className="space-y-8 animate-fade-in">
          {/* Header information */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <nav className="flex items-center gap-2 text-on-surface-variant mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Proyectos
                </span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-semibold">
                  {activeMeeting.project || "Sin Clasificar"}
                </span>
              </nav>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface">
                {activeMeeting.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 mt-4 text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {formatDate(activeMeeting.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    Estado:
                    <span
                      className={cn(
                        "ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                        meetingStatusInfo.className
                      )}
                    >
                      {meetingStatusInfo.label}
                    </span>
                  </span>
                </div>

                {/* Members list */}
                {activeMeetingMembers.length > 0 && (
                  <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                    <span className="text-xs font-semibold text-outline mr-1">
                      Participantes:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMeetingMembers.map(
                        (name: string, i: number) => (
                          <span
                            key={i}
                            className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-on-surface font-medium"
                          >
                            {name}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[500px]">
            {/* LEFT COLUMN: AUDIO PLAYER & TRANSCRIPT */}
            <div className="lg:col-span-7 flex flex-col gap-6 overflow-hidden">
              {/* Premium Styled HTML5 Audio Player */}
              {activeMeeting.audio_url && (
                <div className="glass-card rounded-2xl p-6 border border-white/10 flex flex-col gap-3 shrink-0 bg-surface-container-low/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Reproductor de Reunión
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono">
                      {activeMeeting.file_name}
                    </span>
                  </div>

                  <audio
                    src={activeMeeting.audio_url}
                    controls
                    className="w-full focus:outline-none focus:ring-1 focus:ring-primary rounded-xl"
                  />
                </div>
              )}

              {/* Transcript Panel */}
              <div className="glass-card flex-1 rounded-2xl flex flex-col overflow-hidden min-h-[350px] border border-white/10 bg-surface-container-low/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-surface-container-low/40">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">Transcripción de IA</h3>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activeMeeting.transcript ? (
                    <div className="space-y-4">
                      {activeMeeting.transcript
                        .split("\n")
                        .map((para: string, idx: number) => {
                          if (!para.trim()) return null;

                          // Treat potential speaker patterns like "Carlos:", "Speaker 1:" cleanly
                          const match = para.match(/^([^:]+):(.*)$/);
                          if (match) {
                            const speaker = match[1].trim();
                            const speech = match[2].trim();
                            return (
                              <div
                                key={idx}
                                className="group p-3 rounded-lg hover:bg-white/5 border-l-2 border-transparent transition-all"
                              >
                                <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                                  {speaker}
                                </p>
                                <p className="text-base text-on-surface/90 leading-relaxed font-normal">
                                  {speech}
                                </p>
                              </div>
                            );
                          }

                          return (
                            <p
                              key={idx}
                              className="text-base text-on-surface/90 leading-relaxed font-normal p-3 rounded-lg hover:bg-white/5"
                            >
                              {para}
                            </p>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
                        <Hourglass className="w-6 h-6 text-on-surface-variant" />
                      </div>
                      <p className="text-on-surface-variant">
                        La transcripción aún no está lista o no se pudo generar.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: AI DETECTED TASKS */}
            <div className="lg:col-span-5 flex flex-col gap-5 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  <h3 className="text-lg font-bold">Tareas y Asignaciones</h3>
                </div>
                <button
                  onClick={handleAddNewTask}
                  className="text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline hover:opacity-80"
                >
                  <Plus className="w-3.5 h-3.5" /> AGREGAR TAREA
                </button>
              </div>

              {isTasksLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 h-60 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-on-surface-variant font-medium">
                    Obteniendo tareas...
                  </p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl text-center flex flex-col items-center justify-center flex-1 min-h-[300px] border border-white/5 bg-surface-container-low/5">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 text-on-surface-variant">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-on-surface">
                    No hay tareas creadas
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-[240px]">
                    Gemini no identificó ninguna tarea en esta reunión o aún no
                    se ha procesado.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-12">
                  {tasks.map((task) => {
                    const isCompleted = task.status === "completed";

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "glass-card p-5 rounded-xl border border-white/5 hover:border-white/20 transition-all border-l-4",
                          isCompleted
                            ? "border-l-green-500 opacity-70"
                            : "border-l-primary",
                        )}
                      >
                        <div className="flex justify-between items-start mb-4 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Complete Checkbox Button */}
                            <button
                              onClick={() =>
                                handleStatusToggle(task.id, task.status)
                              }
                              className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all",
                                isCompleted
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-white/25 hover:border-primary text-transparent",
                              )}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                            </button>

                            <span
                              className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px]",
                                isCompleted
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {isCompleted ? "COMPLETADO" : "PENDIENTE"}
                            </span>
                          </div>

                          {/* Date Picker Input */}
                          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                            <input
                              type="date"
                              value={task.dueDate || ""}
                              onChange={(e) =>
                                handleDueDateChange(task.id, e.target.value)
                              }
                              className="bg-transparent border-none text-[10px] text-on-surface font-semibold focus:ring-0 focus:outline-none p-0 cursor-pointer w-28 text-center"
                            />
                          </div>
                        </div>

                        {/* Title and Description */}
                        <div className="mb-4">
                          <h4
                            className={cn(
                              "text-base font-bold text-on-surface mb-1.5 focus:outline-none",
                              isCompleted &&
                                "line-through text-on-surface-variant",
                            )}
                          >
                            {task.title}
                          </h4>
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            {task.description || "Sin descripción detallada."}
                          </p>
                        </div>

                        {/* Assignee Dropdown Selector */}
                        <div className="flex items-center justify-between pt-3.5 border-t border-white/5">
                          <div className="flex items-center gap-3 w-full">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mr-1">
                              Responsable:
                            </span>

                            <div className="relative flex-1 max-w-[240px]">
                              <select
                                value={task.assignee || ""}
                                onChange={(e) =>
                                  handleAssigneeChange(task.id, e.target.value)
                                }
                                className="w-full bg-white/5 border border-white/10 rounded-lg text-xs font-semibold px-3 py-1.5 pl-8 text-on-surface focus:outline-none focus:border-primary cursor-pointer appearance-none"
                              >
                                <option
                                  value=""
                                  className="bg-surface text-on-surface-variant/40"
                                >
                                  Sin asignar...
                                </option>

                                {/* Si el assignee extraído por IA no está en BD global ni en el meeting, lo mostramos temporal */}
                                {task.assignee &&
                                  !members.some(
                                    (m) =>
                                      m.name.toLowerCase() ===
                                      task.assignee.toLowerCase(),
                                  ) &&
                                  !activeMeetingMembers.some(
                                    (name: string) =>
                                      name.toLowerCase() ===
                                      task.assignee.toLowerCase(),
                                  ) && (
                                    <option
                                      value={task.assignee}
                                      className="bg-surface text-secondary-container"
                                    >
                                      [IA Extraído] {task.assignee}
                                    </option>
                                  )}

                                {/* Miembros del meeting que cargamos del upload */}
                                {activeMeetingMembers.map((name: string, idx: number) => (
                                  <option key={`meeting-mem-${idx}`} value={name} className="bg-surface text-primary">
                                    [Participante] {name}
                                  </option>
                                ))}

                                {/* Miembros registrados de la BD global */}
                                {members
                                  .filter(
                                    (m) =>
                                      !activeMeetingMembers.some(
                                        (name: string) =>
                                          name.toLowerCase() ===
                                          m.name.toLowerCase(),
                                      ),
                                  )
                                  .map((m) => (
                                    <option
                                      key={m.id}
                                      value={m.name}
                                      className="bg-surface"
                                    >
                                      {m.name} ({m.role})
                                    </option>
                                  ))}
                              </select>
                              <User className="w-3.5 h-3.5 text-on-surface-variant absolute left-2.5 top-1/2 -translate-y-1/2" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* AI Summary Banner */}
                  <div className="p-5 bg-black/40 border border-primary/20 rounded-xl mt-6 flex items-center gap-4 shadow-lg backdrop-blur-xl shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center border border-primary/30 shrink-0">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-sm">
                        Resumen de IA Asignaciones
                      </h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        Puedes cambiar los responsables de cada tarea y
                        marcarlas como completadas inmediatamente para
                        sincronizarlas con el Task Board.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
