// Suas credenciais do Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyCN_lvHEYr4u4M-t0zRpK5x70X9zsk-tYQ",
  authDomain: "radar-de-ofertas-6f111.firebaseapp.com",
  projectId: "radar-de-ofertas-6f111",
  storageBucket: "radar-de-ofertas-6f111.firebasestorage.app",
  messagingSenderId: "907317647842",
  appId: "1:907317647842:web:fed30440861d062c9601bb",
  measurementId: "G-BBCF0L8NRD"
};

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

export function formatPrice(price) {
  if (!price) return "Consultar";

  // Se já vier formatado como string ex: "R$ 149,90" retorna direto
  if (typeof price === "string" && price.includes("R$")) return price;

  // Se vier como número converte para BRL
  const number = parseFloat(
    String(price).replace(/[^\d,\.]/g, "").replace(",", ".")
  );

  if (isNaN(number)) return price;

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function calcDiscount(oldPrice, newPrice) {
  if (!oldPrice || !newPrice) return null;

  const old = parseFloat(oldPrice.replace(/[^\d,]/g, "").replace(",", "."));
  const now = parseFloat(newPrice.replace(/[^\d,]/g, "").replace(",", "."));

  if (isNaN(old) || isNaN(now) || old <= now) return null;

  const discount = Math.round(((old - now) / old) * 100);
  return discount > 0 ? discount : null;
}

export function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}