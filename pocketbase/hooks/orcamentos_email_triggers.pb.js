// Gatilhos de e-mail do ciclo de orçamentos — LP MÓVEIS.
// Depende das funções definidas em notify_lib.pb.js (carregado antes deste).
//
// Eventos notificados (sempre APÓS a gravação — e-mail nunca quebra a ação):
//   - status -> 'enviado'    : proposta criada/reenviada          -> CLIENTE
//   - status -> 'aprovado'   : aprovação                          -> VENDEDOR/ADMINs
//   - status -> 'recusado'   : recusa                             -> VENDEDOR/ADMINs
//   - status -> 'convertido' : conversão em venda                 -> CLIENTE
// (A expiração via cron é notificada no próprio job expirar_orcamentos.pb.js.)

// Criação de orçamento já com status 'enviado' (fluxo padrão do sistema)
onRecordAfterCreateSuccess(function (e) {
  var orc = e.record
  if (orc.get('status') === 'enviado') {
    notificarEventoOrcamento('ENVIADO', orc, { reenvio: false })
  }
  return e.next()
}, 'orcamentos')

// Mudanças de status em atualizações (aprovar, recusar, reenviar, converter)
onRecordAfterUpdateSuccess(function (e) {
  var orc = e.record
  var statusAnterior = orc.original().get('status')
  var statusNovo = orc.get('status')
  if (statusNovo === statusAnterior) return e.next()

  var quem = ''
  try {
    if (e.auth) {
      var nome = e.auth.get('name')
      var email = e.auth.get('email')
      quem = nome ? String(nome) : String(email || '')
    }
  } catch (_) {}

  if (statusNovo === 'enviado') {
    // Reenvio com nova validade (a criação é coberta pelo hook de create)
    notificarEventoOrcamento('ENVIADO', orc, { reenvio: true })
  } else if (statusNovo === 'aprovado') {
    notificarEventoOrcamento('APROVADO', orc, { autoridade: quem })
  } else if (statusNovo === 'recusado') {
    notificarEventoOrcamento('RECUSADO', orc, { autoridade: quem })
  } else if (statusNovo === 'convertido') {
    var endereco = null
    var enderecoId = orc.get('endereco')
    if (enderecoId) {
      try {
        endereco = $app.findRecordById('enderecos', enderecoId)
      } catch (_) {
        endereco = null
      }
    }
    notificarEventoOrcamento('CONVERTIDO', orc, { endereco: endereco })
  }
  return e.next()
}, 'orcamentos')
