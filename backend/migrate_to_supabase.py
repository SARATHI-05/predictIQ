import os
import sqlite3
import psycopg2
from dotenv import load_dotenv

load_dotenv('c:/Users/Sarathi/predictIQ/.env')
pg_url = os.getenv('DATABASE_URL')
sqlite_db = 'c:/Users/Sarathi/predictIQ/predictiq.db'

def convert_val(val):
    if val is None:
        return None
    return val

def migrate():
    print(f"Connecting to SQLite: {sqlite_db}")
    sq_conn = sqlite3.connect(sqlite_db)
    sq_cursor = sq_conn.cursor()

    print("Connecting to Supabase PostgreSQL...")
    pg_conn = psycopg2.connect(pg_url)
    pg_cursor = pg_conn.cursor()

    # Table ordering to respect foreign keys
    tables = [
        'users',
        'resources',
        'inventory',
        'food_records',
        'predictions',
        'model_metrics',
        'alerts',
        'notifications',
        'dataset_logs',
        'resource_plans',
        'audit_logs',
        'inventory_transactions'
    ]

    for table in tables:
        try:
            sq_cursor.execute(f"PRAGMA table_info({table});")
            columns_info = sq_cursor.fetchall()
            columns = [info[1] for info in columns_info]

            if not columns:
                continue

            col_names = ", ".join([f'"{c}"' for c in columns])
            placeholders = ", ".join(["%s"] * len(columns))

            sq_cursor.execute(f"SELECT {col_names} FROM {table};")
            rows = sq_cursor.fetchall()

            if not rows:
                print(f"  [{table}]: 0 rows, skipped.")
                continue

            # Clear default seeded rows in Supabase before migrating
            pg_cursor.execute(f'DELETE FROM "{table}";')


            # Convert boolean integer values (0/1) for boolean columns in Postgres
            converted_rows = []
            for row in rows:
                new_row = []
                for idx, val in enumerate(row):
                    col_name = columns[idx]
                    if col_name in ['is_active', 'is_read', 'holiday', 'special_event']:
                        if isinstance(val, int):
                            new_row.append(bool(val))
                        else:
                            new_row.append(val)
                    else:
                        new_row.append(val)
                converted_rows.append(tuple(new_row))

            insert_query = f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'
            pg_cursor.executemany(insert_query, converted_rows)
            pg_conn.commit()
            print(f"  [SUCCESS] [{table}]: Migrated {len(converted_rows)} rows to Supabase.", flush=True)

        except Exception as err:
            print(f"  [NOTICE] [{table}]: {err}", flush=True)
            pg_conn.rollback()

    # Reset primary key sequences for PostgreSQL
    for table in tables:
        try:
            pg_cursor.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(max(id), 1)) FROM \"{table}\";")
            pg_conn.commit()
        except Exception:
            pass

    sq_conn.close()
    pg_conn.close()

    print("\nSQLite to Supabase PostgreSQL Data Migration Complete!", flush=True)


if __name__ == '__main__':
    migrate()
