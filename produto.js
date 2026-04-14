import { firebaseConfig, escapeHtml, formatPrice, calcDiscount, showToast } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const productContent = document.getElementById("productContent");
const breadcrumbName = document.getElementById("breadcrumbName");
const pageTitle = document.getElementById("pageTitle");
const pageDescription = document.getElementById("pageDescription");
const ogTitle = document.getElementById("ogTitle");
const ogDescription = document.getElementById("ogDescription");
const ogImage = document.getElementById("ogImage");

async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    productContent.innerHTML = `<div class="empty">Produto não encontrado.</div>`;
    return;
  }

  try {
    const docRef = doc(db, "produtos", productId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      productContent.innerHTML = `<div class="empty">Produto não encontrado.</div>`;
      return;
    }

    const product = docSnap.data();
    const discount = calcDiscount(product.precoAntigo, product.preco);

    // Atualizar meta tags
    pageTitle.textContent = `${product.nome} | Radar de Ofertas`;
    pageDescription.setAttribute("content", product.descricao);
    ogTitle.setAttribute("content", product.nome);
    ogDescription.setAttribute("content", product.descricao);
    if (product.imagem) {
      ogImage.setAttribute("content", product.imagem);
    }

    breadcrumbName.textContent = product.nome;

    productContent.innerHTML = `
      <div class="product-detail">
        <div>
          ${
            product.imagem
              ? `<img class="product-detail-image" src="${product.imagem}" alt="${escapeHtml(product.nome)}">`
              : `<div class="product-image-fallback" style="height:400px;font-size:5rem;">${product.emoji || "🛍️"}</div>`
          }
        </div>

        <div class="product-detail-info">
          ${product.destaque ? `<span class="badge badge-destaque" style="font-size:1rem;">⭐ Produto em destaque</span>` : `<span class="badge" style="font-size:1rem;">${product.badge || "Oferta"}</span>`}
          ${discount ? `<span class="badge badge-desconto" style="font-size:1rem;">-${discount}% de desconto</span>` : ""}

          <h1>${escapeHtml(product.nome)}</h1>

          <div class="product-detail-meta">
            <div>
              <strong>Loja:</strong> ${escapeHtml(product.loja)}
            </div>
            <div>
              <strong>Categoria:</strong> ${escapeHtml(product.categoria)}
            </div>
          </div>

          <p style="color:var(--muted);font-size:1.05rem;margin-bottom:20px;">
            ${escapeHtml(product.descricao)}
          </p>

          <div style="margin:20px 0;">
            ${product.precoAntigo ? `
              <div style="margin-bottom:8px;">
                <span style="color:var(--light);text-decoration:line-through;font-size:1.1rem;">
                  De ${formatPrice(product.precoAntigo)}
                </span>
              </div>
            ` : ""}
            <div style="font-size:2rem;font-weight:800;color:var(--success);">
              Por ${formatPrice(product.preco)}
            </div>
            ${discount ? `
              <div style="margin-top:8px;">
                <span class="discount-badge" style="padding:8px 14px;font-size:1rem;">
                  Economize ${discount}%
                </span>
              </div>
            ` : ""}
          </div>

          ${product.cupom ? `
            <div class="coupon-box">
              <strong>🎟️ Cupom de desconto disponível</strong>
              <div class="coupon-code">
                <input type="text" value="${escapeHtml(product.cupom)}" readonly id="couponInput">
                <button class="btn btn-warning btn-small" onclick="copyCoupon()">Copiar</button>
              </div>
            </div>
          ` : ""}

          <div style="margin-top:24px;">
            <a href="${product.link}" target="_blank" rel="nofollow sponsored" class="btn btn-primary btn-block" style="font-size:1.1rem;padding:16px;">
              🛒 Ver oferta na ${escapeHtml(product.loja)}
            </a>
          </div>

          <div class="notice" style="margin-top:20px;">
            Este site pode receber comissão por compras realizadas através deste link, sem custo adicional para você.
          </div>

          <div class="product-specs" style="margin-top:30px;">
            <h3 style="margin-bottom:14px;">Informações do produto</h3>
            <ul>
              <li><strong>Nome:</strong> ${escapeHtml(product.nome)}</li>
              <li><strong>Loja:</strong> ${escapeHtml(product.loja)}</li>
              <li><strong>Categoria:</strong> ${escapeHtml(product.categoria)}</li>
              <li><strong>Preço:</strong> ${formatPrice(product.preco)}</li>
              ${product.precoAntigo ? `<li><strong>Preço anterior:</strong> ${formatPrice(product.precoAntigo)}</li>` : ""}
              ${product.cupom ? `<li><strong>Cupom:</strong> ${escapeHtml(product.cupom)}</li>` : ""}
            </ul>
          </div>
        </div>
      </div>

      <div style="margin-top:40px;text-align:center;">
        <a href="index.html#produtos" class="btn btn-outline">Ver mais produtos</a>
      </div>
    `;
  } catch (error) {
    productContent.innerHTML = `<div class="empty">Erro ao carregar produto.</div>`;
    console.error(error);
  }
}

window.copyCoupon = function() {
  const input = document.getElementById("couponInput");
  input.select();
  navigator.clipboard.writeText(input.value);
  showToast("Cupom copiado!", "success");
};

loadProduct();