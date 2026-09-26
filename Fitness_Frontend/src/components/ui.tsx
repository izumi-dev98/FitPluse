import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-semibold uppercase tracking-wide text-white flex items-center gap-2.5">
          {Icon && (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 border border-brand-500/20">
              <Icon className="text-brand-400" size={20} />
            </span>
          )}
          {title}
        </h1>
        {subtitle && <p className="text-slate-400 text-sm mt-1.5 max-w-xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  const padded = className.includes('p-0') ? '' : 'p-5';
  return (
    <div className={`bg-panel/80 border border-slate-800/80 rounded-2xl ${padded} ${className}`}>
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  color = 'bg-brand-500',
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(140, Math.round((value / max) * 100)) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-amber-400' : color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

export function MacroRow({
  label,
  current,
  target,
  color,
  bar,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
  bar: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className={`font-semibold ${color}`}>{label}</span>
        <span className="text-slate-400">
          <b className="text-white">{Math.round(current)}g</b>
          {target > 0 && <> / {Math.round(target)}g</>}
          {target > 0 && <span className="ml-1 text-slate-500">{pct}%</span>}
        </span>
      </div>
      <ProgressBar value={current} max={target || 1} color={bar} />
    </div>
  );
}

export function Ring({
  percent,
  size = 148,
  children,
}: {
  percent: number;
  size?: number;
  children?: ReactNode;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = (p / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={p > 100 ? '#fbbf24' : '#a3e635'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-8 px-4">
      <p className="text-slate-300 font-medium">{title}</p>
      {hint && <p className="text-slate-500 text-sm mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`bg-panel border border-brand-600/30 rounded-3xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-panel rounded-t-3xl z-10">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1" aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function PaginationBar({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-800">
      <p className="text-xs text-slate-500">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
          className="p-2 rounded-lg border border-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {pageCount <= 8
          ? Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPage(n)}
                className={`min-w-8 h-8 rounded-lg text-xs font-bold ${
                  n === page ? 'bg-brand-400 text-slate-950' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {n}
              </button>
            ))
          : (
            <span className="px-2 text-xs font-bold text-slate-300">{page} / {pageCount}</span>
          )}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPage(Math.min(pageCount, page + 1))}
          className="p-2 rounded-lg border border-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
