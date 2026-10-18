migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('produtos')

    // 1. Adicionar campo 'codigo' inicialmente não obrigatório para permitir backfill
    if (!col.fields.getByName('codigo')) {
      col.fields.add(
        new TextField({
          name: 'codigo',
          required: false,
        }),
      )
      app.save(col)
    }

    // 2. Mapeamento padrão dos 8 produtos de exemplo existentes
    // Padrão solicitado: "TDL-XXX-001" baseado na linha real (ou TDL-001... se sem linha)
    const seedMap = [
      { nome: 'Sofá Retrátil Maui 3 Lugares', codigo: 'TDL-MAU-001' },
      { nome: 'Mesa de Jantar Biarritz 8 Lugares', codigo: 'TDL-BIA-001' },
      { nome: 'Cadeira Club com Braços', codigo: 'TDL-CLU-001' },
      { nome: 'Cama Box Queen Tulum com Cabeceira', codigo: 'TDL-TUL-001' },
      { nome: 'Armário Guarda-Roupa 4 Portas Maragogi', codigo: 'TDL-MAR-001' },
      { nome: 'Estante Modular Industrial Trancoso', codigo: 'TDL-TRA-001' },
      { nome: 'Poltrona Reclinável Painho com Puff', codigo: 'TDL-PAI-001' },
      { nome: 'Aparador Noronha 2 Gavetas', codigo: 'TDL-NOR-001' },
    ]

    for (const item of seedMap) {
      try {
        const prod = app.findFirstRecordByData('produtos', 'nome', item.nome)
        const codigoAtual = prod.getString('codigo')
        if (!codigoAtual || codigoAtual.trim() === '') {
          prod.set('codigo', item.codigo)
          app.save(prod)
        }
      } catch (_) {}
    }

    // Preencher qualquer outro produto existente sem código para garantir unicidade e não quebrar o índice
    const todosProdutos = app.findRecordsByFilter('produtos', '', '', 1000, 0)
    let seq = 1
    for (const prod of todosProdutos) {
      const codigoAtual = prod.getString('codigo')
      if (!codigoAtual || codigoAtual.trim() === '') {
        let code = `TDL-${String(seq).padStart(3, '0')}`
        // Tentar obter a linha se houver
        const linhaId = prod.getString('linha')
        if (linhaId) {
          try {
            const linhaRec = app.findRecordById('linhas', linhaId)
            const linhaNome = linhaRec.getString('nome') || ''
            if (linhaNome.length >= 3) {
              const sigla = linhaNome.substring(0, 3).toUpperCase()
              code = `TDL-${sigla}-${String(seq).padStart(3, '0')}`
            }
          } catch (_) {}
        }
        prod.set('codigo', code)
        app.save(prod)
        seq++
      }
    }

    // 3. Atualizar o campo para ser OBRIGATÓRIO (required: true)
    const fieldCodigo = col.fields.getByName('codigo')
    if (fieldCodigo) {
      fieldCodigo.required = true
    }

    // 4. Adicionar índice ÚNICO no campo 'codigo'
    col.addIndex('idx_produtos_codigo', true, 'codigo', '')
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('produtos')
      try {
        col.removeIndex('idx_produtos_codigo')
      } catch (_) {}
      const f = col.fields.getByName('codigo')
      if (f) {
        col.fields.removeByName('codigo')
      }
      app.save(col)
    } catch (_) {}
  },
)
