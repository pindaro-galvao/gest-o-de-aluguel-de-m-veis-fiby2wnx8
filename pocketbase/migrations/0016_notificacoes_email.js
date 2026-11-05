// Migração 0016 — LP MÓVEIS: coleção de controle de notificações por e-mail.
// Registra um envio por (orçamento, evento) para impedir e-mail duplicado
// (ex.: job de expiração + validade derivada no frontend).
migrate(
  (app) => {
    const collection = new Collection({
      name: 'notificacoes_email',
      type: 'base',
      listRule: "@request.auth.role = 'ADMIN'",
      viewRule: "@request.auth.role = 'ADMIN'",
      createRule: null,
      updateRule: null,
      deleteRule: "@request.auth.role = 'ADMIN'",
      fields: [
        {
          name: 'orcamento',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('orcamentos').id,
          maxSelect: 1,
        },
        {
          name: 'evento',
          type: 'select',
          required: true,
          values: ['ENVIADO', 'APROVADO', 'RECUSADO', 'EXPIRADO', 'CONVERTIDO'],
          maxSelect: 1,
        },
        { name: 'destinatario', type: 'text', required: false, max: 200 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_notificacoes_orcamento_evento ON notificacoes_email (orcamento, evento)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('notificacoes_email')
      app.delete(collection)
    } catch (_) {}
  },
)
