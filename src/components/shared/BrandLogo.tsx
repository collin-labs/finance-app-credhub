import { useEmpresa } from '../../contexts/EmpresaContext';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const SIZES = {
  sm: { box: 'w-8 h-8', text: 'text-sm', name: 'text-base' },
  md: { box: 'w-11 h-11', text: 'text-lg', name: 'text-lg' },
  lg: { box: 'w-14 h-14', text: 'text-xl', name: 'text-2xl' },
};

export function BrandLogo({ size = 'sm', showName = true }: Props) {
  const { empresa, nomeExibicao } = useEmpresa();
  const s = SIZES[size];
  const cor = empresa.cor_primaria || '#2563eb';
  const inicial = nomeExibicao.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      {empresa.logo ? (
        <div className={`${s.box} rounded-lg overflow-hidden flex items-center justify-center shrink-0`}>
          <img src={empresa.logo} alt={nomeExibicao} className="w-full h-full object-contain" />
        </div>
      ) : (
        <div className={`${s.box} rounded-lg flex items-center justify-center shrink-0`} style={{ backgroundColor: cor }}>
          <span className={`text-white font-bold ${s.text}`}>{inicial}</span>
        </div>
      )}
      {showName && <span className={`font-bold text-surface-900 tracking-tight ${s.name}`}>{nomeExibicao}</span>}
    </div>
  );
}
