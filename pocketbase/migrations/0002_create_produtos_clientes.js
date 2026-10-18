migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Coleção produtos
    const produtos = new Collection({
      name: 'produtos',
      type: 'base',
      // ADMIN e VENDEDOR veem produtos; CLIENTE autenticado também pode ver produtos
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'ADMIN'",
      updateRule: "@request.auth.role = 'ADMIN'",
      deleteRule: "@request.auth.role = 'ADMIN'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['sofá', 'mesa', 'cadeira', 'cama', 'armário', 'estante', 'poltrona', 'aparador'],
          maxSelect: 1,
        },
        { name: 'dimensoes', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'quantidade_estoque', type: 'number', min: 0 },
        { name: 'valor_locacao_mensal', type: 'number', min: 0, required: false },
        {
          name: 'foto',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_produtos_tipo ON produtos (tipo)',
        'CREATE INDEX idx_produtos_nome ON produtos (nome)',
      ],
    })
    app.save(produtos)

    // 2. Coleção clientes
    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      // ADMIN e VENDEDOR veem todos os clientes; CLIENTE vê apenas o seu registro onde usuario = @request.auth.id
      listRule:
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || usuario = @request.auth.id",
      viewRule:
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || usuario = @request.auth.id",
      createRule: "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR'",
      updateRule:
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || usuario = @request.auth.id",
      deleteRule: "@request.auth.role = 'ADMIN'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'endereco', type: 'text' },
        {
          name: 'usuario',
          type: 'relation',
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clientes_usuario ON clientes (usuario)',
        'CREATE INDEX idx_clientes_email ON clientes (email)',
      ],
    })
    app.save(clientes)
  },
  (app) => {
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      app.delete(clientes)
    } catch (_) {}
    try {
      const produtos = app.findCollectionByNameOrId('produtos')
      app.delete(produtos)
    } catch (_) {}
  },
)
