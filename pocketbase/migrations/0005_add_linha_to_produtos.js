migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('produtos')
    if (!col.fields.getByName('linha')) {
      col.fields.add(
        new TextField({
          name: 'linha',
          required: false,
        }),
      )
      col.addIndex('idx_produtos_linha', false, 'linha', '')
      app.save(col)
    }

    // Opcional: preencher linha nos produtos de exemplo já existentes (idempotente)
    const seedLinhas = [
      { nome: 'Sofá Retrátil Maui 3 Lugares', linha: 'Maui' },
      { nome: 'Mesa de Jantar Biarritz 8 Lugares', linha: 'Biarritz' },
      { nome: 'Cadeira Club com Braços', linha: 'Club' },
      { nome: 'Cama Box Queen Tulum com Cabeceira', linha: 'Tulum' },
      { nome: 'Armário Guarda-Roupa 4 Portas Maragogi', linha: 'Maragogi' },
      { nome: 'Estante Modular Industrial Trancoso', linha: 'Trancoso' },
      { nome: 'Poltrona Reclinável Painho com Puff', linha: 'Painho' },
      { nome: 'Aparador Noronha 2 Gavetas', linha: 'Noronha' },
    ]

    for (const item of seedLinhas) {
      try {
        const prod = app.findFirstRecordByData('produtos', 'nome', item.nome)
        if (!prod.getString('linha')) {
          prod.set('linha', item.linha)
          app.save(prod)
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('produtos')
      const f = col.fields.getByName('linha')
      if (f) {
        col.removeIndex('idx_produtos_linha')
        col.fields.removeByName('linha')
        app.save(col)
      }
    } catch (_) {}
  },
)
