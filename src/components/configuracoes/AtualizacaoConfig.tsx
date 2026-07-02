import { useState, useEffect } from 'react';
import { verificarAtualizacao, baixarInstalarAtualizacao, obterVersaoAtual } from '../../lib/updater';
import { RefreshCw, Download, CheckCircle, Loader, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface UpdateEstado {
  versao?: string;
  notas?: string;
  disponivel: boolean;
}

export function AtualizacaoConfig() {
  const [versaoAtual, setVersaoAtual] = useState('...');
  const [checando, setChecando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [update, setUpdate] = useState<UpdateEstado | null>(null);
  const [jaChecou, setJaChecou] = useState(false);

  useEffect(() => {
    obterVersaoAtual().then(setVersaoAtual).catch(() => setVersaoAtual('1.1.0'));
  }, []);

  async function handleVerificar() {
    setChecando(true);
    setUpdate(null);
    try {
      const resultado = await verificarAtualizacao();
      setJaChecou(true);
      if (resultado.disponivel) {
        setUpdate({ versao: resultado.versao, notas: resultado.notas, disponivel: true });
        toast.success(`Versão ${resultado.versao} disponível!`);
      } else {
        setUpdate({ disponivel: false });
        toast.success('Você já está na versão mais recente!');
      }
    } catch (e) {
      toast.error(`Não foi possível verificar: ${(e as Error).message}`);
    } finally {
      setChecando(false);
    }
  }

  async function handleAtualizar() {
    setBaixando(true);
    setProgresso(0);
    try {
      await baixarInstalarAtualizacao((baixado, total) => {
        if (total && total > 0) setProgresso(Math.round((baixado / total) * 100));
      });
      toast.success('Atualização instalada! Reiniciando...');
    } catch (e) {
      toast.error(`Falha: ${(e as Error).message}`);
      setBaixando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-surface-900">Atualizações</h3>
        <p className="text-xs text-surface-400 mt-0.5">
          Mantenha o sistema sempre atualizado com as últimas melhorias e correções.
        </p>
      </div>

      {/* Card versão atual */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800">CredHub</p>
              <p className="text-xs text-surface-400">Versão instalada: <span className="font-medium text-surface-600">{versaoAtual}</span></p>
            </div>
          </div>
          <button
            onClick={handleVerificar}
            disabled={checando || baixando}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checando ? 'animate-spin' : ''}`} />
            {checando ? 'Verificando...' : 'Verificar Atualizações'}
          </button>
        </div>
      </div>

      {/* Resultado da verificação */}
      {jaChecou && update && !update.disponivel && (
        <div className="card p-4 flex items-center gap-3 bg-green-50/50 border-green-100">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-sm text-surface-700">Você está usando a versão mais recente do CredHub.</p>
        </div>
      )}

      {update && update.disponivel && (
        <div className="card p-5 ring-1 ring-brand-200">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <Download className="w-4.5 h-4.5 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-surface-800">Versão {update.versao} disponível</p>
              {update.notas && (
                <div className="text-xs text-surface-600 bg-surface-50 rounded-lg p-3 mt-2 max-h-40 overflow-y-auto whitespace-pre-line">
                  {update.notas}
                </div>
              )}
            </div>
          </div>

          {baixando ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-surface-500 mb-2">
                <span className="flex items-center gap-1.5">
                  <Loader className="w-3.5 h-3.5 animate-spin" /> Baixando...
                </span>
                <span className="font-medium">{progresso}%</span>
              </div>
              <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }} />
              </div>
              <p className="text-2xs text-surface-400 mt-2">O app será reiniciado ao concluir.</p>
            </div>
          ) : (
            <button onClick={handleAtualizar} className="btn-primary w-full text-sm flex items-center justify-center gap-2 mt-2">
              <Download className="w-4 h-4" /> Baixar e Instalar
            </button>
          )}
        </div>
      )}

      {/* Nota informativa */}
      <div className="mt-4 text-2xs text-surface-400 leading-relaxed">
        <p>O CredHub verifica atualizações automaticamente ao abrir. As atualizações são baixadas de forma segura e verificadas por assinatura digital antes da instalação.</p>
      </div>
    </div>
  );
}
