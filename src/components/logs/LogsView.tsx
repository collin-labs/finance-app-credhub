import { useState, useEffect, useCallback } from 'react';
import { listarAuditLog, contarAuditLog, listarUsuarios } from '../../lib/api';
import { Usuario } from '../../lib/types';
import { EmptyState } from '../shared/EmptyState';
import { Tooltip } from '../shared/Tooltip';
import toast from 'react-hot-toast';
import {
  ScrollText, Shield, ChevronLeft, ChevronRight, Download, Search, RotateCcw,
} from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

interface AuditLogEntry {
  id: number;
  usuario_id?: number;
  usuario_nome?: string;
  acao: string;
  entidade: string;
  entidade_id?: number;
  detalhes?: string;
  criado_em: string;
}

const POR_PAGINA = 20;

const ENTIDADES = [
  { value: '', label: 'Todas as entidades' },
  { value: 'cliente', label: 'Clientes' },
  { value: 'proposta', label: 'Propostas' },
  { value: 'agente', label: 'Agentes' },
  { value: 'banco', label: 'Bancos' },
  { value: 'convenio', label: 'Convênios' },
  { value: 'comissao', label: 'Comissões' },
  { value: 'tabela_comissao', label: 'Tabelas de Comissão' },
  { value: 'lancamento', label: 'Financeiro' },
  { value: 'campanha', label: 'Campanhas' },
  { value: 'lead', label: 'Leads' },
  { value: 'interacao_lead', label: 'Interações de Lead' },
  { value: 'interacao_cliente', label: 'Interações de Cliente' },
  { value: 'documento_cliente', label: 'Documentos' },
  { value: 'usuario', label: 'Usuários' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'sistema', label: 'Sistema' },
];

const ACOES = [
  { value: '', label: 'Todas as ações' },
  { value: 'criar', label: 'Criar' },
  { value: 'editar', label: 'Editar' },
  { value: 'excluir', label: 'Excluir' },
  { value: 'desativar', label: 'Desativar' },
  { value: 'alterar_status', label: 'Alterar Status' },
  { value: 'upload', label: 'Upload' },
  { value: 'importar', label: 'Importar' },
  { value: 'distribuir', label: 'Distribuir' },
  { value: 'converter', label: 'Converter' },
  { value: 'receber', label: 'Receber' },
  { value: 'pagar', label: 'Pagar' },
  { value: 'pagar_agente', label: 'Pagar Agente' },
  { value: 'login', label: 'Login' },
  { value: 'reset_senha', label: 'Reset de Senha' },
  { value: 'backup', label: 'Backup' },
  { value: 'restaurar_backup', label: 'Restaurar Backup' },
];

const ACAO_BADGE: Record<string, string> = {
  criar: 'bg-green-50 text-green-700',
  editar: 'bg-blue-50 text-blue-700',
  excluir: 'bg-red-50 text-red-700',
  desativar: 'bg-orange-50 text-orange-700',
  alterar_status: 'bg-amber-50 text-amber-700',
  upload: 'bg-purple-50 text-purple-700',
  importar: 'bg-purple-50 text-purple-700',
  distribuir: 'bg-cyan-50 text-cyan-700',
  converter: 'bg-teal-50 text-teal-700',
  receber: 'bg-green-50 text-green-700',
  pagar: 'bg-emerald-50 text-emerald-700',
  pagar_agente: 'bg-emerald-50 text-emerald-700',
  login: 'bg-surface-100 text-surface-600',
  reset_senha: 'bg-rose-50 text-rose-700',
  recuperacao_senha: 'bg-rose-50 text-rose-700',
  backup: 'bg-indigo-50 text-indigo-700',
  restaurar_backup: 'bg-indigo-50 text-indigo-700',
};

export function LogsView({ currentUser }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [fEntidade, setFEntidade] = useState('');
  const [fAcao, setFAcao] = useState('');
  const [fUsuario, setFUsuario] = useState('');
  const [fDataInicio, setFDataInicio] = useState('');
  const [fDataFim, setFDataFim] = useState('');

  const isAllowed = currentUser.perfil === 'admin' || currentUser.perfil === 'gerente';

  const montarFiltros = useCallback((offset: number) => ({
    entidade: fEntidade || undefined,
    acao: fAcao || undefined,
    usuario_id: fUsuario ? Number(fUsuario) : undefined,
    data_inicio: fDataInicio || undefined,
    data_fim: fDataFim || undefined,
    limite: POR_PAGINA,
    offset,
  }), [fEntidade, fAcao, fUsuario, fDataInicio, fDataFim]);

  const load = useCallback(async (pag: number) => {
    setLoading(true);
    try {
      const filtros = montarFiltros(pag * POR_PAGINA);
      const [lista, count] = await Promise.all([
        listarAuditLog(filtros),
        contarAuditLog(filtros),
      ]);
      setLogs(lista as AuditLogEntry[]);
      setTotal(count as number);
      setPagina(pag);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [montarFiltros]);

  useEffect(() => {
    if (!isAllowed) return;
    load(0);
    listarUsuarios().then(u => setUsuarios(u as Usuario[])).catch(() => {});
  }, [isAllowed]);

  function aplicarFiltros() {
    load(0);
  }

  function limparFiltros() {
    setFEntidade('');
    setFAcao('');
    setFUsuario('');
    setFDataInicio('');
    setFDataFim('');
    // Recarrega sem filtros no próximo tick
    setTimeout(() => load(0), 0);
  }

  function formatData(dt: string) {
    try {
      const d = new Date(dt.replace(' ', 'T') + 'Z');
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return dt;
    }
  }

  function labelAcao(acao: string) {
    const found = ACOES.find(a => a.value === acao);
    return found ? found.label : acao;
  }

  function labelEntidade(ent: string) {
    const found = ENTIDADES.find(e => e.value === ent);
    return found ? found.label.replace(/s$/, '') : ent;
  }

  async function exportarCSV() {
    try {
      // Busca TODOS os registros com os filtros atuais (sem paginação)
      const filtros = { ...montarFiltros(0), limite: 100000, offset: 0 };
      const todos = await listarAuditLog(filtros) as AuditLogEntry[];

      const header = 'Data/Hora;Usuário;Ação;Entidade;ID;Detalhes';
      const linhas = todos.map(l =>
        [
          formatData(l.criado_em),
          l.usuario_nome || 'Sistema',
          labelAcao(l.acao),
          labelEntidade(l.entidade),
          l.entidade_id ?? '',
          (l.detalhes || '').replace(/;/g, ','),
        ].join(';')
      );
      const csv = '\uFEFF' + [header, ...linhas].join('\n');

      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const caminho = await save({
        defaultPath: `logs_auditoria_${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (caminho) {
        await writeTextFile(caminho, csv);
        toast.success('Logs exportados com sucesso!');
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!isAllowed) {
    return (
      <EmptyState
        icon={Shield}
        title="Acesso restrito"
        description="Apenas administradores e gerentes podem visualizar os logs de auditoria."
      />
    );
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-surface-900">Logs de Auditoria</h2>
          <p className="text-xs text-surface-400 mt-0.5">
            Registro de todas as ações realizadas no sistema — {total} registro{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Tooltip content="Exporta os logs filtrados em CSV">
          <button onClick={exportarCSV} className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </Tooltip>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-6 gap-3">
          <div>
            <label className="block text-2xs font-medium text-surface-500 mb-1">Entidade</label>
            <select value={fEntidade} onChange={e => setFEntidade(e.target.value)} className="input-field text-xs">
              {ENTIDADES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-2xs font-medium text-surface-500 mb-1">Ação</label>
            <select value={fAcao} onChange={e => setFAcao(e.target.value)} className="input-field text-xs">
              {ACOES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-2xs font-medium text-surface-500 mb-1">Usuário</label>
            <select value={fUsuario} onChange={e => setFUsuario(e.target.value)} className="input-field text-xs">
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-2xs font-medium text-surface-500 mb-1">De</label>
            <input type="date" value={fDataInicio} onChange={e => setFDataInicio(e.target.value)} className="input-field text-xs" />
          </div>
          <div>
            <label className="block text-2xs font-medium text-surface-500 mb-1">Até</label>
            <input type="date" value={fDataFim} onChange={e => setFDataFim(e.target.value)} className="input-field text-xs" />
          </div>
          <div className="flex items-end gap-1.5">
            <button onClick={aplicarFiltros} className="btn-primary text-xs flex items-center gap-1 flex-1 justify-center">
              <Search className="w-3 h-3" /> Filtrar
            </button>
            <Tooltip content="Limpar filtros">
              <button onClick={limparFiltros} className="btn-secondary text-xs p-2">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Tabela */}
      {logs.length === 0 && !loading ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum log encontrado"
          description="Nenhum registro corresponde aos filtros aplicados."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Data/Hora</th>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Usuário</th>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Ação</th>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Entidade</th>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">ID</th>
                <th className="text-left px-4 py-2.5 font-medium text-surface-500">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-surface-50 hover:bg-surface-25 transition-colors">
                  <td className="px-4 py-2.5 text-surface-500 whitespace-nowrap">{formatData(log.criado_em)}</td>
                  <td className="px-4 py-2.5 text-surface-700 font-medium">{log.usuario_nome || 'Sistema'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-2xs font-medium ${ACAO_BADGE[log.acao] || 'bg-surface-100 text-surface-600'}`}>
                      {labelAcao(log.acao)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-surface-600">{labelEntidade(log.entidade)}</td>
                  <td className="px-4 py-2.5 text-surface-400">{log.entidade_id ? `#${log.entidade_id}` : '—'}</td>
                  <td className="px-4 py-2.5 text-surface-500 max-w-xs truncate" title={log.detalhes}>{log.detalhes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
            <span className="text-2xs text-surface-400">
              Página {pagina + 1} de {totalPaginas}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => load(pagina - 1)}
                disabled={pagina === 0 || loading}
                className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => load(pagina + 1)}
                disabled={pagina + 1 >= totalPaginas || loading}
                className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
