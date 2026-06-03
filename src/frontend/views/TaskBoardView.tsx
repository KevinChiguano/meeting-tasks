import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Filter, Kanban, LayoutList, 
  MoreHorizontal, MessageSquare, Clock, CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/frontend/lib/utils';

export default function TaskBoardView() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros activos
  const [selectedProject, setSelectedProject] = useState<string>('todos');
  const [selectedMeeting, setSelectedMeeting] = useState<string>('todas');

  // Control del menú desplegable por tarea
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const LIMIT = 6; // Cantidad de tareas por página

  // Cargar lista de reuniones inicialmente para los dropdowns
  useEffect(() => {
    fetch('/api/meetings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setMeetings(data.data);
        }
      })
      .catch(err => console.error('Error fetching meetings:', err));
  }, []);

  // Cargar tareas desde el servidor según filtros y paginación
  useEffect(() => {
    // Si no hay ningún filtro activo, no buscamos tareas (mantenemos vacío)
    if (selectedProject === 'todos' && selectedMeeting === 'todas') {
      setTasks([]);
      setTotalTasks(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const queryParams = new URLSearchParams();
    
    if (selectedProject !== 'todos') queryParams.append('project', selectedProject);
    if (selectedMeeting !== 'todas') queryParams.append('meetingId', selectedMeeting);
    queryParams.append('page', currentPage.toString());
    queryParams.append('limit', LIMIT.toString());

    fetch(`/api/tasks?${queryParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setTasks(data.data);
          if (data.pagination) {
            setTotalTasks(data.pagination.total);
            setTotalPages(Math.ceil(data.pagination.total / data.pagination.limit));
          }
        } else {
          setTasks([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching tasks:', err);
        setTasks([]);
        setLoading(false);
      });
  }, [selectedProject, selectedMeeting, currentPage]);

  const handleProjectChange = (projectVal: string) => {
    setSelectedProject(projectVal);
    setSelectedMeeting('todas'); // resetear reunión
    setCurrentPage(1); // resetear a primera página
  };

  const handleMeetingChange = (meetingVal: string) => {
    setSelectedMeeting(meetingVal);
    setCurrentPage(1); // resetear a primera página
  };

  // Función para cambiar de estado una tarea interactivamente
  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'processing' | 'completed') => {
    const previousTasks = [...tasks];

    // Actualización optimista en el frontend
    setTasks(prevTasks => 
      prevTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: taskId, status: newStatus })
      });

      const data = await res.json();
      if (!data.success) {
        // Revertir si falla el servidor
        setTasks(previousTasks);
        console.error('Error al actualizar el estado de la tarea en el servidor');
      }
    } catch (err) {
      // Revertir si hay error de red
      setTasks(previousTasks);
      console.error('Error de red al actualizar la tarea:', err);
    }
  };

  // Extraer lista única de proyectos de las reuniones
  const projectsList = Array.from(
    new Set(
      meetings
        .map(m => m.project)
        .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    )
  );

  // Filtrar reuniones según el proyecto seleccionado
  const filteredMeetingsList = selectedProject !== 'todos'
    ? meetings.filter(m => m.project === selectedProject)
    : meetings;

  return (
    <div className="flex flex-col h-full bg-background absolute inset-0">
      
      {/* Filters & Actions Bar */}
      <div className="p-6 shrink-0 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Proyecto */}
            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="glass-card text-sm font-semibold px-4 py-2 rounded-lg border border-white/10 bg-surface-container-low text-on-surface hover:bg-white/5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-9"
              >
                <option value="todos" className="bg-surface-container-high text-on-surface">Todos los Proyectos</option>
                {projectsList.map(project => (
                  <option key={project} value={project} className="bg-surface-container-high text-on-surface">
                    {project}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-on-surface-variant">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Selector de Reunión */}
            <div className="relative">
              <select
                value={selectedMeeting}
                onChange={(e) => handleMeetingChange(e.target.value)}
                className="glass-card text-sm font-semibold px-4 py-2 rounded-lg border border-white/10 bg-surface-container-low text-on-surface hover:bg-white/5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-9"
              >
                <option value="todas" className="bg-surface-container-high text-on-surface">Todas las Reuniones</option>
                {filteredMeetingsList.map(meeting => (
                  <option key={meeting.id} value={meeting.id} className="bg-surface-container-high text-on-surface">
                    {meeting.title}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-on-surface-variant">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-high p-1 rounded-xl flex items-center w-fit shrink-0 border border-white/5">
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all",
                viewMode === 'kanban' ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <Kanban className="w-4 h-4" /> Kanban
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all",
                viewMode === 'list' ? "bg-primary-container text-on-primary-container font-bold" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <LayoutList className="w-4 h-4" /> Vista de Lista
            </button>
          </div>

        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 overflow-hidden px-6 pb-2">
        
        {selectedProject === 'todos' && selectedMeeting === 'todas' ? (
          /* Estado Inicial: Sin filtros activos */
          <div className="flex flex-col items-center justify-center h-[70%] max-w-md mx-auto text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center text-primary mb-6 shadow-xl border border-primary/10">
              <Kanban className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Visualiza tus Tareas</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Por favor, selecciona un **proyecto** o una **reunión** en los filtros superiores para cargar y organizar las tareas asociadas.
            </p>
          </div>
        ) : loading ? (
          /* Estado de Carga */
          <div className="flex items-center justify-center h-[70%]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-on-surface-variant">Cargando tareas...</p>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-6 h-full overflow-x-auto items-start">
            {/* Column 1: Pendiente */}
            <div className="flex flex-col gap-4 w-[320px] shrink-0 h-full">
              <div className="flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Pendiente</h3>
                  <span className="bg-surface-container-high text-on-surface-variant text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {tasks.filter(t => t.status === 'pending').length}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 snap-y pb-24">
                {tasks.filter(t => t.status === 'pending').length > 0 ? (
                  tasks.filter(t => t.status === 'pending').map(task => {
                    const mtg = meetings.find(m => m.id === task.meetingId);
                    return (
                      <div key={task.id} className="glass-card p-5 rounded-xl hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing snap-start bg-surface-container-lowest/50 hover:bg-surface-container-lowest animate-fade-in">
                        <div className="flex justify-between items-center mb-3 relative">
                          {/* Etiqueta Estática de Estado */}
                          <span className="bg-red-500/20 text-red-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-red-500/10">
                            Pendiente
                          </span>
                          
                          {/* Botón y Menú Desplegable de 3 puntos */}
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)}
                              className="text-on-surface-variant hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {activeMenuTaskId === task.id && (
                              <>
                                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveMenuTaskId(null)} />
                                <div className="absolute right-0 mt-1 w-44 bg-surface-container-high border border-white/10 rounded-xl shadow-xl z-50 p-1 backdrop-blur-lg">
                                  <p className="text-[9px] text-on-surface-variant font-bold uppercase px-2.5 py-1.5 border-b border-white/5 text-left">Cambiar Estado</p>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'pending');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'pending' ? "text-red-400 bg-red-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                      Pendiente
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'processing');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'processing' ? "text-blue-400 bg-blue-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                      En Progreso
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'completed');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'completed' ? "text-green-400 bg-green-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                      Completado
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Badges de Proyecto y Reunión */}
                        {mtg && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {mtg.project && (
                              <span className="bg-primary/10 text-primary text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                {mtg.project}
                              </span>
                            )}
                            <span className="bg-secondary/10 text-secondary text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide truncate max-w-[150px]" title={mtg.title}>
                              {mtg.title}
                            </span>
                          </div>
                        )}

                        <h4 className="font-bold text-base mb-1.5 leading-snug">{task.title}</h4>
                        <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">{task.description}</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs font-bold text-secondary flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {task.due_date ? new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-[10px] text-on-secondary-container font-bold border-2 border-surface">
                            {task.assignee ? task.assignee.substring(0, 2).toUpperCase() : 'AI'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/10 rounded-2xl text-on-surface-variant text-center bg-white/[0.01]">
                    <span className="text-sm font-medium">No hay tareas pendientes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Progreso */}
            <div className="flex flex-col gap-4 w-[320px] shrink-0 h-full">
              <div className="flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">En Progreso</h3>
                  <span className="bg-surface-container-high text-on-surface-variant text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {tasks.filter(t => t.status === 'processing').length}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 snap-y pb-24">
                {tasks.filter(t => t.status === 'processing').length > 0 ? (
                  tasks.filter(t => t.status === 'processing').map(task => {
                    const mtg = meetings.find(m => m.id === task.meetingId);
                    return (
                      <div key={task.id} className="glass-card p-5 rounded-xl border-primary/30 bg-primary/5 transition-all cursor-grab relative overflow-hidden snap-start hover:bg-primary/10 hover:border-primary/50 shadow-[0_0_15px_rgba(99,102,241,0.1)] animate-fade-in">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        <div className="flex justify-between items-center mb-3 relative">
                          {/* Etiqueta Estática de Estado */}
                          <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-500/10">
                            En Progreso
                          </span>
                          
                          {/* Botón y Menú Desplegable de 3 puntos */}
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)}
                              className="text-on-surface-variant hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {activeMenuTaskId === task.id && (
                              <>
                                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveMenuTaskId(null)} />
                                <div className="absolute right-0 mt-1 w-44 bg-surface-container-high border border-white/10 rounded-xl shadow-xl z-50 p-1 backdrop-blur-lg">
                                  <p className="text-[9px] text-on-surface-variant font-bold uppercase px-2.5 py-1.5 border-b border-white/5 text-left">Cambiar Estado</p>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'pending');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'pending' ? "text-red-400 bg-red-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                      Pendiente
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'processing');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'processing' ? "text-blue-400 bg-blue-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                      En Progreso
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'completed');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'completed' ? "text-green-400 bg-green-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                      Completado
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Badges de Proyecto y Reunión */}
                        {mtg && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {mtg.project && (
                              <span className="bg-primary/10 text-primary text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                {mtg.project}
                              </span>
                            )}
                            <span className="bg-secondary/10 text-secondary text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide truncate max-w-[150px]" title={mtg.title}>
                              {mtg.title}
                            </span>
                          </div>
                        )}

                        <h4 className="font-bold text-base mb-2 leading-snug">{task.title}</h4>
                        <p className="text-sm text-on-surface-variant mb-4">{task.description}</p>
                        
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-medium">
                          <span>Asignado a {task.assignee || 'AI'}</span>
                          <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha límite'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/10 rounded-2xl text-on-surface-variant text-center bg-white/[0.01]">
                    <span className="text-sm font-medium">No hay tareas en progreso</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Completado */}
            <div className="flex flex-col gap-4 w-[320px] shrink-0 h-full">
              <div className="flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Completado</h3>
                  <span className="bg-surface-container-high text-on-surface-variant text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {tasks.filter(t => t.status === 'completed').length}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 snap-y pb-24">
                {tasks.filter(t => t.status === 'completed').length > 0 ? (
                  tasks.filter(t => t.status === 'completed').map(task => {
                    const mtg = meetings.find(m => m.id === task.meetingId);
                    return (
                      <div key={task.id} className="glass-card p-5 rounded-xl opacity-60 hover:opacity-100 transition-opacity cursor-grab grayscale-[0.5] hover:grayscale-0 snap-start bg-transparent animate-fade-in">
                        <div className="flex justify-between items-center mb-3 relative">
                          {/* Etiqueta Estática de Estado */}
                          <span className="bg-green-500/20 text-green-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-500/10">
                            Completado
                          </span>
                          
                          {/* Botón y Menú Desplegable de 3 puntos */}
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)}
                              className="text-on-surface-variant hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {activeMenuTaskId === task.id && (
                              <>
                                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveMenuTaskId(null)} />
                                <div className="absolute right-0 mt-1 w-44 bg-surface-container-high border border-white/10 rounded-xl shadow-xl z-50 p-1 backdrop-blur-lg">
                                  <p className="text-[9px] text-on-surface-variant font-bold uppercase px-2.5 py-1.5 border-b border-white/5 text-left">Cambiar Estado</p>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'pending');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'pending' ? "text-red-400 bg-red-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                      Pendiente
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'processing');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'processing' ? "text-blue-400 bg-blue-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                      En Progreso
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'completed');
                                        setActiveMenuTaskId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                        task.status === 'completed' ? "text-green-400 bg-green-500/10" : "text-on-surface"
                                      )}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                      Completado
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Badges de Proyecto y Reunión */}
                        {mtg && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {mtg.project && (
                              <span className="bg-primary/10 text-primary text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                {mtg.project}
                              </span>
                            )}
                            <span className="bg-secondary/10 text-secondary text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide truncate max-w-[150px]" title={mtg.title}>
                              {mtg.title}
                            </span>
                          </div>
                        )}

                        <h4 className="font-bold text-base mb-1.5 line-through text-on-surface-variant">{task.title}</h4>
                        <p className="text-sm text-on-surface-variant line-clamp-1">{task.description}</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-on-surface-variant tracking-wider uppercase">Finalizado</span>
                          <span className="text-xs font-bold text-on-surface">{task.assignee || 'AI'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-white/10 rounded-2xl text-on-surface-variant text-center bg-white/[0.01]">
                    <span className="text-sm font-medium">No hay tareas completadas</span>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        ) : (
          /* List View */
          <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-full border border-white/10">
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-low/95 backdrop-blur-md z-10 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tarea</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Proyecto / Reunión</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Asignado</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fecha Límite</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tasks.length > 0 ? (
                    tasks.map(task => {
                      const mtg = meetings.find(m => m.id === task.meetingId);
                      return (
                        <tr key={task.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                 <LayoutList className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-base">{task.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {mtg ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold text-primary">{mtg.project || 'Sin Proyecto'}</span>
                                <span className="text-[10px] text-on-surface-variant/80 truncate max-w-[180px]">{mtg.title}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-on-surface-variant">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {/* Etiqueta de Estado estática en la lista */}
                            <span className={cn(
                              "text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase border",
                              task.status === 'completed' && "bg-green-500/10 text-green-400 border-green-500/20",
                              task.status === 'processing' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                              task.status === 'pending' && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            )}>
                              {task.status === 'completed' ? 'Completado' : task.status === 'processing' ? 'En Progreso' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium">{task.assignee || 'AI Asistente'}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-on-surface-variant">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sin fecha'}
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            {/* Botón y Menú de 3 puntos en Lista */}
                            <div className="inline-block relative text-left">
                              <button 
                                onClick={() => setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)}
                                className="text-on-surface-variant hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              
                              {activeMenuTaskId === task.id && (
                                <>
                                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveMenuTaskId(null)} />
                                  <div className="absolute right-0 mt-1 w-44 bg-surface-container-high border border-white/10 rounded-xl shadow-xl z-50 p-1 backdrop-blur-lg text-left">
                                    <p className="text-[9px] text-on-surface-variant font-bold uppercase px-2.5 py-1.5 border-b border-white/5">Cambiar Estado</p>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                      <button
                                        onClick={() => {
                                          updateTaskStatus(task.id, 'pending');
                                          setActiveMenuTaskId(null);
                                        }}
                                        className={cn(
                                          "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                          task.status === 'pending' ? "text-red-400 bg-red-500/10" : "text-on-surface"
                                        )}
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                        Pendiente
                                      </button>
                                      <button
                                        onClick={() => {
                                          updateTaskStatus(task.id, 'processing');
                                          setActiveMenuTaskId(null);
                                        }}
                                        className={cn(
                                          "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                          task.status === 'processing' ? "text-blue-400 bg-blue-500/10" : "text-on-surface"
                                        )}
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                        En Progreso
                                      </button>
                                      <button
                                        onClick={() => {
                                          updateTaskStatus(task.id, 'completed');
                                          setActiveMenuTaskId(null);
                                        }}
                                        className={cn(
                                          "w-full text-left text-xs font-semibold px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2",
                                          task.status === 'completed' ? "text-green-400 bg-green-500/10" : "text-on-surface"
                                        )}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                        Completado
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                        No hay tareas que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {!loading && (selectedProject !== 'todos' || selectedMeeting !== 'todas') && totalTasks > 0 && (
        <div className="p-4 shrink-0 border-t border-white/5 bg-surface-container-low/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl mx-6 mb-6">
          <span className="text-xs text-on-surface-variant font-medium">
            Mostrando {tasks.length} de {totalTasks} tareas encontradas
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="glass-card px-3 py-1.5 rounded-lg border-white/10 text-xs font-bold hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-on-surface"
            >
              Anterior
            </button>
            <span className="text-xs font-bold px-3 py-1.5 bg-surface-container-high rounded-lg text-on-surface">
              Página {currentPage} de {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="glass-card px-3 py-1.5 rounded-lg border-white/10 text-xs font-bold hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-on-surface"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
