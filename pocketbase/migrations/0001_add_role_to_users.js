migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          values: ['ADMIN', 'VENDEDOR', 'CLIENTE'],
          maxSelect: 1,
        }),
      )
    }

    // Permissões em users:
    // List/View: autenticado pode ver usuários necessários (admin vê todos, outros podem ver os relacionados)
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    // Admin pode atualizar qualquer um, ou próprio usuário sem mudar o role
    users.updateRule =
      "(@request.auth.role = 'ADMIN') || (@request.auth.id = id && @request.body.role:changed = false)"
    // Admin pode criar usuários
    users.createRule = "@request.auth.role = 'ADMIN' || @request.auth.id = ''"
    users.deleteRule = "@request.auth.role = 'ADMIN'"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = users.fields.getByName('role')
    if (roleField) {
      users.fields.removeByName('role')
      app.save(users)
    }
  },
)
