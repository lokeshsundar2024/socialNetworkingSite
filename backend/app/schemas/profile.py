from pydantic import BaseModel, Field, field_validator


class ProfileUpdate(BaseModel):
    """Only the fields you send are changed. An empty bio, location or website clears it."""

    display_name: str | None = Field(default=None, min_length=1, max_length=60)
    bio: str | None = Field(default=None, max_length=300)
    location: str | None = Field(default=None, max_length=100)
    website: str | None = Field(default=None, max_length=255)

    @field_validator("display_name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Display name cannot be empty")
        return v

    @field_validator("bio", "location")
    @classmethod
    def clean_text(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return v.strip() or None

    @field_validator("website")
    @classmethod
    def clean_website(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("Website must start with http:// or https://")
        return v