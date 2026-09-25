from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileUpdate
from app.schemas.social import ProfileOut
from app.services.follow_service import FollowService


class ProfileService(FollowService):
    def update(self, user: User, data: ProfileUpdate) -> ProfileOut:
        profile = user.profile
        if profile is None:
            profile = Profile(user_id=user.id, display_name=user.username)
            self.db.add(profile)
        changes = data.model_dump(exclude_unset=True)
        if changes.get("display_name") is not None:
            profile.display_name = changes["display_name"]
        for field in ("bio", "location", "website"):
            if field in changes:
                setattr(profile, field, changes[field])
        self.db.commit()
        return self.profile(user, user.username)