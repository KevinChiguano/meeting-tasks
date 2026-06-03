import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  Check,
  Hourglass,
  Waves,
  BrainCircuit,
  CheckCircle2,
  X,
  Plus,
  AlertCircle,
  Loader2,
  Mic,
  Square,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/frontend/lib/utils";

interface UploadViewProps {
  navigateTo?: (
    view: "dashboard" | "upload" | "detail" | "board" | "settings",
  ) => void;
}

export default function UploadView({ navigateTo }: UploadViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = idle, 1 to 5 for steps
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [customMemberName, setCustomMemberName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadedMeetingId, setUploadedMeetingId] = useState<string | null>(
    null,
  );
  const [isFailed, setIsFailed] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"upload" | "record">("upload");

  // Estados de Grabación
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "recording" | "paused" | "stopped">("idle");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingStatus === "recording") {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const now = new Date();
        const dateStr = now.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const timeStr = now.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const generatedTitle = `Grabación del ${dateStr} - ${timeStr}`;

        const audioFile = new File([audioBlob], `grabacion-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        setFile(audioFile);
        if (!title) {
          setTitle(generatedTitle);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecordingStatus("recording");
      setRecordingDuration(0);
      setAudioUrl(null);
      setErrorMsg("");
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setErrorMsg("No se pudo acceder al micrófono. Asegúrate de dar los permisos correspondientes.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      setRecordingStatus("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      setRecordingStatus("recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
      mediaRecorder.stop();
      setRecordingStatus("stopped");
    }
  };

  const resetRecording = () => {
    setFile(null);
    setAudioUrl(null);
    setRecordingStatus("idle");
    setRecordingDuration(0);
  };

  // Estados para datos dinámicos de la BD
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  useEffect(() => {
    // 1. Obtener proyectos dinámicos
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProjectsList(data.data);
        }
      })
      .catch((err) => console.error("Error fetching projects:", err));

    // 2. Obtener miembros de la organización
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setOrgMembers(data.data);
          // Auto-agregar el primer miembro si existe como sugerencia inicial
          if (data.data.length > 0) {
            setMembers([data.data[0].name]);
          }
        }
      })
      .catch((err) => console.error("Error fetching org members:", err));
  }, []);

  // Mantener una referencia estable del callback de navegación para evitar reinstanciar el interval
  const navigateToRef = React.useRef(navigateTo);
  useEffect(() => {
    navigateToRef.current = navigateTo;
  }, [navigateTo]);

  // Polling del estado real de la reunión
  useEffect(() => {
    if (!uploadedMeetingId) return;

    const intervalId = setInterval(async () => {
      try {
        console.log(`[Polling] Consultando estado para ID: ${uploadedMeetingId}`);
        const res = await fetch(`/api/meetings?_cb=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
          }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const mtg = data.data.find((m: any) => m.id === uploadedMeetingId);
          if (mtg) {
            console.log(`[Polling] Reunión encontrada: "${mtg.title}" | Estado: ${mtg.status}`);
            if (mtg.status === "processing") {
              setCurrentStep(3); // Transcribiendo Audio (Whisper)
            } else if (mtg.status === "completed") {
              setCurrentStep(4); // Extrayendo Tareas (LLM)

              // Esperar unos segundos para mostrar la finalización, luego ir al paso 5 y redirigir
              setTimeout(() => {
                setCurrentStep(5); // ¡Todo listo!
                localStorage.setItem("selected_meeting_id", mtg.id);
                localStorage.setItem(
                  "selected_project_name",
                  mtg.project || "",
                );

                if (navigateToRef.current) {
                  setTimeout(() => {
                    navigateToRef.current!("detail");
                  }, 1500);
                }
              }, 2000);

              clearInterval(intervalId);
            } else if (mtg.status === "failed") {
              setErrorMsg(
                "El procesamiento de la reunión falló en el servidor con Gemini.",
              );
              setIsProcessing(false);
              setIsFailed(true);
              clearInterval(intervalId);
            }
          } else {
            console.warn(`[Polling] La reunión con ID ${uploadedMeetingId} aún no aparece en el listado.`);
          }
        }
      } catch (err) {
        console.error("Error polling meeting status:", err);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [uploadedMeetingId]);

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg("");
      setSuccessMsg("");
    }
  };

  const handleAddMember = () => {
    const val = customMemberName.trim();
    if (val && !members.includes(val)) {
      setMembers([...members, val]);
      setCustomMemberName("");
    }
  };

  const handleSelectMember = (name: string) => {
    if (name && !members.includes(name)) {
      setMembers([...members, name]);
    }
  };

  const handleRemoveMember = (name: string) => {
    setMembers(members.filter((m) => m !== name));
  };

  const handleStart = async () => {
    if (!file) {
      setErrorMsg(
        "Por favor, selecciona o arrastra un archivo de audio o video.",
      );
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setErrorMsg("");
    setSuccessMsg("");
    setUploadedMeetingId(null);
    setIsFailed(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "title",
      title ||
        file.name.substring(0, file.name.lastIndexOf(".")) ||
        "Reunión sin título",
    );
    formData.append("project", project);
    formData.append("members", JSON.stringify(members));
    formData.append(
      "model",
      localStorage.getItem("ai_model") || "Gemini 1.5 Flash",
    );
    formData.append("tone", localStorage.getItem("ai_tone") || "2");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al subir el archivo");
      }

      setUploadedMeetingId(data.meetingId);
      setCurrentStep(2); // En Cola de Procesamiento (Worker BullMQ)
      setSuccessMsg(
        "¡Archivo subido con éxito! Esperando al worker de procesamiento...",
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
          'Error al procesar el archivo. ¿Está configurado Supabase Storage con el bucket "audios"?',
      );
      setIsProcessing(false);
      setCurrentStep(0);
    }
  };

  const steps = [
    {
      id: 1,
      title: "Subiendo archivo",
      sub: file
        ? `Cargando ${file.name} - ${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : "Procesando archivo...",
      icon: Check,
      activeIcon: false,
    },
    {
      id: 2,
      title: "En Cola de Procesamiento",
      sub: "Esperando worker BullMQ...",
      icon: Hourglass,
      activeIcon: true,
    },
    {
      id: 3,
      title: "Transcribiendo Audio",
      sub: "Analizando audio con Gemini...",
      icon: Waves,
      activeIcon: true,
    },
    {
      id: 4,
      title: "Extrayendo Tareas (LLM)",
      sub: "Estructurando tareas y accionables...",
      icon: BrainCircuit,
      activeIcon: true,
    },
    {
      id: 5,
      title: "¡Todo listo!",
      sub: "Redirigiendo a Detalles de la Reunión...",
      icon: CheckCircle2,
      activeIcon: false,
    },
  ];

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-10">
      <div>
        <h2 className="text-4xl font-bold text-on-surface mb-2 tracking-tight">
          Subir Nueva Reunión
        </h2>
        <p className="text-lg text-on-surface-variant">
          Sube audio o video para transcribir y generar tareas automáticamente
          con IA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORM AND DROPZONE */}
        <div className="lg:col-span-2 space-y-8">
          {/* Selector de Pestañas */}
          <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/10 gap-1">
            <button
              onClick={() => !isProcessing && setActiveTab("upload")}
              className={cn(
                "flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                activeTab === "upload"
                  ? "bg-primary text-on-primary shadow-lg shadow-indigo-500/20"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              )}
            >
              <UploadCloud className="w-4 h-4" />
              Subir Archivo
            </button>
            <button
              onClick={() => !isProcessing && setActiveTab("record")}
              className={cn(
                "flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                activeTab === "record"
                  ? "bg-primary text-on-primary shadow-lg shadow-indigo-500/20"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              )}
            >
              <Mic className="w-4 h-4" />
              Grabar Audio
            </button>
          </div>

          {activeTab === "upload" ? (
            /* Dropzone */
            <div
              onClick={!isProcessing ? triggerFileSelect : undefined}
              className="glass-card rounded-2xl p-16 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-300 hover:border-primary/50 hover:bg-primary/5"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".mp3,.wav,.m4a,.mp4,.webm"
                style={{ display: "none" }}
              />
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">
                {file ? file.name : "Arrastra y suelta tu archivo"}
              </h3>
              <p className="text-sm text-on-surface-variant">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                  : "Soportamos .mp3, .wav, .mp4, .m4a, .webm hasta 500MB"}
              </p>

              <div className="mt-8 flex gap-4">
                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider text-outline">
                  MP3
                </div>
                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider text-outline">
                  WAV
                </div>
                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider text-outline">
                  M4A
                </div>
                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider text-outline">
                  MP4
                </div>
                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider text-outline">
                  WEBM
                </div>
              </div>
            </div>
          ) : (
            /* Panel de Grabación */
            <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[320px] transition-all duration-300">
              {recordingStatus === "recording" && (
                <div className="absolute inset-0 bg-primary/5 animate-pulse -z-10 pointer-events-none" />
              )}

              <div className="mb-6 z-10">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">
                  {recordingStatus === "idle" && "Listo para grabar"}
                  {recordingStatus === "recording" && "Grabando reunión..."}
                  {recordingStatus === "paused" && "Grabación en pausa"}
                  {recordingStatus === "stopped" && "Grabación lista"}
                </p>
                <h3 className="text-4xl font-mono font-bold text-on-surface mt-2 tracking-wider">
                  {formatDuration(recordingDuration)}
                </h3>
              </div>

              {/* Visualizer / Wave */}
              <div className="h-16 flex items-center justify-center gap-1.5 mb-8 w-full max-w-xs z-10">
                {recordingStatus === "recording" ? (
                  [4, 6, 8, 5, 9, 7, 10, 8, 5, 7, 9, 6, 4].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-primary rounded-full"
                      style={{
                        height: "100%",
                        transform: "scaleY(0.2)",
                        animation: `wave 1.2s ease-in-out infinite`,
                        animationDelay: `${i * 0.08}s`,
                        transformOrigin: "center",
                      }}
                    />
                  ))
                ) : recordingStatus === "paused" ? (
                  <div className="flex gap-2">
                    <div className="w-1.5 h-6 bg-yellow-500 rounded-full" />
                    <div className="w-1.5 h-6 bg-yellow-500 rounded-full" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-on-surface-variant">
                    <Mic className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 items-center z-10">
                {recordingStatus === "idle" && (
                  <button
                    onClick={startRecording}
                    className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-white relative group"
                  >
                    <span className="absolute -inset-1.5 bg-red-500/30 rounded-full animate-ping opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="w-6 h-6 bg-white rounded-full group-hover:scale-90 transition-transform" />
                  </button>
                )}

                {recordingStatus === "recording" && (
                  <>
                    <button
                      onClick={pauseRecording}
                      className="w-12 h-12 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full flex items-center justify-center transition-all text-yellow-500 hover:text-yellow-400"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                    <button
                      onClick={stopRecording}
                      className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-white"
                    >
                      <Square className="w-6 h-6 fill-current" />
                    </button>
                  </>
                )}

                {recordingStatus === "paused" && (
                  <>
                    <button
                      onClick={resumeRecording}
                      className="w-12 h-12 bg-primary/20 border border-primary/30 hover:bg-primary/30 rounded-full flex items-center justify-center transition-all text-primary"
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </button>
                    <button
                      onClick={stopRecording}
                      className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-white"
                    >
                      <Square className="w-6 h-6 fill-current" />
                    </button>
                  </>
                )}

                {recordingStatus === "stopped" && (
                  <div className="flex flex-col gap-5 items-center w-full">
                    {audioUrl && (
                      <audio src={audioUrl} controls className="max-w-xs w-full bg-white/5 rounded-lg border border-white/10 p-1" />
                    )}
                    <button
                      onClick={resetRecording}
                      className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Grabar de nuevo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata Form */}
          <div className="glass-card rounded-2xl p-8 space-y-6">
            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm font-medium">
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant ml-1 uppercase tracking-wider">
                  Título de la Reunión
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Sync Semanal Producto"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-on-surface-variant/50"
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant ml-1 uppercase tracking-wider">
                  Proyecto
                </label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all appearance-none"
                  disabled={isProcessing}
                >
                  <option value="" className="bg-surface">
                    Seleccionar proyecto...
                  </option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.name} className="bg-surface">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant ml-1 uppercase tracking-wider">
                Miembros del equipo
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-white/5 border border-white/10 rounded-lg min-h-[56px] items-center">
                {members.map((member) => (
                  <span
                    key={member}
                    className="bg-primary/20 text-primary px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border border-primary/30"
                  >
                    {member}{" "}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() =>
                        !isProcessing && handleRemoveMember(member)
                      }
                    />
                  </span>
                ))}

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center ml-2 w-full mt-2 sm:mt-0">
                  {/* Select de miembros existentes en BD */}
                  {orgMembers.filter((m) => !members.includes(m.name)).length >
                    0 && (
                    <select
                      value={newMember}
                      onChange={(e) => {
                        handleSelectMember(e.target.value);
                        setNewMember("");
                      }}
                      className="bg-white/5 border border-white/10 text-xs rounded-lg focus:border-primary focus:outline-none px-3 py-2 text-on-surface cursor-pointer max-w-[200px]"
                      disabled={isProcessing}
                    >
                      <option value="" className="bg-surface">
                        Añadir miembro de la BD...
                      </option>
                      {orgMembers
                        .filter((m) => !members.includes(m.name))
                        .map((m) => (
                          <option
                            key={m.id}
                            value={m.name}
                            className="bg-surface"
                          >
                            {m.name} ({m.email})
                          </option>
                        ))}
                    </select>
                  )}

                  {/* Input alternativo para invitar a alguien no registrado */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={customMemberName}
                      onChange={(e) => setCustomMemberName(e.target.value)}
                      placeholder="Invitar externo por nombre..."
                      className="bg-transparent border-b border-white/10 text-xs focus:border-primary focus:outline-none px-2 py-1 placeholder:text-on-surface-variant/35 text-on-surface w-44"
                      disabled={isProcessing}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    />
                    <button
                      onClick={handleAddMember}
                      className="text-primary text-xs flex items-center gap-1 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors font-bold uppercase shrink-0"
                      disabled={isProcessing}
                    >
                      <Plus className="w-3.5 h-3.5" /> Añadir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={isProcessing}
              className={cn(
                "w-full py-4 text-white rounded-xl text-lg font-bold transition-all transform active:scale-[0.98]",
                isProcessing
                  ? "bg-surface-container border border-white/10 text-on-surface-variant cursor-not-allowed"
                  : "bg-gradient-to-r from-[#6366f1] to-[#9333ea] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]",
              )}
            >
              {isProcessing ? "Procesando..." : "Iniciar Procesamiento AI"}
            </button>
          </div>
        </div>

        {/* STEPPER PROGRESS */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-8 sticky top-24">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-on-surface">
                Progreso Realtime
              </h3>
              {isFailed ? (
                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertCircle className="w-3 h-3 text-red-400" /> Fallado
                </span>
              ) : isProcessing && currentStep < 5 ? (
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-2 uppercase tracking-wider">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>{" "}
                  Procesando
                </span>
              ) : null}
            </div>

            <div className="relative space-y-10 pl-2">
              {/* Vertical Line */}
              <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-white/10 z-0 rounded-full overflow-hidden">
                <div
                  className="w-full bg-primary transition-all duration-1000 ease-in-out"
                  style={{
                    height: `${currentStep > 0 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0}%`,
                  }}
                ></div>
              </div>

              {steps.map((step, idx) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const isFailedActive = isFailed && isActive;
                const Icon = isFailedActive ? AlertCircle : step.icon;

                return (
                  <div
                    key={step.id}
                    className="flex items-start gap-5 relative z-10"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0",
                        isFailedActive
                          ? "bg-red-500 text-white"
                          : isCompleted ||
                              (isActive && step.id === steps.length)
                            ? "bg-primary text-on-primary"
                            : isActive
                              ? "bg-primary text-white"
                              : "bg-white/5 border border-white/10 text-on-surface-variant",
                      )}
                    >
                      {isActive &&
                      step.id < steps.length &&
                      step.activeIcon &&
                      !isFailed ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Icon
                          className={cn(
                            "w-5 h-5",
                            isCompleted ||
                              (isActive && step.id === steps.length) ||
                              isFailedActive
                              ? ""
                              : "opacity-70",
                          )}
                        />
                      )}
                    </div>

                    <div className="flex-1 pt-1 min-w-0">
                      <p
                        className={cn(
                          "text-base transition-colors truncate",
                          isFailedActive
                            ? "text-red-400 font-bold"
                            : isCompleted || isActive
                              ? "text-on-surface font-bold"
                              : "text-on-surface-variant",
                        )}
                      >
                        {step.title}
                      </p>
                      <div
                        className={cn(
                          "transition-all duration-500 overflow-hidden",
                          isActive || isCompleted
                            ? "max-h-20 opacity-100 mt-1"
                            : "max-h-0 opacity-0",
                        )}
                      >
                        <p
                          className={cn(
                            "text-sm",
                            isFailedActive
                              ? "text-red-400/80"
                              : isCompleted && step.id !== steps.length
                                ? "text-primary/80"
                                : "text-on-surface-variant/70",
                          )}
                        >
                          {isFailedActive
                            ? "Ocurrió un error en esta etapa de procesamiento."
                            : step.sub}
                        </p>

                        {/* Audio Wave Visualization for Step 3 */}
                        {step.id === 3 && isActive && (
                          <div className="flex items-end gap-[2px] h-6 mt-2 ml-1">
                            {[1, 3, 2, 4, 1, 5, 3].map((delay, i) => (
                              <div
                                key={i}
                                className="w-[3px] bg-primary rounded-sm animate-pulse"
                                style={{
                                  height: "100%",
                                  animationDuration: `${0.5 + delay * 0.2}s`,
                                  animationName: "wave",
                                  animationIterationCount: "infinite",
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Wave animation styling included via global css or inline if needed, but we simulate it with tailwind animate-pulse for now */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes wave {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(0.8); }
        }
      `,
        }}
      />
    </div>
  );
}
