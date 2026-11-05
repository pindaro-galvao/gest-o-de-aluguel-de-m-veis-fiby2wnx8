// Job agendado para expiração automática de orçamentos com status 'enviado' cuja validade passou.
// Roda a cada hora no minuto 0 ('0 * * * *').
// Ao marcar como expirado, notifica CLIENTE e VENDEDOR/ADMINs por e-mail
// (funções em notify_lib.pb.js; deduplicação em notificacoes_email impede
// e-mail repetido em execuções seguintes do job).
cronAdd('expirar_orcamentos_vencidos', '0 * * * *', () => {
  const agoraISO = new Date().toISOString()
  try {
    // Busca orçamentos com status 'enviado' e validade < agora
    const expirados = $app.findRecordsByFilter(
      'orcamentos',
      `status = "enviado" && validade < "${agoraISO}"`,
      'validade',
      1000,
      0,
    )

    let totalAtualizados = 0
    for (const orc of expirados) {
      try {
        orc.set('status', 'expirado')
        $app.save(orc)
        totalAtualizados++
        // E-mail de expiração (nunca lança; dedup por orçamento/evento)
        try {
          notificarEventoOrcamento('EXPIRADO', orc, {})
        } catch (erroEmail) {
          console.error(`Erro ao notificar expiração do orçamento ${orc.id}:`, erroEmail)
        }
      } catch (err) {
        console.error(`Erro ao expirar orçamento ${orc.id}:`, err)
      }
    }

    if (totalAtualizados > 0) {
      console.log(
        `[cron:expirar_orcamentos_vencidos] ${totalAtualizados} orçamento(s) marcado(s) como expirado.`,
      )
    }
  } catch (e) {
    console.error('Erro na execução da cron expirar_orcamentos_vencidos:', e)
  }
})
