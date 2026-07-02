import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2, RotateCcw, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Se definido, exige digitar exatamente esta palavra para liberar o botão (dupla confirmação) */
  requireText?: string;
  /** Texto extra de aviso destacado */
  warning?: string;
  icon?: 'alert' | 'trash' | 'restore' | 'info' | 'check' | 'shield';
}

const VARIANT_STYLES: Record<ConfirmVariant, { bg: string; text: string; btn: string; ring: string }> = {
  danger:  { bg: 'bg-red-50',    text: 'text-red-500',    btn: 'btn-danger',  ring: 'focus:ring-red-300' },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-500',  btn: 'btn-primary', ring: 'focus:ring-amber-300' },
  info:    { bg: 'bg-blue-50',   text: 'text-blue-500',   btn: 'btn-primary', ring: 'focus:ring-blue-300' },
  success: { bg: 'bg-green-50',  text: 'text-green-500',  btn: 'btn-primary', ring: 'focus:ring-green-300' },
};

const ICONS = {
  alert: AlertTriangle, trash: Trash2, restore: RotateCcw,
  info: Info, check: CheckCircle2, shield: ShieldAlert,
};

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'danger', requireText, warning, icon = 'alert',
}: Props) {
  const [typed, setTyped] = useState('');
  const styles = VARIANT_STYLES[variant];
  const Icon = ICONS[icon];

  useEffect(() => { if (open) setTyped(''); }, [open]);

  const canConfirm = !requireText || typed.trim().toUpperCase() === requireText.toUpperCase();

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width="sm" footer={
      <>
        <button onClick={onClose} className="btn-secondary">{cancelLabel}</button>
        <button onClick={handleConfirm} disabled={!canConfirm} className={`${styles.btn} disabled:opacity-40 disabled:cursor-not-allowed`}>
          {confirmLabel}
        </button>
      </>
    }>
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.text}`} />
        </div>
        <div className="flex-1 pt-1">
          <div className="text-sm text-surface-600 leading-relaxed">{message}</div>

          {warning && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">{warning}</p>
            </div>
          )}

          {requireText && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-surface-600 mb-1.5">
                Para confirmar, digite <span className="font-bold text-surface-900">{requireText}</span> abaixo:
              </label>
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                className="input-field"
                placeholder={requireText}
                autoFocus
                autoComplete="off"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
