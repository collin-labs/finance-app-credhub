use rusqlite::{Connection, Result};

pub fn initialize(conn: &Connection) -> Result<()> {
    conn.execute_batch("

    -- ============================================
    -- SISTEMA
    -- ============================================

    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        login TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        perfil TEXT NOT NULL CHECK(perfil IN ('admin', 'gerente', 'agente')),
        permissoes TEXT,
        ver_todos_dados INTEGER NOT NULL DEFAULT 0,
        agente_id INTEGER,
        recovery_hash TEXT,
        senha_temporaria INTEGER NOT NULL DEFAULT 0,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL,
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        acao TEXT NOT NULL,
        entidade TEXT NOT NULL,
        entidade_id INTEGER,
        detalhes TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- ============================================
    -- CADASTROS BASE
    -- ============================================

    CREATE TABLE IF NOT EXISTS convenios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('inss', 'federal', 'estadual', 'municipal', 'clt', 'militar', 'outro')),
        estado TEXT,
        orgao TEXT,
        margem_maxima REAL,
        prazo_maximo INTEGER,
        taxa_teto REAL,
        regras TEXT,
        sistema_consulta TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        notas TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bancos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        codigo TEXT,
        contato TEXT,
        notas TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN (
            'consignado_novo', 'refinanciamento', 'portabilidade',
            'cartao_consignado', 'cartao_beneficio', 'fgts',
            'emprestimo_pessoal', 'seguro', 'outro'
        )),
        descricao TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bancos_convenios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        banco_id INTEGER NOT NULL,
        convenio_id INTEGER NOT NULL,
        produto_id INTEGER NOT NULL,
        taxa_minima REAL,
        taxa_maxima REAL,
        prazo_minimo INTEGER,
        prazo_maximo INTEGER,
        valor_minimo REAL,
        ativo INTEGER NOT NULL DEFAULT 1,
        notas TEXT,
        FOREIGN KEY (banco_id) REFERENCES bancos(id),
        FOREIGN KEY (convenio_id) REFERENCES convenios(id),
        FOREIGN KEY (produto_id) REFERENCES produtos(id),
        UNIQUE(banco_id, convenio_id, produto_id)
    );

    -- ============================================
    -- AGENTES
    -- ============================================

    CREATE TABLE IF NOT EXISTS agentes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT,
        telefone TEXT,
        whatsapp TEXT,
        email TEXT,
        tipo TEXT NOT NULL CHECK(tipo IN ('interno', 'externo', 'sub_correspondente')),
        banco_pagamento TEXT,
        agencia TEXT,
        conta TEXT,
        pix TEXT,
        usuario_id INTEGER,
        ativo INTEGER NOT NULL DEFAULT 1,
        observacoes TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- ============================================
    -- CLIENTES (CRM)
    -- ============================================

    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE,
        rg TEXT,
        data_nascimento TEXT,
        telefone1 TEXT,
        telefone2 TEXT,
        whatsapp TEXT,
        email TEXT,
        cep TEXT,
        endereco TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        cidade TEXT,
        estado TEXT,
        convenio_id INTEGER,
        matricula TEXT,
        orgao TEXT,
        tipo_beneficio TEXT,
        renda_bruta REAL,
        renda_liquida REAL,
        margem_total REAL,
        margem_disponivel REAL,
        margem_atualizada_em TEXT,
        banco_recebimento TEXT,
        agencia_receb TEXT,
        conta_receb TEXT,
        tipo_conta TEXT,
        pix TEXT,
        origem TEXT,
        agente_responsavel_id INTEGER,
        tags TEXT,
        observacoes TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (convenio_id) REFERENCES convenios(id),
        FOREIGN KEY (agente_responsavel_id) REFERENCES agentes(id)
    );

    CREATE TABLE IF NOT EXISTS cliente_interacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        usuario_id INTEGER,
        tipo TEXT NOT NULL CHECK(tipo IN ('ligacao', 'whatsapp', 'visita', 'email', 'atendimento', 'nota')),
        direcao TEXT CHECK(direcao IN ('entrada', 'saida')),
        resumo TEXT NOT NULL,
        resultado TEXT,
        agendado_para TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS cliente_documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        nome_arquivo TEXT NOT NULL,
        caminho TEXT NOT NULL,
        tamanho INTEGER,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    );

    -- ============================================
    -- PROPOSTAS (ESTEIRA DE CRÉDITO)
    -- ============================================

    CREATE TABLE IF NOT EXISTS propostas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        agente_id INTEGER,
        banco_id INTEGER NOT NULL,
        convenio_id INTEGER NOT NULL,
        produto_id INTEGER NOT NULL,
        numero_proposta TEXT,
        numero_contrato TEXT,
        valor_emprestimo REAL NOT NULL,
        valor_liquido REAL,
        valor_parcela REAL NOT NULL,
        quantidade_parcelas INTEGER NOT NULL,
        taxa_juros REAL NOT NULL,
        taxa_juros_anual REAL,
        cet_mensal REAL,
        cet_anual REAL,
        banco_origem_id INTEGER,
        saldo_devedor REAL,
        valor_troco REAL,
        contrato_original TEXT,
        status TEXT NOT NULL DEFAULT 'digitado' CHECK(status IN (
            'digitado', 'pendente', 'em_analise', 'aprovado',
            'aguardando_anuencia', 'averbado', 'pago',
            'rejeitado', 'cancelado', 'expirado'
        )),
        motivo_rejeicao TEXT,
        pendencias TEXT,
        data_digitacao TEXT NOT NULL DEFAULT (datetime('now')),
        data_aprovacao TEXT,
        data_averbacao TEXT,
        data_pagamento TEXT,
        data_vencimento_primeira TEXT,
        observacoes TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (agente_id) REFERENCES agentes(id),
        FOREIGN KEY (banco_id) REFERENCES bancos(id),
        FOREIGN KEY (convenio_id) REFERENCES convenios(id),
        FOREIGN KEY (produto_id) REFERENCES produtos(id),
        FOREIGN KEY (banco_origem_id) REFERENCES bancos(id)
    );

    CREATE TABLE IF NOT EXISTS proposta_historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposta_id INTEGER NOT NULL,
        status_anterior TEXT,
        status_novo TEXT NOT NULL,
        usuario_id INTEGER,
        observacao TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (proposta_id) REFERENCES propostas(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS proposta_documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposta_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        nome_arquivo TEXT NOT NULL,
        caminho TEXT NOT NULL,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (proposta_id) REFERENCES propostas(id)
    );

    -- ============================================
    -- COMISSÕES
    -- ============================================

    CREATE TABLE IF NOT EXISTS tabelas_comissao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        banco_id INTEGER NOT NULL,
        produto_id INTEGER NOT NULL,
        convenio_id INTEGER,
        comissao_empresa_percentual REAL,
        comissao_empresa_fixa REAL,
        comissao_agente_percentual REAL,
        comissao_agente_fixa REAL,
        vigencia_inicio TEXT,
        vigencia_fim TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        notas TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (banco_id) REFERENCES bancos(id),
        FOREIGN KEY (produto_id) REFERENCES produtos(id),
        FOREIGN KEY (convenio_id) REFERENCES convenios(id)
    );

    CREATE TABLE IF NOT EXISTS comissoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposta_id INTEGER NOT NULL,
        valor_comissao_empresa REAL NOT NULL,
        status_empresa TEXT NOT NULL DEFAULT 'a_receber' CHECK(status_empresa IN ('a_receber', 'recebido', 'contestado')),
        data_recebimento_empresa TEXT,
        agente_id INTEGER,
        valor_comissao_agente REAL,
        status_agente TEXT DEFAULT 'a_pagar' CHECK(status_agente IN ('a_pagar', 'pago', 'bloqueado')),
        data_pagamento_agente TEXT,
        observacoes TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (proposta_id) REFERENCES propostas(id),
        FOREIGN KEY (agente_id) REFERENCES agentes(id)
    );

    -- ============================================
    -- FINANCEIRO
    -- ============================================

    CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
        categoria TEXT NOT NULL,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        data_vencimento TEXT NOT NULL,
        data_pagamento TEXT,
        status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
        proposta_id INTEGER,
        comissao_id INTEGER,
        agente_id INTEGER,
        banco_id INTEGER,
        observacoes TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (proposta_id) REFERENCES propostas(id),
        FOREIGN KEY (comissao_id) REFERENCES comissoes(id),
        FOREIGN KEY (agente_id) REFERENCES agentes(id),
        FOREIGN KEY (banco_id) REFERENCES bancos(id)
    );

    -- ============================================
    -- PROSPECÇÃO / LEADS / CAMPANHAS
    -- ============================================

    CREATE TABLE IF NOT EXISTS campanhas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('mailing', 'refinanciamento', 'portabilidade', 'indicacao', 'outra')),
        data_inicio TEXT,
        data_fim TEXT,
        total_leads INTEGER DEFAULT 0,
        leads_contactados INTEGER DEFAULT 0,
        propostas_geradas INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ativa' CHECK(status IN ('planejada', 'ativa', 'pausada', 'encerrada')),
        observacoes TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT,
        telefone1 TEXT,
        telefone2 TEXT,
        whatsapp TEXT,
        campanha_id INTEGER,
        origem TEXT,
        convenio_nome TEXT,
        matricula TEXT,
        beneficio TEXT,
        renda_estimada REAL,
        margem_estimada REAL,
        agente_id INTEGER,
        status TEXT NOT NULL DEFAULT 'novo' CHECK(status IN (
            'novo', 'tentando_contato', 'contactado', 'interessado',
            'agendado', 'sem_interesse', 'telefone_errado',
            'convertido', 'descartado'
        )),
        tentativas_contato INTEGER DEFAULT 0,
        ultima_tentativa TEXT,
        proximo_contato TEXT,
        cliente_id INTEGER,
        observacoes TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (campanha_id) REFERENCES campanhas(id),
        FOREIGN KEY (agente_id) REFERENCES agentes(id),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    );

    CREATE TABLE IF NOT EXISTS lead_interacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL,
        usuario_id INTEGER,
        tipo TEXT NOT NULL CHECK(tipo IN ('ligacao', 'whatsapp', 'sms', 'nota')),
        resumo TEXT,
        resultado TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (lead_id) REFERENCES leads(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- ============================================
    -- FEEDBACK / SUPORTE
    -- ============================================

    CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL CHECK(tipo IN ('bug', 'sugestao', 'melhoria', 'nota')),
        titulo TEXT NOT NULL,
        descricao TEXT,
        prioridade TEXT NOT NULL DEFAULT 'normal' CHECK(prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
        status_envio TEXT NOT NULL DEFAULT 'pendente' CHECK(status_envio IN ('pendente', 'enviado', 'erro', 'parcial')),
        canais_enviados TEXT,
        erro_envio TEXT,
        usuario_id INTEGER,
        versao_app TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        enviado_em TEXT,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS feedback_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canal TEXT NOT NULL UNIQUE CHECK(canal IN ('email', 'telegram', 'discord', 'whatsapp')),
        ativo INTEGER NOT NULL DEFAULT 0,
        config TEXT NOT NULL DEFAULT '{}',
        testado_em TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================
    -- ÍNDICES
    -- ============================================

    CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
    CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
    CREATE INDEX IF NOT EXISTS idx_clientes_convenio ON clientes(convenio_id);
    CREATE INDEX IF NOT EXISTS idx_propostas_cliente ON propostas(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status);
    CREATE INDEX IF NOT EXISTS idx_propostas_banco ON propostas(banco_id);
    CREATE INDEX IF NOT EXISTS idx_propostas_agente ON propostas(agente_id);
    CREATE INDEX IF NOT EXISTS idx_propostas_data ON propostas(data_digitacao);
    CREATE INDEX IF NOT EXISTS idx_comissoes_proposta ON comissoes(proposta_id);
    CREATE INDEX IF NOT EXISTS idx_comissoes_agente ON comissoes(agente_id);
    CREATE INDEX IF NOT EXISTS idx_leads_campanha ON leads(campanha_id);
    CREATE INDEX IF NOT EXISTS idx_leads_agente ON leads(agente_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_financeiro_tipo ON financeiro_lancamentos(tipo);
    CREATE INDEX IF NOT EXISTS idx_financeiro_status ON financeiro_lancamentos(status);
    CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_log(entidade, entidade_id);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status_envio);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_tipo ON feedbacks(tipo);

    -- ============================================
    -- DADOS INICIAIS (produtos padrão)
    -- ============================================

    INSERT OR IGNORE INTO produtos (id, nome, tipo) VALUES
        (1, 'Consignado Novo', 'consignado_novo'),
        (2, 'Refinanciamento', 'refinanciamento'),
        (3, 'Portabilidade', 'portabilidade'),
        (4, 'Cartão Consignado', 'cartao_consignado'),
        (5, 'Cartão Benefício', 'cartao_beneficio'),
        (6, 'Antecipação FGTS', 'fgts'),
        (7, 'Empréstimo Pessoal', 'emprestimo_pessoal'),
        (8, 'Seguro Prestamista', 'seguro');

    ")?;

    // ============================================
    // MIGRAÇÕES — adiciona colunas em bancos existentes
    // (ignora erro se a coluna já existe)
    // ============================================
    let migracoes = [
        "ALTER TABLE usuarios ADD COLUMN permissoes TEXT",
        "ALTER TABLE usuarios ADD COLUMN ver_todos_dados INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE usuarios ADD COLUMN agente_id INTEGER",
        "ALTER TABLE usuarios ADD COLUMN recovery_hash TEXT",
        "ALTER TABLE usuarios ADD COLUMN senha_temporaria INTEGER NOT NULL DEFAULT 0",
        // Documentos de cliente guardados como base64 no banco
        "ALTER TABLE cliente_documentos ADD COLUMN conteudo TEXT",
    ];
    for m in migracoes.iter() {
        let _ = conn.execute(m, []);
    }

    Ok(())
}
