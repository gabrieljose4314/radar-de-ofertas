document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("newsletterForm");
  const msg = document.getElementById("newsletterMessage");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();

      if (email) {
        msg.textContent = "Cadastro realizado com sucesso!";
        msg.style.color = "#bbf7d0";
        form.reset();
      } else {
        msg.textContent = "Digite um e-mail válido.";
        msg.style.color = "#fecaca";
      }
    });
  }
});

function getProducts() {
  return JSON.parse(localStorage.getItem("products")) || [
    {
      id: 1,
      nome: "Fone Bluetooth XYZ",
      descricao: "Som equilibrado, bateria duradoura e ótimo custo-benefício.",
      preco: "R$ 149,90",
      loja: "Amazon",
      categoria: "Tecnologia",
      badge: "Recomendado",
      emoji: "🎧",
      link: "#"
    },
    {
      id: 2,
      nome: "Air Fryer Turbo 4L",
      descricao: "Praticidade para refeições rápidas com menos óleo.",
      preco: "R$ 289,90",
      loja: "Magalu",
      categoria: "Casa e Cozinha",
      badge: "Mais vendido",
      emoji: "🍳",
      link: "#"
    },
    {
      id: 3,
      nome: "Smartwatch Fit Pro",
      descricao: "Monitoramento diário, notificações e boa autonomia.",
      preco: "R$ 199,90",
      loja: "Shopee",
      categoria: "Tecnologia",
      badge: "Promoção",
      emoji: "⌚",
      link: "#"
    }
  ];
}

function saveProducts(products) {
  localStorage.setItem("products", JSON.stringify(products));
}

function renderProducts(containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let products = getProducts();
  if (limit) products = products.slice(0, limit);

  if (!products.length) {
    container.innerHTML = `<div class="empty-state">Nenhum produto cadastrado ainda.</div>`;
    return;
  }

  container.innerHTML = products.map((product) => `
    <article class="card">
      <div class="product-image">${product.emoji || "🛍️"}</div>
      <div class="card-body">
        <span class="badge badge-primary">${product.badge || "Oferta"}</span>
        <h3 class="product-title">${product.nome}</h3>
        <p class="product-desc">${product.descricao}</p>
        <div class="product-meta">
          <span class="price">${product.preco}</span>
          <span class="store">${product.loja}</span>
        </div>
        <a href="${product.link}" target="_blank" rel="nofollow sponsored" class="btn btn-primary">Ver oferta</a>
      </div>
    </article>
  `).join("");
}

function renderFilteredProducts() {
  const container = document.getElementById("allProducts");
  if (!container) return;

  const search = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;

  let products = getProducts();

  products = products.filter(product => {
    const matchText =
      product.nome.toLowerCase().includes(search) ||
      product.descricao.toLowerCase().includes(search) ||
      product.loja.toLowerCase().includes(search);

    const matchCategory = category === "" || product.categoria === category;

    return matchText && matchCategory;
  });

  if (!products.length) {
    container.innerHTML = `<div class="empty-state">Nenhum produto encontrado com esse filtro.</div>`;
    return;
  }

  container.innerHTML = products.map((product) => `
    <article class="card">
      <div class="product-image">${product.emoji || "🛍️"}</div>
      <div class="card-body">
        <span class="badge badge-primary">${product.badge || "Oferta"}</span>
        <h3 class="product-title">${product.nome}</h3>
        <p class="product-desc">${product.descricao}</p>
        <div class="product-meta">
          <span class="price">${product.preco}</span>
          <span class="store">${product.loja}</span>
        </div>
        <p class="small">Categoria: ${product.categoria}</p>
        <br>
        <a href="${product.link}" target="_blank" rel="nofollow sponsored" class="btn btn-primary">Ver oferta</a>
      </div>
    </article>
  `).join("");
}