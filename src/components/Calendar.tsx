import React, { useState } from 'react';
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
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Appointment {
  id: string;
  patientName: string;
  ownerName: string;
  type: 'Consulta' | 'Retorno' | 'Vacina' | 'Cirurgia';
  time: string;
  status: 'confirmed' | 'pending' | 'finished';
  species: 'Canino' | 'Felino';
}

const appointments: Appointment[] = [
  { id: '1', patientName: 'Luna', ownerName: 'Maria Silva', type: 'Consulta', time: '09:00', status: 'finished', species: 'Canino' },
  { id: '2', patientName: 'Thor', ownerName: 'João Santos', type: 'Vacina', time: '10:30', status: 'confirmed', species: 'Canino' },
  { id: '3', patientName: 'Mel', ownerName: 'Ana Oliveira', type: 'Retorno', time: '14:00', status: 'pending', species: 'Felino' },
];

export function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-text tracking-tight">Agenda</h2>
          <p className="text-sm text-slate-500">Gerencie seus atendimentos e retornos</p>
        </div>
        <button className="p-3 bg-clinical-blue text-white rounded-xl shadow-lg shadow-clinical-blue/20 hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Mini Calendar Holder */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-clinical-blue" />
            <span className="font-bold text-slate-700">Maio, 2026</span>
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
            <button className="p-2 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
            <span key={`${day}-${idx}`} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2 text-center">
          {Array.from({ length: 31 }).map((_, i) => {
            const day = i + 1;
            const isToday = day === 21;
            const isSelected = day === 21;
            return (
              <button 
                key={i}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                  isSelected ? 'bg-clinical-blue text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className="text-sm font-bold">{day}</span>
                {day % 5 === 0 && !isSelected && <div className="w-1 h-1 bg-clinical-blue rounded-full mt-1"></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-bold text-slate-700">Próximos para Hoje</h3>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
            <Search className="w-3 h-3 text-slate-400" />
            <input type="text" placeholder="Buscar..." className="bg-transparent text-[10px] font-bold outline-none text-slate-600 w-20" />
          </div>
        </div>

        <div className="space-y-3">
          {appointments.map((apt) => (
            <motion.div 
              key={apt.id}
              whileHover={{ x: 4 }}
              className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  apt.type === 'Vacina' ? 'bg-emerald-50 text-emerald-600' :
                  apt.type === 'Cirurgia' ? 'bg-red-50 text-red-600' :
                  'bg-blue-50 text-clinical-blue'
                }`}>
                  {apt.type === 'Vacina' ? <CheckCircle2 className="w-5 h-5"/> : <CalendarIcon className="w-5 h-5"/>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{apt.patientName}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">• {apt.type}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{apt.ownerName}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <div className="flex items-center gap-1.5 text-clinical-blue">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-black">{apt.time}</span>
                </div>
                <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  apt.status === 'finished' ? 'bg-slate-100 text-slate-400' :
                  apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-orange-50 text-orange-600'
                }`}>
                  {apt.status === 'finished' ? 'Finalizado' :
                   apt.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Preventive Alerts */}
      <div className="bg-amber-50/50 border border-amber-200 p-6 rounded-[2rem] flex gap-4">
        <div className="bg-amber-100 p-3 rounded-xl text-amber-600 h-fit">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-amber-900">Alerta de Agenda</h4>
          <p className="text-xs text-amber-800/80 leading-relaxed">
            <b>4 retornos</b> previstos para os próximos 7 dias ainda não foram confirmados pelos tutores.
          </p>
          <button className="text-amber-700 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-1">
            Enviar Lembretes <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
