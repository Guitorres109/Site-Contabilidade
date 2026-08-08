const { ready, query, run, get } = require('../database/sqlite');

// =====================
// FORMATAR
// =====================
async function formatar(row) {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    conteudo: row.conteudo,
    autor: row.autor,
    desc_autor: row.desc_autor,
    createdAt: row.created_at,
  };
}


// =====================
// MODEL COMENTÁRIOS
// =====================
const comentario = {

  // ---------------------
  // LISTAR TODAS
  // ---------------------
  async findAll() {
    await ready;

    const rows = query(
      'SELECT * FROM comentarios'
    );

    return Promise.all(rows.map(formatar));
  },


  // ---------------------
  // BUSCAR POR ID
  // ---------------------
  async findById(id) {
    await ready;

    const row = get(
      'SELECT * FROM comentarios WHERE id = ?',
      [id]
    );

    return formatar(row);
  },


  // ---------------------
  // CREATE
  // ---------------------
  async create({ conteudo, autor, desc_autor }) {
    await ready;

    const info = run(
      `INSERT INTO comentarios
      (conteudo, autor, desc_autor)
      VALUES (?, ?, ?)`,
      [
        conteudo,
        autor,
        desc_autor
      ]
    );

    const id = info.lastInsertRowid;

    return this.findById(id);
  },


  // ---------------------
  // UPDATE
  // ---------------------
  async update(id, { conteudo = "", autor, desc_autor = "" }) {
    await ready;

    const atual = get(
      "SELECT * FROM comentarios WHERE id = ?",
      [id]
    );

    if (!atual) return null;

    const info = run(
      `UPDATE comentarios SET
        conteudo = ?,
        autor = ?,
        desc_autor = ?,
      WHERE id = ?`,
      [
        conteudo ?? atual.conteudo,
        autor ?? atual.autor,
        desc_autor ?? atual.desc_autor,
        id
      ]
    );

    return this.findById(id);
  },


  // ---------------------
  // DELETE
  // ---------------------
  async delete(id) {
    await ready;

    const comentario = await this.findById(id)
    if (!comentario) return false

    run(
      'DELETE FROM comentarios WHERE id = ?',
      [id]
    );

    return true;
  }
};

module.exports = comentario;  