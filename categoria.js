import { firebaseConfig, escapeHtml, formatPrice, calcDiscount, slugify } from "./firebase-config.js";
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

const categoryProducts = document.getElementById("categoryProducts");
const categoryTitle = document.getElementById("categoryTitle");
const categoryDescription = document.getElementById("categoryDescription");
const breadcrumbName = document.getElementById("breadcrumbName");
const pageTitle = document.getElementById("pageTitle");

async function loadCategory() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("cat");

  if (!category) {
    categoryProducts.innerHTML = `<div class="empty">Categoria não especificada.</div>`;
    return;
  }

  categoryTitle.textContent = category;
  breadcrumbName.textContent = category;
  pageTitle.textContent = `${category} | Radar de Ofertas`;
  categoryDescription.textContent = `Explore os melhores produtos de ${category}.`;

  try {
    const q = query(
      collection(db, "produtos"),
      where("categoria", "==", category),
      where("ativo", "==", true),
      orderBy("criadoEm", "desc")
    );
    
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      categoryProducts.innerHTML = `<div class="empty">Nenhum produto encontrado nesta categoria.</div>`;
      return;
    }

    const products = [];
    snapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    renderProducts(products);
  } catch (error) {
    categoryProducts.innerHTML = `<div class="empty">Erro ao carregar produtos.</div>`;
    console.error(error);
  }
}

function renderProducts(products) {
  categoryProducts.innerHTML = products.map(product => {
    const discount = calcDiscount(product.precoAntigo, product.preco);
    const slug = slugify(product.nome);
    
    return `
      <article class="card">
        ${
          product.imagem
            ? `<img class="product-image" src="${product.imagem}" alt="${escapeHtml(product.nome)}" loading="lazy">`
            : `<div class="product-image-fallback">${product.emoji || "🛍️"}</div>`
        }
        <div class="card-body">
          ${product.destaque ? `<span class="badge badge-destaque">⭐ Destaque</span>` : `<span class="badge">${product.badge || "Oferta"}</span>`}
          ${discount ? `<span class="badge badge-desconto">-${discount}%</span>` : ""}
          
          <h3 class="product-title">${escapeHtml(product.nome)}</h3>
          <p class="product-desc">${escapeHtml(product.descricao)}</p>
          
          <div class="product-meta">
            <div class="price-group">
              ${product.precoAntigo ? `<span class="price-old">${formatPrice(product.precoAntigo)}</span>` : ""}
              <span class="price">${formatPrice(product.preco)}</span>
            </div>
            <span class="store">${escapeHtml(product.loja)}</span>
          </div>
          
          <a href="produto.html?id=${product.id}&slug=${slug}" class="btn btn-primary btn-block">Ver detalhes</a>
        </div>
      </article>
    `;
  }).join("");
}

loadCategory();