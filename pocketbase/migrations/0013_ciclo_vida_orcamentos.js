migrate(
  (app) => {
    // 1. Atualizar valores do campo select 'status' na coleção 'orcamentos' para incluir 'convertido'
    // e adicionar campo 'data_recusa' (DateField)
    const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
    const statusField = orcamentosCol.fields.getByName('status')
    if (statusField) {
      statusField.values = ['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado', 'convertido']
      statusField.maxSelect = 1
    }

    if (!orcamentosCol.fields.getByName('data_recusa')) {
      orcamentosCol.fields.add(
        new DateField({
          name: 'data_recusa',
          required: false,
        }),
      )
    }

    app.save(orcamentosCol)

    // 2. Adicionar campo 'orcamento_origem' na coleção 'vendas' apontando para 'orcamentos'
    const vendasCol = app.findCollectionByNameOrId('vendas')
    if (!vendasCol.fields.getByName('orcamento_origem')) {
      vendasCol.fields.add(
        new RelationField({
          name: 'orcamento_origem',
          collectionId: orcamentosCol.id,
          maxSelect: 1,
          cascadeDelete: false,
          required: false,
        }),
      )
      vendasCol.indexes.push(
        'CREATE INDEX idx_vendas_orcamento_origem ON vendas (orcamento_origem)',
      )
      app.save(vendasCol)
    }
  },
  (app) => {
    try {
      const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
      if (orcamentosCol.fields.getByName('data_recusa')) {
        orcamentosCol.fields.removeByName('data_recusa')
      }
      const statusField = orcamentosCol.fields.getByName('status')
      if (statusField) {
        statusField.values = ['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado']
        statusField.maxSelect = 1
      }
      app.save(orcamentosCol)
    } catch (_) {}

    try {
      const vendasCol = app.findCollectionByNameOrId('vendas')
      if (vendasCol.fields.getByName('orcamento_origem')) {
        vendasCol.fields.removeByName('orcamento_origem')
        app.save(vendasCol)
      }
    } catch (_) {}
  },
)
