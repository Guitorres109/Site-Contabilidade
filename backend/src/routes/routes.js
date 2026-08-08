const express  = require('express');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const auth     = require('../middlewares/auth');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const Usuario  = require('../models/usuario');
const comentario = require('../models/comentarios');
const orcamento = require('../models/orcamentos');
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Muitas requisições, tente novamente mais tarde."
    }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: "Muitas tentativas de login. Tente novamente mais tarde."
    }
});


router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
    }

    const usuario = await Usuario.findByEmail(email);

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    if (usuario.ativo === 0) {
      return res.status(400).json({ erro: 'Este usuário está inativo' });
    }

    const ok = await Usuario.verificarSenha(senha, usuario.senha);

    if (!ok) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        foto: usuario.foto
      }
    });

  } catch (e) {
    console.log("Erro no login:", e);
    return res.status(500).json({ erro: 'Erro ao efetuar o login' });
  }
});

// ===========================================
// Usuarios
// ===========================================

router.get('/usuarios', auth, async (req, res) => {
  try {
    if (req.usuario?.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito' });

    res.json(await Usuario.findAll());

  } catch (e) {
    console.error("Erro ao fornecer os dados:", e);
    res.status(500).json({ erro: "erro ao fornecer os dados" });
  }
});

router.get('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario?.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito' });

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (e) {
    console.error("Erro ao buscar usuário:", e);
    res.status(500).json({ erro: "erro ao buscar usuário" });
  }
});

router.post("/usuarios", auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== "Administrador") {
      return res.status(403).json({ erro: "Acesso restrito a Administradores" });
    }

    const { nome, email, senha, perfil, usuarioId } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        erro: "Nome, email e senha são obrigatórios"
      });
    }

    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha,
      perfil,
      usuarioId
    });

    return res.status(201).json(novoUsuario);

  } catch (e) {
    if (e.message?.includes("UNIQUE")) {
      return res.status(400).json({ erro: "E-mail já cadastrado" });
    }
    console.error("Erro ao criar usuário:", e);
    return res.status(500).json({ erro: "Erro ao criar usuário" });
  }
});

router.put('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador') {
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
      console.error("Acesso restrito a Administradores");
    }
    const { nome, email, senha, perfil, ativo, usuarioId } = req.body;

    const usuarioAtual = await Usuario.findById(req.params.id);
    if (!usuarioAtual) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const u = await Usuario.update(req.params.id, {
      nome,
      email,
      senha,
      perfil,
      ativo,
      usuarioId
    });
    res.json(u);

  } catch (e) {
    console.error("Erro ao atualizar usuário:", e);
    res.status(500).json({ erro: "Erro ao atualizar usuário" });
  }
});

router.delete('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    const ok = await Usuario.delete(req.params.id, req.usuario.id);
    if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Usuário deletado' });
  } catch (e) {
    console.error("Erro ao deletar usuário:", e);
    res.status(500).json({ erro: "Erro ao deletar usuário" });
  }
});

router.get('/comentarios', async (req, res) => {
  try {
    const comentarios = await comentario.findAll();
    res.json(comentarios);
    } catch (e) {
      console.error("Erro ao listar comentários:", e);
      res.status(500).json({ erro: "Erro ao listar comentários" });
    }
});

router.get('/comentarios/:id', async (req, res) => {
  try {
    const comentarioEncontrado = await comentario.findById(req.params.id);
    if (!comentarioEncontrado) {
        return res.status(404).json({ erro: 'Comentário não encontrado' });
    }
    res.json(comentarioEncontrado);
  }
    catch (e) {
        console.error("Erro ao buscar comentário:", e);
        res.status(500).json({ erro: "Erro ao buscar comentário" });
    }
});

router.post('/comentarios', auth, async (req, res) => {
  try {
    const { conteudo, autor, desc_autor } = req.body;
    const novoComentario = await comentario.create({ conteudo, autor, desc_autor });
    res.status(201).json(novoComentario);
    } catch (e) {
        console.error("Erro ao criar comentário:", e);
        res.status(500).json({ erro: "Erro ao criar comentário" });
    }
});

router.put('/comentarios/:id', auth, async (req, res) => {
    try {
        const { conteudo, autor, desc_autor } = req.body;
        const comentarioAtualizado = await comentario.update(req.params.id, { conteudo, autor, desc_autor });
        if (!comentarioAtualizado) {
            return res.status(404).json({ erro: 'Comentário não encontrado' });
        }
        res.json(comentarioAtualizado);
    }
    catch (e) {
        console.error("Erro ao atualizar comentário:", e);
        res.status(500).json({ erro: "Erro ao atualizar comentário" });
    }
});

router.delete('/comentarios/:id', auth, async (req, res) => {
    try {
        const ok = await comentario.delete(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Comentário não encontrado' });
        res.json({ mensagem: 'Comentário deletado' });
    } catch (e) {
        console.error("Erro ao deletar comentário:", e);
        res.status(500).json({ erro: "Erro ao deletar comentário" });
    }
});

router.get('/orcamentos', auth, async (req, res) => {
  try {
    const orcamentos = await orcamento.findAll();
    res.json(orcamentos);
  } catch (e) {
    console.error("Erro ao listar orçamentos:", e);
    res.status(500).json({ erro: "Erro ao listar orçamentos" });
  }
});

router.get('/orcamentos/:id', auth, async (req, res) => {
  try {
    const orcamentoEncontrado = await orcamento.findById(req.params.id);
    if (!orcamentoEncontrado) {
        return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    res.json(orcamentoEncontrado);
  }
    catch (e) {
        console.error("Erro ao buscar orçamento:", e);
        res.status(500).json({ erro: "Erro ao buscar orçamento" });
    }
});

router.post('/orcamentos', limiter, async (req, res) => {
  try {
    const { nome, email, telefone, assunto, status } = req.body;
    const novoOrcamento = await orcamento.create({ nome, email, telefone, assunto, status });
    res.status(201).json(novoOrcamento);
  } catch (e) {
    console.error("Erro ao criar orçamento:", e);
    res.status(500).json({ erro: "Erro ao criar orçamento" });
  }
});

router.put('/orcamentos/:id', auth, async (req, res) => {
  try {
    const { nome, email, telefone, assunto, status } = req.body;

    const orcamentoAtualizado = await orcamento.update(req.params.id, { nome, email, telefone, assunto, status });
    if (!orcamentoAtualizado) {
      return res.status(404).json({ erro: 'Orçamento não encontrado' });
    }
    res.json(orcamentoAtualizado);
  } catch (e) {
    console.error("Erro ao atualizar orçamento:", e);
    res.status(500).json({ erro: "Erro ao atualizar orçamento" });
  }
});

router.delete('/orcamentos/:id', auth, async (req, res) => {
  try {
    const ok = await orcamento.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Orçamento não encontrado' });
    res.json({ mensagem: 'Orçamento deletado' });
  } catch (e) {
    console.error("Erro ao deletar orçamento:", e);
    res.status(500).json({ erro: "Erro ao deletar orçamento" });
  }
});

module.exports = router;
