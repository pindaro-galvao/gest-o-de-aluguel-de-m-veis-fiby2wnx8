// Auto-assign authenticated user as vendedor for vendas if not already provided (e.g. converted from orcamento by admin)
onRecordCreateRequest((e) => {
  if (!e.record.get('vendedor') && e.auth) {
    e.record.set('vendedor', e.auth.id)
  }
  return e.next()
}, 'vendas')
