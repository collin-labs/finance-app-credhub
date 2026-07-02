import { useState, useEffect } from 'react';
import { verificarAtualizacao, baixarInstalarAtualizacao, UpdateInfo } from '../../lib/updater';
import { Download, X, Sparkles, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

// Verifica ao montar (após login). Mostra modal se houver update.
// Silencioso se não houver nada ou se falhar (offline etc).
export function UpdateChecker() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [aberto, setAberto] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function checar() {
      try {
        const resultado = await verificarAtualizacao();
        if (!cancelado && resultado.disponivel) {
          setInfo(resultado);
          setAberto(true);
        }
      } catch {
        // Silencioso — não incomoda o usuário se estiver offline
      }
    }
    // Pequeno delay pra não competir com o carregamento inicial
    const t = setTimeout(checar, 3000);
    return () => { cancelado = true; clearTimeout(t); };
  }, []);

  async function handleAtualizar() {
    setBaixando(true);
    setProgresso(0);
    try {
      await baixarInstalarAtualizacao((baixado, total) => {
        if (total && total > 0) {
          setProgresso(Math.round((baixado / total) * 100));
        }
      });
      // Se chegou aqui sem reiniciar, informa
      toast.success('Atualização instalada! Reiniciando...');
    } catch (e) {
      toast.error(`Falha na atualização: ${(e as Error).message}`);
      setBaixando(false);
    }
  }

  if (!aberto || !info) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 p-5 text-white relative">
          {!baixando && (
            <button
              onClick={() => setAberto(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Atualização Disponível</h3>
              <p className="text-white/80 text-sm">
                Versão {info.versao}
                {info.versaoAtual && <span className="text-white/60"> (atual: {info.versaoAtual})</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {info.notas && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-surface-500 mb-1.5 uppercase tracking-wide">Novidades</p>
              <div className="text-sm text-surface-700 bg-surface-50 rounded-lg p-3 max-h-40 overflow-y-auto whitespace-pre-line">
                {info.notas}
              </div>
            </div>
          )}

          {baixando ? (
            <div className="py-2">
              <div className="flex items-center justify-between text-xs text-surface-500 mb-2">
                <span className="flex items-center gap-1.5">
                  <Loader className="w-3.5 h-3.5 animate-spin" /> Baixando atualização...
                </span>
                <span className="font-medium">{progresso}%</span>
              </div>
              <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <p className="text-2xs text-surface-400 mt-2 text-center">
                O app será reiniciado automaticamente ao concluir.
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setAberto(false)}
                className="btn-secondary flex-1 text-sm"
              >
                Depois
              </button>
              <button
                onClick={handleAtualizar}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Atualizar Agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
