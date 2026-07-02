import { useState, useEffect } from 'react';
import { obterStatsDashboard, obterAlertas } from '../../lib/api';
import { DashboardStats } from '../../lib/types';
import { StatCard } from '../shared/StatCard';
import { StatusBadge } from '../shared/StatusBadge';
import { formatMoney } from '../../lib/formatters';
import { Users, FileText, Target, TrendingUp, ArrowDownRight, AlertTriangle, Clock, Bell } from 'lucide-react';

interface Alerta {
  tipo: string;
  severidade: string;
  titulo: string;
  descricao: string;
  quantidade: number;
}

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    obterStatsDashboard().then(s => setStats(s as DashboardStats)).catch(() => {});
    obterAlertas().then(a => setAlertas(a as Alerta[])).catch(() => {});
  }, []);

  if (!stats) return <div className="text-center py-12 text-sm text-surface-400">Carregando...</div>;

  const totalEsteira = stats.propostas_por_status.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-surface-900">Dashboard</h2>
        <p className="text-xs text-surface-400 mt-0.5">Visão geral da operação</p>
      </div>

      {/* Alertas inteligentes */}
      {alertas.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-surface-700">Alertas</h3>
            <span className="text-2xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{alertas.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alertas.map((a, i) => {
              const cor = a.severidade === 'alta' ? 'red' : a.severidade === 'media' ? 'amber' : 'blue';
              const cores: Record<string, string> = {
                red: 'bg-red-50 border-red-200 text-red-700',
                amber: 'bg-amber-50 border-amber-200 text-amber-700',
                blue: 'bg-blue-50 border-blue-200 text-blue-700',
              };
              const Icon = a.tipo === 'retorno_agendado' ? Clock : AlertTriangle;
              return (
                <div key={i} className={`rounded-xl border p-3 flex items-start gap-3 ${cores[cor]}`}>
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.titulo}</p>
                    <p className="text-xs opacity-80">{a.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Clientes Cadastrados"
          value={stats.total_clientes}
          icon={Users}
          color="brand"
        />
        <StatCard
          title="Propostas este Mês"
          value={stats.total_propostas_mes}
          icon={FileText}
          color="info"
        />
        <StatCard
          title="Comissões a Receber"
          value={formatMoney(stats.comissoes_a_receber)}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          title="Comissões a Pagar"
          value={formatMoney(stats.comissoes_a_pagar)}
          icon={ArrowDownRight}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Valor pago no mês */}
        <div className="stat-card col-span-1">
          <p className="text-xs font-medium text-surface-500">Valor Pago no Mês</p>
          <p className="text-3xl font-bold text-surface-900 mt-2">{formatMoney(stats.valor_total_mes)}</p>
          <p className="text-xs text-surface-400 mt-1">Total de contratos pagos</p>
        </div>

        {/* Leads */}
        <div className="stat-card col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-surface-500">Leads Novos</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-surface-900 mt-2">{stats.total_leads_novos}</p>
          <p className="text-xs text-surface-400 mt-1">Aguardando contato</p>
        </div>

        {/* Funil rápido */}
        <div className="stat-card col-span-1">
          <p className="text-xs font-medium text-surface-500 mb-3">Esteira ({totalEsteira} propostas ativas)</p>
          {stats.propostas_por_status.length === 0 ? (
            <p className="text-xs text-surface-400">Nenhuma proposta ativa</p>
          ) : (
            <div className="space-y-1.5">
              {stats.propostas_por_status.map(s => (
                <div key={s.status} className="flex items-center justify-between">
                  <StatusBadge status={s.status as any} />
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${totalEsteira ? (s.total / totalEsteira) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-surface-600 w-5 text-right">{s.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick tip for empty state */}
      {stats.total_clientes === 0 && (
        <div className="card p-5 bg-brand-50/50 border-brand-200">
          <h3 className="text-sm font-semibold text-brand-900 mb-1">Primeiros passos</h3>
          <p className="text-xs text-brand-700 leading-relaxed">
            Para começar a usar o CredHub, vá em <strong>Configurações</strong> e cadastre os bancos parceiros e convênios.
            Depois, vá em <strong>Clientes</strong> para cadastrar os primeiros clientes e criar propostas.
          </p>
        </div>
      )}
    </div>
  );
}
