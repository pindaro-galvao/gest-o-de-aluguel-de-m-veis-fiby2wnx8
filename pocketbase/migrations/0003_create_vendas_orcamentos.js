migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const clientes = app.findCollectionByNameOrId('clientes')
    const produtos = app.findCollectionByNameOrId('produtos')

    // 1. Coleção vendas
    // Regra:
    // ADMIN vê tudo
    // VENDEDOR vê somente vendedor = @request.auth.id
    // CLIENTE vê somente cliente.usuario = @request.auth.id
    const vendas = new Collection({
      name: 'vendas',
      type: 'base',
      listRule:
        "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)",
      viewRule:
        "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)",
      createRule: "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'",
      updateRule:
        "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id)",
      deleteRule: "@request.auth.role = 'ADMIN'",
      fields: [
        {
          name: 'cliente',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'produto',
          type: 'relation',
          required: true,
          collectionId: produtos.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'quantidade', type: 'number', required: true, min: 1 },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'data_fim', type: 'date', required: true },
        { name: 'valor_total', type: 'number', required: false, min: 0 },
        {
          name: 'forma_pagamento',
          type: 'select',
          required: true,
          values: ['debito_em_conta', 'credito', 'boleto', 'pix'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativa', 'encerrada', 'cancelada'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        {
          name: 'vendedor',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_vendas_vendedor ON vendas (vendedor)',
        'CREATE INDEX idx_vendas_cliente ON vendas (cliente)',
        'CREATE INDEX idx_vendas_status ON vendas (status)',
        'CREATE INDEX idx_vendas_created ON vendas (created DESC)',
      ],
    })
    app.save(vendas)

    // 2. Coleção orcamentos
    // Regra:
    // ADMIN vê tudo
    // VENDEDOR vê somente onde vendedor = @request.auth.id
    // CLIENTE vê somente onde cliente.usuario = @request.auth.id
    const orcamentos = new Collection({
      name: 'orcamentos',
      type: 'base',
      listRule:
        "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)",
      viewRule:
        "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)",
      createRule: "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'",
      // CLIENTE pode atualizar status e data_aprovacao para aprovar orçamentos enviados a ele
      updateRule:
        "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)",
      deleteRule: "@request.auth.role = 'ADMIN'",
      fields: [
        {
          name: 'cliente',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'valor_total', type: 'number', required: false, min: 0 },
        { name: 'validade', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        {
          name: 'vendedor',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'data_aprovacao', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_orcamentos_vendedor ON orcamentos (vendedor)',
        'CREATE INDEX idx_orcamentos_cliente ON orcamentos (cliente)',
        'CREATE INDEX idx_orcamentos_status ON orcamentos (status)',
        'CREATE INDEX idx_orcamentos_created ON orcamentos (created DESC)',
      ],
    })
    app.save(orcamentos)

    // 3. Coleção orcamento_itens
    const orcamento_itens = new Collection({
      name: 'orcamento_itens',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'",
      updateRule: "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'",
      deleteRule: "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'",
      fields: [
        {
          name: 'orcamento',
          type: 'relation',
          required: true,
          collectionId: orcamentos.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'produto',
          type: 'relation',
          required: true,
          collectionId: produtos.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'quantidade', type: 'number', required: true, min: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_orcamento_itens_orcamento ON orcamento_itens (orcamento)'],
    })
    app.save(orcamento_itens)
  },
  (app) => {
    try {
      const orcamento_itens = app.findCollectionByNameOrId('orcamento_itens')
      app.delete(orcamento_itens)
    } catch (_) {}
    try {
      const orcamentos = app.findCollectionByNameOrId('orcamentos')
      app.delete(orcamentos)
    } catch (_) {}
    try {
      const vendas = app.findCollectionByNameOrId('vendas')
      app.delete(vendas)
    } catch (_) {}
  },
)
