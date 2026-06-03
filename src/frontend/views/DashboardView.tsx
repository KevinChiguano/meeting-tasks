import React, { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  CheckCircle,
  BarChart,
  Hourglass,
  Video,
  BrainCircuit,
  Mic,
  Handshake,
  AlertCircle,
  MoreVertical,
  PlusCircle,
  ArrowRight,
  Loader2,
  EyeIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/frontend/lib/utils";

export default function DashboardView({
  navigateTo,
}: {
  navigateTo: (view: any) => void;
}) {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleDeleteMeeting = async (
    e: React.MouseEvent,
    id: string,
    title: string,
  ) => {
    e.stopPropagation(); // Prevenir navegación
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la reunión "${title}"? Se borrarán permanentemente todas las tareas asociadas.`,
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/meetings?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        // Actualizar lista local
        setMeetings((prev) => prev.filter((m) => m.id !== id));
        // Volver a consultar las estadísticas para reflejar la pérdida de tareas/reuniones en los KPI cards
        fetch("/api/stats")
          .then((res) => res.json())
          .then((statsData) => {
            if (statsData.success && statsData.data) {
              setStats(statsData.data);
            }
          });
      } else {
        alert(data.message || "Error al eliminar la reunión.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al eliminar la reunión.");
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/meetings?limit=5&order=desc").then((res) => res.json()),
      fetch("/api/stats").then((res) => res.json()),
    ])
      .then(([meetingsData, statsData]) => {
        if (meetingsData.success && meetingsData.data) {
          setMeetings(meetingsData.data);
        }
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching dashboard data:", err);
        setLoading(false);
      });
  }, []);

  // Métricas dinámicas calculadas 100% desde la Base de Datos
  const mCount = stats?.supabase?.meetingsCount || 0;
  const tCount = stats?.supabase?.tasksCount || 0;
  const cCount = stats?.supabase?.completedTasksCount || 0;

  const processedMeetings = stats?.supabase?.completedMeetingsCount || 0;
  const progressPercentage =
    tCount > 0 ? Math.round((cCount / tCount) * 100) : 0;

  // Estimación de tiempo ahorrado: 30 minutos (0.5 horas) por tarea completada
  const timeSaved = (cCount * 0.5).toFixed(1);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-10 h-10 border-none animate-spin text-primary" />
          <p className="text-sm text-on-surface-variant">
            Cargando panel de control...
          </p>
        </div>
      ) : (
        <>
          {/* Welcome Banner */}
          <section className="relative overflow-hidden rounded-2xl p-10 glass-card flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 space-y-4 text-center md:text-left">
              <h1 className="text-5xl font-bold text-on-surface tracking-tight">
                Bienvenido
              </h1>
              <p className="text-base text-on-surface-variant max-w-lg">
                Tu asistente de IA ha procesado{" "}
                <span className="text-primary font-bold">
                  {processedMeetings}{" "}
                  {processedMeetings === 1 ? "reunión" : "reuniones"}
                </span>{" "}
                reales en total.
              </p>
            </div>

            <div className="relative z-10">
              <button
                onClick={() => navigateTo("upload")}
                className="bg-gradient-to-br from-[#6366f1] to-[#9333ea] text-white px-8 py-4 rounded-xl font-medium flex items-center gap-3 shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                Subir Nueva Reunión
              </button>
            </div>
          </section>

          {/* KPI Cards Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Meetings */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between group cursor-default">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm text-on-surface-variant font-semibold">
                  Total Reuniones
                </p>
                <h3 className="text-3xl font-semibold text-on-surface mt-1">
                  {mCount}
                </h3>
              </div>
            </div>

            {/* Extracted Tasks */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between group cursor-default">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary group-hover:bg-secondary/20 transition-colors">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm text-on-surface-variant font-semibold">
                  Tareas Extraídas
                </p>
                <h3 className="text-3xl font-semibold text-on-surface mt-1">
                  {tCount}
                </h3>
              </div>
            </div>

            {/* Progress */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between group cursor-default">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary group-hover:bg-tertiary/20 transition-colors">
                  <BarChart className="w-6 h-6" />
                </div>
                <div className="relative flex items-center justify-center w-10 h-10">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      className="text-white/5"
                    ></circle>
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray="100"
                      strokeDashoffset={100 - progressPercentage}
                      className="text-tertiary transition-all duration-1000"
                    ></circle>
                  </svg>
                  <span className="absolute text-[10px] font-bold text-on-surface">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm text-on-surface-variant font-semibold">
                  Progreso General
                </p>
                <h3 className="text-3xl font-semibold text-on-surface mt-1">
                  {cCount}/{tCount}
                </h3>
              </div>
            </div>

            {/* Time Saved */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between group cursor-default">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center text-error group-hover:bg-error/20 transition-colors">
                  <Hourglass className="w-6 h-6" />
                </div>
                <div className="flex gap-1 items-end h-8">
                  <div className="w-1.5 h-4 bg-error/30 rounded-full"></div>
                  <div className="w-1.5 h-6 bg-error/50 rounded-full"></div>
                  <div className="w-1.5 h-8 bg-error rounded-full animate-pulse opacity-80"></div>
                  <div className="w-1.5 h-5 bg-error/60 rounded-full"></div>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm text-on-surface-variant font-semibold">
                  Tiempo Ahorrado
                </p>
                <h3 className="text-3xl font-semibold text-on-surface mt-1">
                  {timeSaved}h
                </h3>
              </div>
            </div>
          </section>

          {/* Recent Meetings Table */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-on-surface">
                Reuniones Recientes
              </h2>
              <button
                onClick={() => navigateTo("board")}
                className="text-primary hover:text-primary-container font-semibold text-xs tracking-wider uppercase transition-colors flex items-center gap-2"
              >
                VER TABLERO DE TAREAS <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="p-6 text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
                        TÍTULO DE REUNIÓN
                      </th>
                      <th className="p-6 text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
                        PROYECTO
                      </th>
                      <th className="p-6 text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
                        FECHA
                      </th>
                      <th className="p-6 text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
                        ESTADO
                      </th>
                      <th className="p-6 text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
                        ACCIONES
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {meetings.length > 0 ? (
                      meetings.map((meeting) => (
                        <tr
                          key={meeting.id}
                          className="hover:bg-white/5 transition-colors group cursor-pointer"
                          onClick={() => navigateTo("detail")}
                        >
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Video className="w-4 h-4" />
                              </div>
                              <span className="font-medium text-on-surface text-base">
                                {meeting.title}
                              </span>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="bg-primary/10 text-primary text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
                              {meeting.project || "Sin Proyecto"}
                            </span>
                          </td>
                          <td className="p-6 text-sm text-on-surface-variant">
                            {new Date(
                              meeting.created_at || meeting.updated_at,
                            ).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-6">
                            <div
                              className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border",
                                meeting.status === "completed" &&
                                  "bg-green-500/10 text-green-400 border-green-500/20",
                                meeting.status === "processing" &&
                                  "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                meeting.status === "pending" &&
                                  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                                meeting.status === "failed" &&
                                  "bg-red-500/10 text-red-400 border-red-500/20",
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full mr-2",
                                  meeting.status === "completed" &&
                                    "bg-green-400",
                                  meeting.status === "processing" &&
                                    "bg-blue-400 animate-pulse",
                                  meeting.status === "pending" &&
                                    "bg-yellow-400 animate-pulse",
                                  meeting.status === "failed" && "bg-red-400",
                                )}
                              ></span>
                              {meeting.status === "completed" && "Completado"}
                              {meeting.status === "processing" && "Procesando"}
                              {meeting.status === "pending" && "En Cola"}
                              {meeting.status === "failed" && "Fallido"}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                                <EyeIcon className="w-4 h-4 text-on-surface-variant" />
                              </button>
                              <button
                                onClick={(e) =>
                                  handleDeleteMeeting(
                                    e,
                                    meeting.id,
                                    meeting.title,
                                  )
                                }
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-12 text-center text-on-surface-variant"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Video className="w-8 h-8 text-on-surface-variant/40" />
                            <span className="text-sm font-semibold">
                              No se han encontrado reuniones
                            </span>
                            <span className="text-xs">
                              Usa el botón "Subir Nueva Reunión" para procesar
                              tu primer audio.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="pt-10 pb-6 text-center opacity-40 text-sm text-on-surface-variant">
        © 2024 Reuniones - Productividad. Todos los derechos reservados.
      </footer>
    </div>
  );
}
