import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Users, Cpu, Database, 
  Activity, X, Plus, Edit2, Shield, Loader2, Check, Trash2, UserCheck, Briefcase, FolderKanban
} from 'lucide-react';

type SettingsTab = 'members' | 'roles' | 'projects';

export default function SettingsView() {
  // --- 1. Estado de Preferencias de IA (Persistido en LocalStorage) ---
  const [tone, setTone] = useState<number>(2);
  const [model, setModel] = useState<string>('Gemini 1.5 Flash');
  const [autoSummary, setAutoSummary] = useState<boolean>(true);
  const [hasUnsavedPrefs, setHasUnsavedPrefs] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const savedTone = localStorage.getItem('ai_tone');
    const savedModel = localStorage.getItem('ai_model');
    const savedSummary = localStorage.getItem('ai_auto_summary');

    if (savedTone) setTone(parseInt(savedTone, 10));
    if (savedModel) setModel(savedModel);
    if (savedSummary) setAutoSummary(savedSummary === 'true');
  }, []);

  const handleToneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTone(parseInt(e.target.value, 10));
    setHasUnsavedPrefs(true);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
    setHasUnsavedPrefs(true);
  };

  const handleToggleSummary = () => {
    setAutoSummary(prev => !prev);
    setHasUnsavedPrefs(true);
  };

  const handleSavePrefs = () => {
    localStorage.setItem('ai_tone', tone.toString());
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_auto_summary', autoSummary.toString());
    setHasUnsavedPrefs(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDiscardPrefs = () => {
    const savedTone = localStorage.getItem('ai_tone');
    const savedModel = localStorage.getItem('ai_model');
    const savedSummary = localStorage.getItem('ai_auto_summary');

    setTone(savedTone ? parseInt(savedTone, 10) : 2);
    setModel(savedModel || 'Gemini 1.5 Flash');
    setAutoSummary(savedSummary ? savedSummary === 'true' : true);
    setHasUnsavedPrefs(false);
  };

  // --- 2. Estado de Gestión de Miembros, Roles y Proyectos (Vía Supabase) ---
  const [activeTab, setActiveTab] = useState<SettingsTab>('members');
  const [membersList, setMembersList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
  
  // Modals de Miembros
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Modals de Roles
  const [showCreateRoleModal, setShowCreateRoleModal] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [showDeleteRoleConfirm, setShowDeleteRoleConfirm] = useState<boolean>(false);

  // Modals de Proyectos
  const [showCreateProjectModal, setShowCreateProjectModal] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState<boolean>(false);

  // Formulario del Modal de Invitación
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('viewer');
  const [submittingMember, setSubmittingMember] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Formulario del Modal de Edición de Miembros
  const [editMemberName, setEditMemberName] = useState<string>('');
  const [editMemberEmail, setEditMemberEmail] = useState<string>('');
  const [editMemberRole, setEditMemberRole] = useState<string>('viewer');
  const [updatingMember, setUpdatingMember] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<boolean>(false);

  // Formulario del Modal de Creación de Roles
  const [newRoleId, setNewRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');
  const [submittingRole, setSubmittingRole] = useState<boolean>(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Formulario del Modal de Edición de Roles
  const [editRoleName, setEditRoleName] = useState<string>('');
  const [editRoleDesc, setEditRoleDesc] = useState<string>('');
  const [updatingRole, setUpdatingRole] = useState<boolean>(false);
  const [updateRoleError, setUpdateRoleError] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState<boolean>(false);

  // Formulario del Modal de Creación y Edición de Proyectos
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDesc, setNewProjectDesc] = useState<string>('');
  const [submittingProject, setSubmittingProject] = useState<boolean>(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [editProjectName, setEditProjectName] = useState<string>('');
  const [editProjectDesc, setEditProjectDesc] = useState<string>('');
  const [updatingProject, setUpdatingProject] = useState<boolean>(false);
  const [updateProjectError, setUpdateProjectError] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState<boolean>(false);

  const fetchMembersAndRoles = async () => {
    setLoadingMembers(true);
    try {
      const resMembers = await fetch('/api/members');
      const dataMembers = await resMembers.json();
      if (dataMembers.success) {
        setMembersList(dataMembers.data);
      }

      const resRoles = await fetch('/api/roles');
      const dataRoles = await resRoles.json();
      if (dataRoles.success) {
        setRolesList(dataRoles.data);
      }

      const resProjects = await fetch('/api/projects');
      const dataProjects = await resProjects.json();
      if (dataProjects.success) {
        setProjectsList(dataProjects.data);
      }
    } catch (err) {
      console.error('Error fetching members/roles/projects:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchMembersAndRoles();
  }, []);

  // --- CRUD MIEMBROS ---
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;

    setSubmittingMember(true);
    setInviteError(null);

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMemberName,
          email: newMemberEmail,
          role: newMemberRole,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newMemberName)}`
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMembersList(prev => [...prev, data.data]);
        setShowInviteModal(false);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberRole(rolesList[0]?.id || 'viewer');
      } else {
        setInviteError(data.message || 'Error al invitar al miembro.');
      }
    } catch (err) {
      setInviteError('Error de red. Intenta nuevamente.');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleOpenDetail = (member: any) => {
    setSelectedMember(member);
    setEditMemberName(member.name);
    setEditMemberEmail(member.email);
    setEditMemberRole(member.role || 'viewer');
    setUpdateError(null);
    setShowDeleteConfirm(false);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setUpdatingMember(true);
    setUpdateError(null);

    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMember.id,
          name: editMemberName,
          email: editMemberEmail,
          role: editMemberRole
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMembersList(prev => prev.map(m => m.id === selectedMember.id ? data.data : m));
        setSelectedMember(null);
      } else {
        setUpdateError(data.message || 'Error al actualizar el miembro.');
      }
    } catch (err) {
      setUpdateError('Error de red. Intenta de nuevo.');
    } finally {
      setUpdatingMember(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    setDeletingMember(true);
    try {
      const res = await fetch(`/api/members?id=${selectedMember.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMembersList(prev => prev.filter(m => m.id !== selectedMember.id));
        setSelectedMember(null);
        setShowDeleteConfirm(false);
      } else {
        setUpdateError(data.message || 'Error al eliminar el miembro.');
      }
    } catch (err) {
      setUpdateError('Error de red. Intenta de nuevo.');
    } finally {
      setDeletingMember(false);
    }
  };

  // --- CRUD ROLES ---
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleId || !newRoleName) return;

    setSubmittingRole(true);
    setRoleError(null);

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newRoleId,
          name: newRoleName,
          description: newRoleDesc
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRolesList(prev => [...prev, data.data]);
        setShowCreateRoleModal(false);
        setNewRoleId('');
        setNewRoleName('');
        setNewRoleDesc('');
      } else {
        setRoleError(data.message || 'Error al crear el rol profesional.');
      }
    } catch (err) {
      setRoleError('Error de red. Intenta de nuevo.');
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleOpenRoleDetail = (role: any) => {
    setSelectedRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || '');
    setUpdateRoleError(null);
    setShowDeleteRoleConfirm(false);
  };

  const handleUpdateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setUpdatingRole(true);
    setUpdateRoleError(null);

    try {
      const res = await fetch('/api/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRole.id,
          name: editRoleName,
          description: editRoleDesc
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRolesList(prev => prev.map(r => r.id === selectedRole.id ? data.data : r));
        setSelectedRole(null);
      } else {
        setUpdateRoleError(data.message || 'Error al actualizar el rol.');
      }
    } catch (err) {
      setUpdateRoleError('Error de red. Intenta de nuevo.');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setDeletingRole(true);
    try {
      const res = await fetch(`/api/roles?id=${selectedRole.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setRolesList(prev => prev.filter(r => r.id !== selectedRole.id));
        setSelectedRole(null);
        setShowDeleteRoleConfirm(false);
      } else {
        setUpdateRoleError(data.message || 'Error al eliminar el rol profesional.');
      }
    } catch (err) {
      setUpdateRoleError('Error de red. Intenta de nuevo.');
    } finally {
      setDeletingRole(false);
    }
  };

  // --- CRUD PROYECTOS ---
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;

    setSubmittingProject(true);
    setProjectError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setProjectsList(prev => [...prev, data.data]);
        setShowCreateProjectModal(false);
        setNewProjectName('');
        setNewProjectDesc('');
      } else {
        setProjectError(data.message || 'Error al crear el proyecto.');
      }
    } catch (err) {
      setProjectError('Error de red. Intenta de nuevo.');
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleOpenProjectDetail = (proj: any) => {
    setSelectedProject(proj);
    setEditProjectName(proj.name);
    setEditProjectDesc(proj.description || '');
    setUpdateProjectError(null);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !editProjectName) return;

    setUpdatingProject(true);
    setUpdateProjectError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProject.id,
          name: editProjectName,
          description: editProjectDesc
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setProjectsList(prev => prev.map(p => p.id === selectedProject.id ? data.data : p));
        setSelectedProject(null);
      } else {
        setUpdateProjectError(data.message || 'Error al actualizar el proyecto.');
      }
    } catch (err) {
      setUpdateProjectError('Error de red. Intenta de nuevo.');
    } finally {
      setUpdatingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    setDeletingProject(true);
    try {
      const res = await fetch(`/api/projects?id=${selectedProject.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setProjectsList(prev => prev.filter(p => p.id !== selectedProject.id));
        setSelectedProject(null);
        setShowDeleteProjectConfirm(false);
      } else {
        setUpdateProjectError(data.message || 'Error al eliminar el proyecto.');
      }
    } catch (err) {
      setUpdateProjectError('Error de red. Intenta de nuevo.');
    } finally {
      setDeletingProject(false);
    }
  };

  // --- 3. Estado de Métricas en Tiempo Real (Redis / Supabase / API) ---
  const [stats, setStats] = useState<any>({
    redis: { status: 'loading', info: 'Conectando...', used: '0 GB', total: '10 GB' },
    supabase: { status: 'loading', usagePercentage: 15, meetingsCount: 0, tasksCount: 0 },
    apiLimits: { used: 0, total: 100, usagePercentage: 5 }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success && data.data) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('Error fetching system stats:', err);
      }
    };

    fetchStats();
  }, []);

  const getRoleName = (roleId: string) => {
    const found = rolesList.find(r => r.id === roleId);
    return found ? found.name : roleId.toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* AI Preferences Card */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-8 flex flex-col space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">Preferencias de IA</h3>
          </div>
          <p className="text-on-surface-variant text-sm mb-4">
            Personaliza cómo el motor de IA procesa tus reuniones y genera tareas.
          </p>
          
          <div className="space-y-8 flex-1">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tono del Prompt</label>
                <span className="text-xs text-primary font-semibold px-2 py-0.5 bg-primary/10 rounded-full">
                  {tone === 1 && 'Resumido'}
                  {tone === 2 && 'Equilibrado'}
                  {tone === 3 && 'Crítico'}
                </span>
              </div>
              <input 
                type="range" min="1" max="3" value={tone} onChange={handleToneChange}
                className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary" 
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant/60 uppercase font-semibold">
                <span className={tone === 1 ? "text-primary font-bold" : ""}>Resumido</span>
                <span className={tone === 2 ? "text-primary font-bold" : ""}>Detallado</span>
                <span className={tone === 3 ? "text-primary font-bold" : ""}>Crítico</span>
              </div>
            </div>
              <div className="space-y-3">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">Modelo Predeterminado</label>
              <div className="relative">
                <select 
                  value={model} onChange={handleModelChange}
                  className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer"
                >
                  <option value="Gemini 1.5 Flash">Gemini 1.5 Flash (Recomendado - Eficiente)</option>
                  <option value="Llama 3 8B (Local)">Llama 3 8B (Local / Offline)</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">▼</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Edit2 className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm font-medium">Auto-resumen</span>
              </div>
              {/* Toggle switch */}
              <div 
                onClick={handleToggleSummary}
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-300 ${autoSummary ? 'bg-primary/40' : 'bg-surface-container-high'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-md transition-all duration-300 ${autoSummary ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant/60'}`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab-driven Right Management Card (Members / Roles) */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-8 flex flex-col">
          {/* Header & Navigation Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 shrink-0 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 pb-2 text-lg font-bold transition-all relative border-b-2 ${
                  activeTab === 'members' 
                    ? 'text-primary border-primary' 
                    : 'text-on-surface-variant/60 border-transparent hover:text-on-surface'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Miembros</span>
              </button>
              <button 
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-2 pb-2 text-lg font-bold transition-all relative border-b-2 ml-4 ${
                  activeTab === 'roles' 
                    ? 'text-primary border-primary' 
                    : 'text-on-surface-variant/60 border-transparent hover:text-on-surface'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                <span>Roles</span>
              </button>
              <button 
                onClick={() => setActiveTab('projects')}
                className={`flex items-center gap-2 pb-2 text-lg font-bold transition-all relative border-b-2 ml-4 ${
                  activeTab === 'projects' 
                    ? 'text-primary border-primary' 
                    : 'text-on-surface-variant/60 border-transparent hover:text-on-surface'
                }`}
              >
                <FolderKanban className="w-5 h-5" />
                <span>Proyectos</span>
              </button>
            </div>
            
            <button 
              onClick={() => {
                if (activeTab === 'members') setShowInviteModal(true);
                else if (activeTab === 'roles') setShowCreateRoleModal(true);
                else setShowCreateProjectModal(true);
              }}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold tracking-wider py-2 px-5 rounded-lg shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase shrink-0"
            >
              {activeTab === 'members' && 'Invitar Miembro'}
              {activeTab === 'roles' && 'Añadir Rol'}
              {activeTab === 'projects' && 'Añadir Proyecto'}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[350px] pr-2">
            {loadingMembers ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-60">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Cargando...</p>
              </div>
            ) : (
              <>
                {/* VIEW MEMBERS TAB */}
                {activeTab === 'members' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {membersList.map((member) => (
                      <div 
                        key={member.id} 
                        onClick={() => handleOpenDetail(member)}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4 group hover:bg-white/10 hover:border-primary/20 transition-all cursor-pointer"
                        title="Ver detalles o editar"
                      >
                        <img 
                          src={member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 bg-surface-container group-hover:border-primary/40 transition-colors"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold truncate group-hover:text-primary transition-colors">{member.name}</h4>
                          <p className="text-xs text-on-surface-variant truncate">{member.email}</p>
                        </div>
                        <div className="px-2 py-0.5 text-[10px] rounded-full uppercase font-bold shrink-0 border border-white/10 bg-white/5 text-on-surface-variant/80">
                          {getRoleName(member.role)}
                        </div>
                      </div>
                    ))}

                    <div 
                      onClick={() => setShowInviteModal(true)}
                      className="p-4 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Plus className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-on-surface-variant group-hover:text-primary transition-colors truncate">Añadir nuevo</h4>
                        <p className="text-xs text-on-surface-variant/60 truncate">Enviar enlace de acceso</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW ROLES TAB */}
                {activeTab === 'roles' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rolesList.map((role) => (
                      <div 
                        key={role.id} 
                        onClick={() => handleOpenRoleDetail(role)}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3 group hover:bg-white/10 hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
                        title="Editar o eliminar rol"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-base font-semibold text-on-surface group-hover:text-primary transition-colors truncate">{role.name}</h4>
                            <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-on-surface-variant shrink-0">{role.id}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant/80 mt-1 line-clamp-2">{role.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                    ))}

                    <div 
                      onClick={() => setShowCreateRoleModal(true)}
                      className="p-4 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Plus className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-on-surface-variant group-hover:text-primary transition-colors truncate">Crear Nuevo Rol</h4>
                        <p className="text-xs text-on-surface-variant/60 truncate">Añadir especialidad al catálogo</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW PROJECTS TAB */}
                {activeTab === 'projects' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectsList.map((project) => (
                      <div 
                        key={project.id} 
                        onClick={() => handleOpenProjectDetail(project)}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3 group hover:bg-white/10 hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
                        title="Editar o eliminar proyecto"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-base font-semibold text-on-surface group-hover:text-primary transition-colors truncate">{project.name}</h4>
                          </div>
                          <p className="text-xs text-on-surface-variant/80 mt-1 line-clamp-2">{project.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                    ))}

                    <div 
                      onClick={() => setShowCreateProjectModal(true)}
                      className="p-4 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Plus className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-on-surface-variant group-hover:text-primary transition-colors truncate">Crear Nuevo Proyecto</h4>
                        <p className="text-xs text-on-surface-variant/60 truncate">Añadir espacio al catálogo</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Connectors & Infrastructure */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Supabase Status */}
          <div className="glass-card rounded-2xl p-8 relative overflow-hidden group border border-white/5 flex flex-col justify-between min-h-[220px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-emerald-500/15 transition-all duration-500"></div>
            
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <Database className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold tracking-tight">Supabase Database</h4>
                    <p className="text-[10px] text-on-surface-variant/70 uppercase tracking-widest font-bold">Cloud Storage</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-extrabold text-green-400 uppercase tracking-wider">Activa</span>
                </div>
              </div>

              {/* Data Grid Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-on-surface-variant">Reuniones</span>
                  <h5 className="text-2xl font-bold text-on-surface mt-1">{stats.supabase.meetingsCount}</h5>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-on-surface-variant">Tareas Extraídas</span>
                  <h5 className="text-2xl font-bold text-on-surface mt-1">{stats.supabase.tasksCount}</h5>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
                <span>Capacidad del Tier (Gratuito)</span>
                <span className="font-bold text-on-surface">{stats.supabase.totalRecords} / 500 registros</span>
              </div>
              <div className="relative w-full h-3 bg-surface-container rounded-full overflow-hidden p-[1px]">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${stats.supabase.usagePercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-on-surface-variant/50">
                <span>0%</span>
                <span>{stats.supabase.usagePercentage}% usado</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* API Limits */}
          <div className="glass-card rounded-2xl p-8 relative overflow-hidden group border border-white/5 flex flex-col justify-between min-h-[220px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/15 transition-all duration-500"></div>
            
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold tracking-tight">Consumo de IA</h4>
                    <p className="text-[10px] text-on-surface-variant/70 uppercase tracking-widest font-bold">Gemini API Services</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                  <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider">Plan Premium</span>
                </div>
              </div>

              {/* Data Grid Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-on-surface-variant">Límite Mensual</span>
                  <h5 className="text-2xl font-bold text-on-surface mt-1">{stats.apiLimits.total} reqs</h5>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-on-surface-variant">Disponible</span>
                  <h5 className="text-2xl font-bold text-green-400 mt-1">{Math.max(0, stats.apiLimits.total - stats.apiLimits.used)} reqs</h5>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
                <span>Créditos de Procesamiento Mensual</span>
                <span className="font-bold text-on-surface">{stats.apiLimits.used} / {stats.apiLimits.total} procesados</span>
              </div>
              <div className="relative w-full h-3 bg-surface-container rounded-full overflow-hidden p-[1px]">
                <div 
                  className="h-full bg-gradient-to-r from-[#6366f1] to-[#9333ea] rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${stats.apiLimits.usagePercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-on-surface-variant/50">
                <span>0%</span>
                <span>{stats.apiLimits.usagePercentage}% consumido</span>
                <span>100%</span>
              </div>
            </div>
          </div>

        </div>


        {/* Footer Actions */}
        <div className="lg:col-span-12 flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-white/10 mt-4">
          <p className="text-on-surface-variant text-sm">
            ID de Organización: <span className="font-mono text-primary">org_8829_tasks_ai</span>
          </p>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {saveSuccess && (
              <span className="text-green-400 text-xs font-bold flex items-center gap-1 px-3 py-1 bg-green-500/10 rounded-full animate-fade-in border border-green-500/15">
                <Check className="w-3 h-3" /> Preferencias Guardadas
              </span>
            )}
            
            {hasUnsavedPrefs && (
              <>
                <button 
                  onClick={handleDiscardPrefs}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                >
                  Descartar Cambios
                </button>
                <button 
                  onClick={handleSavePrefs}
                  className="flex-1 sm:flex-none px-8 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
                >
                  Guardar Preferencias
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* --- 4. Modal para Invitar Miembros --- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-2xl max-w-md w-full p-8 border border-white/10 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold">Invitar Nuevo Miembro</h3>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Nombre Completo</label>
                <input 
                  type="text" required value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                  placeholder="ej: Javier Pérez" 
                  className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Correo Electrónico</label>
                <input 
                  type="email" required value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)}
                  placeholder="ej: jperez@meetingtasks.ai" 
                  className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Rol Profesional</label>
                <div className="relative">
                  <select 
                    value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)}
                    className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8"
                  >
                    {rolesList.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">▼</div>
                </div>
              </div>

              {inviteError && (
                <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{inviteError}</p>
              )}

              <div className="flex gap-4 pt-4 shrink-0">
                <button 
                  type="button" onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={submittingMember}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 disabled:opacity-50"
                >
                  {submittingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 5. Modal Detalle, Edición Completa y Eliminación de Miembros --- */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-2xl max-w-md w-full p-8 border border-white/10 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!showDeleteConfirm ? (
              <>
                <div className="flex flex-col items-center text-center gap-3">
                  <img 
                    src={selectedMember.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedMember.name)}`}
                    alt={selectedMember.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-lg"
                  />
                  <div>
                    <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                    <p className="text-xs text-on-surface-variant">{selectedMember.email}</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Nombre Completo</label>
                    <input 
                      type="text" required value={editMemberName} onChange={e => setEditMemberName(e.target.value)}
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Correo Electrónico</label>
                    <input 
                      type="email" required value={editMemberEmail} onChange={e => setEditMemberEmail(e.target.value)}
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Rol Profesional</label>
                    <div className="relative">
                      <select 
                        value={editMemberRole} onChange={e => setEditMemberRole(e.target.value)}
                        className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8"
                      >
                        {rolesList.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">▼</div>
                    </div>
                  </div>

                  {updateError && (
                    <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{updateError}</p>
                  )}

                  <div className="flex gap-4 pt-4 border-t border-white/5 shrink-0 justify-between items-center">
                    <button 
                      type="button" 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all flex items-center justify-center gap-2"
                      title="Eliminar miembro permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex gap-3 flex-1 justify-end">
                      <button 
                        type="button" onClick={() => setSelectedMember(null)}
                        className="px-5 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" disabled={updatingMember}
                        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 disabled:opacity-50"
                      >
                        {updatingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              // Confirmación de Eliminación de Miembro
              <div className="space-y-6 text-center animate-fade-in">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mx-auto border border-red-500/20">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-on-surface">¿Eliminar a {selectedMember.name}?</h4>
                  <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                    Esta acción es irreversible y removerá al miembro de todas las asignaciones y configuraciones de la organización.
                  </p>
                </div>
                
                {updateError && (
                  <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{updateError}</p>
                )}

                <div className="flex gap-4 pt-4 shrink-0">
                  <button 
                    type="button" onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                  >
                    Volver
                  </button>
                  <button 
                    onClick={handleDeleteMember} disabled={deletingMember}
                    className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                  >
                    {deletingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 6. Modal para Crear Roles --- */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-2xl max-w-md w-full p-8 border border-white/10 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowCreateRoleModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold">Crear Nuevo Rol Profesional</h3>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Clave Identificadora (ID)</label>
                <input 
                  type="text" required value={newRoleId} onChange={e => setNewRoleId(e.target.value)}
                  placeholder="ej: developer-senior" 
                  className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-on-surface-variant/60">Se transformará automáticamente en minúsculas y guiones.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Nombre del Rol</label>
                <input 
                  type="text" required value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                  placeholder="ej: Programador Senior" 
                  className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Descripción</label>
                <textarea 
                  value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Describe las responsabilidades del rol..." rows={3}
                  className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {roleError && (
                <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{roleError}</p>
              )}

              <div className="flex gap-4 pt-4 shrink-0">
                <button 
                  type="button" onClick={() => setShowCreateRoleModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={submittingRole}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 disabled:opacity-50"
                >
                  {submittingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 7. Modal Detalle, Edición y Eliminación de Roles --- */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-2xl max-w-md w-full p-8 border border-white/10 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setSelectedRole(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!showDeleteRoleConfirm ? (
              <>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedRole.name}</h3>
                    <p className="text-xs font-mono text-on-surface-variant/80 bg-white/5 px-2 py-0.5 rounded border border-white/10 mt-1 inline-block">{selectedRole.id}</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateRoleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Nombre del Rol</label>
                    <input 
                      type="text" required value={editRoleName} onChange={e => setEditRoleName(e.target.value)}
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Descripción</label>
                    <textarea 
                      value={editRoleDesc} onChange={e => setEditRoleDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  {updateRoleError && (
                    <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{updateRoleError}</p>
                  )}

                  <div className="flex gap-4 pt-4 border-t border-white/5 shrink-0 justify-between items-center">
                    <button 
                      type="button" 
                      onClick={() => setShowDeleteRoleConfirm(true)}
                      className="p-2.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all flex items-center justify-center gap-2"
                      title="Eliminar rol permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex gap-3 flex-1 justify-end">
                      <button 
                        type="button" onClick={() => setSelectedRole(null)}
                        className="px-5 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" disabled={updatingRole}
                        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 disabled:opacity-50"
                      >
                        {updatingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              // Confirmación de Eliminación de Rol
              <div className="space-y-6 text-center animate-fade-in">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mx-auto border border-red-500/20">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-on-surface">¿Eliminar rol "{selectedRole.name}"?</h4>
                  <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                    Esta acción removerá el rol del catálogo. Los miembros que tengan este rol conservarán su string identificador pero requerirán reasignación.
                  </p>
                </div>
                
                {updateRoleError && (
                  <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{updateRoleError}</p>
                )}

                <div className="flex gap-4 pt-4 shrink-0">
                  <button 
                    type="button" onClick={() => setShowDeleteRoleConfirm(false)}
                    className="flex-1 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                  >
                    Volver
                  </button>
                  <button 
                    onClick={handleDeleteRole} disabled={deletingRole}
                    className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                  >
                    {deletingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 8. Modal para Crear Proyectos --- */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-2xl max-w-md w-full p-8 border border-white/10 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setShowCreateProjectModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <FolderKanban className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold">Crear Nuevo Proyecto</h3>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Nombre del Proyecto</label>
                <input 
                  type="text" required value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  placeholder="ej: Rediseño Móvil" 
                  className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Descripción</label>
                <textarea 
                  value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)}
                  placeholder="Describe los objetivos y alcances del proyecto..." rows={3}
                  className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {projectError && (
                <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{projectError}</p>
              )}

              <div className="flex gap-4 pt-4 shrink-0">
                <button 
                  type="button" onClick={() => setShowCreateProjectModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={submittingProject}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 disabled:opacity-50"
                >
                  {submittingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 9. Modal Detalle, Edición y Eliminación de Proyectos --- */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-2xl max-w-md w-full p-8 border border-white/10 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!showDeleteProjectConfirm ? (
              <>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                    <FolderKanban className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedProject.name}</h3>
                  </div>
                </div>

                <form onSubmit={handleUpdateProject} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Nombre del Proyecto</label>
                    <input 
                      type="text" required value={editProjectName} onChange={e => setEditProjectName(e.target.value)}
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Descripción</label>
                    <textarea 
                      value={editProjectDesc} onChange={e => setEditProjectDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-surface-container border border-white/10 rounded-lg p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  {updateProjectError && (
                    <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{updateProjectError}</p>
                  )}

                  <div className="flex gap-4 pt-4 border-t border-white/5 shrink-0 justify-between items-center">
                    <button 
                      type="button" 
                      onClick={() => setShowDeleteProjectConfirm(true)}
                      className="p-2.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all flex items-center justify-center gap-2"
                      title="Eliminar proyecto permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex gap-3 flex-1 justify-end">
                      <button 
                        type="button" onClick={() => setSelectedProject(null)}
                        className="px-5 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" disabled={updatingProject}
                        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 disabled:opacity-50"
                      >
                        {updatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              // Confirmación de Eliminación de Proyecto
              <div className="space-y-6 text-center animate-fade-in">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mx-auto border border-red-500/20">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-on-surface">¿Eliminar proyecto "{selectedProject.name}"?</h4>
                  <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                    Esta acción removerá permanentemente el proyecto. No afectará a las reuniones pasadas que lo utilicen como string de referencia.
                  </p>
                </div>
                
                {updateProjectError && (
                  <p className="text-xs text-red-400 font-medium px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{updateProjectError}</p>
                )}

                <div className="flex gap-4 pt-4 shrink-0">
                  <button 
                    type="button" onClick={() => setShowDeleteProjectConfirm(false)}
                    className="flex-1 py-2.5 rounded-lg border border-white/10 text-on-surface text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                  >
                    Volver
                  </button>
                  <button 
                    onClick={handleDeleteProject} disabled={deletingProject}
                    className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                  >
                    {deletingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
