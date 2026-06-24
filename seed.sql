-- =====================================================================
-- SEED DATA -- sample accounts, categories, suppliers and products
-- so the system is immediately testable after setup.
-- =====================================================================

-- Default login accounts (CHANGE THESE PASSWORDS before real use!)
--   username: admin     password: admin123     role: admin
--   username: manager   password: manager123   role: manager
--   username: cashier   password: cashier123   role: cashier
INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin',   '$2b$10$5.WDaJQPOC6HBy/zE9Gu5O2aCHTEacbvpZSAoDUnma4cfLdNy/rBO', 'Store Admin',   'admin'),
('manager', '$2b$10$H3cKWsn9BbuJbEoqypEA6OPUFBcXzcWo3LvEwk/zfIdBupvYUf8G6', 'Store Manager', 'manager'),
('cashier', '$2b$10$aD8aM/Cdt.jTatZyQUbXbu27MYwVEWEHwoXqxHYaLS9k67OwXq/sK', 'Front Cashier', 'cashier');

INSERT INTO categories (name) VALUES
('Beverages'), ('Snacks'), ('Dairy'), ('Household'), ('Personal Care');

INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('Golden Land Distribution', 'U Aung Min', '09-123456789', 'sales@goldenland.com.mm', 'Yangon, Myanmar'),
('Myanmar Fresh Foods Co.', 'Daw Hla Hla', '09-987654321', 'contact@freshfoods.com.mm', 'Mandalay, Myanmar');

-- Sample products (mixed expiry dates and stock levels so alerts have something to show)
INSERT INTO products (sku, barcode, name, category_id, supplier_id, cost_price, selling_price, quantity_in_stock, reorder_level, expiry_date) VALUES
('SKU-0001', '8850001000017', 'Coca-Cola 1.5L',          1, 1, 900,  1200, 48, 12, '2026-12-31'),
('SKU-0002', '8850001000024', 'Myanmar Beer 330ml',      1, 1, 1100, 1500, 36, 12,  NULL),
('SKU-0003', '8850001000031', 'Lays Potato Chips 60g',   2, 1, 500,  750,  60, 20, '2026-09-15'),
('SKU-0004', '8850001000048', 'Oreo Cookies 137g',       2, 1, 700,  950,  40, 15, '2026-08-01'),
('SKU-0005', '8850001000055', 'Fresh Milk 1L',           3, 2, 1300, 1700, 8,  10, '2026-06-25'),
('SKU-0006', '8850001000062', 'Yogurt Cup 100g',         3, 2, 300,  450,  5,  10, '2026-06-22'),
('SKU-0007', '8850001000079', 'Dish Soap 500ml',         4, 1, 800,  1100, 25, 10,  NULL),
('SKU-0008', '8850001000086', 'Toilet Paper 6-Roll',     4, 1, 1500, 2000, 30, 10,  NULL),
('SKU-0009', '8850001000093', 'Toothpaste 100g',         5, 2, 600,  900,  3,  10,  NULL),
('SKU-0010', '8850001000109', 'Shampoo 200ml',           5, 2, 1200, 1650, 18, 10,  NULL);

-- Sample promotion (active right now)
INSERT INTO promotions (code, name, discount_type, discount_value, start_date, end_date) VALUES
('WELCOME10', '10% Storewide Welcome Discount', 'percent', 10, '2026-01-01', '2026-12-31');
