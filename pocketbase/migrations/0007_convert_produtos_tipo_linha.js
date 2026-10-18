migrate(
  (app) => {
    const colProdutos = app.findCollectionByNameOrId('produtos')
    const colCategorias = app.findCollectionByNameOrId('categorias')
    const colLinhas = app.findCollectionByNameOrId('linhas')

    // 1. Popular registros iniciais de categorias a partir dos 8 valores fixos (se ainda não existirem)
    const seedCategorias = [
      { nome: 'sofá', ordem: 1, descricao: 'Sofás, módulos e chaises' },
      { nome: 'mesa', ordem: 2, descricao: 'Mesas de jantar, centro e apoio' },
      { nome: 'cadeira', ordem: 3, descricao: 'Cadeiras com e sem braços' },
      { nome: 'cama', ordem: 4, descricao: 'Camas box, cabeceiras e recamieres' },
      { nome: 'armário', ordem: 5, descricao: 'Armários, roupeiros e closets' },
      { nome: 'estante', ordem: 6, descricao: 'Estantes e livreiros modulados' },
      { nome: 'poltrona', ordem: 7, descricao: 'Poltronas de design e descanso' },
      { nome: 'aparador', ordem: 8, descricao: 'Aparadores e buffets contemporâneos' },
    ]

    for (const cat of seedCategorias) {
      try {
        app.findFirstRecordByData('categorias', 'nome', cat.nome)
      } catch (_) {
        const r = new Record(colCategorias)
        r.set('nome', cat.nome)
        r.set('ordem', cat.ordem)
        r.set('descricao', cat.descricao)
        r.set('ativo', true)
        app.save(r)
      }
    }

    // 2. Popular registros de linhas a partir dos valores existentes em produtos
    const seedLinhas = [
      { nome: 'Maui', ordem: 1, descricao: 'Linha Maui em corda náutica e alumínio' },
      { nome: 'Biarritz', ordem: 2, descricao: 'Linha Biarritz em madeira teca tratada' },
      { nome: 'Club', ordem: 3, descricao: 'Linha Club com tramas ergonômicas' },
      { nome: 'Tulum', ordem: 4, descricao: 'Linha Tulum com texturas naturais' },
      { nome: 'Maragogi', ordem: 5, descricao: 'Linha Maragogi para ambientes sofisticados' },
      {
        nome: 'Trancoso',
        ordem: 6,
        descricao: 'Linha Trancoso industrial em aço carbono e freijó',
      },
      {
        nome: 'Painho',
        ordem: 7,
        descricao: 'Linha Painho clássico do design artesanal brasileiro',
      },
      { nome: 'Noronha', ordem: 8, descricao: 'Linha Noronha acabamento minimalista' },
    ]

    for (const lin of seedLinhas) {
      try {
        app.findFirstRecordByData('linhas', 'nome', lin.nome)
      } catch (_) {
        const r = new Record(colLinhas)
        r.set('nome', lin.nome)
        r.set('ordem', lin.ordem)
        r.set('descricao', lin.descricao)
        r.set('ativo', true)
        app.save(r)
      }
    }

    // Também verificar se há alguma outra linha já presente em produtos cadastrados
    const produtosExistentes = app.findRecordsByFilter('produtos', '', '', 1000, 0)
    for (const p of produtosExistentes) {
      const nomeLinha = p.getString('linha') ? p.getString('linha').trim() : ''
      if (nomeLinha) {
        try {
          app.findFirstRecordByData('linhas', 'nome', nomeLinha)
        } catch (_) {
          const r = new Record(colLinhas)
          r.set('nome', nomeLinha)
          r.set('ativo', true)
          app.save(r)
        }
      }
    }

    // 3. Preparar conversão dos campos em produtos
    // Passo A: Preservar os valores texto antigos em campos backup (se ainda não salvos)
    // Para rollback seguro, criamos campos text temporários de backup tipo_old e linha_old
    if (!colProdutos.fields.getByName('tipo_old')) {
      colProdutos.fields.add(new TextField({ name: 'tipo_old', required: false }))
    }
    if (!colProdutos.fields.getByName('linha_old')) {
      colProdutos.fields.add(new TextField({ name: 'linha_old', required: false }))
    }
    app.save(colProdutos)

    // Copiar dados existentes para tipo_old e linha_old caso tipo e linha ainda sejam text/select
    const campoTipoAtual = colProdutos.fields.getByName('tipo')
    const campoLinhaAtual = colProdutos.fields.getByName('linha')

    const tipoEraTexto = campoTipoAtual && campoTipoAtual.type !== 'relation'
    const linhaEraTexto = campoLinhaAtual && campoLinhaAtual.type !== 'relation'

    if (tipoEraTexto || linhaEraTexto) {
      app
        .db()
        .newQuery(`
        UPDATE produtos
        SET tipo_old = CASE WHEN tipo_old IS NULL OR tipo_old = '' THEN tipo ELSE tipo_old END,
            linha_old = CASE WHEN linha_old IS NULL OR linha_old = '' THEN linha ELSE linha_old END
      `)
        .execute()
    }

    // Passo B: Substituir campos tipo e linha por RelationField apontando para categorias e linhas
    // Remover índices antigos baseados em tipo e linha text
    try {
      colProdutos.removeIndex('idx_produtos_tipo')
    } catch (_) {}
    try {
      colProdutos.removeIndex('idx_produtos_linha')
    } catch (_) {}

    if (campoTipoAtual && campoTipoAtual.type !== 'relation') {
      colProdutos.fields.removeByName('tipo')
    }
    if (campoLinhaAtual && campoLinhaAtual.type !== 'relation') {
      colProdutos.fields.removeByName('linha')
    }

    if (!colProdutos.fields.getByName('tipo')) {
      colProdutos.fields.add(
        new RelationField({
          name: 'tipo',
          collectionId: colCategorias.id,
          maxSelect: 1,
          cascadeDelete: false,
          required: false, // preencheremos os dados antes de tornar obrigatório se necessário
        }),
      )
    }

    if (!colProdutos.fields.getByName('linha')) {
      colProdutos.fields.add(
        new RelationField({
          name: 'linha',
          collectionId: colLinhas.id,
          maxSelect: 1,
          cascadeDelete: false,
          required: false,
        }),
      )
    }

    colProdutos.addIndex('idx_produtos_tipo', false, 'tipo', '')
    colProdutos.addIndex('idx_produtos_linha', false, 'linha', '')
    app.save(colProdutos)

    // Passo C: Mapear valores tipo_old → id de categorias e linha_old → id de linhas
    const allCategorias = app.findRecordsByFilter('categorias', '', '', 1000, 0)
    for (const cat of allCategorias) {
      app
        .db()
        .newQuery(`
        UPDATE produtos
        SET tipo = {:catId}
        WHERE (tipo IS NULL OR tipo = '' OR tipo = tipo_old)
          AND LOWER(TRIM(tipo_old)) = LOWER(TRIM({:catNome}))
      `)
        .bind({ catId: cat.id, catNome: cat.getString('nome') })
        .execute()
    }

    const allLinhas = app.findRecordsByFilter('linhas', '', '', 1000, 0)
    for (const lin of allLinhas) {
      app
        .db()
        .newQuery(`
        UPDATE produtos
        SET linha = {:linId}
        WHERE (linha IS NULL OR linha = '' OR linha = linha_old)
          AND LOWER(TRIM(linha_old)) = LOWER(TRIM({:linNome}))
      `)
        .bind({ linId: lin.id, linNome: lin.getString('nome') })
        .execute()
    }
  },
  (app) => {
    // Rollback para restaurar campos tipo e linha como texto / select original a partir de tipo_old e linha_old
    try {
      const colProdutos = app.findCollectionByNameOrId('produtos')
      try {
        colProdutos.removeIndex('idx_produtos_tipo')
      } catch (_) {}
      try {
        colProdutos.removeIndex('idx_produtos_linha')
      } catch (_) {}

      const campoTipo = colProdutos.fields.getByName('tipo')
      if (campoTipo && campoTipo.type === 'relation') {
        colProdutos.fields.removeByName('tipo')
      }
      const campoLinha = colProdutos.fields.getByName('linha')
      if (campoLinha && campoLinha.type === 'relation') {
        colProdutos.fields.removeByName('linha')
      }

      colProdutos.fields.add(
        new SelectField({
          name: 'tipo',
          required: true,
          values: ['sofá', 'mesa', 'cadeira', 'cama', 'armário', 'estante', 'poltrona', 'aparador'],
          maxSelect: 1,
        }),
      )
      colProdutos.fields.add(
        new TextField({
          name: 'linha',
          required: false,
        }),
      )
      colProdutos.addIndex('idx_produtos_tipo', false, 'tipo', '')
      colProdutos.addIndex('idx_produtos_linha', false, 'linha', '')
      app.save(colProdutos)

      // Restaurar valores do backup
      app
        .db()
        .newQuery(`
        UPDATE produtos
        SET tipo = tipo_old,
            linha = linha_old
        WHERE tipo_old IS NOT NULL AND tipo_old != ''
      `)
        .execute()
    } catch (_) {}
  },
)
