import { useState, useEffect } from 'react';
import { fazerBackup, listarBackupsAutomaticos, validarBackup, restaurarBackup } from '../../lib/api';
import { Usuario } from '../../lib/types';
import { Modal } from '../shared/Modal';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Tooltip } from '../shared/Tooltip';
import { EmptyState } from '../shared/EmptyState';
import toast from 'react-hot-toast';
import { save, open } from '@tauri-apps/plugin-dialog';
import { Download, Upload, Shield, HardDrive, RotateCcw, CheckCircle2, XCircle, Clock, Info } from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

interface BackupInfo {
  caminho: string;
  nome_arquivo: string;
  tamanho_kb: number;
  criado_em: string;
}

interface BackupConteudo {
  valido: boolean;
  integridade: string;
  total_clientes: number;
  total_propostas: number;
  total_comissoes: number;
  total_usuarios: number;
}

export function BackupConfig({ currentUser }: Props) {
  const [backupsAuto, setBackupsAuto] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Restauração
  const [validacao, setValidacao] = useState<BackupConteudo | null>(null);
  const [caminhoRestaurar, setCaminhoRestaurar] = useState('');
  const [validacaoOpen, setValidacaoOpen] = useState(false);
  const [confirmRestaurar, setConfirmRestaurar] = useState(false);

  const isAdmin = currentUser.perfil === 'admin';

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function load() {
    try { setBackupsAuto(await listarBackupsAutomaticos() as BackupInfo[]); } catch { /* */ }
  }

  async function handleFazerBackup() {
    try {
      const destino = await save({
        title: 'Salvar backup do CredHub',
        defaultPath: `CredHub-backup-${new Date().toISOString().slice(0, 10)}.credhub-backup`,
        filters: [{ name: 'Backup CredHub', extensions: ['credhub-backup'] }],
      });
      if (!destino) return;

      setLoading(true);
      const info = await fazerBackup(destino) as BackupInfo;
      toast.success(`Backup criado: ${info.nome_arquivo} (${info.tamanho_kb} KB)`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  }

  async function handleSelecionarRestaurar() {
    try {
      const arquivo = await open({
        title: 'Selecionar backup para restaurar',
        multiple: false,
        filters: [{ name: 'Backup CredHub', extensions: ['credhub-backup', 'db'] }],
      });
      if (!arquivo || typeof arquivo !== 'string') return;

      setCaminhoRestaurar(arquivo);
      const conteudo = await validarBackup(arquivo) as BackupConteudo;
      setValidacao(conteudo);
      setValidacaoOpen(true);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function restaurarBackupAuto(info: BackupInfo) {
    try {
      setCaminhoRestaurar(info.caminho);
      const conteudo = await validarBackup(info.caminho) as BackupConteudo;
      setValidacao(conteudo);
      setValidacaoOpen(true);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function prosseguirParaConfirmacao() {
    setValidacaoOpen(false);
    setConfirmRestaurar(true);
  }

  async function executarRestauracao() {
    try {
      setLoading(true);
      // O backend reinicia o app ao final (app.restart()), então esta chamada
      // pode não retornar — avisamos o usuário antes.
      toast.success('Backup restaurado. O aplicativo vai reiniciar...', { duration: 4000 });
      await restaurarBackup(caminhoRestaurar);
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return <EmptyState icon={Shield} title="Acesso restrito" description="Apenas administradores podem gerenciar backups." />;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-surface-900">Backup e Restauração</h3>
        <p className="text-xs text-surface-400 mt-0.5">Proteja os dados do sistema. Backups automáticos são criados ao fechar o app.</p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-semibold mb-1">Como funciona</p>
          <p>O CredHub cria um <strong>backup automático ao fechar</strong> o aplicativo (mantém os 2 mais recentes). Você também pode fazer um backup manual a qualquer momento e salvá-lo onde quiser (pendrive, nuvem). Todo backup é validado quanto à integridade antes de ser gravado.</p>
        </div>
      </div>

      {/* Ações principais */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <Download className="w-5 h-5 text-green-600" />
          </div>
          <h4 className="text-sm font-semibold text-surface-900 mb-1">Fazer Backup</h4>
          <p className="text-xs text-surface-400 mb-4">Cria uma cópia segura de todos os dados e salva no local que você escolher.</p>
          <button onClick={handleFazerBackup} disabled={loading} className="btn-primary text-xs w-full">
            {loading ? 'Processando...' : 'Fazer Backup Agora'}
          </button>
        </div>

        <div className="card p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <Upload className="w-5 h-5 text-amber-600" />
          </div>
          <h4 className="text-sm font-semibold text-surface-900 mb-1">Restaurar Backup</h4>
          <p className="text-xs text-surface-400 mb-4">Restaura os dados de um arquivo de backup. Os dados atuais serão substituídos.</p>
          <button onClick={handleSelecionarRestaurar} className="btn-secondary text-xs w-full">
            Selecionar Arquivo...
          </button>
        </div>
      </div>

      {/* Backups automáticos */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-surface-400" />
          <h4 className="text-sm font-semibold text-surface-700">Backups Automáticos</h4>
        </div>
        {backupsAuto.length === 0 ? (
          <div className="card p-6 text-center">
            <Clock className="w-6 h-6 text-surface-300 mx-auto mb-2" />
            <p className="text-xs text-surface-400">Nenhum backup automático ainda. Um será criado quando você fechar o app.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Arquivo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Tamanho</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500">Criado em</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {backupsAuto.map((b, i) => (
                  <tr key={i} className="border-b border-surface-50 hover:bg-surface-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-surface-600">{b.nome_arquivo}</td>
                    <td className="px-4 py-3 text-surface-500">{b.tamanho_kb} KB</td>
                    <td className="px-4 py-3 text-surface-500">{b.criado_em}</td>
                    <td className="px-4 py-3">
                      <Tooltip content="Validar e restaurar este backup">
                        <button onClick={() => restaurarBackupAuto(b)} className="p-1.5 rounded-lg hover:bg-amber-50 text-surface-400 hover:text-amber-600">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de validação (mostra conteúdo do backup) */}
      <Modal open={validacaoOpen} onClose={() => setValidacaoOpen(false)} title="Validação do Backup" width="sm" footer={
        validacao?.valido ? (
          <>
            <button onClick={() => setValidacaoOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={prosseguirParaConfirmacao} className="btn-primary">Prosseguir com Restauração</button>
          </>
        ) : (
          <button onClick={() => setValidacaoOpen(false)} className="btn-secondary">Fechar</button>
        )
      }>
        {validacao && (
          <div>
            <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg ${validacao.valido ? 'bg-green-50' : 'bg-red-50'}`}>
              {validacao.valido ? (
                <><CheckCircle2 className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-700">Backup válido e íntegro</span></>
              ) : (
                <><XCircle className="w-5 h-5 text-red-500" /><span className="text-sm font-medium text-red-600">Backup inválido ou corrompido</span></>
              )}
            </div>

            {validacao.valido && (
              <>
                <p className="text-xs text-surface-500 mb-3">Confira o conteúdo deste backup antes de restaurar:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-50 rounded-lg p-3">
                    <p className="text-2xs text-surface-400">Clientes</p>
                    <p className="text-lg font-bold text-surface-900">{validacao.total_clientes}</p>
                  </div>
                  <div className="bg-surface-50 rounded-lg p-3">
                    <p className="text-2xs text-surface-400">Propostas</p>
                    <p className="text-lg font-bold text-surface-900">{validacao.total_propostas}</p>
                  </div>
                  <div className="bg-surface-50 rounded-lg p-3">
                    <p className="text-2xs text-surface-400">Comissões</p>
                    <p className="text-lg font-bold text-surface-900">{validacao.total_comissoes}</p>
                  </div>
                  <div className="bg-surface-50 rounded-lg p-3">
                    <p className="text-2xs text-surface-400">Usuários</p>
                    <p className="text-lg font-bold text-surface-900">{validacao.total_usuarios}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmação dupla de restauração */}
      <ConfirmDialog
        open={confirmRestaurar}
        onClose={() => setConfirmRestaurar(false)}
        onConfirm={executarRestauracao}
        title="Restaurar Backup"
        variant="danger"
        icon="restore"
        confirmLabel="Restaurar Agora"
        requireText="RESTAURAR"
        warning="Os dados atuais serão substituídos pelos do backup. Uma cópia de segurança dos dados atuais será criada automaticamente antes. O app será reiniciado após a restauração."
        message={
          <span>
            Você está prestes a <strong>substituir todos os dados atuais</strong> pelos dados do backup selecionado
            {validacao && <> ({validacao.total_clientes} clientes, {validacao.total_propostas} propostas)</>}.
          </span>
        }
      />
    </div>
  );
}
