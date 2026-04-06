"""
BillFlow - Smart Billing & Inventory
FastAPI Backend — replaces your old psycopg2 terminal scripts

Install: pip install fastapi uvicorn psycopg2-binary
Run:     uvicorn backend:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import psycopg2
import psycopg2.extras
from datetime import date

app = FastAPI(title="BillFlow API", version="1.0.0")

# Allow frontend to call this API from any origin (local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DATABASE CONNECTION ──────────────────────────────────────────
def get_conn():
    return psycopg2.connect(
        host="localhost",
        database="ecommerce",
        user="postgres",
        password="9522",
        port="5433"
    )

def query(sql, params=(), fetch="all"):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(sql, params)
    result = None
    if fetch == "all":
        result = cur.fetchall()
    elif fetch == "one":
        result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return result

# ─── PYDANTIC MODELS ─────────────────────────────────────────────
class CustomerCreate(BaseModel):
    name: str
    contact: str

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    quantity: int

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None

class StockUpdate(BaseModel):
    quantity: int  # amount to deduct

class SaleCreate(BaseModel):
    customer_id: int
    date: str
    total_amount: float

class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int
    price: float

# ─── CUSTOMERS ───────────────────────────────────────────────────
@app.get("/customers")
def get_customers():
    return query("SELECT * FROM customers ORDER BY id DESC")

@app.get("/customers/{customer_id}")
def get_customer(customer_id: int):
    c = query("SELECT * FROM customers WHERE id = %s", (customer_id,), fetch="one")
    if not c:
        raise HTTPException(404, "Customer not found")
    return c

@app.post("/customers", status_code=201)
def create_customer(data: CustomerCreate):
    return query(
        "INSERT INTO customers (name, contact) VALUES (%s, %s) RETURNING *",
        (data.name, data.contact), fetch="one"
    )

@app.put("/customers/{customer_id}")
def update_customer(customer_id: int, data: CustomerUpdate):
    fields, values = [], []
    if data.name:    fields.append("name=%s");    values.append(data.name)
    if data.contact: fields.append("contact=%s"); values.append(data.contact)
    if not fields:
        raise HTTPException(400, "Nothing to update")
    values.append(customer_id)
    return query(
        f"UPDATE customers SET {', '.join(fields)} WHERE id=%s RETURNING *",
        tuple(values), fetch="one"
    )

@app.delete("/customers/{customer_id}")
def delete_customer(customer_id: int):
    query("DELETE FROM customers WHERE id = %s", (customer_id,))
    return {"deleted": customer_id}

# ─── PRODUCTS ────────────────────────────────────────────────────
@app.get("/products")
def get_products():
    return query("SELECT * FROM products ORDER BY name")

@app.get("/products/{product_id}")
def get_product(product_id: int):
    p = query("SELECT * FROM products WHERE id = %s", (product_id,), fetch="one")
    if not p:
        raise HTTPException(404, "Product not found")
    return p

@app.post("/products", status_code=201)
def create_product(data: ProductCreate):
    return query(
        "INSERT INTO products (name, description, price, quantity) VALUES (%s,%s,%s,%s) RETURNING *",
        (data.name, data.description, data.price, data.quantity), fetch="one"
    )

@app.put("/products/{product_id}")
def update_product(product_id: int, data: ProductUpdate):
    fields, values = [], []
    if data.name:        fields.append("name=%s");        values.append(data.name)
    if data.description is not None: fields.append("description=%s"); values.append(data.description)
    if data.price:       fields.append("price=%s");       values.append(data.price)
    if data.quantity is not None: fields.append("quantity=%s"); values.append(data.quantity)
    if not fields:
        raise HTTPException(400, "Nothing to update")
    values.append(product_id)
    return query(
        f"UPDATE products SET {', '.join(fields)} WHERE id=%s RETURNING *",
        tuple(values), fetch="one"
    )

@app.patch("/products/{product_id}/stock")
def reduce_stock(product_id: int, data: StockUpdate):
    """Deduct quantity after a sale"""
    p = query("SELECT quantity FROM products WHERE id=%s", (product_id,), fetch="one")
    if not p:
        raise HTTPException(404, "Product not found")
    if p["quantity"] < data.quantity:
        raise HTTPException(400, "Insufficient stock")
    return query(
        "UPDATE products SET quantity = quantity - %s WHERE id=%s RETURNING *",
        (data.quantity, product_id), fetch="one"
    )

@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    query("DELETE FROM products WHERE id=%s", (product_id,))
    return {"deleted": product_id}

# ─── SALES ───────────────────────────────────────────────────────
@app.get("/sales")
def get_sales():
    return query("SELECT * FROM sales ORDER BY id DESC")

@app.get("/sales/{sale_id}")
def get_sale(sale_id: int):
    s = query("SELECT * FROM sales WHERE id=%s", (sale_id,), fetch="one")
    if not s:
        raise HTTPException(404, "Sale not found")
    return s

@app.post("/sales", status_code=201)
def create_sale(data: SaleCreate):
    return query(
        "INSERT INTO sales (customer_id, date, total_amount) VALUES (%s,%s,%s) RETURNING *",
        (data.customer_id, data.date, data.total_amount), fetch="one"
    )

@app.get("/sales/{sale_id}/items")
def get_sale_items(sale_id: int):
    return query(
        """SELECT si.*, p.name as product_name
           FROM sale_items si
           LEFT JOIN products p ON si.product_id = p.id
           WHERE si.sale_id = %s""",
        (sale_id,)
    )

@app.post("/sales/{sale_id}/items", status_code=201)
def add_sale_item(sale_id: int, data: SaleItemCreate):
    return query(
        "INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (%s,%s,%s,%s) RETURNING *",
        (sale_id, data.product_id, data.quantity, data.price), fetch="one"
    )

# ─── ANALYTICS ───────────────────────────────────────────────────
@app.get("/analytics/top-products")
def top_products():
    return query(
        """SELECT p.id, p.name, SUM(si.quantity) as total_sold, SUM(si.quantity * si.price) as revenue
           FROM sale_items si JOIN products p ON si.product_id = p.id
           GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 10"""
    )

@app.get("/analytics/revenue-by-date")
def revenue_by_date(start: str, end: str):
    return query(
        "SELECT date, SUM(total_amount) as revenue, COUNT(*) as sales FROM sales WHERE date BETWEEN %s AND %s GROUP BY date ORDER BY date",
        (start, end)
    )

# ─── SETUP: Create all tables ────────────────────────────────────
@app.post("/setup")
def setup_tables():
    """Call once to create all tables"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            contact VARCHAR(15) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sales (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            date DATE NOT NULL,
            total_amount DECIMAL(10,2)
        );
        CREATE TABLE IF NOT EXISTS sale_items (
            id SERIAL PRIMARY KEY,
            sale_id INTEGER REFERENCES sales(id),
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "All tables created successfully!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True)