import psycopg2
import Project1.DataBase

from Project1.customers import Customer
from Project1.products import Product
from Project1.sales import Sale
from Project1.salesitem import SaleItem

def main_menu():
    while True:
        print("1. Customer Management")
        print("2. Product Management")
        print("3. Sales Management")
        print("4. Exit")
        choice = input("Select an option: ")
        if choice == '1':
            Customer.customer_menu()
        elif choice == '2':
            Product.product_menu()
        elif choice == '3':
            Sale.sale_menu()
        elif choice == '4':
            print("Exiting the application.")
            break
        else:
            print("Invalid choice. Please try again.")
        
if __name__ == "__main__":
    main_menu()