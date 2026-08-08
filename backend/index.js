require('dotenv').config();

const os = require('os');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

const app = express();

const PORT = process.env.PORT || 3000;

const { ready } = require('./src/database/sqlite');
const routes = require('./src/routes/routes');
const auth = require('./src/middlewares/auth');

// =========================
// MIDDLEWARES
// =========================

app.use(cors());

app.use(helmet());

app.use(express.json());


// =========================
// BLOQUEIO DE USER-AGENTS
// =========================

app.use((req, res, next) => {

    const ua = req.get("User-Agent") || "";

    if (
        ua.includes("curl") ||
        ua.includes("python-requests")
    ) {
        return res.status(403).json({
            error: "Acesso bloqueado por firewall"
        });
    }

    next();

});


// =========================
// INICIALIZAÇÃO
// =========================

ready.then(() => {

    // =========================
    // ROTAS
    // =========================

    app.get("/", (req, res) => {

        res.sendFile(
            path.join(__dirname, "./public/index.html")
        );

    });


    app.get("/dashboard", (req, res) => {

        res.sendFile(
            path.join(__dirname, "./public/dashboard.html")
        );

    });


    // =========================
    // API
    // =========================

    app.use('/api', routes);


    // =========================
    // ARQUIVOS ESTÁTICOS
    // =========================

    app.use(
        helmet({
            crossOriginResourcePolicy: {
                policy: "cross-origin"
            }
        })
    );

    app.use(express.static("public"));


    // =========================
    // INICIAR SERVIDOR
    // =========================

    app.listen(PORT, () => {

        console.log('=================================');
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse em: http://localhost:${PORT}/api`);
        console.log('=================================');

    });

}).catch(err => {

    console.error(
        'Erro ao inicializar banco:',
        err
    );

    process.exit(1);

});
