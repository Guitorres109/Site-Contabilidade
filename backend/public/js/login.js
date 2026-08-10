// ==========================================================
    // CONFIGURAÇÃO
    // ==========================================================

    const API_BASE = 'http://localhost:3000/api';

    const form = document.getElementById('loginForm');
    const errorBox = document.getElementById('errorBox');
    const errorText = document.getElementById('errorText');
    const btn = document.getElementById('btnEntrar');
    const btnText = document.getElementById('btnEntrarText');

    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const togglePass = document.getElementById('togglePass');
    const forgotLink = document.getElementById('forgotLink');


    // ==========================================================
    // FUNÇÕES DE MENSAGEM
    // ==========================================================

    function showError(msg, isError = true) {
        errorText.textContent = msg;

        errorBox.style.background = isError
            ? 'var(--red-tint)'
            : '#EAF1EC';

        errorBox.style.color = isError
            ? 'var(--red)'
            : 'var(--ink-green)';

        errorBox.style.borderColor = isError
            ? 'rgba(162,59,46,0.25)'
            : 'rgba(28,61,46,0.2)';

        errorBox.classList.add('show');
    }

    function hideError() {
        errorBox.classList.remove('show');
    }


    // ==========================================================
    // VERIFICA SE EXISTE TOKEN
    // ==========================================================
    //
    // NÃO redirecionamos automaticamente apenas porque existe
    // um token. Isso evita loop/redirecionamento para dashboard
    // quando o token estiver inválido ou antigo.
    //
    // ==========================================================

    async function verificarSessao() {

        const token = localStorage.getItem('token');

        if (!token) {
            return;
        }

        try {

            const response = await fetch(`${API_BASE}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {

                window.location.replace('dashboard.html');

            } else {

                // Token inválido/expirado
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
            }

        } catch (error) {

            // Se a API estiver offline, NÃO impede a página
            // de login de abrir.
            console.warn(
                'Não foi possível verificar a sessão:',
                error
            );
        }
    }


    // ==========================================================
    // MOSTRAR / OCULTAR SENHA
    // ==========================================================

    togglePass.addEventListener('click', () => {

        const mostrando = senhaInput.type === 'text';

        senhaInput.type = mostrando
            ? 'password'
            : 'text';

        togglePass.setAttribute(
            'aria-label',
            mostrando
                ? 'Mostrar senha'
                : 'Ocultar senha'
        );
    });


    // ==========================================================
    // ESQUECI MINHA SENHA
    // ==========================================================

    forgotLink.addEventListener('click', (e) => {

        e.preventDefault();

        const email = emailInput.value.trim();

        if (email) {

            showError(
                `Se ${email} estiver cadastrado, entre em contato com o administrador para redefinir sua senha.`,
                false
            );

        } else {

            showError(
                'Informe seu e-mail acima para recuperar o acesso.',
                false
            );
        }
    });


    // ==========================================================
    // LOGIN
    // ==========================================================

    form.addEventListener('submit', async (e) => {

        e.preventDefault();

        hideError();

        const email = emailInput.value.trim();
        const senha = senhaInput.value;


        // ------------------------------------------------------
        // VALIDAÇÕES
        // ------------------------------------------------------

        if (!email || !senha) {

            showError(
                'Preencha e-mail e senha para continuar.'
            );

            return;
        }


        if (!/^\S+@\S+\.\S+$/.test(email)) {

            showError(
                'Digite um e-mail válido.'
            );

            return;
        }


        if (senha.length < 4) {

            showError(
                'A senha deve ter pelo menos 4 caracteres.'
            );

            return;
        }


        // ------------------------------------------------------
        // ESTADO DO BOTÃO
        // ------------------------------------------------------

        btn.disabled = true;
        btnText.textContent = 'Entrando...';


        try {

            console.log('Tentando fazer login...');
            console.log('API:', `${API_BASE}/auth/login`);


            // --------------------------------------------------
            // REQUISIÇÃO
            // --------------------------------------------------

            const response = await fetch(
                `${API_BASE}/auth/login`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },

                    body: JSON.stringify({
                        email: email,
                        senha: senha
                    })
                }
            );


            // --------------------------------------------------
            // LER RESPOSTA
            // --------------------------------------------------

            let data = {};

            try {

                data = await response.json();

            } catch (jsonError) {

                console.warn(
                    'O servidor não retornou JSON válido.'
                );
            }


            console.log('Resposta do servidor:', {
                status: response.status,
                data: data
            });


            // --------------------------------------------------
            // ERRO HTTP
            // --------------------------------------------------

            if (!response.ok) {

                showError(
                    data.erro ||
                    data.error ||
                    data.mensagem ||
                    `Erro ao fazer login. Código: ${response.status}`
                );

                btn.disabled = false;
                btnText.textContent = 'Entrar';

                return;
            }


            // --------------------------------------------------
            // VERIFICAR TOKEN
            // --------------------------------------------------

            if (!data.token) {

                console.error(
                    'Resposta do servidor:',
                    data
                );

                showError(
                    'O servidor respondeu, mas não enviou o token de acesso.'
                );

                btn.disabled = false;
                btnText.textContent = 'Entrar';

                return;
            }


            // --------------------------------------------------
            // SALVAR SESSÃO
            // --------------------------------------------------

            localStorage.setItem(
                'token',
                data.token
            );


            if (data.usuario) {

                localStorage.setItem(
                    'usuario',
                    JSON.stringify(data.usuario)
                );

            } else {

                localStorage.removeItem('usuario');
            }


            // --------------------------------------------------
            // REDIRECIONAR
            // --------------------------------------------------

            console.log(
                'Login realizado com sucesso.'
            );

            window.location.replace(
                '/dashboard'
            );

        } catch (error) {

            console.error(
                'Erro ao efetuar login:',
                error
            );


            // --------------------------------------------------
            // ERROS DE CONEXÃO
            // --------------------------------------------------

            if (
                error instanceof TypeError &&
                error.message.toLowerCase().includes('fetch')
            ) {

                showError(
                    'Não foi possível conectar ao servidor. Verifique se o backend está rodando em http://localhost:3000.'
                );

            } else {

                showError(
                    'Ocorreu um erro inesperado ao realizar o login.'
                );
            }


            btn.disabled = false;
            btnText.textContent = 'Entrar';
        }

    });


    // ==========================================================
    // INICIALIZAÇÃO
    // ==========================================================

    document.addEventListener('DOMContentLoaded', () => {

        verificarSessao();

    });