// Notificações por e-mail do ciclo de orçamentos — LP MÓVEIS (Aluguel de Móveis)
// Envio via Resend usando a conta do DONO do app (Conectores) — $connectors.executeAsOwner.
// REGRA CRÍTICA: o envio NUNCA quebra a ação do usuário. Toda falha é apenas
// registrada no log do backend (console) e a operação (aprovar, recusar,
// reenviar, converter) segue normalmente.

var EMAIL_REMETENTE = 'LP MÓVEIS <onboarding@resend.dev>'
var APP_URL = 'https://gestao-de-aluguel-de-moveis-c238d.shrd01.internal.goskip.dev'

// ---------------------------------------------------------------------------
// Envio bruto — nunca lança exceção
// ---------------------------------------------------------------------------

function enviarEmailResend(para, assunto, html) {
  try {
    var resposta = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
      from: EMAIL_REMETENTE,
      to: [para],
      subject: assunto,
      html: html,
    })
    if (!resposta || resposta.successful === false) {
      console.error(
        '[email] Falha ao enviar e-mail para ' + para + ' (assunto: ' + assunto + ')',
        resposta && resposta.error,
      )
      return false
    }
    console.log('[email] Enviado: "' + assunto + '" -> ' + para)
    return true
  } catch (erro) {
    console.error(
      '[email] Erro no conector Resend ao enviar para ' + para + ' (assunto: ' + assunto + ')',
      erro && erro.message,
    )
    return false
  }
}

function emailValido(v) {
  if (!v || typeof v !== 'string') return false
  return v.indexOf('@') > 0 && v.indexOf('.') > 0
}

// ---------------------------------------------------------------------------
// Helpers de formatação (datas em UTC, moeda em BRL, escape de HTML)
// ---------------------------------------------------------------------------

function formatarData(iso) {
  if (!iso) return '—'
  var data = new Date(iso)
  if (isNaN(data.getTime())) return '—'
  var d = data.getUTCDate()
  var m = data.getUTCMonth() + 1
  var a = data.getUTCFullYear()
  return (d < 10 ? '0' + d : '' + d) + '/' + (m < 10 ? '0' + m : '' + m) + '/' + a
}

function formatarMoeda(valor) {
  var v = Number(valor) || 0
  var inteiro = Math.floor(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  var centavos = Math.round((v - Math.floor(v)) * 100).toString()
  if (centavos.length < 2) centavos = '0' + centavos
  return 'R$ ' + inteiro + ',' + centavos
}

function esc(t) {
  if (t === undefined || t === null) return ''
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function numeroOrcamento(orc) {
  return '#' + String(orc.id).substring(0, 7).toUpperCase()
}

// ---------------------------------------------------------------------------
// Template base — padrão visual do sistema (tons madeira/grafite, caixa alta)
// ---------------------------------------------------------------------------

function emailWrap(tituloInterno, blocoConteudo) {
  var html = ''
  html +=
    '<div style="margin:0;padding:24px;background-color:#F5F2ED;font-family:Arial,Helvetica,sans-serif;">'
  html +=
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E5E0DA;">'
  html += '<tr><td style="background-color:#2B2B2B;padding:20px 24px;text-align:center;">'
  html +=
    '<div style="color:#FFFFFF;font-size:18px;font-weight:bold;letter-spacing:2px;">LP MÓVEIS</div>'
  html +=
    '<div style="color:#A67C52;font-size:12px;letter-spacing:3px;margin-top:4px;">ALUGUEL DE MÓVEIS</div>'
  html += '</td></tr>'
  html += '<tr><td style="padding:24px;border-bottom:4px solid #A67C52;">'
  html +=
    '<div style="color:#2B2B2B;font-size:16px;font-weight:bold;letter-spacing:1px;margin-bottom:16px;">' +
    esc(tituloInterno) +
    '</div>'
  html += '<div style="color:#2B2B2B;font-size:14px;line-height:1.6;">' + blocoConteudo + '</div>'
  html += '</td></tr>'
  html +=
    '<tr><td style="background-color:#F5F2ED;padding:16px 24px;color:#6B6B6B;font-size:11px;letter-spacing:1px;text-align:center;">'
  html += 'LP MÓVEIS — ALUGUEL DE MÓVEIS &nbsp;·&nbsp; ESTA É UMA MENSAGEM AUTOMÁTICA DO SISTEMA.'
  html += '</td></tr>'
  html += '</table></div>'
  return html
}

function paragrafo(texto) {
  return '<p style="margin:0 0 12px 0;">' + texto + '</p>'
}

function linkProposta() {
  return (
    '<div style="margin-top:16px;"><a href="' +
    APP_URL +
    '/orcamentos" ' +
    'style="display:inline-block;background-color:#A67C52;color:#FFFFFF;text-decoration:none;' +
    'font-size:12px;font-weight:bold;letter-spacing:2px;padding:10px 18px;">VER PROPOSTA NO SISTEMA</a></div>'
  )
}

function linhaResumo(rotulo, valor) {
  return (
    '<tr>' +
    '<td style="padding:4px 0;color:#6B6B6B;font-size:12px;letter-spacing:1px;width:170px;">' +
    esc(rotulo) +
    '</td>' +
    '<td style="padding:4px 0;color:#2B2B2B;font-size:13px;font-weight:bold;">' +
    esc(valor) +
    '</td>' +
    '</tr>'
  )
}

// Resumo comum da proposta: número, cliente, período, total, validade e itens
function blocoResumoProposta(orc, cliente, itens) {
  var nomeCliente = cliente && cliente.get ? cliente.get('nome') : ''
  var html = ''
  html +=
    '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">'
  html += linhaResumo('ORÇAMENTO Nº', numeroOrcamento(orc))
  html += linhaResumo('CLIENTE', nomeCliente || '—')
  if (orc.get('data_inicio') && orc.get('data_fim')) {
    html += linhaResumo(
      'PERÍODO',
      'DE ' + formatarData(orc.get('data_inicio')) + ' A ' + formatarData(orc.get('data_fim')),
    )
  }
  html += linhaResumo('VALOR TOTAL', formatarMoeda(orc.get('valor_total')))
  html += linhaResumo('VALIDADE DA PROPOSTA', formatarData(orc.get('validade')))
  html += '</table>'

  html +=
    '<div style="margin:16px 0 8px 0;color:#A67C52;font-size:12px;font-weight:bold;letter-spacing:2px;">MÓVEIS DA PROPOSTA</div>'
  html +=
    '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">'
  html +=
    '<tr>' +
    '<td style="padding:6px 8px;background-color:#F5F2ED;color:#6B6B6B;font-size:11px;letter-spacing:1px;border-bottom:1px solid #E5E0DA;">CÓDIGO</td>' +
    '<td style="padding:6px 8px;background-color:#F5F2ED;color:#6B6B6B;font-size:11px;letter-spacing:1px;border-bottom:1px solid #E5E0DA;">MÓVEL</td>' +
    '<td style="padding:6px 8px;background-color:#F5F2ED;color:#6B6B6B;font-size:11px;letter-spacing:1px;border-bottom:1px solid #E5E0DA;">QTD.</td>' +
    '<td style="padding:6px 8px;background-color:#F5F2ED;color:#6B6B6B;font-size:11px;letter-spacing:1px;border-bottom:1px solid #E5E0DA;">DIÁRIA</td>' +
    '</tr>'
  var temItens = false
  if (itens && itens.length) {
    for (var i = 0; i < itens.length; i++) {
      var it = itens[i]
      var produto = it.get('produto_expand')
      var codigo = produto && produto.get ? produto.get('codigo') : ''
      var nomeProduto = produto && produto.get ? produto.get('nome') : ''
      var diaria = produto && produto.get ? produto.get('valor_locacao_diaria') : 0
      html +=
        '<tr>' +
        '<td style="padding:6px 8px;color:#2B2B2B;font-size:12px;font-weight:bold;border-bottom:1px solid #F5F2ED;">' +
        esc(codigo || '—') +
        '</td>' +
        '<td style="padding:6px 8px;color:#2B2B2B;font-size:12px;border-bottom:1px solid #F5F2ED;">' +
        esc(nomeProduto || 'MÓVEL') +
        '</td>' +
        '<td style="padding:6px 8px;color:#2B2B2B;font-size:12px;border-bottom:1px solid #F5F2ED;">' +
        esc(it.get('quantidade')) +
        '</td>' +
        '<td style="padding:6px 8px;color:#2B2B2B;font-size:12px;border-bottom:1px solid #F5F2ED;">' +
        esc(formatarMoeda(diaria)) +
        '</td>' +
        '</tr>'
      temItens = true
    }
  }
  if (!temItens) {
    html +=
      '<tr><td colspan="4" style="padding:8px;color:#6B6B6B;font-size:12px;">SEM ITENS CADASTRADOS NESTA PROPOSTA.</td></tr>'
  }
  html += '</table>'
  return html
}

// ---------------------------------------------------------------------------
// Roteamento interno: vendedor responsável e/ou ADMINs. Nunca lança exceção.
// ---------------------------------------------------------------------------

function enviarParaEquipe(orc, assunto, html) {
  var enviados = {}
  var jaMandou = function (email) {
    var chave = String(email).toLowerCase()
    if (enviados[chave]) return true
    enviados[chave] = true
    return false
  }
  var idVendedor = orc && orc.get ? orc.get('vendedor') : ''
  if (idVendedor) {
    try {
      var vendedor = $app.findRecordById('users', idVendedor)
      var emailVendedor = vendedor.get('email')
      if (emailValido(emailVendedor)) {
        enviarEmailResend(emailVendedor, assunto, html)
        jaMandou(emailVendedor)
      }
    } catch (_) {
      console.warn(
        '[email] Orçamento ' + orc.id + ': vendedor não encontrado — notificando ADMINs.',
      )
    }
  }
  if (!Object.keys(enviados).length) {
    // Cliente criou o orçamento sem vendedor atribuído -> notifica os ADMINs
    try {
      var admins = $app.findRecordsByFilter('users', "role = 'ADMIN'", '', 20, 0)
      for (var i = 0; i < admins.length; i++) {
        var emailAdmin = admins[i].get('email')
        if (emailValido(emailAdmin) && !jaMandou(emailAdmin)) {
          enviarEmailResend(emailAdmin, assunto, html)
        }
      }
    } catch (erro) {
      console.error('[email] Falha ao buscar ADMINs para notificar:', erro && erro.message)
    }
  }
}

// ---------------------------------------------------------------------------
// Eventos do ciclo de orçamento
// ---------------------------------------------------------------------------

// 1) ORÇAMENTO ENVIADO (criação nova ou reenvio com nova validade) -> CLIENTE
function emailOrcamentoEnviado(orc, cliente, itens, ehReenvio) {
  if (!cliente || !cliente.get) return
  var emailCliente = cliente.get('email')
  if (!emailValido(emailCliente)) {
    console.warn('[email] Orçamento ' + orc.id + ': cliente sem e-mail válido — envio cancelado.')
    return
  }
  var assunto = ehReenvio
    ? 'LP MÓVEIS — PROPOSTA REENVIADA COM NOVA VALIDADE'
    : 'LP MÓVEIS — NOVA PROPOSTA DE LOCAÇÃO'
  var intro = ehReenvio
    ? 'SUA PROPOSTA DE LOCAÇÃO FOI REENVIADA COM NOVA DATA DE VALIDADE. CONFIRA OS DETALHES ABAIXO:'
    : 'REGISTRAMOS SUA PROPOSTA DE LOCAÇÃO DE MÓVEIS. CONFIRA OS DETALHES ABAIXO:'
  var corpo = paragrafo(intro) + blocoResumoProposta(orc, cliente, itens) + linkProposta()
  enviarEmailResend(emailCliente, assunto, emailWrap('PROPOSTA DE LOCAÇÃO', corpo))
}

// 2) ORÇAMENTO APROVADO -> VENDEDOR (ou ADMINs se não houver vendedor)
function emailOrcamentoAprovado(orc, cliente, itens, autoridade) {
  var detalhe = autoridade ? ' (REGISTRO FEITO POR ' + esc(autoridade) + ')' : ''
  var corpo =
    paragrafo(
      'O CLIENTE APROVOU A PROPOSTA ABAIXO' +
        detalhe +
        '. LEMBRE-SE DE CONVERTÊ-LA EM VENDA NO SISTEMA:',
    ) + blocoResumoProposta(orc, cliente, itens)
  enviarParaEquipe(orc, 'LP MÓVEIS — ORÇAMENTO APROVADO', emailWrap('ORÇAMENTO APROVADO', corpo))
}

// 3) ORÇAMENTO RECUSADO -> VENDEDOR (ou ADMINs)
function emailOrcamentoRecusado(orc, cliente, itens, autoridade) {
  var detalhe = autoridade ? ' (REGISTRO FEITO POR ' + esc(autoridade) + ')' : ''
  var corpo =
    paragrafo(
      'O CLIENTE RECUSOU A PROPOSTA ABAIXO' +
        detalhe +
        '. ENTRE EM CONTATO PARA UMA NOVA COTAÇÃO SE FOR O CASO:',
    ) + blocoResumoProposta(orc, cliente, itens)
  enviarParaEquipe(orc, 'LP MÓVEIS — ORÇAMENTO RECUSADO', emailWrap('ORÇAMENTO RECUSADO', corpo))
}

// 4) ORÇAMENTO EXPIRADO -> CLIENTE e VENDEDOR/ADMINs
function emailOrcamentoExpirado(orc, cliente, itens) {
  if (cliente && cliente.get && emailValido(cliente.get('email'))) {
    var corpoCliente =
      paragrafo(
        'A PROPOSTA ABAIXO EXPIROU NA DATA DE VALIDADE. SE AINDA TIVER INTERESSE, FALE CONOSCO PARA REENVIARMOS COM NOVA VALIDADE:',
      ) + blocoResumoProposta(orc, cliente, itens)
    enviarEmailResend(
      cliente.get('email'),
      'LP MÓVEIS — ORÇAMENTO EXPIRADO',
      emailWrap('ORÇAMENTO EXPIRADO', corpoCliente),
    )
  }
  var corpoEquipe =
    paragrafo(
      'A PROPOSTA ABAIXO EXPIROU (VALIDADE VENCIDA). AVALIE REENVIÁ-LA AO CLIENTE COM NOVA VALIDADE:',
    ) + blocoResumoProposta(orc, cliente, itens)
  enviarParaEquipe(
    orc,
    'LP MÓVEIS — ORÇAMENTO EXPIRADO',
    emailWrap('ORÇAMENTO EXPIRADO', corpoEquipe),
  )
}

// 5) ORÇAMENTO CONVERTIDO EM VENDA -> CLIENTE
function emailOrcamentoConvertido(orc, cliente, itens, endereco) {
  if (!cliente || !cliente.get) return
  var emailCliente = cliente.get('email')
  if (!emailValido(emailCliente)) {
    console.warn(
      '[email] Orçamento ' + orc.id + ': cliente sem e-mail válido — confirmação não enviada.',
    )
    return
  }
  var linhaEndereco = '—'
  if (endereco && endereco.get) {
    linhaEndereco = [
      endereco.get('logradouro'),
      endereco.get('numero'),
      endereco.get('complemento'),
      endereco.get('bairro'),
      endereco.get('cidade') + '/' + endereco.get('uf'),
      endereco.get('cep'),
    ]
      .filter(function (p) {
        return p && String(p).trim() !== ''
      })
      .join(', ')
  }
  var corpo =
    paragrafo(
      'SUA PROPOSTA FOI CONVERTIDA EM LOCAÇÃO CONFIRMADA. SEUS MÓVEIS ESTÃO RESERVADOS NO PERÍODO ABAIXO:',
    ) +
    blocoResumoProposta(orc, cliente, itens) +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:12px;">' +
    linhaResumo('ENDEREÇO DE INSTALAÇÃO', linhaEndereco) +
    '</table>'
  enviarEmailResend(
    emailCliente,
    'LP MÓVEIS — LOCAÇÃO CONFIRMADA',
    emailWrap('LOCAÇÃO CONFIRMADA', corpo),
  )
}

// ---------------------------------------------------------------------------
// Carregamento de dados do orçamento (cliente + itens com produto expandido)
// ---------------------------------------------------------------------------

// Sempre retorna { cliente, itens } — falhas são registradas e devolvidas vazias.
function carregarDadosOrcamento(orc) {
  var cliente = null
  var itens = []
  try {
    var clienteId = orc.get('cliente')
    if (clienteId) {
      cliente = $app.findRecordById('clientes', clienteId)
    }
  } catch (erro) {
    console.error(
      '[email] Falha ao carregar cliente do orçamento ' + orc.id + ':',
      erro && erro.message,
    )
  }
  try {
    itens = $app.findRecordsByFilter(
      'orcamento_itens',
      'orcamento = "' + orc.id + '"',
      '-created',
      200,
      0,
    )
    var vistos = {}
    for (var i = 0; i < itens.length; i++) {
      var pid = itens[i].get('produto')
      if (pid && !(pid in vistos)) {
        try {
          vistos[pid] = $app.findRecordById('produtos', pid)
        } catch (_) {
          vistos[pid] = null
        }
      }
      itens[i].set('produto_expand', pid ? vistos[pid] : null)
    }
  } catch (erro) {
    console.error(
      '[email] Falha ao carregar itens do orçamento ' + orc.id + ':',
      erro && erro.message,
    )
  }
  return { cliente: cliente, itens: itens }
}

// ---------------------------------------------------------------------------
// Deduplicação: um e-mail por (orçamento, evento). Evita o caso clássico do
// cron de expiração + validade derivada no frontend dispararem duas vezes.
// ---------------------------------------------------------------------------

function jaEnviado(orcamentoId, evento) {
  var registros = $app.findRecordsByFilter(
    'notificacoes_email',
    'orcamento = "' + orcamentoId + '" && evento = "' + evento + '"',
    '',
    1,
    0,
  )
  return registros && registros.length > 0
}

function marcarEnviado(orcamentoId, evento, para) {
  try {
    var registro = new Record($app.findCollectionByNameOrId('notificacoes_email'))
    registro.set('orcamento', orcamentoId)
    registro.set('evento', evento)
    registro.set('destinatario', para || '')
    $app.save(registro)
  } catch (erro) {
    console.error(
      '[email] Falha ao registrar notificação ' + orcamentoId + '/' + evento + ':',
      erro && erro.message,
    )
  }
}

// ---------------------------------------------------------------------------
// Ponto de entrada usado pelos demais hooks: dispara o e-mail do evento UMA
// vez por orçamento. Sempre silencioso em caso de erro — nunca quebra a ação
// do usuário.
//   evento: 'ENVIADO' | 'APROVADO' | 'RECUSADO' | 'EXPIRADO' | 'CONVERTIDO'
//   extras: { reenvio } | { autoridade } | { endereco }
// ---------------------------------------------------------------------------

function notificarEventoOrcamento(evento, orc, extras) {
  try {
    if (!orc || !orc.id) return
    if (jaEnviado(orc.id, evento)) return
    var dados = carregarDadosOrcamento(orc)
    if (!dados.cliente) {
      console.warn(
        '[email] Orçamento ' +
          orc.id +
          ': cliente não encontrado — evento "' +
          evento +
          '" não notificado.',
      )
      return
    }
    marcarEnviado(orc.id, evento, dados.cliente.get('email') || '')
    if (evento === 'ENVIADO') {
      emailOrcamentoEnviado(orc, dados.cliente, dados.itens, extras && extras.reenvio)
    } else if (evento === 'APROVADO') {
      emailOrcamentoAprovado(orc, dados.cliente, dados.itens, extras && extras.autoridade)
    } else if (evento === 'RECUSADO') {
      emailOrcamentoRecusado(orc, dados.cliente, dados.itens, extras && extras.autoridade)
    } else if (evento === 'EXPIRADO') {
      emailOrcamentoExpirado(orc, dados.cliente, dados.itens)
    } else if (evento === 'CONVERTIDO') {
      emailOrcamentoConvertido(orc, dados.cliente, dados.itens, extras && extras.endereco)
    }
  } catch (erro) {
    console.error(
      '[email] Erro inesperado no evento "' + evento + '" do orçamento:',
      erro && erro.message,
    )
  }
}
