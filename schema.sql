-- ===================================================================
--  SUPERMARKET POS SYSTEM - DATABASE SCHEMA (PostgreSQL)
-- ===================================================================
--  Design notes:
--  - quantity_in_stock is kept directly on `products` (not a separate
--    "inventories" table) so the checkout transaction can lock and
--    update it in ONE place with `SELECT ... FOR UPDATE`. This avoids
--    race conditions when two cashiers sell the same product at once.
--  - `stock_movements` acts as the audit trail / ledger for every
--    stock change (sale, purchase received, manual adjustment,
--    customer return) -- this is what most real systems call
--    "Inventory" in reports.
-- ===================================================================

-- ---------------------------------------------------------------
-- 1. USERS  (RBAC: cashier / manager / admin)
-- ---------------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('cashier', 'manager', 'admin')),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 2. CATEGORIES  (e.g. Beverages, Snacks, Dairy)
-- ---------------------------------------------------------------
CREATE TABLE categories (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) UNIQUE NOT NULL
);

-- ---------------------------------------------------------------
-- 3. SUPPLIERS
-- ---------------------------------------------------------------
CREATE TABLE suppliers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(30),
    email           VARCHAR(100),
    address         TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 4. PRODUCTS  (SKU / Barcode / pricing / live stock count)
-- ---------------------------------------------------------------
CREATE TABLE products (
    id                  SERIAL PRIMARY KEY,
    sku                 VARCHAR(50)  UNIQUE NOT NULL,
    barcode             VARCHAR(50)  UNIQUE,            -- scanned at checkout
    name                VARCHAR(150) NOT NULL,
    category_id         INT REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id         INT REFERENCES suppliers(id)  ON DELETE SET NULL,
    cost_price          NUMERIC(12,2) NOT NULL CHECK (cost_price >= 0),
    selling_price       NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
    quantity_in_stock   INT NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
    reorder_level       INT NOT NULL DEFAULT 10,        -- triggers "low stock" alert
    expiry_date         DATE,                           -- NULL = non-perishable
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_expiry  ON products(expiry_date);

-- ---------------------------------------------------------------
-- 5. STOCK MOVEMENTS  (full audit ledger of every stock change)
-- ---------------------------------------------------------------
CREATE TABLE stock_movements (
    id                SERIAL PRIMARY KEY,
    product_id        INT NOT NULL REFERENCES products(id),
    change_type       VARCHAR(20) NOT NULL CHECK (change_type IN
                        ('sale', 'purchase_receive', 'adjustment', 'return')),
    quantity_change   INT NOT NULL,        -- negative = stock leaving, positive = stock coming in
    reference_id      INT,                 -- sale_id OR purchase_order_id, depending on change_type
    note              TEXT,
    created_by        INT REFERENCES users(id),
    created_at        TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 6. PURCHASE ORDERS  (restocking from suppliers)
-- ---------------------------------------------------------------
CREATE TABLE purchase_orders (
    id              SERIAL PRIMARY KEY,
    po_number       VARCHAR(50) UNIQUE NOT NULL,
    supplier_id     INT NOT NULL REFERENCES suppliers(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN
                        ('pending', 'partially_received', 'received', 'cancelled')),
    ordered_by      INT REFERENCES users(id),
    order_date      DATE DEFAULT CURRENT_DATE,
    expected_date   DATE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id                  SERIAL PRIMARY KEY,
    purchase_order_id   INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id          INT NOT NULL REFERENCES products(id),
    quantity_ordered    INT NOT NULL CHECK (quantity_ordered > 0),
    quantity_received   INT NOT NULL DEFAULT 0,
    unit_cost           NUMERIC(12,2) NOT NULL
);

-- ---------------------------------------------------------------
-- 7. PROMOTIONS / COUPONS
-- ---------------------------------------------------------------
CREATE TABLE promotions (
    id                      SERIAL PRIMARY KEY,
    code                    VARCHAR(50) UNIQUE NOT NULL,     -- coupon code typed/scanned at checkout
    name                    VARCHAR(150) NOT NULL,
    discount_type           VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value          NUMERIC(12,2) NOT NULL CHECK (discount_value >= 0),
    applicable_product_id   INT REFERENCES products(id),     -- NULL = not product-specific
    applicable_category_id  INT REFERENCES categories(id),   -- NULL = not category-specific
    start_date              DATE NOT NULL,
    end_date                DATE NOT NULL,
    is_active               BOOLEAN DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- 8. SALES  (the checkout "receipt" header)
-- ---------------------------------------------------------------
CREATE TABLE sales (
    id              SERIAL PRIMARY KEY,
    sale_number     VARCHAR(50) UNIQUE NOT NULL,         -- e.g. printed on receipt
    cashier_id      INT NOT NULL REFERENCES users(id),
    subtotal        NUMERIC(12,2) NOT NULL,
    discount_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(12,2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN
                        ('completed', 'voided', 'refunded')),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_created_at ON sales(created_at);

-- ---------------------------------------------------------------
-- 9. SALE ITEMS  (line items on a receipt)
-- ---------------------------------------------------------------
CREATE TABLE sale_items (
    id          SERIAL PRIMARY KEY,
    sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id  INT NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12,2) NOT NULL,     -- price AT TIME of sale (don't trust product.selling_price later)
    line_total  NUMERIC(12,2) NOT NULL
);

-- ---------------------------------------------------------------
-- 10. PAYMENTS  (supports split payments: e.g. half cash + half KPay)
-- ---------------------------------------------------------------
CREATE TABLE payments (
    id                SERIAL PRIMARY KEY,
    sale_id           INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    method            VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'kpay', 'wavepay', 'card')),
    amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reference_number  VARCHAR(100),         -- transaction ID from KPay/WavePay/card terminal
    status            VARCHAR(20) NOT NULL DEFAULT 'success',
    paid_at           TIMESTAMP DEFAULT NOW()
);
