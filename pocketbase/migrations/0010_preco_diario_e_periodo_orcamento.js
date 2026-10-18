migrate(
  (app) => {
    // 1. Atualizar coleção produtos: adicionar valor_locacao_diaria se não existir
    const produtosCol = app.findCollectionByNameOrId('produtos')
    if (!produtosCol.fields.getByName('valor_locacao_diaria')) {
      produtosCol.fields.add(
        new NumberField({
          name: 'valor_locacao_diaria',
          min: 0,
          required: false,
        }),
      )
      app.save(produtosCol)
    }

    // 2. Backfill de valor_locacao_diaria a partir de valor_locacao_mensal ou vice-versa
    // Se o produto já possui valor_locacao_mensal e valor_locacao_diaria estiver vazio/0, copiar
    try {
      app
        .db()
        .newQuery(`
        UPDATE produtos 
        SET valor_locacao_diaria = valor_locacao_mensal 
        WHERE (valor_locacao_diaria IS NULL OR valor_locacao_diaria = 0) 
          AND valor_locacao_mensal IS NOT NULL AND valor_locacao_mensal > 0
      `)
        .execute()
    } catch (e) {
      console.log('Backfill produtos valor_locacao_diaria erro:', e)
    }

    // 3. Atualizar coleção orcamentos: adicionar campos opcionais data_inicio e data_fim para permitir cotação com datas
    const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
    let orcamentosChanged = false
    if (!orcamentosCol.fields.getByName('data_inicio')) {
      orcamentosCol.fields.add(
        new DateField({
          name: 'data_inicio',
          required: false,
        }),
      )
      orcamentosChanged = true
    }
    if (!orcamentosCol.fields.getByName('data_fim')) {
      orcamentosCol.fields.add(
        new DateField({
          name: 'data_fim',
          required: false,
        }),
      )
      orcamentosChanged = true
    }
    if (orcamentosChanged) {
      app.save(orcamentosCol)
    }

    // 4. Backfill de datas nas vendas existentes para garantir integridade caso alguma esteja sem data
    try {
      app
        .db()
        .newQuery(`
        UPDATE vendas
        SET data_inicio = '2025-01-01 00:00:00.000Z'
        WHERE data_inicio IS NULL OR data_inicio = ''
      `)
        .execute()
      app
        .db()
        .newQuery(`
        UPDATE vendas
        SET data_fim = '2025-06-30 00:00:00.000Z'
        WHERE data_fim IS NULL OR data_fim = ''
      `)
        .execute()
    } catch (e) {
      console.log('Backfill vendas datas erro:', e)
    }
  },
  (app) => {
    try {
      const produtosCol = app.findCollectionByNameOrId('produtos')
      if (produtosCol.fields.getByName('valor_locacao_diaria')) {
        produtosCol.fields.removeByName('valor_locacao_diaria')
        app.save(produtosCol)
      }
    } catch (_) {}

    try {
      const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
      let changed = false
      if (orcamentosCol.fields.getByName('data_inicio')) {
        orcamentosCol.fields.removeByName('data_inicio')
        changed = true
      }
      if (orcamentosCol.fields.getByName('data_fim')) {
        orcamentosCol.fields.removeByName('data_fim')
        changed = true
      }
      if (changed) {
        app.save(orcamentosCol)
      }
    } catch (_) {}
  },
)
