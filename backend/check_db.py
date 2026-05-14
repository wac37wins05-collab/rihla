import sqlite3

def check_db():
    conn = sqlite3.connect('dev.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in dev.db:")
    for table in tables:
        print(f"- {table[0]}")
    conn.close()

if __name__ == "__main__":
    check_db()
