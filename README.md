# 🍔 Sistema de Lanchonete (PDV + KDS)

Um sistema completo para gerenciamento de lanchonetes e pizzarias, construído com arquitetura Client-Server. Possui Frente de Caixa (PDV), Painel de Cozinha (KDS), Histórico Financeiro e Autenticação.

## 🚀 Tecnologias Utilizadas
* **Frontend:** HTML5, Tailwind CSS, Phosphor Icons, JavaScript (Vanilla)
* **Backend:** Node.js, Express
* **Tempo Real:** Socket.io (WebSockets)
* **Banco de Dados:** SQLite

## ⚙️ Como executar o projeto localmente

1. Clone o repositório:
```bash
git clone https://github.com/AndersonFariaas/Gestor-FastFood-v1.git
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm start
```

4. Acesse no navegador: `http://localhost:3000`

### 🔑 Primeiro acesso
Na primeira execução (banco vazio) o sistema cria o usuário `admin`:
* Se a variável `ADMIN_PASSWORD` estiver definida, ela será a senha.
* Caso contrário, uma senha aleatória é gerada e exibida **uma única vez** no terminal.

### ⚙️ Variáveis de ambiente (opcionais)
| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor |
| `HOST` | `0.0.0.0` | Interface de rede (use `127.0.0.1` para acesso só local) |
| `DB_PATH` | `./lanchonete.sqlite` | Caminho do banco SQLite |
| `SESSION_TTL_HOURS` | `168` (7 dias) | Duração da sessão de login |
| `ADMIN_PASSWORD` | aleatória | Senha do admin criado no primeiro uso |

## 🛡️ Segurança
- Login validado no servidor, com sessão em cookie `httpOnly` e limite de tentativas.
- Todas as ações em tempo real exigem sessão válida; ações de gerência (cardápio, fechamento, cancelamento) são bloqueadas no servidor para operadores.
- Preço, total, número da senha e horário do pedido são calculados pelo servidor — o navegador envia apenas itens e quantidades.
- Todos os dados recebidos são validados (`zod`) e erros nunca derrubam o servidor.

## 🔒 Funcionalidades
- Sincronização em tempo real entre Caixa e Cozinha.
- Controle de acessos (Administrador vs Usuário Comum).
- Fechamento de caixa com relatório de pagamentos.
- Gestão de Cardápio e Histórico de Vendas.

- Feito por Anderson Farias