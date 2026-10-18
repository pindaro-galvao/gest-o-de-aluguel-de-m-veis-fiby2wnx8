migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const produtos = app.findCollectionByNameOrId('produtos')
    const clientes = app.findCollectionByNameOrId('clientes')
    const vendas = app.findCollectionByNameOrId('vendas')
    const orcamentos = app.findCollectionByNameOrId('orcamentos')
    const orcamento_itens = app.findCollectionByNameOrId('orcamento_itens')

    // 1. Seed Usuários
    // 1.1 Admin
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'pindaro.galvao@outlook.com')
      adminUser.set('role', 'ADMIN')
      adminUser.set('name', 'Píndaro Galvão (Admin)')
      adminUser.setVerified(true)
      app.save(adminUser)
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail('pindaro.galvao@outlook.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Píndaro Galvão (Admin)')
      adminUser.set('role', 'ADMIN')
      app.save(adminUser)
    }

    // 1.2 Vendedor de exemplo
    let vendedorUser
    try {
      vendedorUser = app.findAuthRecordByEmail('_pb_users_auth_', 'carlos.vendas@lpmoveis.com.br')
    } catch (_) {
      vendedorUser = new Record(users)
      vendedorUser.setEmail('carlos.vendas@lpmoveis.com.br')
      vendedorUser.setPassword('Skip@Pass')
      vendedorUser.setVerified(true)
      vendedorUser.set('name', 'Carlos Mendes (Vendedor)')
      vendedorUser.set('role', 'VENDEDOR')
      app.save(vendedorUser)
    }

    // 1.3 Cliente de exemplo (usuário do cliente)
    let clienteUser
    try {
      clienteUser = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'mariana.cliente@residencia.com.br',
      )
    } catch (_) {
      clienteUser = new Record(users)
      clienteUser.setEmail('mariana.cliente@residencia.com.br')
      clienteUser.setPassword('Skip@Pass')
      clienteUser.setVerified(true)
      clienteUser.set('name', 'Mariana Silva (Cliente)')
      clienteUser.set('role', 'CLIENTE')
      app.save(clienteUser)
    }

    // 2. Seed Produtos (8 móveis elegantes Tidelli)
    const produtosData = [
      {
        nome: 'Sofá Retrátil Maui 3 Lugares',
        tipo: 'sofá',
        dimensoes: '240 x 110 x 85 cm',
        descricao:
          'Sofá modular com acabamento em corda náutica e estrutura de alumínio, ideal para varandas cobertas e salas de estar contemporâneas.',
        quantidade_estoque: 5,
        valor_locacao_mensal: 480,
      },
      {
        nome: 'Mesa de Jantar Biarritz 8 Lugares',
        tipo: 'mesa',
        dimensoes: '220 x 100 x 75 cm',
        descricao:
          'Mesa de jantar robusta com tampo em madeira teca tratada e base metálica com pintura eletrostática.',
        quantidade_estoque: 4,
        valor_locacao_mensal: 390,
      },
      {
        nome: 'Cadeira Club com Braços',
        tipo: 'cadeira',
        dimensoes: '58 x 56 x 82 cm',
        descricao:
          'Cadeira de jantar ergonômica com trama artesanal e almofada em tecido impermeável de alta densidade.',
        quantidade_estoque: 16,
        valor_locacao_mensal: 95,
      },
      {
        nome: 'Cama Box Queen Tulum com Cabeceira',
        tipo: 'cama',
        dimensoes: '160 x 200 x 115 cm',
        descricao:
          'Conjunto cama box queen com cabeceira estofada em linho sintético e pés maciços de reflorestamento.',
        quantidade_estoque: 3,
        valor_locacao_mensal: 350,
      },
      {
        nome: 'Armário Guarda-Roupa 4 Portas Maragogi',
        tipo: 'armário',
        dimensoes: '200 x 60 x 220 cm',
        descricao:
          'Armário modulado de alto padrão com portas de correr, espelho central e gaveteiro telescópico suave.',
        quantidade_estoque: 3,
        valor_locacao_mensal: 420,
      },
      {
        nome: 'Estante Modular Industrial Trancoso',
        tipo: 'estante',
        dimensoes: '120 x 40 x 195 cm',
        descricao:
          'Estante aberta com 5 prateleiras em freijó natural e perfis em aço carbono grafite acetinado.',
        quantidade_estoque: 6,
        valor_locacao_mensal: 190,
      },
      {
        nome: 'Poltrona Reclinável Painho com Puff',
        tipo: 'poltrona',
        dimensoes: '88 x 85 x 98 cm',
        descricao:
          'Ícone do design artesanal com corda trançada à mão e estrutura ergonômica perfeita para relaxamento e leitura.',
        quantidade_estoque: 7,
        valor_locacao_mensal: 280,
      },
      {
        nome: 'Aparador Noronha 2 Gavetas',
        tipo: 'aparador',
        dimensoes: '150 x 45 x 80 cm',
        descricao:
          'Aparador sofisticado para halls e salas de jantar com puxadores discretos e tampo laminado fosco.',
        quantidade_estoque: 5,
        valor_locacao_mensal: 160,
      },
    ]

    const produtosCriados = []
    for (const item of produtosData) {
      try {
        const existing = app.findFirstRecordByData('produtos', 'nome', item.nome)
        produtosCriados.push(existing)
      } catch (_) {
        const rec = new Record(produtos)
        rec.set('nome', item.nome)
        rec.set('tipo', item.tipo)
        rec.set('dimensoes', item.dimensoes)
        rec.set('descricao', item.descricao)
        rec.set('quantidade_estoque', item.quantidade_estoque)
        rec.set('valor_locacao_mensal', item.valor_locacao_mensal)
        app.save(rec)
        produtosCriados.push(rec)
      }
    }

    // 3. Seed Clientes
    let clienteMariana
    try {
      clienteMariana = app.findFirstRecordByData(
        'clientes',
        'email',
        'mariana.cliente@residencia.com.br',
      )
    } catch (_) {
      clienteMariana = new Record(clientes)
      clienteMariana.set('nome', 'Mariana Silva')
      clienteMariana.set('email', 'mariana.cliente@residencia.com.br')
      clienteMariana.set('telefone', '(11) 98765-4321')
      clienteMariana.set('endereco', 'Av. Paulista, 1500, Apto 82 - Bela Vista, São Paulo/SP')
      clienteMariana.set('usuario', clienteUser.id)
      app.save(clienteMariana)
    }

    let clienteRoberto
    try {
      clienteRoberto = app.findFirstRecordByData(
        'clientes',
        'email',
        'roberto.almeida@empresa.com.br',
      )
    } catch (_) {
      clienteRoberto = new Record(clientes)
      clienteRoberto.set('nome', 'Roberto Almeida (Design Studio)')
      clienteRoberto.set('email', 'roberto.almeida@empresa.com.br')
      clienteRoberto.set('telefone', '(11) 97654-3210')
      clienteRoberto.set('endereco', 'Rua Oscar Freire, 320 - Jardins, São Paulo/SP')
      app.save(clienteRoberto)
    }

    // 4. Seed Vendas / Contratos
    try {
      app.findFirstRecordByData('vendas', 'cliente', clienteMariana.id)
    } catch (_) {
      // Venda 1: Sofá para Mariana
      const v1 = new Record(vendas)
      v1.set('cliente', clienteMariana.id)
      v1.set('produto', produtosCriados[0].id)
      v1.set('quantidade', 1)
      v1.set('data_inicio', '2025-01-10 00:00:00.000Z')
      v1.set('data_fim', '2025-07-10 00:00:00.000Z')
      v1.set('valor_total', 2880) // 6 meses x 480
      v1.set('forma_pagamento', 'credito')
      v1.set('status', 'ativa')
      v1.set('observacoes', 'Contrato semestral renovável. Entrega realizada com sucesso.')
      v1.set('vendedor', vendedorUser.id)
      app.save(v1)

      // Venda 2: Poltrona para Mariana
      const v2 = new Record(vendas)
      v2.set('cliente', clienteMariana.id)
      v2.set('produto', produtosCriados[6].id)
      v2.set('quantidade', 1)
      v2.set('data_inicio', '2025-02-01 00:00:00.000Z')
      v2.set('data_fim', '2025-08-01 00:00:00.000Z')
      v2.set('valor_total', 1680) // 6 meses x 280
      v2.set('forma_pagamento', 'pix')
      v2.set('status', 'ativa')
      v2.set('observacoes', 'Aditivo ao contrato principal de locação.')
      v2.set('vendedor', vendedorUser.id)
      app.save(v2)
    }

    // Venda para Roberto cadastrada por Admin
    try {
      app.findFirstRecordByData('vendas', 'cliente', clienteRoberto.id)
    } catch (_) {
      const v3 = new Record(vendas)
      v3.set('cliente', clienteRoberto.id)
      v3.set('produto', produtosCriados[1].id)
      v3.set('quantidade', 1)
      v3.set('data_inicio', '2024-11-01 00:00:00.000Z')
      v3.set('data_fim', '2025-05-01 00:00:00.000Z')
      v3.set('valor_total', 2340) // 6 meses x 390
      v3.set('forma_pagamento', 'boleto')
      v3.set('status', 'ativa')
      v3.set('observacoes', 'Locação para showroom corporativo.')
      v3.set('vendedor', adminUser.id)
      app.save(v3)
    }

    // 5. Seed Orçamentos
    try {
      app.findFirstRecordByData('orcamentos', 'cliente', clienteMariana.id)
    } catch (_) {
      const o1 = new Record(orcamentos)
      o1.set('cliente', clienteMariana.id)
      o1.set('valor_total', 1140)
      o1.set('validade', '2025-04-30 00:00:00.000Z')
      o1.set('status', 'enviado')
      o1.set('observacoes', 'Orçamento para locação de 6 cadeiras Club para compor sala de jantar.')
      o1.set('vendedor', vendedorUser.id)
      app.save(o1)

      const item1 = new Record(orcamento_itens)
      item1.set('orcamento', o1.id)
      item1.set('produto', produtosCriados[2].id)
      item1.set('quantidade', 6)
      app.save(item1)
    }

    try {
      app.findFirstRecordByData('orcamentos', 'cliente', clienteRoberto.id)
    } catch (_) {
      const o2 = new Record(orcamentos)
      o2.set('cliente', clienteRoberto.id)
      o2.set('valor_total', 2520)
      o2.set('validade', '2025-04-15 00:00:00.000Z')
      o2.set('status', 'rascunho')
      o2.set('observacoes', 'Cotação para renovação de espaço executivo com estantes e aparadores.')
      o2.set('vendedor', vendedorUser.id)
      app.save(o2)

      const item2 = new Record(orcamento_itens)
      item2.set('orcamento', o2.id)
      item2.set('produto', produtosCriados[5].id)
      item2.set('quantidade', 2)
      app.save(item2)
    }
  },
  (app) => {
    // down logic opcional
  },
)
