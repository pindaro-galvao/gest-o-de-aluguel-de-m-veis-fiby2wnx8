// Auto-assign authenticated user as vendedor for orcamentos if user is VENDEDOR or ADMIN and not provided
// If created by CLIENTE, leave vendedor empty so it can be picked up later or managed by admin/vendedores
onRecordCreateRequest((e) => {
  if (!e.record.get('vendedor') && e.auth && e.auth.get('role') !== 'CLIENTE') {
    e.record.set('vendedor', e.auth.id)
  }
  return e.next()
}, 'orcamentos')
