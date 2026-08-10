const { ready, query, run, get } = require('../database/sqlite');
// =====================
// FORMATAR
// =====================
async function formatar(row) {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    nome : row.nome,
    email : row.email,
    telefone : row.telefone,
    assunto : row.assunto,
    status : row.status,
    createdAt: row.created_at,
  };
}


// =====================
// MODEL ORÇAMENTOS
// =====================
const orcamento = {

  // ---------------------
  // LISTAR TODAS
  // ---------------------
  async findAll() {
    await ready;

    const rows = query(
      'SELECT * FROM orcamentos ORDER BY created_at DESC'
    );

    return Promise.all(rows.map(formatar));
  },


  // ---------------------
  // BUSCAR POR ID
  // ---------------------
  async findById(id) {
    await ready;

    const row = get(
      'SELECT * FROM orcamentos WHERE id = ?',
      [id]
    );

    return formatar(row);
  },


  // ---------------------
  // CREATE
  // ---------------------
  async create({ nome, email, telefone, assunto}) {
    await ready;

    const info = run(
      `INSERT INTO orcamentos
      (nome, email, telefone, assunto)
      VALUES (?, ?, ?, ?)`,
      [
        nome,
        email,
        telefone,
        assunto,
      ]
    );

    const id = info.lastInsertRowid;

    return this.findById(id);
  },


  // ---------------------
  // UPDATE
  // ---------------------
  async update(id, { nome, email, telefone, assunto, status }) {
    await ready;

    const atual = get(
      "SELECT * FROM orcamentos WHERE id = ?",
      [id]
    );

    if (!atual) return null;

    const info = run(
      `UPDATE orcamentos SET
        nome = ?,
        email = ?,
        telefone = ?,
        assunto = ?,
        status = ?,
      WHERE id = ?`,
      [
        nome ?? atual.nome,
        email ?? atual.email,
        telefone ?? atual.telefone,
        assunto ?? atual.assunto,
        status ?? atual.status,
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

    const orcamento = await this.findById(id)
    if (!orcamento) return false

    run(
      'DELETE FROM orcamentos WHERE id = ?',
      [id]
    );

    return true;
  }
};

module.exports = orcamento;  