import { useState, useEffect, useRef } from 'react';
import { obterIdentidadeEmpresa, salvarIdentidadeEmpresa } from '../../lib/api';
import { useEmpresa, EmpresaIdentidade } from '../../contexts/EmpresaContext';
import { Usuario } from '../../lib/types';
import { EmptyState } from '../shared/EmptyState';
import toast from 'react-hot-toast';
import {
  Shield, Building, Upload, Trash2, Image as ImageIcon, Palette,
  Instagram, Facebook, Linkedin, Youtube, Globe, Phone, Save
} from 'lucide-react';

interface Props {
  currentUser: Usuario;
}

const CORES_SUGERIDAS = ['#2563eb', '#0891b2', '#16a34a', '#9333ea', '#dc2626', '#ea580c', '#ca8a04', '#0f172a'];

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function EmpresaConfig({ currentUser }: Props) {
  const { recarregar } = useEmpresa();
  const [form, setForm] = useState<EmpresaIdentidade>({});
  const [loading, setLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoHorizontalInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser.perfil === 'admin';

  useEffect(() => {
    if (isAdmin) {
      obterIdentidadeEmpresa().then(d => setForm((d as EmpresaIdentidade) || {})).catch(() => {});
    }
  }, [isAdmin]);

  function set(fields: Partial<EmpresaIdentidade>) { setForm(prev => ({ ...prev, ...fields })); }

  function handleImageUpload(file: File, campo: 'logo' | 'logo_horizontal' | 'favicon') {
    if (file.size > 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set({ [campo]: reader.result as string });
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setLoading(true);
    try {
      await salvarIdentidadeEmpresa(form);
      await recarregar();
      toast.success('Identidade da empresa salva!');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return <EmptyState icon={Shield} title="Acesso restrito" description="Apenas administradores podem editar a identidade da empresa." />;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-surface-900">Identidade da Empresa</h3>
        <p className="text-xs text-surface-400 mt-0.5">Personalize nome, logo, cores e dados. Eles aparecem em todo o sistema e nos relatórios.</p>
      </div>

      {/* Modo de exibição */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-surface-700">O que mostrar no topo do app</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => set({ modo_exibicao: 'icone' })}
            className={`p-4 rounded-xl border-2 transition-all text-left ${(form.modo_exibicao || 'icone') === 'icone' ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:bg-surface-50'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.cor_primaria || '#2563eb' }}>
                <span className="text-white text-sm font-bold">{(form.nome || 'C').charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-xs font-semibold text-surface-700">Ícone + Nome</span>
            </div>
            <p className="text-2xs text-surface-400">Ícone quadrado pequeno com o nome ao lado. Ideal se você não tem um logo retangular.</p>
          </button>

          <button
            onClick={() => set({ modo_exibicao: 'logo' })}
            className={`p-4 rounded-xl border-2 transition-all text-left ${form.modo_exibicao === 'logo' ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:bg-surface-50'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 px-2 rounded bg-surface-200 flex items-center justify-center">
                <span className="text-2xs font-bold text-surface-500">LOGO</span>
              </div>
              <span className="text-xs font-semibold text-surface-700">Logo Retangular</span>
            </div>
            <p className="text-2xs text-surface-400">Seu logo no formato paisagem (horizontal). Ideal se você tem uma marca pronta.</p>
          </button>
        </div>
      </div>

      {/* Logo e Favicon */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-surface-700">Imagens</span>
        </div>

        {/* Logo horizontal (só aparece se modo = logo) */}
        {form.modo_exibicao === 'logo' && (
          <div className="mb-5 pb-5 border-b border-surface-100">
            <label className="block text-xs font-medium text-surface-600 mb-2">Logo Retangular (paisagem)</label>
            <div className="flex items-center gap-3">
              <div className="h-14 w-44 rounded-xl border-2 border-dashed border-surface-200 flex items-center justify-center overflow-hidden bg-surface-50 shrink-0 px-2">
                {form.logo_horizontal ? <img src={form.logo_horizontal} alt="logo" className="max-h-full max-w-full object-contain" /> : <span className="text-2xs text-surface-300">Prévia do logo</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => logoHorizontalInputRef.current?.click()} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Upload className="w-3 h-3" /> Enviar
                </button>
                {form.logo_horizontal && (
                  <button onClick={() => set({ logo_horizontal: undefined })} className="text-2xs text-red-500 hover:text-red-600 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                )}
              </div>
              <input ref={logoHorizontalInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo_horizontal')} />
            </div>
            <p className="text-2xs text-surface-400 mt-2">Formato horizontal (ex: 200×56px). Fundo transparente. A altura é ajustada automaticamente; largura máxima de 200px na barra.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          {/* Ícone (logo quadrado) */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-2">Ícone (quadrado)</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-200 flex items-center justify-center overflow-hidden bg-surface-50 shrink-0">
                {form.logo ? <img src={form.logo} alt="logo" className="w-full h-full object-contain" /> : <Building className="w-6 h-6 text-surface-300" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => logoInputRef.current?.click()} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Upload className="w-3 h-3" /> Enviar
                </button>
                {form.logo && (
                  <button onClick={() => set({ logo: undefined })} className="text-2xs text-red-500 hover:text-red-600 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} />
            </div>
            <p className="text-2xs text-surface-400 mt-2">Imagem quadrada. Usada no modo "Ícone + Nome".</p>
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-2">Ícone do app (favicon)</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-200 flex items-center justify-center overflow-hidden bg-surface-50 shrink-0">
                {form.favicon ? <img src={form.favicon} alt="favicon" className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-surface-300" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => faviconInputRef.current?.click()} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Upload className="w-3 h-3" /> Enviar
                </button>
                {form.favicon && (
                  <button onClick={() => set({ favicon: undefined })} className="text-2xs text-red-500 hover:text-red-600 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                )}
              </div>
              <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'favicon')} />
            </div>
            <p className="text-2xs text-surface-400 mt-2">Imagem quadrada pequena. Máx 1 MB.</p>
          </div>
        </div>
      </div>

      {/* Cores */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-surface-700">Cor da Marca</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {CORES_SUGERIDAS.map(cor => (
            <button
              key={cor}
              onClick={() => set({ cor_primaria: cor })}
              className={`w-9 h-9 rounded-lg transition-all ${form.cor_primaria === cor ? 'ring-2 ring-offset-2 ring-surface-400 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: cor }}
            />
          ))}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="color"
              value={form.cor_primaria || '#2563eb'}
              onChange={e => set({ cor_primaria: e.target.value })}
              className="w-9 h-9 rounded-lg border border-surface-200 cursor-pointer"
            />
            <span className="text-xs text-surface-500 font-mono">{form.cor_primaria || '#2563eb'}</span>
          </div>
        </div>
      </div>

      {/* Dados básicos */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-surface-700">Dados da Empresa</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Nome da Empresa</label>
              <input value={form.nome || ''} onChange={e => set({ nome: e.target.value })} className="input-field" placeholder="Ex: Finance Consignados" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">CNPJ</label>
              <input value={form.cnpj || ''} onChange={e => set({ cnpj: e.target.value })} className="input-field" placeholder="00.000.000/0001-00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Slogan</label>
            <input value={form.slogan || ''} onChange={e => set({ slogan: e.target.value })} className="input-field" placeholder="Ex: Seu crédito com confiança" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Sobre a empresa</label>
            <textarea value={form.sobre || ''} onChange={e => set({ sobre: e.target.value })} className="input-field h-20 resize-none" placeholder="Breve descrição da empresa (aparece em relatórios)" />
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-surface-700">Contato</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Telefone</label>
              <input value={form.telefone || ''} onChange={e => set({ telefone: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">WhatsApp</label>
              <input value={form.whatsapp || ''} onChange={e => set({ whatsapp: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">E-mail</label>
              <input value={form.email || ''} onChange={e => set({ email: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Site</label>
            <input value={form.site || ''} onChange={e => set({ site: e.target.value })} className="input-field" placeholder="https://" />
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-surface-600 mb-1">Endereço</label>
              <input value={form.endereco || ''} onChange={e => set({ endereco: e.target.value })} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">Cidade</label>
              <input value={form.cidade || ''} onChange={e => set({ cidade: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">UF</label>
              <select value={form.estado || ''} onChange={e => set({ estado: e.target.value })} className="input-field">
                <option value="">--</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Redes sociais */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-surface-700">Redes Sociais</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SocialInput icon={Instagram} label="Instagram" value={form.instagram} onChange={v => set({ instagram: v })} placeholder="@usuario" />
          <SocialInput icon={Facebook} label="Facebook" value={form.facebook} onChange={v => set({ facebook: v })} placeholder="facebook.com/..." />
          <SocialInput icon={Linkedin} label="LinkedIn" value={form.linkedin} onChange={v => set({ linkedin: v })} placeholder="linkedin.com/..." />
          <SocialInput icon={Youtube} label="YouTube" value={form.youtube} onChange={v => set({ youtube: v })} placeholder="youtube.com/..." />
        </div>
      </div>

      {/* Salvar */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {loading ? 'Salvando...' : 'Salvar Identidade'}
        </button>
      </div>
    </div>
  );
}

function SocialInput({ icon: Icon, label, value, onChange, placeholder }: {
  icon: React.ElementType; label: string; value?: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-600 mb-1 flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} className="input-field" placeholder={placeholder} />
    </div>
  );
}
