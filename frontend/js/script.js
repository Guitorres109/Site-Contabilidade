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