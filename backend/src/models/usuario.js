const { ready, query, run, get } = require('../database/sqlite');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function formatarUsuario(row) {
  if (!row) return null;
  return {
    _id:       row.id,
    id:        row.id,
    nome:      row.nome,
    email:     row.email,
    perfil:    row.perfil,
    ativo:     row.ativo === 1,
    foto:      row.foto,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Usuario = {

  //Pegar todos os usuarios
  async findAll() {
    await ready;
    const rows = query(`
      SELECT id, nome, email, perfil, ativo, foto, created_at, updated_at
      FROM usuarios ORDER BY created_at DESC
    `);
    return rows.map(formatarUsuario);
  },

  //Buscar usuarios pore email
  async findByEmail(email) {
    await ready;
    return get('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
  },

  //Buscar usuarios por ID
  async findById(id) {
    await ready;
    const row = get(`
      SELECT id, nome, email, perfil, ativo, foto, created_at, updated_at
      FROM usuarios WHERE id = ?
    `, [id]);
    return formatarUsuario(row);
  },

  verificarSenha(senhaDigitada, hashSalvo) {
    return bcrypt.compare(senhaDigitada, hashSalvo);
  },

  //Criar usuarios 

  async create({ nome, email, senha, perfil = "Usuário", usuarioId }) {
    await ready;
    const hash = await bcrypt.hash(senha, 10);

    const info = run(
      `
      INSERT INTO usuarios
      (nome, email, senha, perfil)
      VALUES (?, ?, ?, ?)
      `,
      [
        nome.trim(),
        email.toLowerCase().trim(),
        hash,
        perfil
      ]
    );

    const novoId = info.lastInsertRowid;

    return this.findById(novoId);
  },


  //Atualizar usuarios
  async update(id, { nome, email, senha, perfil, ativo, usuarioId }) {
      await ready;

      const atual = await get(
        'SELECT * FROM usuarios WHERE id = ?',
        [id]
      );


      if (!atual) return null;

      // 📧 EMAIL
      let emailFinal = atual.email;

      if (email && email !== atual.email) {
        const existente = await get(
          'SELECT id FROM usuarios WHERE email = ? AND id != ?',
          [email, id]
        );

        if (existente) {
          throw new Error('E-mail já cadastrado');
          console.error("E-mail já cadastrado:", email);
        }

        emailFinal = email;
      }

      // 🔐 SENHA
      let senhaFinal = atual.senha;

      if (senha) {
        senhaFinal = await bcrypt.hash(senha, 10);
      }

      // 🔒 GARANTIA ANTI-UNDEFINED (ESSENCIAL)
      const dados = {
        nome: nome ?? atual.nome,
        email: emailFinal,
        senha: senhaFinal,
        perfil: perfil ?? atual.perfil,
        ativo: ativo,
      };

      // 🔄 UPDATE SEGURO (sem undefined)
      await run(`
        UPDATE usuarios SET
          nome       = ?,
          email      = ?,
          senha      = ?,
          perfil     = ?,
          ativo      = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `, [
        dados.nome,
        dados.email,
        dados.senha,
        dados.perfil,
        dados.ativo,
        id
      ]);

      // 📝 ATIVIDADE
      const nomeFinal = dados.nome.trim();


      return await this.findById(id);
    },

  //Deletar usuarios
  async delete(id, usuarioId) {
    await ready;
    const usuarioExcluido = await this.findById(id);
    const info = run('DELETE FROM usuarios WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = Usuario;