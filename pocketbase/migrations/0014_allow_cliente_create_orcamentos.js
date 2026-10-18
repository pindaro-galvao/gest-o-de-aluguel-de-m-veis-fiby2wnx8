migrate(
  (app) => {
    // 1. Atualizar coleção orcamentos
    const orcamentosCol = app.findCollectionByNameOrId('orcamentos')

    // Tornar vendedor opcional (required: false) para permitir criação por cliente sem vendedor atribuído
    const vendedorField = orcamentosCol.fields.getByName('vendedor')
    if (vendedorField) {
      vendedorField.required = false
    }

    // Regra de criação: ADMIN, VENDEDOR, ou CLIENTE criando para o registro de cliente associado ao seu usuário
    orcamentosCol.createRule =
      "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || (@request.auth.role = 'CLIENTE' && @request.body.cliente != '' && @request.body.cliente.usuario = @request.auth.id)"

    // Regra de atualização: ADMIN, VENDEDOR (dele), ou CLIENTE (onde cliente.usuario = @request.auth.id)
    // Mantém e reforça para garantir edição completa pelo cliente em seus orçamentos
    orcamentosCol.updateRule =
      "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)"

    // Manter listRule e viewRule
    orcamentosCol.listRule =
      "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)"
    orcamentosCol.viewRule =
      "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)"

    app.save(orcamentosCol)

    // 2. Atualizar coleção orcamento_itens
    const orcamentoItensCol = app.findCollectionByNameOrId('orcamento_itens')

    // Permitir CLIENTE criar, atualizar e excluir itens de orçamentos onde ele é o cliente
    orcamentoItensCol.createRule =
      "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || (@request.auth.role = 'CLIENTE' && @request.body.orcamento != '' && @request.body.orcamento.cliente.usuario = @request.auth.id)"
    orcamentoItensCol.updateRule =
      "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || (@request.auth.role = 'CLIENTE' && orcamento.cliente.usuario = @request.auth.id)"
    orcamentoItensCol.deleteRule =
      "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || (@request.auth.role = 'CLIENTE' && orcamento.cliente.usuario = @request.auth.id)"

    app.save(orcamentoItensCol)
  },
  (app) => {
    try {
      const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
      const vendedorField = orcamentosCol.fields.getByName('vendedor')
      if (vendedorField) {
        vendedorField.required = true
      }
      orcamentosCol.createRule = "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'"
      orcamentosCol.updateRule =
        "@request.auth.role = 'ADMIN' || (@request.auth.role = 'VENDEDOR' && vendedor = @request.auth.id) || (@request.auth.role = 'CLIENTE' && cliente.usuario = @request.auth.id)"
      app.save(orcamentosCol)
    } catch (_) {}

    try {
      const orcamentoItensCol = app.findCollectionByNameOrId('orcamento_itens')
      orcamentoItensCol.createRule =
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'"
      orcamentoItensCol.updateRule =
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'"
      orcamentoItensCol.deleteRule =
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'"
      app.save(orcamentoItensCol)
    } catch (_) {}
  },
)
