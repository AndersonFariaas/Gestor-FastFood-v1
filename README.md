# 🍔 Gestor FastFood

Sistema de gestão para lanchonetes: **frente de caixa (PDV)**, **tela da cozinha (KDS)**, **painel de senhas para TV**, **fechamento de caixa por turno** e **gestão de cardápio e usuários** — tudo sincronizado em tempo real na rede local.

## ✨ Funcionalidades

- **Caixa:** cardápio visual por categoria, busca com atalho `/`, pagamento em PIX, Dinheiro (com cálculo de troco) ou Cartão. Ao finalizar, o pedido vai para a cozinha e o comprovante (itens, senha, total e troco) é impresso automaticamente, sem cliques extras.
- **Cozinha:** pedidos novos e em preparo, cronômetro com alerta de atraso, aviso sonoro.
- **Painel da TV:** senha chamada em destaque com som, lista de prontos e em preparo.
- **Pedidos:** área de despacho com os pedidos prontos em destaque (botão "Entregar"), fluxo `Novo → Em preparo → Pronto → Entregue` e cancelamento com motivo (gerência).
- **Fechamento:** faturamento (pedidos entregues) por forma de pagamento, turnos com histórico consultável. Só fecha quando não há pedidos em andamento.
- **Cardápio e equipe:** CRUD completo, item esgotado com um toque, senha provisória no primeiro acesso, perfis Gerente/Operador.
- **Funciona offline:** nenhuma dependência de CDN — ideal para a rede da loja.

## 🧱 Arquitetura

Monorepo com [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces):

```
apps/
  api/        Node.js + Express + Socket.IO (TypeScript executado nativamente pelo Node 24)
  web/        Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router
packages/
  shared/     Tipos, constantes e validações (zod) usados pela API e pelo front
```

```
Navegador ──HTTP (REST)──▶ API ──▶ Serviços ──▶ Repositórios ──▶ SQLite
    ▲                                  │
    └───── Socket.IO (só leitura) ◀── Eventos de domínio
```

- **REST para ações, Socket.IO só para notificar** as telas (servidor → cliente).
- **Servidor é a fonte da verdade:** o navegador envia apenas itens e quantidades; preço, total, número da senha e horário são calculados na API, dentro de transações.
- **Camadas na API:** rotas (HTTP + validação) → serviços (regras de negócio) → repositórios (SQL). Dependências injetadas em `container.ts`.
- **Banco:** SQLite nativo do Node (`node:sqlite`), migrações versionadas em `apps/api/src/db/migrations`, valores em centavos.

### Segurança

- Sessão em cookie `httpOnly` + `SameSite=Strict`; token guardado só como hash no banco.
- Senhas com bcrypt, limite de tentativas de login e mensagens que não revelam usuários válidos.
- Permissões verificadas no servidor (gerência × operador) em toda rota.
- Validação de todas as entradas com zod; erros nunca derrubam o processo.
- Cabeçalhos de segurança com Helmet (CSP); nenhum HTML montado com dados do usuário.

## 🚀 Como rodar

Requisitos: **Node.js 24+**.

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Sobe a API em `http://localhost:3000` e o front com hot reload em **`http://localhost:5173`** (o Vite repassa `/api` e o WebSocket para a API).

### Produção (rede da loja)

```bash
npm run build
```

```bash
npm start
```

A API passa a servir também o front compilado em `http://<ip-do-computador>:3000`. Abra o caixa, a cozinha (`/cozinha`) e o painel (`/painel`) em qualquer dispositivo da rede.

> **Impressão direta (sem caixa de diálogo):** abra o caixa no Chrome com a opção `--kiosk-printing` e defina a impressora térmica como padrão do Windows. Ex.: `chrome.exe --kiosk-printing http://localhost:3000`. O comprovante impresso não é documento fiscal; emitir NFC-e exige integração com a SEFAZ.

### Primeiro acesso

Na primeira execução é criado o usuário **`admin`**. A senha é a de `ADMIN_PASSWORD` (se definida) ou uma senha aleatória exibida **uma única vez** no log. No primeiro login o sistema pede para trocá-la.

### Migrar dados da versão 1

O banco antigo (`lanchonete.sqlite`) pode ser importado para um banco novo — usuários (com as mesmas senhas), cardápio e pedidos:

```bash
npm run db:import-legacy -- ../../lanchonete.sqlite
```

Rode **antes** de cadastrar dados no sistema novo. Quem ainda usa a senha padrão `admin123` precisará trocá-la no próximo login.

## ⚙️ Configuração

Copie `apps/api/.env.example` para `apps/api/.env`. Todas as variáveis são opcionais:

| Variável            | Padrão             | Descrição                                                               |
| ------------------- | ------------------ | ----------------------------------------------------------------------- |
| `PORT`              | `3000`             | Porta da API                                                            |
| `HOST`              | `0.0.0.0`          | Use `127.0.0.1` para permitir acesso só nesta máquina                   |
| `DB_PATH`           | `data/fastfood.db` | Caminho do banco (relativo a `apps/api`)                                |
| `SESSION_TTL_HOURS` | `168` (7 dias)     | Duração da sessão                                                       |
| `COOKIE_SECURE`     | `false`            | `true` somente se o sistema for servido via HTTPS                       |
| `ADMIN_PASSWORD`    | aleatória          | Senha do `admin` criado no primeiro uso                                 |
| `LOG_LEVEL`         | `info`             | `info` mostra ações e falhas; `debug` inclui leituras                   |
| `LOG_FORMAT`        | `auto`             | `auto` (legível no terminal, JSON se redirecionado), `pretty` ou `json` |

## 🧪 Qualidade

| Comando             | O que faz                                     |
| ------------------- | --------------------------------------------- |
| `npm test`          | Testes (Vitest): integração da API e unidades |
| `npm run typecheck` | Checagem de tipos de todos os pacotes         |
| `npm run lint`      | ESLint (TypeScript + Vue)                     |
| `npm run format`    | Prettier                                      |
| `npm run check`     | Tudo acima, como no CI                        |

O GitHub Actions executa `npm run check` e o build a cada push e pull request.

---

Feito por **Anderson Farias** · Licença [GPL-3.0](LICENSE)
