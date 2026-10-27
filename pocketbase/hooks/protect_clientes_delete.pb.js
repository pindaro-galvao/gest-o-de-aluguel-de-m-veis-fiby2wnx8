// Bloquear exclusão de clientes quando houver locação aprovada / ativa em seu nome
onRecordDeleteRequest((e) => {
  const clienteId = e.record.id

  // Checar se o cliente possui vendas com status 'aprovada' ou 'ativa'
  const totalVendasAprovadas = $app.countRecords(
    'vendas',
    $dbx.exp('cliente = {:clienteId} AND (status = "aprovada" || status = "ativa")', {
      clienteId: clienteId,
    }),
  )

  if (totalVendasAprovadas > 0) {
    throw new BadRequestError(
      'CLIENTE POSSUI LOCAÇÃO APROVADA — NÃO É POSSÍVEL EXCLUIR. Existem contratos vinculados ao cliente.',
    )
  }

  return e.next()
}, 'clientes')
