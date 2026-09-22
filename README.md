# 🍔 Sistema de Lanchonete (PDV + KDS)

Um sistema completo para gerenciamento de lanchonetes e pizzarias, construído com arquitetura Client-Server. Possui Frente de Caixa (PDV), Painel de Cozinha (KDS), Histórico Financeiro e Autenticação.

## 🚀 Tecnologias Utilizadas
* **Frontend:** HTML5, Tailwind CSS, Phosphor Icons, JavaScript (Vanilla)
* **Backend:** Node.js, Express
* **Tempo Real:** Socket.io (WebSockets)
* **Banco de Dados:** SQLite

## ⚙️ Como executar o projeto localmente

1. Clone o repositório:
\`\`\`bash
git clone https://github.com/AndersonFariaas/Gestor-FastFood-v1.git
\`\`\`

2. Instale as dependências:
\`\`\`bash
npm install
\`\`\`

3. Inicie o servidor:
\`\`\`bash
npm start
\`\`\`

4. Acesse no navegador:
* URL: `http://localhost:3000`
* **Usuário padrão:** `admin`
* **Senha padrão:** `admin123`

## 🔒 Funcionalidades
- Sincronização em tempo real entre Caixa e Cozinha.
- Controle de acessos (Administrador vs Usuário Comum).
- Fechamento de caixa com relatório de pagamentos.
- Gestão de Cardápio e Histórico de Vendas.

- Feito por Anderson Farias