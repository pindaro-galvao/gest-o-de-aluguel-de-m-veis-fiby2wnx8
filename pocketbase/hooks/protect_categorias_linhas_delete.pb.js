// Bloquear exclusão de categorias e linhas quando houver produtos vinculados
onRecordDeleteRequest((e) => {
  const catId = e.record.id
  const total = $app.countRecords('produtos', $dbx.exp('tipo = {:catId}', { catId: catId }))
  if (total > 0) {
    throw new BadRequestError(
      'Não é possível excluir esta categoria pois existem ' +
        total +
        ' produto(s) vinculado(s). Reclassifique ou desative os produtos primeiro.',
    )
  }
}, 'categorias')

onRecordDeleteRequest((e) => {
  const linId = e.record.id
  const total = $app.countRecords('produtos', $dbx.exp('linha = {:linId}', { linId: linId }))
  if (total > 0) {
    throw new BadRequestError(
      'Não é possível excluir esta linha pois existem ' +
        total +
        ' produto(s) vinculado(s). Reclassifique ou desative os produtos primeiro.',
    )
  }
}, 'linhas')
