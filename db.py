import psycopg2

def get_connection():
    return psycopg2.connect(
        dbname="flask_todo_db",
        user="ana",
        password="0000",
        host="localhost",
        port="5432"
    )