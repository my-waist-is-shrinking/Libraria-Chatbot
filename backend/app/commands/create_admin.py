"""Create the first admin account (there's no sign-up page yet).

Run from the backend folder:  python -m app.commands.create_admin
The password is hidden while you type it (nothing shows on screen, that's normal).
"""

from getpass import getpass

from app.db.session import SessionLocal
from app.schemas.user import UserCreate
from app.services import auth as auth_service


def main():
    print("=== Create a Libraria account ===")
    full_name = input("Full name: ")
    email = input("Email: ")
    password = getpass("Password (hidden): ")
    if password != getpass("Type the password again: "):
        print("Passwords don't match. Nothing was saved.")
        return
    role = input("Role [admin]: ").strip() or "admin"   # just press Enter for admin

    db = SessionLocal()
    try:
        data = UserCreate(full_name=full_name, email=email, password=password, role=role)
        user = auth_service.register_user(db, data)
        db.commit()     # save to the database
        print(f"Done! Created {user.email} with role '{user.role}' (id {user.id}).")
    except ValueError as e:
        # email already used, or role is not user/librarian/admin
        db.rollback()
        print(f"Not saved: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()