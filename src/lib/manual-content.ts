// ============================================
// MANUAL DO CREDHUB — conteúdo estruturado e pesquisável
// Cada seção tem id, título, categoria, palavras-chave e conteúdo markdown.
// Sempre que um módulo novo é criado, adicionar a seção aqui.
// ============================================

export interface ManualSection {
  id: string;
  titulo: string;
  categoria: string;
  keywords: string[];
  conteudo: string;
}

export const MANUAL_VERSAO = '1.0';
export const MANUAL_ATUALIZADO = '28/06/2026';

export const MANUAL: ManualSection[] = [
  // ──────────────────────────────────────────
  // VISÃO GERAL
  // ──────────────────────────────────────────
  {
    id: 'visao-geral',
    titulo: 'O que é o CredHub',
    categoria: 'Introdução',
    keywords: ['sobre', 'sistema', 'visão geral', 'o que é', 'introdução', 'objetivo'],
    conteudo: `
# O que é o CredHub

O **CredHub** é um sistema de gestão para empresas de **crédito consignado e financiamentos** que atuam como correspondentes bancários (CORBAN) ou promotoras de crédito.

## Para que serve

A empresa que usa o CredHub é uma intermediária: ela conecta o cliente (aposentado, servidor público, trabalhador CLT) ao banco e ganha **comissão** sobre cada contrato fechado. O CredHub organiza todo esse fluxo de trabalho:

- **Cadastrar e gerenciar clientes** com seus dados de consignação e margem
- **Acompanhar propostas** desde a digitação até o pagamento (a "esteira")
- **Calcular comissões** automaticamente quando um contrato é pago
- **Controlar o financeiro** — o que a empresa tem a receber dos bancos e a pagar aos agentes
- **Prospectar novos clientes** ("caça") com campanhas e listas
- **Simular operações** de crédito para apresentar ao cliente

## Quem usa

O sistema foi pensado para equipes pequenas (1 a 5 pessoas). Cada pessoa tem um login com permissões específicas — o administrador controla exatamente o que cada funcionário pode ver e fazer.

## Tecnologia

O CredHub é um **aplicativo de desktop** que funciona offline, sem depender de internet. Todos os dados ficam guardados na própria máquina, com segurança.
`,
  },

  // ──────────────────────────────────────────
  // BANCO DE DADOS
  // ──────────────────────────────────────────
  {
    id: 'banco-de-dados',
    titulo: 'Como funciona o banco de dados',
    categoria: 'Sistema',
    keywords: ['banco de dados', 'sqlite', 'dados', 'armazenamento', 'backup', 'onde ficam os dados', 'arquivo'],
    conteudo: `
# Como funciona o banco de dados

## Você não precisou instalar nada

O CredHub usa um banco de dados chamado **SQLite**. Diferente de outros bancos (como MySQL ou PostgreSQL), o SQLite **não é um programa separado que precisa ser instalado** — ele já vem embutido dentro do próprio aplicativo.

Por isso você não instalou "um SQL": ele faz parte do CredHub.

## Onde os dados ficam

Todos os dados (clientes, propostas, comissões, usuários) ficam guardados em **um único arquivo** no seu computador:

- **Windows:** \`%APPDATA%/com.credhub.app/credhub.db\`
- **macOS:** \`~/Library/Application Support/com.credhub.app/credhub.db\`
- **Linux:** \`~/.local/share/com.credhub.app/credhub.db\`

## Por que isso é bom

- **Funciona offline** — não precisa de internet
- **Privacidade** — os dados ficam na sua máquina, não em nuvem de terceiros
- **Rápido** — o app lê e escreve direto no arquivo
- **Backup simples** — basta copiar o arquivo \`credhub.db\` para um pendrive ou nuvem

## Segurança

O SQLite não tem senha embutida, então a proteção é feita pelo próprio CredHub: o **login com senha criptografada** (cada senha é guardada de forma embaralhada com a tecnologia bcrypt, impossível de ler mesmo abrindo o arquivo). Para máxima segurança, mantenha o computador protegido com senha do Windows.

## Recomendação de backup

Faça uma cópia do arquivo \`credhub.db\` regularmente. Se o computador estragar, é só restaurar essa cópia em outra máquina e todos os dados voltam.
`,
  },

  // ──────────────────────────────────────────
  // ACESSO E USUÁRIOS
  // ──────────────────────────────────────────
  {
    id: 'primeiro-acesso',
    titulo: 'Primeiro acesso e configuração inicial',
    categoria: 'Acesso e Usuários',
    keywords: ['primeiro acesso', 'configuração inicial', 'setup', 'criar admin', 'começar', 'código de recuperação'],
    conteudo: `
# Primeiro acesso e configuração inicial

Na primeira vez que o CredHub abre, ele pede para você configurar o **administrador** do sistema.

## Passo a passo

1. **Nome da empresa** (opcional) — aparece nos relatórios
2. **Seu nome** — o nome do administrador
3. **Login** — o nome de acesso (ex: \`admin\`)
4. **Senha** — escolha uma senha (mínimo 4 caracteres)

## O Código de Recuperação (MUITO IMPORTANTE)

Depois de criar o administrador, o sistema mostra um **Código de Recuperação** no formato \`XXXX-XXXX-XXXX-XXXX\`.

**Anote este código e guarde em local seguro!** (papel guardado, gerenciador de senhas, etc.)

Este código é o **único jeito** de recuperar o acesso se você, administrador, esquecer sua senha. Como o sistema é offline e não tem e-mail para enviar link de recuperação, o código é a sua chave reserva.

O código aparece **uma única vez**. Se perder, você pode gerar um novo em **Configurações → Minha Conta**, mas só enquanto ainda estiver logado.
`,
  },
  {
    id: 'perfis-usuario',
    titulo: 'Perfis de usuário (Admin, Gerente, Agente)',
    categoria: 'Acesso e Usuários',
    keywords: ['perfil', 'admin', 'administrador', 'gerente', 'agente', 'permissões', 'níveis de acesso'],
    conteudo: `
# Perfis de usuário

O CredHub tem três perfis, cada um com um nível de acesso padrão:

## Administrador
Acesso **total** ao sistema. É o único que pode:
- Criar, editar e remover usuários
- Definir o que cada funcionário pode ver
- Resetar a senha de qualquer funcionário
- Acessar todos os módulos e dados

O administrador **sempre vê tudo** — suas permissões não podem ser limitadas.

## Gerente
Acesso amplo, mas sem gerenciamento de usuários. Por padrão vê quase tudo: dashboard, clientes, propostas, simulador, financeiro, agentes, prospecção, convênios e relatórios.

## Agente
Acesso **operacional**. Por padrão vê apenas: dashboard, clientes, propostas, simulador e prospecção. **Não vê** financeiro, comissões nem configurações.

## Importante: permissões são ajustáveis

O perfil define apenas o **padrão**. O administrador pode ajustar fino, módulo por módulo, para cada funcionário individualmente. Veja a seção "Gerenciar usuários e permissões".
`,
  },
  {
    id: 'gerenciar-usuarios',
    titulo: 'Gerenciar usuários e permissões',
    categoria: 'Acesso e Usuários',
    keywords: ['gerenciar usuários', 'criar usuário', 'adicionar funcionário', 'permissões', 'remover usuário', 'editar usuário', 'comissão esconder', 'ver todos os dados', 'bloquear acesso'],
    conteudo: `
# Gerenciar usuários e permissões

Apenas o **administrador** acessa esta área, em **Configurações → Usuários**.

## Criar um novo usuário (funcionário)

1. Clique em **Novo Usuário**
2. Preencha nome, login e senha inicial
3. Escolha o **perfil** (agente, gerente ou admin)
4. Ajuste as **permissões** se quiser

## Controle fino de permissões

Ao criar ou editar um usuário (que não seja admin), você vê duas configurações poderosas:

### Ver todos os dados
- **Ligado:** o funcionário vê todos os clientes e propostas da empresa
- **Desligado:** o funcionário vê **apenas** os clientes e propostas vinculados a ele

Isso é útil quando você quer que cada agente trabalhe só com a própria carteira.

### Módulos que pode acessar
Uma lista com todos os módulos do sistema. Marque ou desmarque cada um para liberar ou bloquear.

Os módulos **sensíveis** (Financeiro, Agentes, Relatórios, Configurações) vêm marcados com um ponto laranja. **Cuidado ao liberá-los para agentes** — é assim que você impede, por exemplo, que um agente veja as comissões da empresa.

## Exemplo prático

Você quer que o funcionário "João" cadastre clientes e propostas, mas **não veja as comissões nem o financeiro**:
1. Crie o usuário João como **Agente**
2. O perfil Agente já vem sem Financeiro — pronto!
3. Se quiser, desligue "Ver todos os dados" para ele ver só a carteira dele

## Resetar senha de um funcionário

Se um funcionário esquecer a senha:
1. Vá em **Configurações → Usuários**
2. Clique no ícone de chave 🔑 ao lado do nome dele
3. Defina uma senha temporária
4. Passe a senha para o funcionário — ele será avisado para trocá-la no próximo acesso

## Desativar um usuário

Em vez de remover, você pode **desativar** um usuário (editar → Status: Inativo). Ele não consegue mais entrar, mas os dados e o histórico dele ficam preservados.

> **Proteção:** o sistema não deixa você desativar ou rebaixar o último administrador ativo, para nunca ficar sem acesso.
`,
  },
  {
    id: 'recuperar-senha',
    titulo: 'Esqueci minha senha — como recuperar',
    categoria: 'Acesso e Usuários',
    keywords: ['esqueci senha', 'recuperar senha', 'esqueceu', 'recuperação', 'código de recuperação', 'reset', 'perdi acesso', 'não consigo entrar'],
    conteudo: `
# Esqueci minha senha — como recuperar

A recuperação depende de quem esqueceu a senha:

## Funcionário esqueceu a senha
O **administrador** reseta para ele. Veja "Gerenciar usuários" → Resetar senha. É o caminho mais simples e seguro.

## Administrador esqueceu a senha
Use o **Código de Recuperação** que foi gerado na configuração inicial:

1. Na tela de login, clique em **"Esqueci minha senha (administrador)"**
2. Digite seu login de admin
3. Digite o **código de recuperação** (\`XXXX-XXXX-XXXX-XXXX\`)
4. Defina uma nova senha

Pronto! Após usar o código, um **novo código** é gerado automaticamente — anote o novo, porque o antigo deixa de funcionar.

## E se eu perdi o código de recuperação também?

Se você ainda está logado, gere um novo em **Configurações → Minha Conta → Gerar Novo Código**.

Se você não está logado **e** perdeu o código, não há como recuperar o acesso de administrador sem perder os dados — é por isso que guardar o código com cuidado é tão importante. (Isso é uma proteção: se houvesse um "jeitinho" de burlar, qualquer pessoa mal-intencionada poderia usar.)

## Alterar a própria senha (a qualquer momento)
Em **Configurações → Minha Conta → Alterar Senha**. Informe a senha atual e a nova.
`,
  },

  // ──────────────────────────────────────────
  // MÓDULOS
  // ──────────────────────────────────────────
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    categoria: 'Módulos',
    keywords: ['dashboard', 'painel', 'visão geral', 'indicadores', 'resumo', 'gráficos'],
    conteudo: `
# Dashboard

O Dashboard é a tela inicial — uma visão geral rápida da operação.

## O que mostra

- **Clientes cadastrados** — total de clientes na base
- **Propostas este mês** — quantas propostas foram digitadas no mês atual
- **Comissões a receber** — quanto a empresa tem para receber dos bancos
- **Comissões a pagar** — quanto a empresa deve aos agentes
- **Valor pago no mês** — soma dos contratos que foram pagos
- **Leads novos** — leads aguardando contato
- **Esteira** — quantas propostas estão em cada status, com barra visual

Os valores se atualizam automaticamente conforme você usa o sistema.
`,
  },
  {
    id: 'clientes',
    titulo: 'Clientes (CRM)',
    categoria: 'Módulos',
    keywords: ['clientes', 'cadastro', 'crm', 'cpf', 'margem', 'consignação', 'cadastrar cliente', 'buscar cliente', 'dados pessoais'],
    conteudo: `
# Clientes (CRM)

O módulo de Clientes é onde você cadastra e gerencia todas as pessoas atendidas.

## Cadastrar um cliente

Clique em **Novo Cliente**. O formulário tem 4 abas:

### Dados Pessoais
Nome (obrigatório), CPF, RG, data de nascimento, telefones, WhatsApp, e-mail e a origem do cliente (balcão, mailing, indicação, etc.).

### Endereço
CEP, endereço completo, bairro, cidade e estado.

### Consignação
A parte mais importante para o crédito:
- **Convênio** — INSS, servidor estadual, CLT, etc.
- **Matrícula / NB** — número do benefício ou matrícula
- **Órgão** pagador
- **Tipo de benefício** — aposentadoria, pensão, salário, BPC
- **Renda** bruta e líquida
- **Margem total** e **margem disponível** — quanto o cliente pode comprometer

### Bancário
Dados da conta do cliente para receber o crédito (banco, agência, conta, PIX).

## Buscar clientes

Use a barra de busca no topo. Você pode buscar por **nome, CPF, telefone ou matrícula**. A busca acontece conforme você digita.

## Editar ou excluir

Passe o mouse sobre a linha do cliente para ver os botões de ação. A exclusão é "suave" — o cliente é apenas ocultado, e as propostas dele são preservadas.
`,
  },
  {
    id: 'propostas',
    titulo: 'Propostas e a Esteira',
    categoria: 'Módulos',
    keywords: ['propostas', 'esteira', 'kanban', 'status', 'digitado', 'pago', 'aprovado', 'pendente', 'portabilidade', 'refinanciamento', 'criar proposta', 'acompanhar proposta'],
    conteudo: `
# Propostas e a Esteira

A esteira é o coração da operação: o acompanhamento de cada proposta desde a digitação até o pagamento.

## Criar uma proposta

Clique em **Nova Proposta**:
1. **Busque e selecione o cliente**
2. Escolha o **produto** (consignado novo, refinanciamento, portabilidade, etc.)
3. Escolha o **banco** e o **convênio**
4. Informe os **valores**: valor do empréstimo, valor líquido, parcela, quantidade de parcelas e taxa
5. Para **portabilidade**, informe o banco de origem, saldo devedor e troco
6. Para **refinanciamento**, informe o saldo devedor

## As duas visões

### Kanban (quadro)
Colunas coloridas, uma para cada status. Cada proposta é um cartão. Clique em um cartão para mudar o status.

### Lista
Uma tabela com todas as propostas e seus detalhes. Clique numa linha para mudar o status.

## Os status da esteira

1. **Digitado** — proposta enviada ao banco
2. **Pendente** — banco pediu documentação
3. **Em Análise** — banco analisando
4. **Aprovado** — aprovado, aguardando averbação
5. **Aguard. Anuência** — (INSS 2026) aguardando o cliente confirmar por biometria no Meu INSS
6. **Averbado** — averbado, aguardando pagamento
7. **Pago** — concluído! O dinheiro caiu e a comissão é gerada automaticamente
8. **Rejeitado / Cancelado / Expirado** — encerramentos

## Mudança de status gera histórico

Toda mudança de status fica registrada com data, hora e a observação que você escreveu. Isso cria um histórico completo de cada proposta.

## O momento mágico: "Pago"

Quando você marca uma proposta como **Pago**, o sistema automaticamente:
- Calcula a comissão da empresa
- Calcula a comissão do agente (se houver)
- Cria os lançamentos no Financeiro

Veja a seção "Financeiro e Comissões".
`,
  },
  {
    id: 'cliente-detalhes',
    titulo: 'Detalhes do Cliente (histórico e documentos)',
    categoria: 'Módulos',
    keywords: ['cliente', 'detalhes', 'histórico', 'interações', 'documentos', 'anexar', 'upload', 'rg', 'comprovante', 'contracheque', 'linha do tempo'],
    conteudo: `
# Detalhes do Cliente

Clicando no nome de um cliente (ou no ícone de olho), você abre a tela de detalhes, com três abas.

## Informações

Todos os dados do cliente organizados: dados pessoais, consignação (benefício, matrícula, renda, margem) e endereço.

## Histórico

A linha do tempo de tudo que aconteceu com esse cliente. Registre cada contato (ligação, WhatsApp, visita, nota) com um resumo e o resultado. Você pode **agendar um retorno** colocando uma data — e isso gera um alerta no painel inicial quando a data chegar.

Tudo fica gravado em ordem, então você sempre sabe o histórico completo do relacionamento.

## Documentos

Anexe documentos do cliente: RG, CPF, comprovante de renda, comprovante de residência, contracheque, extratos, contratos. Escolha o tipo, selecione o arquivo (PDF ou imagem, até 5 MB) e adicione.

Os documentos ficam guardados com segurança dentro do banco de dados (entram no backup automaticamente). Você pode baixar ou excluir quando quiser.
`,
  },
  {
    id: 'alertas',
    titulo: 'Alertas Inteligentes',
    categoria: 'Módulos',
    keywords: ['alertas', 'avisos', 'lembretes', 'proposta parada', 'retorno', 'pendência', 'dashboard', 'notificação'],
    conteudo: `
# Alertas Inteligentes

No topo do Dashboard, o sistema mostra automaticamente os pontos que precisam de atenção. Eles aparecem só quando há algo relevante.

## Tipos de alerta

- **Propostas paradas:** propostas em andamento sem movimentação há mais de 7 dias. Pode ser uma pendência esquecida.
- **Leads aguardando contato:** leads novos que ninguém contatou há mais de 3 dias. Lead esfria rápido — atenda logo.
- **Comissões a receber:** comissões pendentes do banco há mais de 30 dias. Hora de cobrar.
- **Retornos para hoje:** clientes ou leads com retorno agendado para hoje (ou atrasado). Não perca o follow-up.

## Por que isso importa

Os alertas transformam o sistema de passivo (você procura informação) em ativo (o sistema te avisa). Eles ajudam a não deixar dinheiro na mesa: uma proposta parada é uma venda travada, um lead sem contato é um cliente perdido, uma comissão esquecida é dinheiro que não entra.

Confira o Dashboard toda manhã e resolva os alertas. É o melhor hábito para manter a operação saudável.
`,
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios',
    categoria: 'Módulos',
    keywords: ['relatórios', 'relatorio', 'produção', 'financeiro', 'comercial', 'funil', 'conversão', 'gráfico', 'exportar', 'gerencial', 'desempenho', 'ticket médio'],
    conteudo: `
# Relatórios

A visão gerencial do negócio. Apenas **administradores e gerentes** acessam. Tem três abas e um seletor de período (este mês, mês passado, este ano, todo o período).

## Produção

Mostra o volume de propostas e valores:
- **Total de propostas** e valor total no período
- **Propostas pagas** (as que viraram dinheiro)
- **Em andamento** (na esteira)
- **Ticket médio** (valor médio por proposta)

Tem um gráfico de produção por mês e tabelas que quebram os números **por agente, por banco, por convênio e por produto** — você vê rapidamente quem produz mais, qual banco traz mais volume, etc.

Pode **exportar para CSV** (abre no Excel) com um clique.

## Financeiro

A saúde financeira do negócio:
- **Receitas** (total e quanto já foi recebido dos bancos)
- **Despesas** (total e quanto já foi pago aos agentes)
- **Saldo** (recebido menos pago)
- **A receber** dos bancos e **a pagar** aos agentes
- **Comissões** da empresa e dos agentes

Um gráfico compara receitas vs despesas mês a mês.

## Comercial (Funil)

Mostra a eficiência da operação comercial:
- **Taxa de conversão de leads** (quantos leads viraram clientes)
- **Taxa de conversão de propostas** (quantas propostas foram pagas)
- **Funil de propostas** (gráfico de pizza por status)
- **Funil de leads** (barras por status)

Essas taxas mostram onde está o gargalo: se muitos leads não convertem, o problema é no atendimento; se muitas propostas não são pagas, o problema é na esteira.

## Exportar: CSV ou PDF?

Cada relatório tem dois botões, com finalidades diferentes:

- **Imprimir PDF:** gera um relatório visual formatado, com a identidade da empresa (logo, cores, dados), pronto para imprimir, arquivar ou enviar. Ideal para apresentar resultados.
- **Exportar CSV:** salva os dados crus numa planilha que abre no Excel, para você fazer suas próprias contas e cruzamentos.

Use PDF para mostrar, CSV para trabalhar os números.

## Dica

Acompanhe os relatórios toda semana. A taxa de conversão e o ticket médio são os números que mais ajudam a tomar decisões — onde investir, quem premiar, o que ajustar.
`,
  },
  {
    id: 'prospeccao',
    titulo: 'Prospecção (Campanhas e Leads)',
    categoria: 'Módulos',
    keywords: ['prospecção', 'leads', 'campanha', 'mailing', 'importar', 'csv', 'caça', 'captação', 'fila', 'atendimento', 'converter cliente', 'whatsapp'],
    conteudo: `
# Prospecção

O módulo de prospecção é a "caça" — onde você organiza a captação de novos clientes a partir de listas (mailing), campanhas e contatos.

## Campanhas

Uma campanha agrupa leads com um objetivo comum (ex: "INSS Janeiro", "Portabilidade Servidores"). Crie uma campanha em **Nova Campanha**, escolhendo o tipo (mailing, refinanciamento, portabilidade, indicação).

Ao selecionar uma campanha, você vê o resumo: total de leads, contactados, convertidos e a taxa de conversão.

## Importar Mailing (lista de CSV)

A forma mais rápida de adicionar muitos leads de uma vez:

1. Clique em **Importar Mailing**
2. Selecione um arquivo **CSV** (se você tem Excel, salve como CSV primeiro)
3. O sistema **detecta as colunas automaticamente** (nome, CPF, telefone, etc.)
4. Confira o mapeamento — você pode ajustar qual coluna do arquivo corresponde a cada campo
5. Escolha a campanha de destino e clique em importar

O sistema **ignora duplicados** automaticamente (mesmo CPF na mesma campanha) e mostra quantos foram importados.

### O que é um arquivo CSV?

Um CSV é uma planilha simples salva num formato que qualquer sistema entende. Você cria no **Excel** (ou Google Planilhas), preenche os dados e salva como CSV. Pense nele como uma tabela: a primeira linha são os **títulos das colunas** (cabeçalho), e cada linha abaixo é um contato.

### Como o arquivo deve ficar

A primeira linha tem os nomes das colunas, exatamente assim:

| nome | cpf | telefone | whatsapp | convenio | matricula | beneficio | renda |
|------|-----|----------|----------|----------|-----------|-----------|-------|
| Maria Aparecida da Silva | 12345678901 | 11987654321 | 11987654321 | INSS | 1234567890 | Aposentadoria por idade | 2500.00 |
| Jose Carlos de Souza | 98765432100 | 11912345678 | 11912345678 | INSS | 0987654321 | Aposentadoria por tempo | 3200.00 |
| Antonio Pereira Lima | 45678912300 | 21987651234 | 21987651234 | SIAPE | 5544332211 | Servidor Federal | 5800.00 |

### O que cada coluna significa

| Coluna | Obrigatório? | Como preencher |
|--------|--------------|----------------|
| **nome** | Sim | Nome completo do contato |
| **cpf** | Não | Só números, sem pontos ou traços (ex: 12345678901) |
| **telefone** | Não | DDD + número, só dígitos (ex: 11987654321) |
| **whatsapp** | Não | Pode ser igual ao telefone |
| **convenio** | Não | INSS, SIAPE, CLT, etc. |
| **matricula** | Não | Matrícula ou número do benefício |
| **beneficio** | Não | Tipo de benefício ou vínculo |
| **renda** | Não | Use ponto para os centavos (ex: 2500.00) |

> **Só o nome é obrigatório.** As outras colunas são opcionais — mas quanto mais você preencher, mais informação o agente tem para trabalhar o lead.

### Baixe um modelo pronto

Não precisa montar do zero! Na tela de importação, há dois botões:
- **Modelo com exemplos** — um arquivo já preenchido com contatos fictícios, pra você ver como fica e substituir pelos seus dados.
- **Modelo em branco** — só com os títulos das colunas, pra você preencher do zero.

Baixe um deles, abra no Excel, coloque seus dados e salve.

### Passo a passo: criar o CSV no Excel

1. Baixe o **modelo com exemplos** na tela de importação
2. Abra o arquivo no Excel (clique duplo)
3. Apague os exemplos e coloque seus contatos (uma linha por pessoa)
4. Não mude os títulos das colunas (a primeira linha)
5. Clique em **Arquivo → Salvar Como**
6. Escolha o tipo **"CSV UTF-8 (delimitado por vírgula)"**
7. Salve e pronto — agora é só importar esse arquivo no CredHub

> **Atenção ao salvar:** sempre escolha o formato CSV (não deixe como .xlsx). Se aparecer um aviso do Excel sobre "recursos incompatíveis", clique em "Sim, manter formato". Os acentos são preservados automaticamente.

## Fila de Atendimento

A lista de leads é a sua fila de trabalho. Ela é ordenada inteligentemente: leads novos e em andamento aparecem primeiro. Para cada lead você pode:
- **Mudar o status** direto na lista (novo → tentando contato → interessado → agendado, etc.)
- **Abrir o WhatsApp** com um clique (botão verde)
- **Ver detalhes** clicando no nome — abre o painel com dados e histórico de interações
- **Converter em cliente** quando o lead fecha negócio

## Registrar Interações

Ao abrir um lead, você registra cada contato (ligação, WhatsApp, nota) com um resumo e o resultado. Tudo fica no histórico, então você sempre sabe o que já foi conversado. Registrar uma ligação ou WhatsApp marca o lead como "contactado" automaticamente.

## Converter Lead em Cliente

Quando o lead fecha negócio, clique em **Converter em Cliente** (ícone de pessoa+). O sistema cria um cliente com os dados do lead, e a partir daí você cria propostas normalmente. O lead fica marcado como "convertido".

## Dica de fluxo

1. Importe o mailing numa campanha
2. Trabalhe a fila de leads, registrando cada contato
3. Marque os interessados e agende retornos
4. Converta os que fecharam em clientes
5. Crie as propostas e acompanhe na esteira
`,
  },
  {
    id: 'simulador',
    titulo: 'Simulador de Crédito',
    categoria: 'Módulos',
    keywords: ['simulador', 'simulação', 'calcular', 'parcela', 'cet', 'portabilidade', 'troco', 'margem', 'price', 'juros', 'taxa', 'quanto posso emprestar', 'capacidade'],
    conteudo: `
# Simulador de Crédito

Ferramenta para simular operações e apresentar ao cliente na hora da venda. Tem três modos:

## Consignado Novo

Calcula a parcela de um empréstimo a partir do valor, prazo e taxa.

Você informa: valor do empréstimo, número de parcelas, taxa mensal. O sistema mostra:
- **Parcela mensal** (calculada pela Tabela Price, padrão dos bancos)
- **Valor liberado** — o que o cliente recebe (descontados IOF, TAC e seguro)
- **Total a pagar** e **total de juros**
- **CET** (Custo Efetivo Total) mensal e anual — o custo real da operação

Os **botões de teto** (INSS, Servidor, CLT) preenchem a taxa máxima de 2026 automaticamente. Você pode ver a **tabela de amortização** completa, mês a mês.

## Portabilidade (com troco)

Quando o cliente tem um consignado em outro banco e você oferece taxa menor.

Você informa o contrato atual (saldo devedor, parcela, parcelas restantes) e a nova proposta (sua taxa e prazo). O sistema calcula:
- **Troco** — dinheiro extra que o cliente pode receber
- **Nova parcela** vs parcela atual
- **Economia mensal**

É um argumento de venda poderoso: "trago seu contrato pra cá, com parcela menor, e ainda te dou um troco".

## Margem → Valor

Responde a pergunta "quanto esse cliente consegue pegar?".

Você informa a renda líquida e o tipo (INSS, servidor, CLT). O sistema calcula a margem consignável (o quanto da renda pode comprometer) e converte em **valor máximo de empréstimo**.

## Sobre os cálculos

Todos os cálculos seguem a **Tabela Price** (Sistema Francês de Amortização), o mesmo método usado por todos os bancos brasileiros. O CET usa a metodologia oficial (Taxa Interna de Retorno). São estimativas precisas, mas a proposta final do banco pode variar alguns reais por arredondamento ou tarifas específicas.
`,
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro e Comissões',
    categoria: 'Módulos',
    keywords: ['financeiro', 'comissões', 'comissão', 'receita', 'despesa', 'a receber', 'a pagar', 'lançamento', 'saldo', 'tabela de comissão'],
    conteudo: `
# Financeiro e Comissões

Este módulo controla o dinheiro: o que entra (comissões dos bancos) e o que sai (comissões dos agentes e despesas).

> **Atenção:** este é um módulo **sensível**. Por padrão, agentes não têm acesso. O administrador decide quem pode ver.

## Comissões automáticas

Quando uma proposta vira **Pago**, o sistema gera a comissão sozinho. Ele calcula com base nas **Tabelas de Comissão** (em Configurações). Se não houver tabela cadastrada para aquele banco/produto, ele usa um padrão de 5% empresa / 2% agente.

## As 4 abas

### Resumo
Cards com a receber, recebido, a pagar, saldo líquido e os totais do mês.

### Comissões
Lista de todas as comissões geradas. Você pode:
- Marcar a comissão da empresa como **recebida** (quando o banco pagar)
- Marcar a comissão do agente como **paga** (quando você pagar o agente)

### Receitas
Todas as entradas — principalmente comissões a receber dos bancos.

### Despesas
Todas as saídas — comissões dos agentes e despesas operacionais (aluguel, salário, marketing). Você pode adicionar despesas manualmente com **Novo Lançamento**.

## Tabelas de Comissão

Em **Configurações → Tabelas de Comissão**, cadastre o percentual de comissão para cada combinação de banco + produto + convênio. Assim o cálculo automático fica preciso.
`,
  },
  {
    id: 'agentes',
    titulo: 'Agentes e Corretores',
    categoria: 'Módulos',
    keywords: ['agentes', 'corretores', 'cadastrar agente', 'sub-correspondente', 'comissão agente', 'pix agente'],
    conteudo: `
# Agentes e Corretores

Cadastre aqui as pessoas que trazem propostas — agentes internos, externos e sub-correspondentes.

## Cadastrar um agente

Clique em **Novo Agente** e informe nome, tipo (interno/externo/sub-correspondente), CPF, telefone, WhatsApp, e-mail e a chave PIX (para pagamento das comissões).

## Para que serve

- Ao criar uma proposta, você vincula o agente que a trouxe
- Quando a proposta é paga, a comissão do agente é calculada automaticamente
- O financeiro mostra quanto cada agente tem a receber

## Vínculo com usuário

Um agente pode ter um login no sistema. Ao criar um usuário (em Configurações → Usuários), você pode vinculá-lo a um agente cadastrado. Combinado com a opção "Ver todos os dados" desligada, isso faz o agente ver só a própria carteira.
`,
  },

  // ──────────────────────────────────────────
  // SUPORTE
  // ──────────────────────────────────────────
  {
    id: 'excluir-desativar',
    titulo: 'Excluir ou Desativar registros',
    categoria: 'Sistema',
    keywords: ['excluir', 'apagar', 'remover', 'deletar', 'desativar', 'vínculos', 'agente', 'cliente', 'histórico', 'não consigo excluir'],
    conteudo: `
# Excluir ou Desativar registros

O CredHub protege seus dados com um sistema inteligente de exclusão. Entender isso evita perder histórico importante por acidente.

## A diferença entre excluir e desativar

- **Excluir definitivamente:** apaga o registro de vez. Só é permitido quando o registro **não tem nenhum vínculo** com outras partes do sistema.
- **Desativar:** o registro sai das listas e não pode mais ser usado em novas operações, mas **todo o histórico é preservado**. Usado quando há vínculos.

## Por que isso existe?

Imagine excluir um agente que já trouxe 50 propostas e tem comissões a receber. Se ele sumisse do banco, todas essas propostas e comissões ficariam "órfãs" — apontando para um agente que não existe mais. Isso quebraria os relatórios e o financeiro.

Por isso, o sistema **verifica os vínculos antes de excluir**.

## Como funciona na prática

Quando você clica em excluir um **agente** ou **cliente**, o sistema verifica se ele está vinculado a:
- Usuários do sistema (no caso de agentes)
- Propostas
- Comissões
- Clientes ou Leads
- Interações e documentos

**Se não houver nenhum vínculo:** aparece a opção de excluir definitivamente.

**Se houver vínculos:** o sistema mostra exatamente quais são (ex: "3 propostas, 1 usuário") e oferece a opção de **desativar**, preservando tudo.

## Atenção especial: agente vinculado a usuário

Um agente pode estar vinculado a um **usuário que faz login no sistema**. Nesse caso, o sistema avisa com destaque. Desative com cuidado, pois pode afetar o acesso dessa pessoa.

## Resumo

Você nunca vai perder histórico por acidente. O sistema sempre pergunta antes (com modal de confirmação) e escolhe automaticamente o método mais seguro: exclusão de vez quando pode, desativação quando precisa preservar dados.
`,
  },
  {
    id: 'backup-restore',
    titulo: 'Backup e Restauração',
    categoria: 'Suporte',
    keywords: ['backup', 'restaurar', 'restauração', 'cópia de segurança', 'perder dados', 'recuperar dados', 'salvar dados', 'segurança dos dados'],
    conteudo: `
# Backup e Restauração

Como os dados ficam na sua máquina, o backup é a sua rede de proteção. Apenas o **administrador** acessa esta área, em **Configurações → Backup**.

## Backup automático

O CredHub cria um **backup automático sempre que você fecha o aplicativo**. Ele mantém os **2 backups mais recentes** e apaga os mais antigos automaticamente, para não ocupar espaço à toa.

Esses backups ficam guardados numa pasta interna do sistema e aparecem na lista "Backups Automáticos".

## Backup manual

A qualquer momento, clique em **Fazer Backup Agora**. Você escolhe onde salvar — recomendamos um **pendrive ou nuvem** (Google Drive, OneDrive), assim os dados ficam protegidos mesmo se o computador estragar.

O arquivo gerado tem a extensão \`.credhub-backup\`.

## Como o backup é seguro

Antes de gravar qualquer backup, o sistema **verifica a integridade** do banco de dados. Se houver algum problema, o backup é cancelado e você é avisado — assim você nunca salva uma cópia defeituosa.

O método usado (chamado VACUUM INTO) gera uma cópia limpa e compactada, sem risco de pegar dados "pela metade".

## Restaurar um backup

> **Atenção:** restaurar substitui TODOS os dados atuais pelos dados do backup. Faça isso com cuidado.

1. Vá em **Configurações → Backup**
2. Clique em **Selecionar Arquivo** (ou no ícone de restaurar ao lado de um backup automático)
3. O sistema **valida o backup e mostra o que tem dentro** — quantos clientes, propostas, comissões e usuários. Confira se é o backup certo!
4. Clique em **Prosseguir com Restauração**
5. Por segurança, digite a palavra **RESTAURAR** para confirmar
6. O sistema faz uma **cópia de segurança dos dados atuais** antes de substituir (caso você se arrependa)
7. Os dados são restaurados e o app reinicia

## Recomendação

Faça um **backup manual para um pendrive ou nuvem pelo menos uma vez por semana**. Os backups automáticos protegem contra erros do dia a dia, mas um backup externo protege contra o computador estragar de vez.
`,
  },
  {
    id: 'identidade-empresa',
    titulo: 'Identidade da Empresa (logo, cores, dados)',
    categoria: 'Sistema',
    keywords: ['identidade', 'empresa', 'logo', 'logotipo', 'cores', 'marca', 'favicon', 'nome da empresa', 'redes sociais', 'personalizar', 'branding', 'slogan', 'finance consignados'],
    conteudo: `
# Identidade da Empresa

Apenas o **administrador** pode personalizar, em **Configurações → Identidade da Empresa**. Tudo que você configurar aqui aparece automaticamente em todo o sistema.

## O que você pode personalizar

### Logo e Ícone
Você escolhe **o que mostrar no topo do app**:
- **Ícone + Nome:** um ícone quadrado pequeno com o nome da empresa ao lado. Ideal se você não tem um logo retangular pronto.
- **Logo Retangular:** seu logo no formato paisagem (horizontal). Ideal se você já tem uma marca pronta. A altura é ajustada automaticamente e a largura é limitada para não quebrar o visual da barra.

Além disso:
- **Favicon:** o ícone pequeno do app (formato quadrado).

### Cor da Marca
Escolha uma cor entre as sugeridas ou use o seletor para uma cor exata. Ela é aplicada nos destaques do sistema.

### Dados da Empresa
Nome, CNPJ, slogan e uma descrição "Sobre". O **nome substitui "CredHub"** em todo o sistema — na sidebar, no login e nos relatórios.

### Contato
Telefone, WhatsApp, e-mail, site e endereço. Aparecem nos relatórios e documentos gerados.

### Redes Sociais
Instagram, Facebook, LinkedIn e YouTube.

## Como salvar

Preencha o que quiser e clique em **Salvar Identidade**. As mudanças aparecem na hora em todo o app. Você pode ajustar quando quiser.

> **Dica:** capriche no logo e na cor — é a primeira coisa que sua equipe vê ao abrir o sistema, e dá um ar profissional.
`,
  },
  {
    id: 'atualizar-sistema',
    titulo: 'Atualizar o sistema sem perder dados',
    categoria: 'Sistema',
    keywords: ['atualizar', 'atualização', 'nova versão', 'update', 'instalar nova versão', 'perder dados', 'manter dados', 'upgrade'],
    conteudo: `
# Atualizar o sistema sem perder dados

Uma dúvida comum: "se eu instalar uma versão nova, perco os dados?" **Não!** E aqui está o porquê.

## O programa e os dados ficam separados

- O **programa** (o aplicativo em si) fica instalado em uma pasta do sistema (ex: Arquivos de Programas)
- Os **dados** (clientes, propostas, tudo) ficam em uma pasta separada do usuário: \`%APPDATA%/com.credhub.app/\`

Quando você instala uma versão nova:
1. O instalador **substitui apenas o programa**
2. A pasta com o banco de dados **fica intacta**
3. O programa novo abre, encontra o banco existente e se ajusta automaticamente

## Migração automática

Quando há campos novos numa versão (como aconteceu com permissões e código de recuperação), o sistema **adiciona as novidades ao banco existente sem apagar nada**. Seus clientes, propostas e configurações continuam todos lá.

## Recomendação ao atualizar

Por segurança, **faça um backup manual antes de instalar uma versão nova** (Configurações → Backup → Fazer Backup Agora). É raríssimo dar problema, mas backup nunca é demais.

## Resumindo

Instalar uma versão nova é seguro. Os dados ficam protegidos numa pasta própria que o instalador não toca. Mesmo assim, um backup antes traz tranquilidade total.
`,
  },
  {
    id: 'dicas-uso',
    titulo: 'Dicas de uso e fluxo recomendado',
    categoria: 'Suporte',
    keywords: ['dicas', 'fluxo', 'como começar', 'passo a passo', 'ordem', 'rotina', 'melhor forma'],
    conteudo: `
# Dicas de uso e fluxo recomendado

## Para começar (configuração)

1. **Configurações → Bancos** — cadastre os bancos parceiros
2. **Configurações → Convênios** — cadastre INSS, convênios estaduais, CLT
3. **Configurações → Tabelas de Comissão** — cadastre os percentuais
4. **Configurações → Usuários** — crie os logins dos funcionários
5. **Agentes** — cadastre os corretores

## Rotina do dia a dia

1. **Prospecção** — trabalhe os leads, faça contato
2. **Clientes** — cadastre os interessados
3. **Simulador** — simule a melhor operação
4. **Propostas** — crie a proposta e digite no banco
5. **Esteira** — acompanhe o status até o pagamento
6. **Financeiro** — confira as comissões quando os contratos forem pagos

## Boas práticas

- Faça **backup** do banco de dados regularmente (copie o arquivo \`credhub.db\`)
- Mantenha as **margens dos clientes atualizadas** para simulações precisas
- Use o campo de **observações** nas propostas para registrar pendências
- Registre as **interações** com clientes para ter histórico

## Precisa de ajuda?

Use a **busca** deste manual (no topo) — digite uma palavra e as seções relevantes aparecem na hora.
`,
  },
];

// Categorias na ordem de exibição
export const MANUAL_CATEGORIAS = ['Introdução', 'Sistema', 'Acesso e Usuários', 'Módulos', 'Suporte'];
