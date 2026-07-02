import { STATUS_LABELS, PropostaStatus } from '../../lib/types';

interface Props {
  status: PropostaStatus;
  size?: 'sm' | 'md';
}

const colors: Record<PropostaStatus, string> = {
  digitado:              'bg-surface-100 text-surface-600',
  pendente:              'bg-amber-50 text-amber-700',
  em_analise:            'bg-cyan-50 text-cyan-700',
  aprovado:              'bg-blue-50 text-blue-700',
  aguardando_anuencia:   'bg-purple-50 text-purple-700',
  averbado:              'bg-emerald-50 text-emerald-700',
  pago:                  'bg-green-50 text-green-700',
  rejeitado:             'bg-red-50 text-red-600',
  cancelado:             'bg-surface-100 text-surface-500',
  expirado:              'bg-surface-50 text-surface-400',
};

export function StatusBadge({ status, size = 'sm' }: Props) {
  const label = STATUS_LABELS[status] || status;
  const color = colors[status] || 'bg-surface-100 text-surface-600';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold tracking-wide uppercase
      ${color}
      ${size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs'}
    `}>
      {label}
    </span>
  );
}
