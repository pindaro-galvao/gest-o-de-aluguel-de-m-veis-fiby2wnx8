migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    // 1. Criar coleção 'enderecos'
    // ADMIN e VENDEDOR veem e gerenciam endereços de qualquer cliente.
    // CLIENTE vê e gerencia apenas endereços do seu próprio cliente (cliente.usuario = @request.auth.id).
    const enderecos = new Collection({
      name: 'enderecos',
      type: 'base',
      listRule:
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || cliente.usuario = @request.auth.id",
      viewRule:
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || cliente.usuario = @request.auth.id",
      createRule:
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || cliente.usuario = @request.auth.id",
      updateRule:
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || cliente.usuario = @request.auth.id",
      deleteRule:
        "@request.auth.role = 'ADMIN' || @request.auth.role = 'VENDEDOR' || cliente.usuario = @request.auth.id",
      fields: [
        {
          name: 'cliente',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'identificacao', type: 'text' },
        { name: 'logradouro', type: 'text', required: true },
        { name: 'numero', type: 'text', required: true },
        { name: 'complemento', type: 'text' },
        { name: 'bairro', type: 'text', required: true },
        { name: 'cidade', type: 'text', required: true },
        { name: 'uf', type: 'text', required: true },
        { name: 'cep', type: 'text' },
        { name: 'principal', type: 'bool' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_enderecos_cliente ON enderecos (cliente)',
        'CREATE INDEX idx_enderecos_principal ON enderecos (principal)',
        'CREATE INDEX idx_enderecos_ativo ON enderecos (ativo)',
      ],
    })
    app.save(enderecos)

    // 2. Adicionar campo 'endereco' na coleção 'orcamentos' apontando para 'enderecos'
    const orcamentos = app.findCollectionByNameOrId('orcamentos')
    if (!orcamentos.fields.getByName('endereco')) {
      orcamentos.fields.add(
        new RelationField({
          name: 'endereco',
          collectionId: enderecos.id,
          maxSelect: 1,
          cascadeDelete: false,
          required: false,
        }),
      )
      orcamentos.indexes.push('CREATE INDEX idx_orcamentos_endereco ON orcamentos (endereco)')
      app.save(orcamentos)
    }

    // 3. Adicionar campo 'endereco' também na coleção 'vendas' caso exista para sincronia de contratos
    const vendas = app.findCollectionByNameOrId('vendas')
    if (!vendas.fields.getByName('endereco')) {
      vendas.fields.add(
        new RelationField({
          name: 'endereco',
          collectionId: enderecos.id,
          maxSelect: 1,
          cascadeDelete: false,
          required: false,
        }),
      )
      vendas.indexes.push('CREATE INDEX idx_vendas_endereco ON vendas (endereco)')
      app.save(vendas)
    }

    // 4. Migração idempotente dos endereços existentes dos clientes para a coleção enderecos
    const allClientes = app.findRecordsByFilter('clientes', '', 'created', 5000, 0)
    for (const c of allClientes) {
      // Checar se já existe algum endereço cadastrado para este cliente
      const existing = app.findRecordsByFilter('enderecos', `cliente = "${c.id}"`, 'created', 1, 0)
      if (existing.length > 0) {
        continue // já migrado ou já possui endereços
      }

      const rawEnd = (c.getString('endereco') || '').trim()
      let logradouro = rawEnd || 'ENDEREÇO NÃO ESPECIFICADO'
      let numero = 'S/N'
      let complemento = ''
      let bairro = 'CENTRO'
      let cidade = 'SÃO PAULO'
      let uf = 'SP'
      let cep = ''

      if (rawEnd) {
        // Tentar parse básico de "LOGRADOURO, NUMERO, COMPL - BAIRRO, CIDADE/UF"
        // Ex: "AV. PAULISTA, 1500, APTO 82 - BELA VISTA, SÃO PAULO/SP"
        // Ex: "RUA OSCAR FREIRE, 320 - JARDINS, SÃO PAULO/SP"
        const dashParts = rawEnd.split('-')
        if (dashParts.length >= 2) {
          const firstPart = dashParts[0].trim() // "AV. PAULISTA, 1500, APTO 82"
          const secondPart = dashParts.slice(1).join('-').trim() // "BELA VISTA, SÃO PAULO/SP"

          const firstCommaParts = firstPart.split(',')
          if (firstCommaParts.length >= 1) logradouro = firstCommaParts[0].trim()
          if (firstCommaParts.length >= 2) numero = firstCommaParts[1].trim()
          if (firstCommaParts.length >= 3) complemento = firstCommaParts.slice(2).join(', ').trim()

          const secondCommaParts = secondPart.split(',')
          if (secondCommaParts.length >= 1) bairro = secondCommaParts[0].trim()
          if (secondCommaParts.length >= 2) {
            const cityState = secondCommaParts.slice(1).join(',').trim()
            if (cityState.includes('/')) {
              const [cName, uName] = cityState.split('/')
              cidade = cName.trim()
              uf = uName.trim()
            } else {
              cidade = cityState
            }
          }
        }
      }

      const endRec = new Record(enderecos)
      endRec.set('cliente', c.id)
      endRec.set('identificacao', 'PRINCIPAL')
      endRec.set('logradouro', (logradouro || 'ENDEREÇO PRINCIPAL').toUpperCase())
      endRec.set('numero', (numero || 'S/N').toUpperCase())
      endRec.set('complemento', (complemento || '').toUpperCase())
      endRec.set('bairro', (bairro || 'CENTRO').toUpperCase())
      endRec.set('cidade', (cidade || 'SÃO PAULO').toUpperCase())
      endRec.set('uf', (uf || 'SP').toUpperCase())
      endRec.set('cep', cep)
      endRec.set('principal', true)
      endRec.set('ativo', true)
      app.save(endRec)

      // Vincular os orçamentos existentes deste cliente a este endereço recém criado
      const clienteOrcamentos = app.findRecordsByFilter(
        'orcamentos',
        `cliente = "${c.id}" && (endereco = "" || endereco = null)`,
        'created',
        2000,
        0,
      )
      for (const o of clienteOrcamentos) {
        o.set('endereco', endRec.id)
        app.save(o)
      }

      // Vincular as vendas existentes deste cliente a este endereço recém criado
      const clienteVendas = app.findRecordsByFilter(
        'vendas',
        `cliente = "${c.id}" && (endereco = "" || endereco = null)`,
        'created',
        2000,
        0,
      )
      for (const v of clienteVendas) {
        v.set('endereco', endRec.id)
        app.save(v)
      }
    }
  },
  (app) => {
    try {
      const orcamentos = app.findCollectionByNameOrId('orcamentos')
      if (orcamentos.fields.getByName('endereco')) {
        orcamentos.fields.removeByName('endereco')
        app.save(orcamentos)
      }
    } catch (_) {}

    try {
      const vendas = app.findCollectionByNameOrId('vendas')
      if (vendas.fields.getByName('endereco')) {
        vendas.fields.removeByName('endereco')
        app.save(vendas)
      }
    } catch (_) {}

    try {
      const enderecos = app.findCollectionByNameOrId('enderecos')
      app.delete(enderecos)
    } catch (_) {}
  },
)
