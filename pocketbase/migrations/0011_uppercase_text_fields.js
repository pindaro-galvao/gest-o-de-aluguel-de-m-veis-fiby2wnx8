migrate(
  (app) => {
    // 1. BACKFILL PRODUTOS (nome, dimensoes, descricao, codigo, tipo_old, linha_old)
    // Verificar unicidade do campo 'codigo' para não quebrar idx_produtos_codigo
    try {
      const produtos = app.findRecordsByFilter('produtos', '', 'created', 2000, 0)
      const seenCodigos = {}

      for (const p of produtos) {
        let changed = false

        // Tratar codigo com cuidado para evitar colisões
        const cod = p.getString('codigo')
        if (cod && cod.trim() !== '') {
          let upperCod = cod.trim().toUpperCase()
          // Se já vimos este upperCod em outro produto diferente, adicionar sufixo
          if (seenCodigos[upperCod] && seenCodigos[upperCod] !== p.id) {
            let suffix = 2
            let candidate = `${upperCod}-${suffix}`
            while (seenCodigos[candidate]) {
              suffix++
              candidate = `${upperCod}-${suffix}`
            }
            upperCod = candidate
          }
          seenCodigos[upperCod] = p.id
          if (cod !== upperCod) {
            p.set('codigo', upperCod)
            changed = true
          }
        }

        const nome = p.getString('nome')
        if (nome && nome !== nome.trim().toUpperCase()) {
          p.set('nome', nome.trim().toUpperCase())
          changed = true
        }

        const dim = p.getString('dimensoes')
        if (dim && dim !== dim.trim().toUpperCase()) {
          p.set('dimensoes', dim.trim().toUpperCase())
          changed = true
        }

        const desc = p.getString('descricao')
        if (desc && desc !== desc.trim().toUpperCase()) {
          p.set('descricao', desc.trim().toUpperCase())
          changed = true
        }

        const tipoOld = p.getString('tipo_old')
        if (tipoOld && tipoOld !== tipoOld.trim().toUpperCase()) {
          p.set('tipo_old', tipoOld.trim().toUpperCase())
          changed = true
        }

        const linhaOld = p.getString('linha_old')
        if (linhaOld && linhaOld !== linhaOld.trim().toUpperCase()) {
          p.set('linha_old', linhaOld.trim().toUpperCase())
          changed = true
        }

        if (changed) {
          app.save(p)
        }
      }
    } catch (e) {
      console.log('Erro ao converter produtos para maiúsculo:', e)
    }

    // 2. BACKFILL CATEGORIAS (nome, descricao)
    try {
      const categorias = app.findRecordsByFilter('categorias', '', 'created', 1000, 0)
      for (const c of categorias) {
        let changed = false
        const nome = c.getString('nome')
        if (nome && nome !== nome.trim().toUpperCase()) {
          c.set('nome', nome.trim().toUpperCase())
          changed = true
        }
        const desc = c.getString('descricao')
        if (desc && desc !== desc.trim().toUpperCase()) {
          c.set('descricao', desc.trim().toUpperCase())
          changed = true
        }
        if (changed) {
          app.save(c)
        }
      }
    } catch (e) {
      console.log('Erro ao converter categorias para maiúsculo:', e)
    }

    // 3. BACKFILL LINHAS (nome, descricao)
    try {
      const linhas = app.findRecordsByFilter('linhas', '', 'created', 1000, 0)
      for (const l of linhas) {
        let changed = false
        const nome = l.getString('nome')
        if (nome && nome !== nome.trim().toUpperCase()) {
          l.set('nome', nome.trim().toUpperCase())
          changed = true
        }
        const desc = l.getString('descricao')
        if (desc && desc !== desc.trim().toUpperCase()) {
          l.set('descricao', desc.trim().toUpperCase())
          changed = true
        }
        if (changed) {
          app.save(l)
        }
      }
    } catch (e) {
      console.log('Erro ao converter linhas para maiúsculo:', e)
    }

    // 4. BACKFILL ATRIBUTOS (codigo_atr, descricao_atr)
    try {
      const atributos = app.findRecordsByFilter('atributos', '', 'created', 1000, 0)
      for (const a of atributos) {
        let changed = false
        const cod = a.getString('codigo_atr')
        if (cod && cod !== cod.trim().toUpperCase()) {
          a.set('codigo_atr', cod.trim().toUpperCase())
          changed = true
        }
        const desc = a.getString('descricao_atr')
        if (desc && desc !== desc.trim().toUpperCase()) {
          a.set('descricao_atr', desc.trim().toUpperCase())
          changed = true
        }
        if (changed) {
          app.save(a)
        }
      }
    } catch (e) {
      console.log('Erro ao converter atributos para maiúsculo:', e)
    }

    // 5. BACKFILL CLIENTES (nome, endereco, telefone) - e-mail NÃO converter
    try {
      const clientes = app.findRecordsByFilter('clientes', '', 'created', 2000, 0)
      for (const cl of clientes) {
        let changed = false
        const nome = cl.getString('nome')
        if (nome && nome !== nome.trim().toUpperCase()) {
          cl.set('nome', nome.trim().toUpperCase())
          changed = true
        }
        const end = cl.getString('endereco')
        if (end && end !== end.trim().toUpperCase()) {
          cl.set('endereco', end.trim().toUpperCase())
          changed = true
        }
        // telefone mantem como digitado ou trim
        const tel = cl.getString('telefone')
        if (tel && tel !== tel.trim().toUpperCase()) {
          cl.set('telefone', tel.trim().toUpperCase())
          changed = true
        }
        if (changed) {
          app.save(cl)
        }
      }
    } catch (e) {
      console.log('Erro ao converter clientes para maiúsculo:', e)
    }

    // 6. BACKFILL VENDAS (observacoes)
    try {
      const vendas = app.findRecordsByFilter('vendas', '', 'created', 2000, 0)
      for (const v of vendas) {
        const obs = v.getString('observacoes')
        if (obs && obs !== obs.trim().toUpperCase()) {
          v.set('observacoes', obs.trim().toUpperCase())
          app.save(v)
        }
      }
    } catch (e) {
      console.log('Erro ao converter vendas para maiúsculo:', e)
    }

    // 7. BACKFILL ORCAMENTOS (observacoes)
    try {
      const orcamentos = app.findRecordsByFilter('orcamentos', '', 'created', 2000, 0)
      for (const o of orcamentos) {
        const obs = o.getString('observacoes')
        if (obs && obs !== obs.trim().toUpperCase()) {
          o.set('observacoes', obs.trim().toUpperCase())
          app.save(o)
        }
      }
    } catch (e) {
      console.log('Erro ao converter orcamentos para maiúsculo:', e)
    }

    // 8. BACKFILL USERS (name) - e-mail e senhas NÃO converter
    try {
      const users = app.findRecordsByFilter('_pb_users_auth_', '', 'created', 1000, 0)
      for (const u of users) {
        const nome = u.getString('name')
        if (nome && nome !== nome.trim().toUpperCase()) {
          u.set('name', nome.trim().toUpperCase())
          app.save(u)
        }
      }
    } catch (e) {
      console.log('Erro ao converter users para maiúsculo:', e)
    }
  },
  (app) => {
    // Reversão no-op: conversão de texto para maiúsculo é irreversível de forma determinística
  },
)
