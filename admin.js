import { firebaseConfig, slugify, showToast } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");
const productForm = document.getElementById("productForm");
const adminProductsList = document.getElementById("adminProductsList");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveBtn = document.getElementById("saveBtn");

const totalProductsEl = document.getElementById("totalProducts");
const activeProductsEl = document.getElementById("activeProducts");
const featuredProductsEl = document.getElementById("featuredProducts");

let editingId = null;

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginMessage.textContent = "Login realizado com sucesso.";
    loginMessage.style.color = "green";
    showToast("Login realizado com sucesso!", "success");
  } catch (error) {
    loginMessage.textContent = "Erro ao entrar. Verifique e-mail e senha.";
    loginMessage.style.color = "red";
    showToast("Erro ao fazer login.", "danger");
    console.error(error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  showToast("Você saiu do painel.", "success");
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.classList.add("hidden");
    adminSection.classList.remove("hidden");
    loadAdminProducts();
  } else {
    loginSection.classList.remove("hidden");
    adminSection.classList.add("hidden");
  }
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const product = {
    nome: document.getElementById("nome").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    preco: document.getElementById("preco").value.trim(),
    precoAntigo: document.getElementById("precoAntigo").value.trim(),
    loja: document.getElementById("loja").value.trim(),
    categoria: document.getElementById("categoria").value.trim(),
    badge: document.getElementById("badge").value.trim() || "Oferta",
    cupom: document.getElementById("cupom").value.trim(),
    emoji: document.getElementById("emoji").value.trim() || "🛍️",
    imagem: document.getElementById("imagem").value.trim(),
    link: document.getElementById("link").value.trim(),
    destaque: document.getElementById("destaque").checked,
    ativo: document.getElementById("ativo").checked
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "produtos", editingId), product);
      showToast("Produto atualizado com sucesso!", "success");
    } else {
      await addDoc(collection(db, "produtos"), {
        ...product,
        criadoEm: serverTimestamp()
      });
      showToast("Produto cadastrado com sucesso!", "success");
    }

    resetForm();
    loadAdminProducts();
  } catch (error) {
    showToast("Erro ao salvar produto.", "danger");
    console.error(error);
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

function resetForm() {
  productForm.reset();
  document.getElementById("ativo").checked = true;
  editingId = null;
  saveBtn.textContent = "Salvar produto";
  cancelEditBtn.classList.add("hidden");
}

async function loadAdminProducts() {
  try {
    const q = query(collection(db, "produtos"), orderBy("criadoEm", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      adminProductsList.innerHTML = `<div class="empty">Nenhum produto cadastrado.</div>`;
      updateStats(0, 0, 0);
      return;
    }

    const products = [];
    snapshot.forEach((item) => {
      products.push({
        id: item.id,
        ...item.data()
      });
    });

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.ativo).length;
    const featuredProducts = products.filter(p => p.destaque).length;

    updateStats(totalProducts, activeProducts, featuredProducts);
    renderAdminList(products);
  } catch (error) {
    adminProductsList.innerHTML = `<div class="empty">Erro ao carregar produtos.</div>`;
    console.error(error);
  }
}

function updateStats(total, active, featured) {
  totalProductsEl.textContent = total;
  activeProductsEl.textContent = active;
  featuredProductsEl.textContent = featured;
}

function renderAdminList(products) {
  adminProductsList.innerHTML = products.map((product) => `
    <div class="admin-item ${!product.ativo ? 'inactive' : ''}">
      <h4>
        ${product.emoji || "🛍️"} 
        ${escapeHtml(product.nome)}
        ${product.destaque ? " ⭐" : ""}
        ${!product.ativo ? " (Inativo)" : ""}
      </h4>
      <p>${escapeHtml(product.descricao)}</p>
      <p><strong>Preço:</strong> ${escapeHtml(product.preco)}</p>
      ${product.precoAntigo ? `<p><strong>Preço antigo:</strong> ${escapeHtml(product.precoAntigo)}</p>` : ""}
      <p><strong>Loja:</strong> ${escapeHtml(product.loja)}</p>
      <p><strong>Categoria:</strong> ${escapeHtml(product.categoria)}</p>
      ${product.cupom ? `<p><strong>Cupom:</strong> ${escapeHtml(product.cupom)}</p>` : ""}
      ${product.imagem ? `<p><strong>Imagem:</strong> cadastrada</p>` : ""}
      <div class="top-actions">
        <a href="${product.link}" target="_blank" class="btn btn-outline btn-small">Abrir link</a>
        <a href="produto.html?id=${product.id}&slug=${slugify(product.nome)}" target="_blank" class="btn btn-outline btn-small">Ver página</a>
        <button class="btn btn-primary btn-small" onclick="window.editProduct('${product.id}')">Editar</button>
        <button class="btn btn-danger btn-small" onclick="window.deleteProduct('${product.id}')">Excluir</button>
      </div>
    </div>
  `).join("");
}

window.editProduct = async function(id) {
  try {
    const snap = await getDoc(doc(db, "produtos", id));
    if (!snap.exists()) return;

    const product = snap.data();

    document.getElementById("nome").value = product.nome || "";
    document.getElementById("descricao").value = product.descricao || "";
    document.getElementById("preco").value = product.preco || "";
    document.getElementById("precoAntigo").value = product.precoAntigo || "";
    document.getElementById("loja").value = product.loja || "";
    document.getElementById("categoria").value = product.categoria || "";
    document.getElementById("badge").value = product.badge || "";
    document.getElementById("cupom").value = product.cupom || "";
    document.getElementById("emoji").value = product.emoji || "";
    document.getElementById("imagem").value = product.imagem || "";
    document.getElementById("link").value = product.link || "";
    document.getElementById("destaque").checked = product.destaque || false;
    document.getElementById("ativo").checked = product.ativo !== false;

    editingId = id;
    saveBtn.textContent = "Atualizar produto";
    cancelEditBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Produto carregado para edição.", "success");
  } catch (error) {
    showToast("Erro ao carregar produto para edição.", "danger");
    console.error(error);
  }
};

window.deleteProduct = async function(id) {
  const confirmDelete = confirm("Tem certeza que deseja excluir este produto?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "produtos", id));
    loadAdminProducts();
    showToast("Produto excluído com sucesso.", "success");
  } catch (error) {
    showToast("Erro ao excluir produto.", "danger");
    console.error(error);
  }
};

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}