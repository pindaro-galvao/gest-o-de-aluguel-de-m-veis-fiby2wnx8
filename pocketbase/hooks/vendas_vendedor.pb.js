// Auto-assign authenticated user as vendedor for vendas
onRecordCreateRequest((e) => {
  if (e.auth) {
    e.record.set('vendedor', e.auth.id)
  }
}, 'vendas')
