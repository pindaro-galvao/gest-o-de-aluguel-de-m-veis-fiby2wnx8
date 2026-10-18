// Bloquear exclusão de endereço quando houver orçamentos ou vendas vinculadas
// E garantir que ao marcar um endereço como principal, desmarca outros do mesmo cliente

onRecordDeleteRequest((e) => {
  const endId = e.record.id

  const totalOrcamentos = $app.countRecords(
    'orcamentos',
    $dbx.exp('endereco = {:endId}', { endId: endId }),
  )
  if (totalOrcamentos > 0) {
    throw new BadRequestError(
      'Não é possível excluir este endereço pois existem ' +
        totalOrcamentos +
        ' orçamento(s) vinculado(s). Caso não utilize mais este endereço, desative-o ao invés de excluir.',
    )
  }

  const totalVendas = $app.countRecords('vendas', $dbx.exp('endereco = {:endId}', { endId: endId }))
  if (totalVendas > 0) {
    throw new BadRequestError(
      'Não é possível excluir este endereço pois existem ' +
        totalVendas +
        ' contrato(s) de locação vinculado(s). Desative o endereço ao invés de excluir para manter o histórico.',
    )
  }
}, 'enderecos')

// Hook para manter apenas 1 endereço principal por cliente ao salvar (inline callback)
onRecordCreateRequest((e) => {
  if (!e.record) return e.next()
  if (!e.record.getBool('principal')) return e.next()

  const clienteId = e.record.getString('cliente')
  try {
    $app
      .db()
      .newQuery('UPDATE enderecos SET principal = 0 WHERE cliente = {:clienteId}')
      .bind({ clienteId: clienteId })
      .execute()
  } catch (_) {}
  return e.next()
}, 'enderecos')

onRecordUpdateRequest((e) => {
  if (!e.record) return e.next()
  if (!e.record.getBool('principal')) return e.next()

  const clienteId = e.record.getString('cliente')
  const recordId = e.record.id
  try {
    $app
      .db()
      .newQuery(
        'UPDATE enderecos SET principal = 0 WHERE cliente = {:clienteId} AND id != {:recordId}',
      )
      .bind({ clienteId: clienteId, recordId: recordId })
      .execute()
  } catch (_) {}
  return e.next()
}, 'enderecos')
