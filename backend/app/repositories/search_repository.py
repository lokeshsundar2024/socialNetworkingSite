from sqlalchemy import case, func, literal_column, or_, select
from sqlalchemy.orm import Session, contains_eager
from sqlalchemy.sql.elements import ColumnElement

from app.models.post import Hashtag, Post, post_hashtags
from app.models.profile import Profile
from app.models.user import User

ESCAPE = "\\"


def like_escape(text: str) -> str:
    """Make user input match literally inside LIKE patterns (so '%' and '_' are not wildcards)."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class SearchRepository:
    def __init__(self, db: Session):
        self.db = db

    def users(self, q: str, limit: int) -> list[User]:
        term = like_escape(q.lower())
        prefix = f"{term}%"
        anywhere = f"%{term}%"
        rank = case(
            (User.username == q.lower(), 0),
            (User.username.ilike(prefix, escape=ESCAPE), 1),
            else_=2,
        )
        stmt = (
            select(User)
            .outerjoin(Profile, Profile.user_id == User.id)
            .options(contains_eager(User.profile))
            .where(
                User.is_active.is_(True),
                User.is_suspended.is_(False),
                or_(
                    User.username.ilike(prefix, escape=ESCAPE),
                    Profile.display_name.ilike(anywhere, escape=ESCAPE),
                ),
            )
            .order_by(rank, User.username)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).unique())

    def hashtags(
        self, q: str, limit: int, visible: ColumnElement[bool]
    ) -> list[tuple[str, int]]:
        """Tags starting with q, counting only posts the viewer is allowed to see."""
        pattern = f"{like_escape(q.lower())}%"
        count = func.count(Post.id)
        stmt = (
            select(Hashtag.tag, count)
            .select_from(Hashtag)
            .join(post_hashtags, post_hashtags.c.hashtag_id == Hashtag.id)
            .join(Post, Post.id == post_hashtags.c.post_id)
            .where(Hashtag.tag.like(pattern, escape=ESCAPE), visible)
            .group_by(Hashtag.tag)
            .order_by(count.desc(), Hashtag.tag)
            .limit(limit)
        )
        return [(tag, n) for tag, n in self.db.execute(stmt).all()]

    def match_clause(self, q: str) -> ColumnElement[bool]:
        """Full-text match. Supports "quoted phrases", OR, and -excluded words."""
        query = func.websearch_to_tsquery(literal_column("'english'"), q)
        return Post.content_tsv.bool_op("@@")(query)

    def hashtag_clause(self, tag: str) -> ColumnElement[bool]:
        tagged = (
            select(post_hashtags.c.post_id)
            .join(Hashtag, Hashtag.id == post_hashtags.c.hashtag_id)
            .where(Hashtag.tag == tag.lower())
        )
        return Post.id.in_(tagged)