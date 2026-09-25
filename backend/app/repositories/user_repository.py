import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.models.settings import PrivacySettings, UserSettings
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(select(User).where(User.username == username.lower()))

    def get_by_identifier(self, identifier: str) -> User | None:
        identifier = identifier.strip()
        if "@" in identifier:
            return self.get_by_email(identifier)
        return self.get_by_username(identifier)

    def create_with_defaults(
        self, *, email: str, username: str, password_hash: str, display_name: str
    ) -> User:
        user = User(email=email.lower(), username=username.lower(), password_hash=password_hash)
        user.profile = Profile(display_name=display_name)
        user.user_settings = UserSettings()
        user.privacy_settings = PrivacySettings()
        self.db.add(user)
        self.db.flush()
        return user