// Normalização automática de todos os campos texto das coleções para MAIÚSCULO (CAPSLOCK)
// Exclui campos de e-mail, senha, tokens e campos de sistema

const TEXT_FIELDS_TO_UPPERCASE = {
  produtos: ['nome', 'codigo', 'dimensoes', 'descricao', 'tipo_old', 'linha_old'],
  categorias: ['nome', 'descricao'],
  linhas: ['nome', 'descricao'],
  atributos: ['codigo_atr', 'descricao_atr'],
  clientes: ['nome', 'endereco', 'telefone'],
  enderecos: [
    'identificacao',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'uf',
    'cep',
  ],
  vendas: ['observacoes'],
  orcamentos: ['observacoes'],
  users: ['name'],
}

Object.keys(TEXT_FIELDS_TO_UPPERCASE).forEach(function (colName) {
  var fields = TEXT_FIELDS_TO_UPPERCASE[colName]
  var handler = function (e) {
    if (!e.record) return e.next()
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i]
      try {
        var val = e.record.getString(field)
        if (typeof val === 'string' && val.trim() !== '') {
          var upper = val.trim().toUpperCase()
          if (val !== upper) {
            e.record.set(field, upper)
          }
        }
      } catch (_) {}
    }
    return e.next()
  }

  onRecordCreateRequest(handler, colName)
  onRecordUpdateRequest(handler, colName)
})
