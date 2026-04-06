import psycopg2
from Project1.DataBase import conn

class Sale:

    def create_table(self):
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS sales(
                        id SERIAL PRIMARY KEY,
                        customer_id INTEGER NOT NULL,
                        date DATE,
                        total_amount DECIMAL(10,2)
                    )''')
        conn.commit()
        cur.close()

    def insert_sale(self, customer_id, date, total_amount):
        cur = conn.cursor()
        cur.execute('''INSERT INTO sales (customer_id, date, total_amount)
                       VALUES (%s,%s,%s)''',
                    (customer_id, date, total_amount))
        conn.commit()
        cur.close()

    def view_sales(self):
        cur = conn.cursor()
        cur.execute('SELECT * FROM sales')
        sales = cur.fetchall()
        cur.close()
        return sales

    def view_sale_by_id(self, sale_id):
        cur = conn.cursor()
        cur.execute('SELECT * FROM sales WHERE id = %s', (sale_id,))
        sale = cur.fetchone()
        cur.close()
        return sale

    def add_sale_items(self, sale_id, product_id, quantity, price):
        cur = conn.cursor()
        cur.execute('''INSERT INTO sale_items (sale_id, product_id, quantity, price)
                       VALUES (%s,%s,%s,%s)''',
                    (sale_id, product_id, quantity, price))
        conn.commit()
        cur.close()

    def update_inventory(self, product_id, quantity_sold):
        cur = conn.cursor()
        cur.execute('''UPDATE products
                       SET quantity = quantity - %s
                       WHERE id = %s''',
                    (quantity_sold, product_id))
        conn.commit()
        cur.close()

    def generate_bill(self, sale_id):
        cur = conn.cursor()
        cur.execute('''SELECT quantity, price FROM sale_items WHERE sale_id = %s''',
                    (sale_id,))
        items = cur.fetchall()
        cur.close()

        total = 0
        for item in items:
            total += item[0] * item[1]

        return total

    def get_total_sales_by_date(self, start_date, end_date):
        cur = conn.cursor()
        cur.execute('''SELECT SUM(total_amount)
                       FROM sales
                       WHERE date BETWEEN %s AND %s''',
                    (start_date, end_date))
        total = cur.fetchone()[0]
        cur.close()
        return total if total else 0

    def get_top_selling_products(self):
        cur = conn.cursor()
        cur.execute('''SELECT product_id, SUM(quantity) as total_quantity
                       FROM sale_items
                       GROUP BY product_id
                       ORDER BY total_quantity DESC
                       LIMIT 5''')
        data = cur.fetchall()
        cur.close()
        return data

    def get_sales_by_customer(self, customer_id):
        cur = conn.cursor()
        cur.execute('SELECT * FROM sales WHERE customer_id = %s', (customer_id,))
        sales = cur.fetchall()
        cur.close()
        return sales

    # ✅ FIXED MENU (INSIDE CLASS)
    @staticmethod
    def sale_menu():
        s = Sale()

        while True:
            print("\n1. Create Table")
            print("2. Insert Sale")
            print("3. View Sales")
            print("4. View Sale by ID")
            print("5. Add Sale Items")
            print("6. Update Inventory")
            print("7. Generate Bill")
            print("8. Get Total Sales by Date")
            print("9. Get Top Selling Products")
            print("10. Get Sales by Customer")
            print("0. Exit")

            choice = input("Enter choice: ")

            if choice == '1':
                s.create_table()
                print("Table created")

            elif choice == '2':
                customer_id = int(input("Enter customer id: "))
                date = input("Enter date (YYYY-MM-DD): ")
                total_amount = float(input("Enter total amount: "))
                s.insert_sale(customer_id, date, total_amount)

            elif choice == '3':
                for sale in s.view_sales():
                    print(sale)

            elif choice == '4':
                sale_id = int(input("Enter sale id: "))
                print(s.view_sale_by_id(sale_id))

            elif choice == '5':
                sale_id = int(input("Enter sale id: "))
                product_id = int(input("Enter product id: "))
                quantity = int(input("Enter quantity: "))
                price = float(input("Enter price: "))
                s.add_sale_items(sale_id, product_id, quantity, price)

            elif choice == '6':
                product_id = int(input("Enter product id: "))
                quantity_sold = int(input("Enter quantity sold: "))
                s.update_inventory(product_id, quantity_sold)

            elif choice == '7':
                sale_id = int(input("Enter sale id: "))
                print("Total:", s.generate_bill(sale_id))

            elif choice == '8':
                start = input("Start date: ")
                end = input("End date: ")
                print("Total Sales:", s.get_total_sales_by_date(start, end))

            elif choice == '9':
                for p in s.get_top_selling_products():
                    print(p)

            elif choice == '10':
                customer_id = int(input("Enter customer id: "))
                sales = s.get_sales_by_customer(customer_id)
                for sale in sales:
                    print(sale)

            elif choice == '0':
                break

            else:
                print("Invalid choice")