# API Endpoint Documentation — Supermarket POS Backend

Base URL: `http://localhost:4000/api` (local/Docker). On a cloud deployment
(see CLOUD_DEPLOY_MYANMAR.md), this becomes `https://your-app-name.onrender.com/api`.

All endpoints except `/auth/login` require:
```
Authorization: Bearer <jwt_token>
```

Roles: `cashier` < `manager` < `admin`

---

## Auth

| Method | Endpoint            | Role         | Description                          |
|--------|----------------------|--------------|---------------------------------------|
| POST   | `/auth/login`         | Public       | Login, returns JWT + user profile     |
| POST   | `/auth/register`      | admin        | Create a new user account             |
| GET    | `/auth/me`            | any          | Get current logged-in user profile    |

## Products (Inventory)

| Method | Endpoint                          | Role            | Description                                  |
|--------|------------------------------------|-----------------|------------------------------------------------|
| GET    | `/products?search=&category_id=`  | any             | List/search products                          |
| GET    | `/products/:id`                    | any             | Get one product                               |
| GET    | `/products/barcode/:barcode`       | any             | **Barcode scanner lookup** (used at checkout) |
| GET    | `/products/alerts/low-stock`       | manager, admin  | Products at/below reorder level               |
| GET    | `/products/alerts/expiring?days=`  | manager, admin  | Products expiring within N days               |
| POST   | `/products`                        | manager, admin  | Create product                                |
| PUT    | `/products/:id`                    | manager, admin  | Update product                                |
| DELETE | `/products/:id`                    | admin           | Deactivate (soft delete) product              |

## Categories

| Method | Endpoint        | Role            | Description       |
|--------|------------------|-----------------|--------------------|
| GET    | `/categories`    | any             | List categories    |
| POST   | `/categories`    | manager, admin  | Create category    |

## Suppliers & Purchase Orders

| Method | Endpoint                                        | Role            | Description                              |
|--------|---------------------------------------------------|-----------------|--------------------------------------------|
| GET    | `/suppliers`                                       | manager, admin  | List suppliers                            |
| POST   | `/suppliers`                                       | manager, admin  | Create supplier                           |
| PUT    | `/suppliers/:id`                                   | manager, admin  | Update supplier                           |
| GET    | `/suppliers/purchase-orders/all`                   | manager, admin  | List all purchase orders                  |
| POST   | `/suppliers/purchase-orders`                       | manager, admin  | Create a new purchase order                |
| POST   | `/suppliers/purchase-orders/:id/receive`           | manager, admin  | Receive stock against a PO (increases stock, logged transactionally) |

## Promotions / Coupons

| Method | Endpoint                        | Role            | Description                  |
|--------|-----------------------------------|-----------------|--------------------------------|
| GET    | `/promotions`                     | any             | List active/inactive promos   |
| POST   | `/promotions`                     | manager, admin  | Create promotion/coupon       |
| PUT    | `/promotions/:id/deactivate`      | manager, admin  | Deactivate a promotion        |

## Sales / Checkout  ⭐ Core Module

| Method | Endpoint               | Role            | Description                                                    |
|--------|-------------------------|-----------------|-------------------------------------------------------------------|
| POST   | `/sales/checkout`       | any (cashier+)  | **Process a sale.** Atomic transaction: locks stock, deducts inventory, records payment(s), applies coupon. See request/response shape below. |
| GET    | `/sales?from=&to=`      | manager, admin  | Sales history                                                   |
| GET    | `/sales/:id`            | manager, admin  | Full receipt detail (items + payments)                          |
| POST   | `/sales/:id/void`       | manager, admin  | Void a completed sale, restores stock                            |

### `POST /sales/checkout` — Request body
```json
{
  "items": [
    { "product_id": 12, "quantity": 2 },
    { "product_id": 5,  "quantity": 1 }
  ],
  "payments": [
    { "method": "cash",  "amount": 5000 },
    { "method": "kpay",  "amount": 3200, "reference_number": "KPAY-TXN-991122" }
  ],
  "promo_code": "NEWYEAR10"
}
```

### Response (success, 201)
```json
{
  "message": "Checkout successful.",
  "sale_id": 105,
  "sale_number": "POS-20260619-143012-482",
  "subtotal": 9200,
  "discount_total": 1000,
  "total_amount": 8200,
  "created_at": "2026-06-19T14:30:12.000Z"
}
```

### Response (failure, e.g. insufficient stock — 409)
```json
{ "error": "Insufficient stock for \"Coca-Cola 1.5L\". Available: 1, requested: 2." }
```
On any error, the **entire transaction rolls back** — no stock is deducted, no sale row is created.

## Reports & Analytics

| Method | Endpoint                                  | Role            | Description                               |
|--------|---------------------------------------------|-----------------|----------------------------------------------|
| GET    | `/reports/sales?period=daily\|weekly\|monthly` | manager, admin | Aggregated sales totals per period      |
| GET    | `/reports/profit-margin?from=&to=`          | manager, admin  | Revenue, cost, and profit per product       |
| GET    | `/reports/best-selling?limit=10`            | manager, admin  | Top-selling products                        |
| GET    | `/reports/slow-moving?days=30`              | manager, admin  | Products with little/no recent sales        |
| GET    | `/reports/export/sales.xlsx?from=&to=`      | manager, admin  | Download sales report as Excel              |
| GET    | `/reports/export/sales.pdf?from=&to=`       | manager, admin  | Download sales report as PDF                |

---

## Standard error shape
```json
{ "error": "Human-readable message" }
```

## HTTP status code conventions used throughout
- `400` – Bad request / validation error
- `401` – Not authenticated (missing/invalid token)
- `403` – Authenticated but role not permitted
- `404` – Resource not found
- `409` – Conflict (duplicate SKU, insufficient stock, payment mismatch)
- `500` – Unexpected server/database error
