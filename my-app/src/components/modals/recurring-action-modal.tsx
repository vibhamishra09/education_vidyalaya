import React from 'react';
import { Calendar, Layers, X, ArrowRight, LogOut } from 'lucide-react';

interface RecurringActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: 'THIS' | 'ALL') => void; 
  actionType: 'join' | 'leave';
  title?: string;
}

const RecurringActionModal: React.FC<RecurringActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  title = "Recurring Study Room"
}) => {
  if (!isOpen) return null;
  
  const themes = {
    join: {
      primary: 'bg-green-600 hover:bg-green-700 text-white',
      secondary: 'bg-white border-green-100 hover:bg-green-50 text-green-700 hover:border-green-200',
      iconBg: 'bg-green-50 text-green-600',
      accent: 'text-green-600',
      icon: <Calendar size={28} />,
      heading: "Update your schedule?",
      subheading: "This room repeats daily. Would you like to join just this instance or the entire series?",
    },
    leave: {
      primary: 'bg-red-600 hover:bg-red-700 text-white',
      secondary: 'bg-white border-red-100 hover:bg-red-50 text-red-700 hover:border-red-200',
      iconBg: 'bg-red-50 text-red-600',
      accent: 'text-red-600',
      icon: <LogOut size={28} />,
      heading: "Unenroll from this series?",
      subheading: "You are currently a participant. Do you want to leave just this session or remove all instances from your dashboard?"
    }
  };

  const theme = themes[actionType];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${actionType === 'leave' ? 'bg-red-500' : 'bg-green-500'}`} />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <div className={`mx-auto w-16 h-16 ${theme.iconBg} rounded-2xl flex items-center justify-center mb-5 shadow-inner`}>
            {theme.icon}
          </div>
          <h4 className="text-xl font-bold text-slate-900 mb-2">
            {theme.heading}
          </h4>
          <p className="text-slate-500 text-sm leading-relaxed px-2">
            {theme.subheading}
          </p>
        </div>

        <div className="px-5 pb-6 flex flex-col gap-3">
          <button
            onClick={() => onConfirm('THIS')}
            className={`flex items-center justify-between w-full py-3.5 px-4 rounded-xl border transition-all text-sm font-medium ${theme.secondary}`}
          >
            <div className="flex flex-col items-start">
              <span className="font-bold">This session only</span>
            </div>
            <ArrowRight size={16} className="opacity-50" />
          </button>

          <button
            onClick={() => onConfirm('ALL')}
            className={`flex items-center justify-between w-full py-3.5 px-4 rounded-xl transition-all text-sm font-semibold shadow-md ${theme.primary}`}
          >
            <div className="flex flex-col items-start">
              <span className="font-bold">{actionType[0].toUpperCase() + actionType.substring(1)} entire series</span>
            </div>
            <Layers size={18} />
          </button>
          
          <button
            onClick={onClose}
            className="mt-2 text-xs text-slate-400 hover:text-slate-600 font-bold transition-colors py-2"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringActionModal;