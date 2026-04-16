import { firebaseConfig, slugify, escapeHtml, formatPrice, calcDiscount, showToast } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const productsGrid = document.getElementById("productsGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");
const categoriesGrid = document.getElementById("categoriesGrid");
const newsletterForm = document.getElementById("newsletterForm");
const newsletterMessage = document.getElementById("newsletterMessage");

let allProducts = [];

async function loadProducts() {
  try {
    const q = query(
      collection(db, "produtos"),
      where("ativo", "==", true),
      orderBy("criadoEm", "desc")
    );
    const snapshot = await getDocs(q);

    allProducts = [];

    snapshot.forEach((doc) => {
      allProducts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    fillCategories(allProducts);
    renderProducts(allProducts);
    renderCategories(allProducts);
  } catch (error) {
    productsGrid.innerHTML = `<div class="empty">Erro ao carregar produtos.</div>`;
    console.error(error);
  }
}

function fillCategories(products) {
  const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))];

  categoryFilter.innerHTML = `<option value="">Todas as categorias</option>`;
  categories.forEach(category => {
    categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
  });
}

function renderCategories(products) {
  if (!categoriesGrid) return;
  
  const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))];
  const emojis = {
    "Tecnologia": "💻",
    "Casa e Cozinha": "🏠",
    "Beleza": "💄",
    "Moda": "👕",
    "Games": "🎮",
    "Cursos Online": "📚",
    "Eletrônicos": "📱",
    "Saúde": "🏥"
  };

  categoriesGrid.innerHTML = categories.map(cat => `
    <a href="categoria.html?cat=${encodeURIComponent(cat)}" class="category-card">
      <span>${emojis[cat] || "🛍️"}</span>
      <strong>${escapeHtml(cat)}</strong>
    </a>
  `).join("");
}

function renderProducts(products) {
  if (!productsGrid) return;

  if (!products.length) {
    productsGrid.innerHTML = `<div class="empty">Nenhum produto encontrado.</div>`;
    return;
  }

  productsGrid.innerHTML = products.map(product => {
    const discount = calcDiscount(product.precoAntigo, product.preco);
    const slug = slugify(product.nome);
    const url = `produto.html?id=${product.id}&slug=${slug}`;

    let mediaHtml = "";

    if (product.midia) {
      if (product.midiaTipo === "video") {
        mediaHtml = `
          <video
            src="${product.midia}"
            muted
            autoplay
            loop
            playsinline
            style="width:100%;height:160px;object-fit:cover;"
          ></video>
        `;
      } else {
        mediaHtml = `
          <img
            class="product-image"
            src="${product.midia}"
            alt="${escapeHtml(product.nome)}"
            loading="lazy"
          >
        `;
      }
    } else {
      mediaHtml = `<div class="product-image-fallback">${product.emoji || "🛍️"}</div>`;
    }

    return `
      <a href="${url}" class="card product-card">

        ${mediaHtml}

        <div class="card-body">

          ${product.destaque
            ? `<span class="badge badge-destaque">⭐ Destaque</span>`
            : discount
            ? `<span class="badge badge-desconto">-${discount}%</span>`
            : `<span class="badge">${product.badge || "Oferta"}</span>`
          }

          <h3 class="product-title">${escapeHtml(product.nome)}</h3>

          <div class="product-meta">
            <div class="price-group">
              ${product.precoAntigo
                ? `<span class="price-old">${formatPrice(product.precoAntigo)}</span>`
                : ""
              }
              <span class="price">${formatPrice(product.preco)}</span>
            </div>
            <span class="store">${escapeHtml(product.loja)}</span>
          </div>

        </div>
      </a>
    `;
  }).join("");
}

function applyFilters() {
  const search = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const sort = sortFilter.value;

  let filtered = [...allProducts].filter(product => {
    const matchText =
      (product.nome || "").toLowerCase().includes(search) ||
      (product.descricao || "").toLowerCase().includes(search) ||
      (product.loja || "").toLowerCase().includes(search) ||
      (product.categoria || "").toLowerCase().includes(search);

    const matchCategory = !category || product.categoria === category;

    return matchText && matchCategory;
  });

  if (sort === "name-asc") {
    filtered.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  } else if (sort === "name-desc") {
    filtered.sort((a, b) => (b.nome || "").localeCompare(a.nome || ""));
  }

  renderProducts(filtered);
}

if (searchInput) searchInput.addEventListener("input", applyFilters);
if (categoryFilter) categoryFilter.addEventListener("change", applyFilters);
if (sortFilter) sortFilter.addEventListener("change", applyFilters);

if (newsletterForm) {
  newsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    
    if (email) {
      newsletterMessage.textContent = "Cadastro realizado com sucesso!";
      newsletterMessage.style.color = "#bbf7d0";
      newsletterForm.reset();
      showToast("E-mail cadastrado com sucesso!", "success");
    }
  });
}

loadProducts();