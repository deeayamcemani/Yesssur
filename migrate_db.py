"""
Database migration script to add new columns to existing database
Run this script once to update your existing database schema
"""

import sqlite3
from datetime import datetime
import os

def migrate_database():
    db_path = 'attendance.db'
    
    # Check if database exists
    if not os.path.exists(db_path):
        print("Database doesn't exist yet. It will be created when you run the app.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if last_seen column exists in user table
        cursor.execute("PRAGMA table_info(user)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'last_seen' not in columns:
            print("Adding last_seen column to user table...")
            cursor.execute("ALTER TABLE user ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP")
            # Update existing users with current timestamp
            cursor.execute("UPDATE user SET last_seen = ? WHERE last_seen IS NULL", (datetime.utcnow(),))
            print("✓ Added last_seen column to user table")
        else:
            print("✓ last_seen column already exists in user table")
        
        # Check if announcement table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='announcement'")
        if not cursor.fetchone():
            print("Creating announcement table...")
            cursor.execute("""
                CREATE TABLE announcement (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(200) NOT NULL,
                    content TEXT NOT NULL,
                    author_id INTEGER NOT NULL,
                    course_id INTEGER,
                    priority VARCHAR(20) DEFAULT 'normal',
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(author_id) REFERENCES user(id),
                    FOREIGN KEY(course_id) REFERENCES course(id)
                )
            """)
            print("✓ Created announcement table")
        else:
            print("✓ announcement table already exists")
            
            # Check if is_active column exists in announcement table
            cursor.execute("PRAGMA table_info(announcement)")
            announcement_columns = [column[1] for column in cursor.fetchall()]
            
            if 'is_active' not in announcement_columns:
                print("Adding is_active column to announcement table...")
                cursor.execute("ALTER TABLE announcement ADD COLUMN is_active BOOLEAN DEFAULT 1")
                print("✓ Added is_active column to announcement table")
        
        # Check if announcement_read table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='announcement_read'")
        if not cursor.fetchone():
            print("Creating announcement_read table...")
            cursor.execute("""
                CREATE TABLE announcement_read (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    announcement_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(announcement_id) REFERENCES announcement(id),
                    FOREIGN KEY(user_id) REFERENCES user(id),
                    UNIQUE(announcement_id, user_id)
                )
            """)
            print("✓ Created announcement_read table")
        else:
            print("✓ announcement_read table already exists")
        
        conn.commit()
        print("\n✅ Database migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔄 Starting database migration...")
    migrate_database()
    print("\n🎉 Migration complete! You can now run your app.")