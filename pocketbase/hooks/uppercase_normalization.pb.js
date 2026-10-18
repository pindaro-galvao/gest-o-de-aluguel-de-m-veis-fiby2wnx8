// Normalização automática de todos os campos texto das coleções para MAIÚSCULO (CAPSLOCK)
// Exclui campos de e-mail, senha, tokens e campos de sistema

const TEXT_FIELDS_TO_UPPERCASE = {
  produtos: ['nome', 'codigo', 'dimensoes', 'descricao', 'tipo_old', 'linha_old'],
  categorias: ['nome', 'descricao'],
  linhas: ['nome', 'descricao'],
  atributos: ['codigo_atr', 'descricao_atr'],
  clientes: ['nome', 'endereco', 'telefone'],
  vendas: ['observacoes'],
  orcamentos: ['observacoes'],
  users: ['name'],
}

for (const [colName, fields] of Object.entries(TEXT_FIELDS_TO_UPPERCASE)) {
  const handler = (e) => {
    if (!e.record) return
    for (const field of fields) {
      try {
        const val = e.record.getString(field)
        if (typeof val === 'string' && val.trim() !== '') {
          const upper = val.trim().toUpperCase()
          if (val !== upper) {
            e.record.set(field, upper)
          }
        }
      } catch (_) {}
    }
  }

  onRecordCreateRequest(handler, colName)
  onRecordUpdateRequest(handler, colName)
}
