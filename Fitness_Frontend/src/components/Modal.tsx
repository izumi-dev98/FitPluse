import { useAppStore } from '../store/store';

export default function Modal() {
  const { modalOpen, modalTitle, modalBody, closeModal } = useAppStore();
  if (!modalOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4" onClick={closeModal}>
      <div className="w-full max-w-lg bg-slate-900 border border-brand-600/30 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-brand-400 mb-3">{modalTitle}</h2>
        <p className="text-slate-300 mb-6 whitespace-pre-wrap">{modalBody}</p>
        <button onClick={closeModal} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition">Close</button>
      </div>
    </div>
  );
}