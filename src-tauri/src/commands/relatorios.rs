use tauri::State;
use crate::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct PeriodoFiltro {
    pub data_inicio: Option<String>,
    pub data_fim: Option<String>,
}

fn periodo_where(p: &PeriodoFiltro, campo: &str) -> String {
    let mut cond = String::new();
    if let Some(ref ini) = p.data_inicio {
        cond.push_str(&format!(" AND date({}) >= date('{}')", campo, ini.replace('\'', "''")));
    }
    if let Some(ref fim) = p.data_fim {
        cond.push_str(&format!(" AND date({}) <= date('{}')", campo, fim.replace('\'', "''")));
    }
    cond
}

// ============================================
// RELATÓRIO DE PRODUÇÃO
// ============================================

#[derive(Debug, Serialize)]
pub struct ProducaoResumo {
    pub total_propostas: i64,
    pub total_valor: f64,
    pub propostas_pagas: i64,
    pub valor_pago: f64,
    pub propostas_andamento: i64,
    pub valor_andamento: f64,
    pub ticket_medio: f64,
}

#[derive(Debug, Serialize)]
pub struct ItemAgrupado {
    pub label: String,
    pub quantidade: i64,
    pub valor: f64,
}

#[derive(Debug, Serialize)]
pub struct RelatorioProducao {
    pub resumo: ProducaoResumo,
    pub por_agente: Vec<ItemAgrupado>,
    pub por_banco: Vec<ItemAgrupado>,
    pub por_convenio: Vec<ItemAgrupado>,
    pub por_produto: Vec<ItemAgrupado>,
    pub por_mes: Vec<ItemAgrupado>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn relatorio_producao(state: State<'_, AppState>, periodo: PeriodoFiltro) -> Result<RelatorioProducao, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let w = periodo_where(&periodo, "data_digitacao");

    // Resumo geral
    let resumo = db.query_row(
        &format!("
            SELECT
                COUNT(*),
                COALESCE(SUM(valor_emprestimo), 0),
                COALESCE(SUM(CASE WHEN status='pago' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN status='pago' THEN valor_emprestimo ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN status IN ('digitado','pendente','em_analise','aprovado','aguardando_anuencia','averbado') THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN status IN ('digitado','pendente','em_analise','aprovado','aguardando_anuencia','averbado') THEN valor_emprestimo ELSE 0 END), 0)
            FROM propostas WHERE 1=1 {}
        ", w),
        [],
        |r| {
            let total: i64 = r.get(0)?;
            let valor: f64 = r.get(1)?;
            Ok(ProducaoResumo {
                total_propostas: total,
                total_valor: valor,
                propostas_pagas: r.get(2)?,
                valor_pago: r.get(3)?,
                propostas_andamento: r.get(4)?,
                valor_andamento: r.get(5)?,
                ticket_medio: if total > 0 { valor / total as f64 } else { 0.0 },
            })
        },
    ).map_err(|e| e.to_string())?;

    let agrupar = |join_sql: &str, label_col: &str| -> Vec<ItemAgrupado> {
        let sql = format!("
            SELECT COALESCE({}, 'Sem definição') as label, COUNT(*) as qtd, COALESCE(SUM(p.valor_emprestimo), 0) as valor
            FROM propostas p {}
            WHERE 1=1 {}
            GROUP BY label ORDER BY valor DESC LIMIT 20
        ", label_col, join_sql, w.replace("data_digitacao", "p.data_digitacao"));
        let mut stmt = match db.prepare(&sql) { Ok(s) => s, Err(_) => return vec![] };
        let rows = stmt.query_map([], |r| Ok(ItemAgrupado {
            label: r.get(0)?, quantidade: r.get(1)?, valor: r.get(2)?,
        }));
        match rows { Ok(it) => it.filter_map(|x| x.ok()).collect(), Err(_) => vec![] }
    };

    let por_agente = agrupar("LEFT JOIN agentes a ON p.agente_id = a.id", "a.nome");
    let por_banco = agrupar("LEFT JOIN bancos b ON p.banco_id = b.id", "b.nome");
    let por_convenio = agrupar("LEFT JOIN convenios c ON p.convenio_id = c.id", "c.nome");
    let por_produto = agrupar("LEFT JOIN produtos pr ON p.produto_id = pr.id", "pr.nome");

    // Por mês
    let por_mes = {
        let sql = format!("
            SELECT strftime('%Y-%m', data_digitacao) as mes, COUNT(*) as qtd, COALESCE(SUM(valor_emprestimo),0) as valor
            FROM propostas WHERE 1=1 {}
            GROUP BY mes ORDER BY mes DESC LIMIT 12
        ", w);
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(ItemAgrupado {
            label: r.get(0)?, quantidade: r.get(1)?, valor: r.get(2)?,
        })).map_err(|e| e.to_string())?;
        rows.filter_map(|x| x.ok()).collect::<Vec<_>>()
    };

    Ok(RelatorioProducao { resumo, por_agente, por_banco, por_convenio, por_produto, por_mes })
}

// ============================================
// RELATÓRIO FINANCEIRO
// ============================================

#[derive(Debug, Serialize)]
pub struct RelatorioFinanceiro {
    pub total_receitas: f64,
    pub receitas_recebidas: f64,
    pub receitas_a_receber: f64,
    pub total_despesas: f64,
    pub despesas_pagas: f64,
    pub despesas_a_pagar: f64,
    pub saldo: f64,
    pub comissoes_empresa: f64,
    pub comissoes_agentes: f64,
    pub por_mes: Vec<FinanceiroMes>,
}

#[derive(Debug, Serialize)]
pub struct FinanceiroMes {
    pub mes: String,
    pub receitas: f64,
    pub despesas: f64,
}

#[tauri::command(rename_all = "snake_case")]
pub fn relatorio_financeiro(state: State<'_, AppState>, periodo: PeriodoFiltro) -> Result<RelatorioFinanceiro, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let w = periodo_where(&periodo, "data_vencimento");

    let val = |sql: &str| -> f64 { db.query_row(sql, [], |r| r.get(0)).unwrap_or(0.0) };

    let total_receitas = val(&format!("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='receita' {}", w));
    let receitas_recebidas = val(&format!("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='receita' AND status='pago' {}", w));
    let total_despesas = val(&format!("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='despesa' {}", w));
    let despesas_pagas = val(&format!("SELECT COALESCE(SUM(valor),0) FROM financeiro_lancamentos WHERE tipo='despesa' AND status='pago' {}", w));

    let wc = periodo_where(&periodo, "criado_em");
    let comissoes_empresa = val(&format!("SELECT COALESCE(SUM(valor_comissao_empresa),0) FROM comissoes WHERE 1=1 {}", wc));
    let comissoes_agentes = val(&format!("SELECT COALESCE(SUM(valor_comissao_agente),0) FROM comissoes WHERE 1=1 {}", wc));

    // Por mês (receitas vs despesas)
    let por_mes = {
        let sql = format!("
            SELECT strftime('%Y-%m', data_vencimento) as mes,
                   COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END),0) as rec,
                   COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END),0) as desp
            FROM financeiro_lancamentos WHERE 1=1 {}
            GROUP BY mes ORDER BY mes DESC LIMIT 12
        ", w);
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(FinanceiroMes {
            mes: r.get(0)?, receitas: r.get(1)?, despesas: r.get(2)?,
        })).map_err(|e| e.to_string())?;
        rows.filter_map(|x| x.ok()).collect::<Vec<_>>()
    };

    Ok(RelatorioFinanceiro {
        total_receitas,
        receitas_recebidas,
        receitas_a_receber: total_receitas - receitas_recebidas,
        total_despesas,
        despesas_pagas,
        despesas_a_pagar: total_despesas - despesas_pagas,
        saldo: receitas_recebidas - despesas_pagas,
        comissoes_empresa,
        comissoes_agentes,
        por_mes,
    })
}

// ============================================
// RELATÓRIO COMERCIAL (FUNIL)
// ============================================

#[derive(Debug, Serialize)]
pub struct RelatorioComercial {
    pub funil_propostas: Vec<ItemAgrupado>,
    pub funil_leads: Vec<ItemAgrupado>,
    pub total_leads: i64,
    pub leads_convertidos: i64,
    pub taxa_conversao_leads: f64,
    pub total_propostas: i64,
    pub propostas_pagas: i64,
    pub taxa_conversao_propostas: f64,
}

#[tauri::command(rename_all = "snake_case")]
pub fn relatorio_comercial(state: State<'_, AppState>, periodo: PeriodoFiltro) -> Result<RelatorioComercial, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let w = periodo_where(&periodo, "data_digitacao");
    let wl = periodo_where(&periodo, "criado_em");

    // Funil de propostas por status
    let funil_propostas = {
        let sql = format!("
            SELECT status, COUNT(*), COALESCE(SUM(valor_emprestimo),0)
            FROM propostas WHERE 1=1 {} GROUP BY status
        ", w);
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(ItemAgrupado {
            label: r.get(0)?, quantidade: r.get(1)?, valor: r.get(2)?,
        })).map_err(|e| e.to_string())?;
        rows.filter_map(|x| x.ok()).collect::<Vec<_>>()
    };

    // Funil de leads por status
    let funil_leads = {
        let sql = format!("
            SELECT status, COUNT(*), 0
            FROM leads WHERE 1=1 {} GROUP BY status
        ", wl);
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(ItemAgrupado {
            label: r.get(0)?, quantidade: r.get(1)?, valor: r.get(2)?,
        })).map_err(|e| e.to_string())?;
        rows.filter_map(|x| x.ok()).collect::<Vec<_>>()
    };

    let cnt = |sql: &str| -> i64 { db.query_row(sql, [], |r| r.get(0)).unwrap_or(0) };
    let total_leads = cnt(&format!("SELECT COUNT(*) FROM leads WHERE 1=1 {}", wl));
    let leads_convertidos = cnt(&format!("SELECT COUNT(*) FROM leads WHERE status='convertido' {}", wl));
    let total_propostas = cnt(&format!("SELECT COUNT(*) FROM propostas WHERE 1=1 {}", w));
    let propostas_pagas = cnt(&format!("SELECT COUNT(*) FROM propostas WHERE status='pago' {}", w));

    Ok(RelatorioComercial {
        funil_propostas,
        funil_leads,
        total_leads,
        leads_convertidos,
        taxa_conversao_leads: if total_leads > 0 { (leads_convertidos as f64 / total_leads as f64) * 100.0 } else { 0.0 },
        total_propostas,
        propostas_pagas,
        taxa_conversao_propostas: if total_propostas > 0 { (propostas_pagas as f64 / total_propostas as f64) * 100.0 } else { 0.0 },
    })
}
