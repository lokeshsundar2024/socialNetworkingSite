from pydantic import BaseModel


class HashtagResult(BaseModel):
    tag: str
    post_count: int