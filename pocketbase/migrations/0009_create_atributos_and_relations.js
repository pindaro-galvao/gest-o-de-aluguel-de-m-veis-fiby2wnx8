migrate(
  (app) => {
    // 1. Coleção atributos
    if (!app.hasTable('atributos')) {
      const atributos = new Collection({
        name: 'atributos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'ADMIN'",
        updateRule: "@request.auth.role = 'ADMIN'",
        deleteRule: "@request.auth.role = 'ADMIN'",
        fields: [
          { name: 'codigo_atr', type: 'text', required: true },
          { name: 'descricao_atr', type: 'text', required: true },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_atributos_codigo_atr ON atributos (codigo_atr)'],
      })
      app.save(atributos)
    }

    const atributosCol = app.findCollectionByNameOrId('atributos')
    const produtosCol = app.findCollectionByNameOrId('produtos')

    // 2. Adicionar os 9 campos atr01..atr09 na coleção produtos (relation -> atributos, opcionais)
    const atrFields = [
      'atr01',
      'atr02',
      'atr03',
      'atr04',
      'atr05',
      'atr06',
      'atr07',
      'atr08',
      'atr09',
    ]

    for (const atrName of atrFields) {
      if (!produtosCol.fields.getByName(atrName)) {
        produtosCol.fields.add(
          new RelationField({
            name: atrName,
            collectionId: atributosCol.id,
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
          }),
        )
      }
    }
    app.save(produtosCol)

    // 3. Popular atributos de exemplo para contexto de cores e materiais TIDELLI
    const seedAtributos = [
      { codigo_atr: 'TECIDO-LINHO-BEGE', descricao_atr: 'Tecido Linho Bege', ativo: true },
      { codigo_atr: 'MADEIRA-TAUARI', descricao_atr: 'Madeira Tauari', ativo: true },
      { codigo_atr: 'COR-GRAFITE', descricao_atr: 'Cor Grafite', ativo: true },
      { codigo_atr: 'TECIDO-VELUDO-VERDE', descricao_atr: 'Tecido Veludo Verde', ativo: true },
      { codigo_atr: 'MADEIRA-NOGAL', descricao_atr: 'Madeira Nogal', ativo: true },
      { codigo_atr: 'COR-NATURAL', descricao_atr: 'Cor Natural', ativo: true },
      { codigo_atr: 'CORDA-AZUL-NAVY', descricao_atr: 'Corda Náutica Azul Navy', ativo: true },
      { codigo_atr: 'CORDA-TERRACOTA', descricao_atr: 'Corda Náutica Terracota', ativo: true },
      {
        codigo_atr: 'ALUMINIO-FOSCO-CHAMPAGNE',
        descricao_atr: 'Alumínio Champagne Fosco',
        ativo: true,
      },
      {
        codigo_atr: 'FIBRA-SINTETICA-CARAMELO',
        descricao_atr: 'Fibra Sintética Caramelo',
        ativo: true,
      },
    ]

    const atributosMap = {}

    for (const item of seedAtributos) {
      let rec
      try {
        rec = app.findFirstRecordByData('atributos', 'codigo_atr', item.codigo_atr)
      } catch (_) {
        rec = new Record(atributosCol)
        rec.set('codigo_atr', item.codigo_atr)
        rec.set('descricao_atr', item.descricao_atr)
        rec.set('ativo', item.ativo)
        app.save(rec)
      }
      atributosMap[item.codigo_atr] = rec.id
    }

    // 4. Vincular alguns atributos aos produtos de exemplo para visualização imediata
    const vinculacoes = [
      {
        nome: 'Sofá Retrátil Maui 3 Lugares',
        atributos: ['CORDA-TERRACOTA', 'TECIDO-LINHO-BEGE', 'ALUMINIO-FOSCO-CHAMPAGNE'],
      },
      {
        nome: 'Mesa de Jantar Biarritz 8 Lugares',
        atributos: ['MADEIRA-TAUARI', 'COR-GRAFITE'],
      },
      {
        nome: 'Cadeira Club com Braços',
        atributos: ['CORDA-AZUL-NAVY', 'TECIDO-LINHO-BEGE'],
      },
      {
        nome: 'Cama Box Queen Tulum com Cabeceira',
        atributos: ['TECIDO-LINHO-BEGE', 'MADEIRA-NOGAL'],
      },
      {
        nome: 'Poltrona Reclinável Painho com Puff',
        atributos: ['CORDA-AZUL-NAVY', 'TECIDO-VELUDO-VERDE', 'COR-NATURAL'],
      },
      {
        nome: 'Estante Modular Industrial Trancoso',
        atributos: ['MADEIRA-TAUARI', 'COR-GRAFITE'],
      },
    ]

    for (const vinc of vinculacoes) {
      try {
        const prod = app.findFirstRecordByData('produtos', 'nome', vinc.nome)
        vinc.atributos.forEach((cod, idx) => {
          const fieldName = `atr0${idx + 1}`
          const atrId = atributosMap[cod]
          if (atrId && (!prod.getString(fieldName) || prod.getString(fieldName) === '')) {
            prod.set(fieldName, atrId)
          }
        })
        app.save(prod)
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const produtosCol = app.findCollectionByNameOrId('produtos')
      for (let i = 1; i <= 9; i++) {
        const fieldName = `atr0${i}`
        if (produtosCol.fields.getByName(fieldName)) {
          produtosCol.fields.removeByName(fieldName)
        }
      }
      app.save(produtosCol)
    } catch (_) {}

    try {
      const atributosCol = app.findCollectionByNameOrId('atributos')
      app.delete(atributosCol)
    } catch (_) {}
  },
)
