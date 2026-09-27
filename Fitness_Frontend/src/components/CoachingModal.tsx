import { X, Sparkles, Check, Zap, Target, Brain, Award } from 'lucide-react';

export default function CoachingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1626] border border-[#1a263d] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ccff00] to-transparent" />

        <div className="flex items-center justify-between p-5 border-b border-[#182338]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 flex items-center justify-center">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">FitPulse AI Coaching</h3>
              <p className="text-xs text-slate-400">Unlock your peak athletic potential</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#141f33] border border-[#1e2d47]">
            <span className="text-[11px] font-bold text-[#ccff00] uppercase tracking-wider">Premium Access</span>
            <h4 className="text-xl font-extrabold text-white mt-0.5">Personalized AI Performance</h4>
            <p className="text-xs text-slate-400 mt-1">
              Dynamic macro adjustments, progressive overload tracking, and 24/7 smart recovery insights tailored to your body metrics.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Brain, title: 'Adaptive Daily Macros', desc: 'Auto-adjusts calories and protein based on your daily training load.' },
              { icon: Target, title: 'Intelligent Workout Periodization', desc: 'Custom 4-week routines with progressive volume and deload weeks.' },
              { icon: Zap, title: 'Real-time Strain & Recovery', desc: 'Syncs with your sleep, hydration, and fatigue levels.' },
              { icon: Award, title: 'Pro Athlete Badge & Priority Support', desc: 'Exclusive community badges and direct nutrition review.' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/30 transition">
                <div className="w-8 h-8 rounded-lg bg-[#ccff00]/10 text-[#ccff00] flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    {f.title} <Check size={14} className="text-[#ccff00]" />
                  </div>
                  <div className="text-xs text-slate-400">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              alert('Welcome to FitPulse Pro Trial! All coaching features are unlocked for your profile.');
              onClose();
            }}
            className="w-full py-3.5 rounded-xl bg-[#ccff00] hover:bg-[#bbf000] text-black font-extrabold text-sm transition shadow-[0_0_20px_rgba(204,255,0,0.35)] flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>Start 14-Day Free Trial</span>
          </button>

          <p className="text-[11px] text-center text-slate-500">
            No credit card required. Cancel anytime from your account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
