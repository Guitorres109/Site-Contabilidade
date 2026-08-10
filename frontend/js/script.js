document.addEventListener("DOMContentLoaded", () => {

    const elementos = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {

            if (entry.isIntersecting) {
                entry.target.classList.add("in");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15
    });
    elementos.forEach(elemento => {
        observer.observe(elemento);
    });
});

async function enviarOrcamento(){
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const telefone = document.getElementById("tel").value;
    const assunto = document.getElementById("msg").value;
    if(!nome || !email || !telefone || !assunto){
        alert("Por favor, preencha todos os campos.");
        return;
    }
    try {
        const response = await fetch("http://localhost:3000/api/orcamentos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nome, email, telefone, assunto }),
        });
        if (!response.ok) {
            throw new Error("Erro ao enviar orçamento");
        }
        const result = await response.json();
        console.log("Orçamento enviado com sucesso:", result);
        alert("Orçamento enviado com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar orçamento:", error);
        alert("Ocorreu um erro ao enviar o orçamento. Por favor, tente novamente.");
    }
}   