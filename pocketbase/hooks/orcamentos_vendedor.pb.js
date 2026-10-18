// Auto-assign authenticated user as vendedor for orcamentos if not provided
onRecordCreateRequest((e) => {
  if (!e.record.get('vendedor') && e.auth) {
    e.record.set('vendedor', e.auth.id)
  }
  return e.next()
}, 'orcamentos')
