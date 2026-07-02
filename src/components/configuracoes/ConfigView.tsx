import { useState } from 'react';
import { BancosConfig } from './BancosConfig';
import { ConveniosConfig } from './ConveniosConfig';
import { TabelasComissao } from './TabelasComissao';
import { UsuariosConfig } from './UsuariosConfig';
import { MinhaContaConfig } from './MinhaContaConfig';
import { BackupConfig } from './BackupConfig';
import { EmpresaConfig } from './EmpresaConfig';
import { FeedbackConfig } from './FeedbackConfig';
import { AtualizacaoConfig } from './AtualizacaoConfig';
import { Building2, ScrollText, Settings, Percent, Users2, UserCog, DatabaseBackup, Sparkles, Bell, RefreshCw } from 'lucide-react';
import { Usuario } from '../../lib/types';

interface Props {
  currentUser: Usuario;
}

export function ConfigView({ currentUser }: Props) {
  const isAdmin = currentUser.perfil === 'admin';

  const TABS = [
    { id: 'minha_conta', label: 'Minha Conta', icon: UserCog, adminOnly: false },
    { id: 'empresa', label: 'Identidade da Empresa', icon: Sparkles, adminOnly: true },
    { id: 'usuarios', label: 'Usuários', icon: Users2, adminOnly: true },
    { id: 'bancos', label: 'Bancos', icon: Building2, adminOnly: true },
    { id: 'convenios', label: 'Convênios', icon: ScrollText, adminOnly: true },
    { id: 'comissoes', label: 'Tabelas de Comissão', icon: Percent, adminOnly: true },
    { id: 'backup', label: 'Backup', icon: DatabaseBackup, adminOnly: true },
    { id: 'notificacoes', label: 'Notificações', icon: Bell, adminOnly: true },
    { id: 'atualizacao', label: 'Atualizações', icon: RefreshCw },
  ].filter(t => isAdmin || !t.adminOnly);

  const [tab, setTab] = useState(TABS[0].id);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-surface-400" />
        <h2 className="text-lg font-bold text-surface-900">Configurações</h2>
      </div>

      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t.id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'minha_conta' && <MinhaContaConfig currentUser={currentUser} />}
      {tab === 'empresa' && <EmpresaConfig currentUser={currentUser} />}
      {tab === 'usuarios' && <UsuariosConfig currentUser={currentUser} />}
      {tab === 'bancos' && <BancosConfig />}
      {tab === 'convenios' && <ConveniosConfig />}
      {tab === 'comissoes' && <TabelasComissao />}
      {tab === 'backup' && <BackupConfig currentUser={currentUser} />}
      {tab === 'notificacoes' && <FeedbackConfig currentUser={currentUser} />}
      {tab === 'atualizacao' && <AtualizacaoConfig />}
    </div>
  );
}
