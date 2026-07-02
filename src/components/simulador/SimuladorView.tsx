import { useState, useMemo } from 'react';
import {
  simularEmprestimo, simularPortabilidade, calcularValorPresente,
  calcularMargem, gerarTabelaAmortizacao, TETOS_TAXA_2026, MARGEM_PADRAO,
} from '../../lib/calculos';
import { Tooltip } from '../shared/Tooltip';
import { Modal } from '../shared/Modal';
import { formatMoney, formatPercent } from '../../lib/formatters';
import {
  Calculator, TrendingDown, ArrowRightLeft, Info,
  Wallet, Calendar, DollarSign
} from 'lucide-react';

type Modo = 'novo' | 'portabilidade' | 'margem';

export function SimuladorView() {
  const [modo, setModo] = useState<Modo>('novo');

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-5">
        <Calculator className="w-5 h-5 text-brand-600" />
        <div>
          <h2 className="text-lg font-bold text-surface-900">Simulador de Crédito</h2>
          <p className="text-xs text-surface-400">Simule operações e apresente ao cliente</p>
        </div>
      </div>

      {/* Tabs de modo */}
      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-1 w-fit">
        <ModoTab atual={modo} id="novo" label="Consignado Novo" icon={DollarSign} onClick={setModo} />
        <ModoTab atual={modo} id="portabilidade" label="Portabilidade" icon={ArrowRightLeft} onClick={setModo} />
        <ModoTab atual={modo} id="margem" label="Margem → Valor" icon={Wallet} onClick={setModo} />
      </div>

      {modo === 'novo' && <SimuladorNovo />}
      {modo === 'portabilidade' && <SimuladorPortabilidade />}
      {modo === 'margem' && <SimuladorMargem />}
    </div>
  );
}

function ModoTab({ atual, id, label, icon: Icon, onClick }: { atual: string; id: Modo; label: string; icon: React.ElementType; onClick: (m: Modo) => void }) {
  return (
    <button onClick={() => onClick(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${atual === id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ============================================
// SIMULADOR: CONSIGNADO NOVO
// ============================================
function SimuladorNovo() {
  const [valor, setValor] = useState('10000');
  const [parcelas, setParcelas] = useState('84');
  const [taxa, setTaxa] = useState('1.80');
  const [tac, setTac] = useState('0');
  const [seguro, setSeguro] = useState('0');
  const [incluirIOF, setIncluirIOF] = useState(true);
  const [tabelaOpen, setTabelaOpen] = useState(false);

  const resultado = useMemo(() => {
    const v = parseFloat(valor) || 0;
    const n = parseInt(parcelas) || 1;
    const t = (parseFloat(taxa) || 0) / 100;
    if (v <= 0 || n <= 0) return null;
    return simularEmprestimo({
      valorEmprestimo: v, taxaMensal: t, numParcelas: n,
      tac: parseFloat(tac) || 0, seguro: parseFloat(seguro) || 0, incluirIOF,
    });
  }, [valor, parcelas, taxa, tac, seguro, incluirIOF]);

  const tabela = useMemo(() => {
    if (!resultado) return [];
    return gerarTabelaAmortizacao(resultado.valorEmprestimo, resultado.taxaMensal, resultado.numParcelas);
  }, [resultado]);

  function aplicarTeto(tipo: string) {
    const teto = TETOS_TAXA_2026[tipo];
    if (teto) setTaxa((teto.taxa * 100).toFixed(2));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Inputs */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-surface-700 mb-4">Dados da Operação</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Valor do Empréstimo (R$)</label>
            <input type="number" value={valor} onChange={e => setValor(e.target.value)} className="input-field text-lg font-semibold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Parcelas</label>
              <input type="number" value={parcelas} onChange={e => setParcelas(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-surface-600 mb-1">
                Taxa (% a.m.)
                <Tooltip content="Taxa de juros mensal. Use os botões abaixo para os tetos de 2026.">
                  <Info className="w-3 h-3 text-surface-400" />
                </Tooltip>
              </label>
              <input type="number" step="0.01" value={taxa} onChange={e => setTaxa(e.target.value)} className="input-field" />
            </div>
          </div>

          {/* Tetos rápidos */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-2xs text-surface-400 self-center">Tetos 2026:</span>
            {Object.entries(TETOS_TAXA_2026).map(([key, t]) => (
              <Tooltip key={key} content={t.label}>
                <button onClick={() => aplicarTeto(key)} className="text-2xs px-2 py-1 rounded-md bg-surface-100 hover:bg-brand-50 hover:text-brand-700 text-surface-500 transition-colors uppercase font-medium">
                  {key}
                </button>
              </Tooltip>
            ))}
          </div>

          <div className="h-px bg-surface-100 my-1" />

          {/* Custos opcionais */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">TAC (R$)</label>
              <input type="number" value={tac} onChange={e => setTac(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Seguro (R$)</label>
              <input type="number" value={seguro} onChange={e => setSeguro(e.target.value)} className="input-field" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={incluirIOF} onChange={e => setIncluirIOF(e.target.checked)} />
            <span className="text-xs text-surface-600">Incluir IOF no cálculo do valor líquido</span>
          </label>
        </div>
      </div>

      {/* Resultado */}
      <div className="card p-5 bg-gradient-to-br from-brand-50/50 to-white">
        {resultado ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-700">Resultado</h3>
              <button onClick={() => setTabelaOpen(true)} className="text-2xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Ver tabela de parcelas
              </button>
            </div>

            <div className="mb-4 p-4 rounded-xl bg-white border border-brand-100">
              <p className="text-xs text-surface-500">Parcela mensal</p>
              <p className="text-3xl font-bold text-brand-700">{formatMoney(resultado.valorParcela)}</p>
              <p className="text-xs text-surface-400 mt-0.5">{resultado.numParcelas}x</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ResultItem label="Valor liberado" value={formatMoney(resultado.valorLiberado)} hint="O que o cliente recebe" />
              <ResultItem label="Total a pagar" value={formatMoney(resultado.totalPago)} />
              <ResultItem label="Total de juros" value={formatMoney(resultado.totalJuros)} negative />
              <ResultItem label="IOF" value={formatMoney(resultado.iof)} negative />
              <ResultItem label="Taxa anual" value={formatPercent(resultado.taxaAnual * 100)} />
              <ResultItem
                label="CET mensal"
                value={resultado.cetMensal !== null ? formatPercent(resultado.cetMensal * 100) : '—'}
                hint="Custo Efetivo Total"
              />
            </div>

            {resultado.cetAnual !== null && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-2xs text-amber-700">
                  <strong>CET anual: {formatPercent(resultado.cetAnual * 100)}</strong> — é o custo real da operação, incluindo juros, IOF e tarifas.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-surface-400">Preencha os dados</div>
        )}
      </div>

      {/* Modal tabela de amortização */}
      <Modal open={tabelaOpen} onClose={() => setTabelaOpen(false)} title="Tabela de Amortização (Price)" width="lg">
        <div className="overflow-y-auto max-h-[50vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-surface-100">
                <th className="text-left px-2 py-2 text-surface-500">#</th>
                <th className="text-right px-2 py-2 text-surface-500">Parcela</th>
                <th className="text-right px-2 py-2 text-surface-500">Juros</th>
                <th className="text-right px-2 py-2 text-surface-500">Amortização</th>
                <th className="text-right px-2 py-2 text-surface-500">Saldo Devedor</th>
              </tr>
            </thead>
            <tbody>
              {tabela.map(linha => (
                <tr key={linha.parcela} className="border-b border-surface-50">
                  <td className="px-2 py-1.5 text-surface-600">{linha.parcela}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{formatMoney(linha.valorParcela)}</td>
                  <td className="px-2 py-1.5 text-right text-red-500">{formatMoney(linha.juros)}</td>
                  <td className="px-2 py-1.5 text-right text-green-600">{formatMoney(linha.amortizacao)}</td>
                  <td className="px-2 py-1.5 text-right text-surface-600">{formatMoney(linha.saldoDevedor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}

// ============================================
// SIMULADOR: PORTABILIDADE
// ============================================
function SimuladorPortabilidade() {
  const [saldo, setSaldo] = useState('15000');
  const [parcelaAtual, setParcelaAtual] = useState('450');
  const [parcelasRest, setParcelasRest] = useState('60');
  const [novaTaxa, setNovaTaxa] = useState('1.65');
  const [novoPrazo, setNovoPrazo] = useState('84');

  const resultado = useMemo(() => {
    const s = parseFloat(saldo) || 0;
    const pa = parseFloat(parcelaAtual) || 0;
    const pr = parseInt(parcelasRest) || 0;
    const nt = (parseFloat(novaTaxa) || 0) / 100;
    const np = parseInt(novoPrazo) || 1;
    if (s <= 0 || pa <= 0) return null;
    return simularPortabilidade({
      saldoDevedor: s, parcelaAtual: pa, parcelasRestantes: pr,
      novaTaxaMensal: nt, novoPrazo: np,
    });
  }, [saldo, parcelaAtual, parcelasRest, novaTaxa, novoPrazo]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-surface-700 mb-4">Contrato Atual (outro banco)</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Saldo Devedor (R$)</label>
            <input type="number" value={saldo} onChange={e => setSaldo(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Parcela Atual (R$)</label>
              <input type="number" value={parcelaAtual} onChange={e => setParcelaAtual(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Parcelas Restantes</label>
              <input type="number" value={parcelasRest} onChange={e => setParcelasRest(e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="h-px bg-surface-100 my-1" />
          <h4 className="text-xs font-semibold text-surface-700">Nova Proposta (seu banco)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Nova Taxa (% a.m.)</label>
              <input type="number" step="0.01" value={novaTaxa} onChange={e => setNovaTaxa(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Novo Prazo</label>
              <input type="number" value={novoPrazo} onChange={e => setNovoPrazo(e.target.value)} className="input-field" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 bg-gradient-to-br from-green-50/50 to-white">
        {resultado ? (
          <>
            <h3 className="text-sm font-semibold text-surface-700 mb-4">Resultado da Portabilidade</h3>

            {resultado.valorTroco > 0 && (
              <div className="mb-4 p-4 rounded-xl bg-white border border-green-200">
                <p className="text-xs text-surface-500 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-green-600" /> Troco para o cliente
                </p>
                <p className="text-3xl font-bold text-green-600">{formatMoney(resultado.valorTroco)}</p>
                <p className="text-xs text-surface-400 mt-0.5">dinheiro extra no bolso</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <ResultItem label="Nova parcela" value={formatMoney(resultado.novaParcela)} />
              <ResultItem label="Parcela atual" value={formatMoney(resultado.parcelaAtual)} />
              <ResultItem
                label="Economia/mês"
                value={formatMoney(Math.abs(resultado.economiaParcela))}
                positive={resultado.economiaParcela > 0}
                negative={resultado.economiaParcela < 0}
              />
              <ResultItem label="Novo contrato" value={formatMoney(resultado.novoValorContrato)} />
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-2xs text-blue-700">
                {resultado.economiaParcela > 0
                  ? `O cliente economiza ${formatMoney(resultado.economiaParcela)} por mês na parcela.`
                  : 'A nova parcela mantém o valor, mas libera troco com taxa menor.'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-surface-400">Preencha os dados</div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SIMULADOR: MARGEM → VALOR
// ============================================
function SimuladorMargem() {
  const [renda, setRenda] = useState('3000');
  const [tipoMargem, setTipoMargem] = useState('inss');
  const [parcelasExistentes, setParcelasExistentes] = useState('0');
  const [taxa, setTaxa] = useState('1.80');
  const [prazo, setPrazo] = useState('84');

  const resultado = useMemo(() => {
    const r = parseFloat(renda) || 0;
    const pct = MARGEM_PADRAO[tipoMargem] || 0.35;
    const pe = parseFloat(parcelasExistentes) || 0;
    const t = (parseFloat(taxa) || 0) / 100;
    const n = parseInt(prazo) || 1;
    if (r <= 0) return null;

    const margem = calcularMargem(r, pct, pe);
    const valorMaximo = calcularValorPresente(margem.margemDisponivel, t, n);

    return { margem, valorMaximo, pct };
  }, [renda, tipoMargem, parcelasExistentes, taxa, prazo]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-surface-700 mb-4">Dados do Cliente</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Renda Líquida (R$)</label>
            <input type="number" value={renda} onChange={e => setRenda(e.target.value)} className="input-field text-lg font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Tipo de Margem</label>
            <select value={tipoMargem} onChange={e => setTipoMargem(e.target.value)} className="input-field">
              <option value="inss">INSS (35%)</option>
              <option value="servidor">Servidor (35%)</option>
              <option value="clt">CLT (35%)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Parcelas já comprometidas (R$)</label>
            <input type="number" value={parcelasExistentes} onChange={e => setParcelasExistentes(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Taxa (% a.m.)</label>
              <input type="number" step="0.01" value={taxa} onChange={e => setTaxa(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Prazo</label>
              <input type="number" value={prazo} onChange={e => setPrazo(e.target.value)} className="input-field" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 bg-gradient-to-br from-purple-50/50 to-white">
        {resultado ? (
          <>
            <h3 className="text-sm font-semibold text-surface-700 mb-4">Capacidade de Crédito</h3>

            <div className="mb-4 p-4 rounded-xl bg-white border border-purple-200">
              <p className="text-xs text-surface-500">Valor máximo do empréstimo</p>
              <p className="text-3xl font-bold text-purple-600">{formatMoney(resultado.valorMaximo)}</p>
              <p className="text-xs text-surface-400 mt-0.5">com a margem disponível</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ResultItem label="Margem total" value={formatMoney(resultado.margem.margemTotal)} hint={`${(resultado.pct*100).toFixed(0)}% da renda`} />
              <ResultItem label="Margem disponível" value={formatMoney(resultado.margem.margemDisponivel)} positive />
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-surface-50 border border-surface-100">
              <p className="text-2xs text-surface-500">
                A parcela máxima que cabe na margem é <strong>{formatMoney(resultado.margem.margemDisponivel)}</strong>.
                Com a taxa e prazo informados, isso equivale a um empréstimo de até <strong>{formatMoney(resultado.valorMaximo)}</strong>.
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-surface-400">Preencha os dados</div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE AUXILIAR
// ============================================
function ResultItem({ label, value, hint, positive, negative }: {
  label: string; value: string; hint?: string; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-white border border-surface-100">
      <p className="text-2xs text-surface-400">{label}</p>
      <p className={`text-sm font-bold ${positive ? 'text-green-600' : negative ? 'text-red-500' : 'text-surface-900'}`}>{value}</p>
      {hint && <p className="text-2xs text-surface-400 mt-0.5">{hint}</p>}
    </div>
  );
}
