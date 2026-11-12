-- Migração aditiva: não altera preços, pedidos ou compras existentes de skins.
CREATE TABLE IF NOT EXISTS cerco_shop.card_orders (
 id uuid PRIMARY KEY,
 owner_hash text NOT NULL REFERENCES cerco_shop.collections(owner_hash),
 card_id text NOT NULL CHECK(card_id='card_liliti'),
 amount integer NOT NULL CHECK(amount=1000),
 status text NOT NULL DEFAULT 'creating',
 checkout_url text,
 transaction_nsu text UNIQUE,
 slug text,
 method text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cerco_one_pending_card
 ON cerco_shop.card_orders(owner_hash,card_id) WHERE status IN ('creating','pending');
CREATE INDEX IF NOT EXISTS cerco_card_orders_owner ON cerco_shop.card_orders(owner_hash,created_at DESC);
CREATE TABLE IF NOT EXISTS cerco_shop.card_owned (
 owner_hash text NOT NULL REFERENCES cerco_shop.collections(owner_hash),
 card_id text NOT NULL CHECK(card_id='card_liliti'),
 order_id uuid NOT NULL REFERENCES cerco_shop.card_orders(id),
 PRIMARY KEY(owner_hash,card_id)
);
CREATE TABLE IF NOT EXISTS cerco_shop.payment_claims (
 transaction_nsu text PRIMARY KEY,
 order_id uuid NOT NULL UNIQUE
);
INSERT INTO cerco_shop.payment_claims(transaction_nsu,order_id)
 SELECT transaction_nsu,id FROM cerco_shop.orders WHERE transaction_nsu IS NOT NULL
 ON CONFLICT DO NOTHING;
