import psycopg2
from Project1.DataBase import conn

class SaleItem:
    def __init__(self, sale_id ,product_id , quantity ,price):
        self.sale_id = sale_id
        self.product_id = product_id
        self.quantity = quantity 
        self.price = price 

    def create_table(self):
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS sale_items(
                    id SERIAL PRIMARY KEY,
                    sale_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    price DECIMAL(10, 2) NOT NULL            
                    )''')
        conn.commit()
        cur.close()
    
    def add_item(self, sale_id, product_id, quantity, price):
        cur = conn.cursor()
        cur.execute('''INSERT INTO sale_items (sale_id,product_id,quantity,price)
                    VALUES(%s,%s,%s,%s)''',
                    (sale_id,product_id,quantity,price))
        conn.commit()
        cur.close()
        print("Item added to sale")
    
    def get_items_by_sale(self, sale_id):
        cur = conn.cursor()
        cur.execute('SELECT * FROM sale_items WHERE sale_id = %s', (sale_id,))
        items = cur.fetchall()
        cur.close()
        return items

    def view_sale_items(self, sale_id):
        cur = conn.cursor()
        cur.execute('SELECT * FROM sale_items WHERE sale_id = %s', (sale_id,))
        items = cur.fetchall()
        for item in items:
            print(item)
        cur.close()

        total_amount = 0
        for item in items:
            total_amount += item[3] * item[4]  # quantity * price
        
        print("Total Amount for Sale ID", sale_id, ":", total_amount)
        return total_amount

    def sale_item_menu():
        s = SaleItem(0,0,0,0)
        while True:
            print("1. Create Table")
            print("2. Add Item to Sale") 
            print("3. View Sale Items")
            print("0. Exit")

            choice = input("Enter choice: ")

            if choice == '1':
                s.create_table()
                print("Table created")

            elif choice == '2':
                sale_id = int(input("Enter sale id: "))
                product_id = int(input("Enter product id: "))
                quantity = int(input("Enter quantity: "))
                price = float(input("Enter price: "))
                s.add_item(sale_id, product_id, quantity, price)

            elif choice == '3':
                sale_id = int(input("Enter sale id: "))
                total_amount = s.view_sale_items(sale_id)
                print("Total Amount:", total_amount)

            elif choice == '0':
                print("Exiting...")
                break

            else:
                print("Invalid choice. Please try again.")

#SaleItem.sale_item_menu()