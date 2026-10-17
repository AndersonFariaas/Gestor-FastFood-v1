-- Esquema inicial. Valores monetários em centavos (INTEGER); datas em ISO 8601 (UTC).

CREATE TABLE users (
  id                   TEXT PRIMARY KEY,
  username             TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash        TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
  created_at           TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  category    TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  deleted_at  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Turno de caixa: sempre existe exatamente um turno aberto.
CREATE TABLE shifts (
  id        TEXT PRIMARY KEY,
  opened_at TEXT NOT NULL,
  opened_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  closed_at TEXT,
  closed_by TEXT REFERENCES users (id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX idx_shifts_single_open ON shifts ((closed_at IS NULL)) WHERE closed_at IS NULL;

CREATE TABLE orders (
  id             TEXT PRIMARY KEY,
  shift_id       TEXT NOT NULL REFERENCES shifts (id),
  number         INTEGER NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO')),
  customer       TEXT NOT NULL,
  note           TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL,
  total_cents    INTEGER NOT NULL CHECK (total_cents >= 0),
  cancel_reason  TEXT,
  created_by     TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (shift_id, number)
);
CREATE INDEX idx_orders_shift_status ON orders (shift_id, status);

-- Itens guardam nome e preço do momento da venda (o cardápio pode mudar depois).
CREATE TABLE order_items (
  id               INTEGER PRIMARY KEY,
  order_id         TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id       TEXT REFERENCES products (id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity         INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_order_items_order ON order_items (order_id);
