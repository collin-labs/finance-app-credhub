import toast from 'react-hot-toast';
import { abrirArquivo, abrirPasta } from './salvar-arquivo';

/**
 * Mostra um toast de sucesso após salvar um arquivo, com botões
 * "Abrir arquivo" e "Abrir pasta" — para o usuário não precisar
 * procurar onde o arquivo foi salvo.
 */
export function toastArquivoSalvo(caminho: string, nomeAmigavel = 'Arquivo') {
  toast.custom((t) => (
    <div
      className={`${t.visible ? 'animate-fade-in' : 'opacity-0'} max-w-sm w-full bg-white shadow-lg rounded-xl border border-surface-100 p-3 flex flex-col gap-2.5`}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-surface-900">{nomeAmigavel} salvo!</p>
          <p className="text-2xs text-surface-400 truncate">{caminho}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            try {
              await abrirArquivo(caminho);
              toast.dismiss(t.id);
            } catch (e) {
              toast.error('Não foi possível abrir: ' + ((e as Error).message || e), { duration: 6000 });
            }
          }}
          className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          Abrir arquivo
        </button>
        <button
          onClick={async () => {
            try {
              await abrirPasta(caminho);
              toast.dismiss(t.id);
            } catch (e) {
              toast.error('Não foi possível abrir a pasta: ' + ((e as Error).message || e), { duration: 6000 });
            }
          }}
          className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-100 text-surface-700 hover:bg-surface-200 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Abrir pasta
        </button>
      </div>
    </div>
  ), { duration: 8000 });
}
