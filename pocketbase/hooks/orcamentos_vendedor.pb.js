// Auto-assign authenticated user as vendedor for orcamentos
onRecordCreateRequest((e) => {
  if (e.auth) {
    e.record.set('vendedor', e.auth.id)
  }
}, 'orcamentos')
