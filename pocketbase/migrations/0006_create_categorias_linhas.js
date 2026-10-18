migrate(
  (app) => {
    // 1. Coleção categorias
    if (!app.hasTable('categorias')) {
      const categorias = new Collection({
        name: 'categorias',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'ADMIN'",
        updateRule: "@request.auth.role = 'ADMIN'",
        deleteRule: "@request.auth.role = 'ADMIN'",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'ordem', type: 'number', min: 0 },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_categorias_nome ON categorias (nome)',
          'CREATE INDEX idx_categorias_ordem ON categorias (ordem)',
        ],
      })
      app.save(categorias)
    }

    // 2. Coleção linhas
    if (!app.hasTable('linhas')) {
      const linhas = new Collection({
        name: 'linhas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'ADMIN'",
        updateRule: "@request.auth.role = 'ADMIN'",
        deleteRule: "@request.auth.role = 'ADMIN'",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'ordem', type: 'number', min: 0 },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_linhas_nome ON linhas (nome)',
          'CREATE INDEX idx_linhas_ordem ON linhas (ordem)',
        ],
      })
      app.save(linhas)
    }
  },
  (app) => {
    try {
      const linhas = app.findCollectionByNameOrId('linhas')
      app.delete(linhas)
    } catch (_) {}
    try {
      const categorias = app.findCollectionByNameOrId('categorias')
      app.delete(categorias)
    } catch (_) {}
  },
)
