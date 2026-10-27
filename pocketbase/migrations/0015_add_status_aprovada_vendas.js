migrate(
  (app) => {
    const vendas = app.findCollectionByNameOrId('vendas')
    const statusField = vendas.fields.getByName('status')
    if (statusField) {
      statusField.values = ['ativa', 'encerrada', 'cancelada', 'aprovada']
      statusField.maxSelect = 1
      app.save(vendas)
    }
  },
  (app) => {
    try {
      const vendas = app.findCollectionByNameOrId('vendas')
      const statusField = vendas.fields.getByName('status')
      if (statusField) {
        statusField.values = ['ativa', 'encerrada', 'cancelada']
        statusField.maxSelect = 1
        app.save(vendas)
      }
    } catch (_) {}
  },
)
