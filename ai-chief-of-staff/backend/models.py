from typing import Any, Literal
from pydantic import BaseModel, Field


class TriageItem(BaseModel):
    id: int
    category: Literal["DECIDE", "DELEGATE", "IGNORE"]
    channel: Literal["email", "slack", "whatsapp"]
    from_: str = Field(alias="from")
    subject: str
    reasoning: str
    thread_ids: list[int]
    urgency: Literal["HIGH", "MEDIUM", "LOW"]
    drafted_response: str
    delegate_to: str | None


class Flag(BaseModel):
    type: Literal[
        "SECURITY_RISK",
        "SCHEDULING_CONFLICT",
        "LIVE_INCIDENT",
        "RELATIONSHIP_RISK",
        "INTERNAL_MISALIGNMENT",
        "HARD_DEADLINE",
    ]
    severity: Literal["HIGH", "MEDIUM", "LOW"]
    summary: str
    related_message_ids: list[int]
    recommended_action: str


class BriefingSection(BaseModel):
    heading: str
    items: list[str]


class Briefing(BaseModel):
    date: str
    one_liner: str
    sections: list[BriefingSection]
    bottom_line: str


class AnalysisResponse(BaseModel):
    triage: list[TriageItem]
    flags: list[Flag]
    briefing: Briefing


class Message(BaseModel):
    id: int
    channel: str
    from_: str = Field(alias="from")
    timestamp: str
    body: str
    subject: str | None = None
    channel_name: str | None = None
    to: str | None = None


class AnalyzeRequest(BaseModel):
    messages: list[dict[str, Any]]


class DraftsRequest(BaseModel):
    messages: list[dict[str, Any]]
    triage: list[TriageItem]


class DraftUpdate(BaseModel):
    id: int
    drafted_response: str
    delegate_to: str | None


class DraftsResponse(BaseModel):
    updates: list[DraftUpdate]
