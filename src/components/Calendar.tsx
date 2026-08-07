import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  User, 
  PawPrint,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Search,
  Trash2,
  Play,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, getCurrentUser, collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, onSnapshot } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Appointment } from '../types';

interface CalendarProps {
  onStartConsultation?: (patientInfo: {
    name: string;
    species: string;
    breed: string;
    tutorName: string;
    tutorPhone: string;
  }) => void;
}

export function Calendar({ onStartConsultation }: CalendarProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [patName, setPatName] = useState('');
  const [tutName, setTutName] = useState('');
  const [aptType, setAptType] = useState<'Consulta' | 'Retorno' | 'Vacina' | 'Cirurgia'>('Consulta');
  const [aptTime, setAptTime] = useState('09:00');
  const [aptDate, setAptDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [patSpecies, setPatSpecies] = useState<'Canino' | 'Felino'>('Canino');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load appointments in real-time
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const q = query(
      collection(db, 'appointments'),
      where('ownerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
      });
      // Sort appointments by time
      list.sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading appointments:", error);
      handleFirestoreError(error, OperationType.LIST, 'appointments');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtered by selected date
  const filteredAppointments = appointments.filter((apt) => {
    const matchesDate = apt.date === selectedDate;
    const matchesSearch = 
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patName.trim() || !tutName.trim() || !aptDate || !aptTime) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert("Você precisa estar autenticado.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newAptData = {
        patientName: patName,
        ownerName: tutName,
        type: aptType,
        time: aptTime,
        date: aptDate,
        status: 'pending' as const,
        species: patSpecies,
        ownerId: currentUser.uid
      };

      await addDoc(collection(db, 'appointments'), newAptData);
      
      // Reset form and close modal
      setPatName('');
      setTutName('');
      setAptType('Consulta');
      setAptTime('09:00');
      setPatSpecies('Canino');
      setShowAddModal(false);
    } catch (err) {
      console.error("Error saving appointment:", err);
      handleFirestoreError(err, OperationType.WRITE, 'appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Deseja realmente remover este agendamento?")) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (err) {
      console.error("Error deleting appointment:", err);
      handleFirestoreError(err, OperationType.WRITE, `appointments/${id}`);
    }
  };

  const handleToggleStatus = async (apt: Appointment) => {
    const nextStatusMap: Record<string, 'pending' | 'confirmed' | 'finished'> = {
      'pending': 'confirmed',
      'confirmed': 'finished',
      'finished': 'pending'
    };
    const newStatus = nextStatusMap[apt.status] || 'pending';
    try {
      await updateDoc(doc(db, 'appointments', apt.id), { status: newStatus });
    } catch (err) {
      console.error("Error updating appointment status:", err);
      handleFirestoreError(err, OperationType.WRITE, `appointments/${apt.id}`);
    }
  };

  // Helper to generate monthly days list
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Pad previous month days with null
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const monthDays = getDaysInMonth(currentMonth);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const getDayFormatted = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-sans text-slate-900 tracking-tight">Agenda Médica</h2>
          <p className="text-sm text-slate-500 font-medium">Controle suas consultas, vacinas e procedimentos integrados ao prontuário.</p>
        </div>
        <button 
          onClick={() => {
            setAptDate(selectedDate);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] text-white rounded-full font-bold shadow-lg shadow-indigo-600/15 cursor-pointer transition-all text-xs uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Side Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm h-fit">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              <span className="font-bold text-slate-800 uppercase tracking-wide text-xs">
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4 text-slate-500"/>
              </button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors cursor-pointer">
                <ChevronRight className="w-4 h-4 text-slate-500"/>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <span key={day} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {monthDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              
              const dateStr = getDayFormatted(day);
              const isSelected = dateStr === selectedDate;
              const isToday = getDayFormatted(new Date()) === dateStr;
              
              // Check if date has appointments
              const hasApts = appointments.some(apt => apt.date === dateStr);

              return (
                <button 
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all relative cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className={`text-xs font-bold ${isToday && !isSelected ? 'text-indigo-600 border-b-2 border-indigo-500 pb-0.5' : ''}`}>
                    {day.getDate()}
                  </span>
                  {hasApts && (
                    <span className={`w-1 h-1 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Appointments List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                Compromissos para {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </h3>
              <p className="text-xs text-slate-400 font-medium">{filteredAppointments.length} agendamento(s) para este dia</p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full shadow-3xs max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-[11px] font-bold outline-none text-slate-600 w-24 sm:w-32" 
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center bg-white border border-slate-100 rounded-3xl animate-pulse space-y-3">
                <div className="h-12 bg-slate-50 rounded-xl"></div>
                <div className="h-12 bg-slate-50 rounded-xl"></div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white border border-slate-100 rounded-[2rem] shadow-xs">
                 <PawPrint className="w-8 h-8 mb-3 text-slate-300" />
                 <p className="text-xs font-medium text-slate-500">Nenhum compromisso marcado para este dia.</p>
                 <button 
                   onClick={() => setShowAddModal(true)}
                   className="mt-4 px-4 py-2 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-full transition-all"
                 >
                   Agendar Agora
                 </button>
              </div>
            ) : (
              filteredAppointments.map((apt) => (
                <motion.div 
                  key={apt.id}
                  layoutId={apt.id}
                  className="bg-white border border-slate-100/85 p-5 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-2xl shrink-0 ${
                      apt.type === 'Vacina' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/40' :
                      apt.type === 'Cirurgia' ? 'bg-rose-50 text-rose-600 border border-rose-100/40' :
                      apt.type === 'Retorno' ? 'bg-orange-50 text-orange-600 border border-orange-100/40' :
                      'bg-indigo-50 text-indigo-600 border border-indigo-100/40'
                    }`}>
                      {apt.species === 'Canino' ? <span className="text-xl">🐕</span> : <span className="text-xl">🐈</span>}
                    </div>
                    
                    <div className="text-left space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 font-display text-base capitalize">{apt.patientName}</span>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{apt.type}</span>
                        <span className="text-[10px] font-semibold text-slate-500">({apt.species})</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Tutor: <span className="font-semibold text-slate-700">{apt.ownerName}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-50 sm:border-t-0 pt-3 sm:pt-0">
                    <div className="flex flex-col items-start sm:items-end gap-1.5 text-left sm:text-right">
                      <div className="flex items-center gap-1.5 text-indigo-600">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs font-black">{apt.time}h</span>
                      </div>
                      
                      <button
                        onClick={() => handleToggleStatus(apt)}
                        className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border tracking-wide transition-all ${
                          apt.status === 'finished' ? 'bg-slate-50 text-slate-400 border-slate-200' :
                          apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}
                        title="Clique para alternar status"
                      >
                        {apt.status === 'finished' ? '✓ Atendido' :
                         apt.status === 'confirmed' ? '● Confirmado' : '○ Pendente'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* INICIAR ATENDIMENTO (Seamless integration to workspace) */}
                      {onStartConsultation && (
                        <button
                          onClick={() => onStartConsultation({
                            name: apt.patientName,
                            species: apt.species,
                            breed: "SRD",
                            tutorName: apt.ownerName,
                            tutorPhone: ""
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
                          title="Iniciar Consulta no Workspace"
                        >
                          <Play className="w-3 h-3 fill-current shrink-0" />
                          <span>Atender</span>
                        </button>
                      )}

                      <button 
                        onClick={() => handleDeleteAppointment(apt.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                        title="Remover compromisso"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Appointment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold font-display text-slate-800 text-sm uppercase tracking-wider">Novo Agendamento</h3>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddAppointment} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome do Pet *</label>
                    <input 
                      type="text" 
                      required
                      value={patName}
                      onChange={(e) => setPatName(e.target.value)}
                      placeholder="Ex: Luna"
                      className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 bg-slate-50/50 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Espécie *</label>
                    <select 
                      value={patSpecies}
                      onChange={(e) => setPatSpecies(e.target.value as any)}
                      className="w-full text-xs font-bold py-2.5 px-3 border border-slate-200 bg-slate-50/50 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="Canino">🐕 Canino</option>
                      <option value="Felino">🐈 Felino</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome do Tutor *</label>
                    <input 
                      type="text" 
                      required
                      value={tutName}
                      onChange={(e) => setTutName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 bg-slate-50/50 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data *</label>
                    <input 
                      type="date" 
                      required
                      value={aptDate}
                      onChange={(e) => setAptDate(e.target.value)}
                      className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 bg-slate-50/50 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Horário *</label>
                    <input 
                      type="time" 
                      required
                      value={aptTime}
                      onChange={(e) => setAptTime(e.target.value)}
                      className="w-full text-xs font-semibold py-2.5 px-3 border border-slate-200 bg-slate-50/50 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-colors cursor-pointer"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipo de Atendimento</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Consulta', 'Retorno', 'Vacina', 'Cirurgia'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAptType(type)}
                          className={`py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                            aptType === type 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs' 
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    {isSubmitting ? "Salvando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
