document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  const d = document, root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = $("header");

  /* ---------- Estrutura de animação (sem precisar mexer no HTML) ---------- */
  $$(".hero-inner > div:first-child > *").forEach((el, i) => el.style.setProperty("--i", i));
  $$(".stats-grid > div").forEach(el => el.classList.add("reveal"));
  $$(".contact-inner > *").forEach((el, i) => el.classList.add(i ? "reveal-right" : "reveal-left"));
  [".stats-grid > div", ".ledger-entry", ".testi-card", ".contact-inner > *"].forEach(sel =>
    $$(sel).forEach((el, i) => el.style.setProperty("--d", i * 0.1 + "s")));

  /* ---------- Títulos animados palavra por palavra ---------- */
  const split = el => {
    let i = 0;
    el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = d.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (!t.trim()) return frag.append(t);
          const w = d.createElement("span"), s = d.createElement("span");
          w.className = "w"; w.setAttribute("aria-hidden", "true");
          s.textContent = t; s.style.setProperty("--i", i++);
          w.append(s); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  };
  if (!reduce) $$(".hero h1, .section-head h2, .contact h2").forEach(split);

  /* ---------- Scroll reveal ---------- */
  const els = $$(".reveal, .reveal-left, .reveal-right");
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach(e => e.classList.add("in"));
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });
    els.forEach(e => io.observe(e));
  }

  /* ---------- Contadores das estatísticas ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    $$(".stat-num").forEach(el => {
      const m = el.textContent.trim().match(/^(\d+)(.*)$/);
      if (!m) return;
      const end = +m[1], suf = m[2];
      el.textContent = "0" + suf;
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = now => {
          const p = Math.min((now - t0) / 1400, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  /* ---------- Header, barra de progresso e parallax (1 listener, rAF) ---------- */
  const bar = d.createElement("div");
  bar.className = "progress";
  d.body.append(bar);
  const stampWrap = $(".stamp-wrap");
  let queued = false;
  const onScroll = () => {
    const y = scrollY, max = root.scrollHeight - innerHeight;
    header.classList.toggle("scrolled", y > 24);
    bar.style.setProperty("--p", max > 0 ? y / max : 0);
    if (stampWrap && !reduce && y < innerHeight * 1.5) stampWrap.style.setProperty("--py", y);
    queued = false;
  };
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  const nav = $(".nav"), links = $(".nav-links"), phone = $(".nav-phone");
  if (nav && links) {
    const btn = d.createElement("button");
    btn.type = "button"; btn.className = "nav-toggle"; links.id = "menu";
    btn.setAttribute("aria-controls", "menu");
    btn.innerHTML = "<span></span><span></span><span></span>";
    nav.append(btn);
    if (phone) {
      const p = phone.cloneNode(true);
      p.className = "nav-phone-m";
      links.append(p);
    }
    const set = open => {
      header.classList.toggle("nav-open", open);
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    };
    set(false);
    btn.addEventListener("click", () => set(!header.classList.contains("nav-open")));
    links.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
    d.addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
    matchMedia("(min-width: 921px)").addEventListener("change", e => { if (e.matches) set(false); });
  }

  /* ---------- Formulário ---------- */
  const form = $(".contact-card");
  if (form) {
    form.noValidate = true;
    ["nome", "tel"].forEach(id => {
      $("#" + id).required = true;
      $(`label[for=${id}]`).textContent += " *";
    });
    $("#nome").autocomplete = "name";
    $("#email").autocomplete = "email";
    $("#tel").autocomplete = "tel";
    ["nome", "email", "tel", "msg"].forEach(id =>
      $("#" + id).addEventListener("input", e => {
        if (e.target.closest(".form-row").classList.contains("invalid")) validar(id);
      }));
  }

  /* ---------- Entrada da página (depois do loader) ---------- */
  const go = () => root.classList.add("ready");
  if (reduce) go();
  else { addEventListener("load", () => setTimeout(go, 1000)); setTimeout(go, 2500); }
});

/* ===================== Orçamento ===================== */
const MENSAGENS = {
  nome: "Informe seu nome.",
  email: "Informe um e-mail válido.",
  tel: "Informe um telefone com DDD.",
  msg: "Conte o que você precisa."
};

function validar(id) {
  const el = document.getElementById(id), v = el.value.trim();
  let ok = !!v;
  if (id === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (id === "tel") ok = v.replace(/\D/g, "").length >= 10;
  const row = el.closest(".form-row");
  let err = row.querySelector(".field-error");
  row.classList.toggle("invalid", !ok);
  if (ok) {
    if (err) err.remove();
    el.removeAttribute("aria-invalid");
    el.removeAttribute("aria-describedby");
  } else {
    if (!err) {
      err = document.createElement("span");
      err.className = "field-error";
      err.id = id + "-erro";
      row.append(err);
    }
    err.textContent = MENSAGENS[id];
    el.setAttribute("aria-invalid", "true");
    el.setAttribute("aria-describedby", err.id);
  }
  return ok;
}

function mostrarStatus(texto, tipo) {
  const btn = document.querySelector(".form-submit");
  let p = document.querySelector(".form-status");
  if (!p) {
    p = document.createElement("p");
    p.className = "form-status";
    p.setAttribute("role", "status");
    btn.before(p);
  }
  p.className = "form-status " + (tipo || "");
  p.textContent = texto;
}

async function enviarOrcamento() {
  const campos = ["nome", "email", "tel", "msg"];
  const invalidos = campos.filter(id => !validar(id));
  if (invalidos.length) {
    mostrarStatus("Confira os campos destacados.", "err");
    document.getElementById(invalidos[0]).focus();
    return;
  }

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const telefone = document.getElementById("tel").value.trim();
  const assunto = document.getElementById("msg").value.trim();

  const btn = document.querySelector(".form-submit");
  const rotulo = btn.textContent;
  btn.disabled = true;
  btn.classList.add("is-loading");
  btn.textContent = "Enviando…";
  mostrarStatus("");

  try {
    const response = await fetch("http://localhost:3000/api/orcamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, telefone, assunto }),
    });
    if (!response.ok) throw new Error("Erro ao enviar orçamento");
    const result = await response.json();
    console.log("Orçamento enviado com sucesso:", result);
    document.querySelector(".contact-card").reset();
    mostrarStatus("Orçamento enviado! Em breve entraremos em contato.", "ok");
  } catch (error) {
    console.error("Erro ao enviar orçamento:", error);
    mostrarStatus("Não foi possível enviar agora. Tente novamente ou chame no WhatsApp.", "err");
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-loading");
    btn.textContent = rotulo;
  }
}