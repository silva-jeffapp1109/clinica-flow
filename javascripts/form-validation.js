// Arquivo de validação e simulação de envio do formulário de agendamento
console.log("Validador de formulário carregado com sucesso.");

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault(); // Impede o envio real (POST) para não quebrar a página estática

            const nomeEl = document.getElementById("nome");
            const emailEl = document.getElementById("email");
            const horaEl = document.getElementById("hora");

            const nome = nomeEl ? nomeEl.value.trim() : "";
            const email = emailEl ? emailEl.value.trim() : "";
            const hora = horaEl ? horaEl.value : "";

            if (!nome) {
                showNotification("Por favor, preencha seu nome completo.", "error");
                return;
            }

            if (!email) {
                showNotification("Por favor, preencha seu e-mail.", "error");
                return;
            }

            if (!hora) {
                showNotification("Por favor, selecione um horário desejado.", "error");
                return;
            }

            // Exibe modal premium de sucesso
            showSuccessModal(nome, email, hora);
        });
    }
});

function showNotification(message, type) {
    const toast = document.createElement("div");
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.padding = "14px 22px";
    toast.style.borderRadius = "12px";
    toast.style.background = type === "error" ? "rgba(239, 68, 68, 0.95)" : "rgba(16, 185, 129, 0.95)";
    toast.style.color = "#fff";
    toast.style.fontFamily = "'Outfit', sans-serif";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "600";
    toast.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.3)";
    toast.style.backdropFilter = "blur(8px)";
    toast.style.border = type === "error" ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)";
    toast.style.zIndex = "99999";
    toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
    toast.style.transform = "translateY(-10px)";
    toast.style.opacity = "0";
    toast.textContent = message;

    document.body.appendChild(toast);
    
    // Animação de entrada
    setTimeout(() => {
        toast.style.transform = "translateY(0)";
        toast.style.opacity = "1";
    }, 50);

    // Animação de saída
    setTimeout(() => {
        toast.style.transform = "translateY(-10px)";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showSuccessModal(nome, email, hora) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(15, 23, 42, 0.85)";
    overlay.style.backdropFilter = "blur(12px)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "999999";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease";

    const modal = document.createElement("div");
    modal.style.background = "rgba(30, 41, 59, 0.75)";
    modal.style.backdropFilter = "blur(16px)";
    modal.style.border = "1px solid rgba(255, 255, 255, 0.08)";
    modal.style.borderRadius = "24px";
    modal.style.padding = "40px 30px";
    modal.style.maxWidth = "420px";
    modal.style.width = "90%";
    modal.style.textAlign = "center";
    modal.style.boxShadow = "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.15)";
    modal.style.fontFamily = "'Outfit', sans-serif";
    modal.style.color = "#f8fafc";
    modal.style.transform = "scale(0.95)";
    modal.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";

    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #a78bfa, #8b5cf6); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
        <h3 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; background: linear-gradient(to right, #ffffff, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Solicitação Enviada!</h3>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 28px;">
            Olá, <strong>${nome.split(" ")[0]}</strong>! Recebemos sua solicitação de consulta para às <strong>${hora}</strong>. Enviamos a confirmação para <strong>${email}</strong>.
        </p>
        <button id="closeModalBtn" style="background: linear-gradient(135deg, #a78bfa, #8b5cf6); hover:background: linear-gradient(135deg, #c084fc, #a855f7); color: white; border: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3); width: 100%;">
            Voltar para a Página
        </button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Entrada suave
    setTimeout(() => {
        overlay.style.opacity = "1";
        modal.style.transform = "scale(1)";
    }, 50);

    const btn = modal.querySelector("#closeModalBtn");
    if (btn) {
        btn.addEventListener("click", () => {
            overlay.style.opacity = "0";
            modal.style.transform = "scale(0.95)";
            setTimeout(() => {
                overlay.remove();
                const formEl = document.querySelector("form");
                if (formEl) formEl.reset();
            }, 300);
        });
    }

    // Fechar ao clicar fora do modal
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            overlay.style.opacity = "0";
            modal.style.transform = "scale(0.95)";
            setTimeout(() => {
                overlay.remove();
                const formEl = document.querySelector("form");
                if (formEl) formEl.reset();
            }, 300);
        }
    });
}
