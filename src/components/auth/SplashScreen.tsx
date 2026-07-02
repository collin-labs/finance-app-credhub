import { useEmpresa } from '../../contexts/EmpresaContext';

export function SplashScreen() {
  const { empresa, nomeExibicao } = useEmpresa();

  const temLogo = Boolean(empresa.logo);
  const corPrimaria = empresa.cor_primaria;
  const slogan = empresa.slogan?.trim() || 'Gestão de Crédito Consignado';
  const inicial = (nomeExibicao || 'C').charAt(0).toUpperCase();

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-950">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {temLogo ? (
          <img
            src={empresa.logo}
            alt={nomeExibicao}
            className="w-20 h-20 rounded-2xl object-contain bg-white/5 p-1.5"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center"
            style={corPrimaria ? { backgroundColor: corPrimaria } : undefined}
          >
            <span className="text-white text-2xl font-bold">{inicial}</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-white tracking-tight">{nomeExibicao}</h1>
        <p className="text-surface-400 text-sm">{slogan}</p>
        <div className="mt-4 w-32 h-1 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full animate-pulse"
            style={corPrimaria ? { backgroundColor: corPrimaria, width: '60%' } : { width: '60%' }}
          />
        </div>
      </div>
    </div>
  );
}
