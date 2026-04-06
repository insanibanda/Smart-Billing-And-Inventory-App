import psycopg2
# neonDB online serverless database connection url , supabase 

def connection():
    con = psycopg2.connect(
        host="localhost",
        database="ecommerce",
        user="postgres",
        password="9522",
        port="5433"
    )

    if con:
        print("Connection Established")
        return con
    else:
        print("Connection failed!")
        return None

#  YE LINE MUST HAI
conn = connection()