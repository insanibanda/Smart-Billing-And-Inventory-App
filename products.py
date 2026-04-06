import psycopg2
from Project1.DataBase import conn

class Product:
    def __init__(self,name,description,price,quantity):
        self.name = name 
        self.description = description 
        self.price = price 
        self.quantity = quantity 
    
    def create_table(self):
        cur = conn.cursor()
        cur.execute(''' CREATE TABLE IF NOT EXISTS products (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    quantity INTEGER NOT NULL
        )''')
        conn.commit()
        cur.close()

    def insert_product(self, name, description, price, quantity):
        cur = conn.cursor()
        cur.execute(''' INSERT INTO products (name , description , price , quantity)
                        VALUES(%s,%s,%s,%s)''',
                        (name, description , price , quantity))
        conn.commit()
        cur.close()
    
    def update_product(self, product_id , name=None , description=None , price=None , quantity=None):
        cur = conn.cursor()
        cur.execute('SELECT * FROM products WHERE id = %s',(product_id,))
        product = cur.fetchone()
        if not product:
            print("product not found")
            cur.close()
            return 
        
        update_fields = []
        values = []

        if name:
            update_fields.append("name=%s")
            values.append(name)
        if description:
            update_fields.append("description=%s")
            values.append(description)
        if price:
            update_fields.append("price=%s")
            values.append(price)
        if quantity:
            update_fields.append("quantity=%s")
            values.append(quantity)

        if not update_fields:
            print("Nothing to update")
            cur.close()
            return

        update_query = f"UPDATE products SET {', '.join(update_fields)} WHERE id = %s"
        values.append(product_id)

        cur.execute(update_query , tuple(values))
        conn.commit()
        cur.close()

    def delete_product(self, product_id):
        cur = conn.cursor()
        cur.execute('DELETE FROM products WHERE id = %s', (product_id,))
        conn.commit()
        cur.close()
    
    def view_products(self):
        cur = conn.cursor()
        cur.execute('SELECT * FROM products')
        products = cur.fetchall()
        cur.close()
        return products
    
    def view_product_id(self, product_id):
        cur = conn.cursor()
        cur.execute('SELECT * FROM products WHERE id = %s', (product_id,))
        product = cur.fetchone()
        cur.close()
        return product 
    

# SETTING MENU 

    def product_menu():
        p = Product("", "", 0, 0)
        while True:
            print("1. Create Table")
            print("2. Insert Product")
            print("3. Update Product")
            print("4. Delete Product")
            print("5. View Products")
            print("6. View Product by ID")
            print("0. Exit")

            choice = input("Enter Choice: ")
            if choice == '1':
                p.create_table()
                print("Table Created")
            
            elif choice == '2':
                name = input("Enter product name : ")
                description = input("Enter Product Description: ")
                price = float(input("Enter product price: "))
                quantity = int(input("Enter product quantity: "))
                p.insert_product(name, description, price, quantity)
                print(" Product Inserted ")
            
            elif choice =='3':
                product_id = int(input("Enter product id : "))
                name = input("Enter Product Name: ")
                description = input("Enter product description: ")
                price = float(input("Enter product price: "))
                quantity = int(input("Enter product quantity: "))
                p.update_product(product_id, name, description, price, quantity)
                print("Product updated")
            
            elif choice == '4':
                product_id = int(input("Enter product id: "))
                p.delete_product(product_id)
                print("Product deleted")

            elif choice == '5':
                products = p.view_products()
                for product in products:
                    print(product)
                print("Product viewed")

            elif choice == '6':
                product_id = int(input("Enter product id: "))
                product = p.view_product_id(product_id)
                print(product)
                print("Product viewed")

            elif choice == '0':
                print("Exiting...")
                break

#Product.product_menu()