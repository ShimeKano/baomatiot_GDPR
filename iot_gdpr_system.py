from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, date
from statistics import mean
from typing import Dict, Iterable, List, Mapping, Optional


ADMIN_EMAIL = "22004249@st.vlute.edu.vn"


@dataclass(frozen=True)
class User:
    email: str
    role: str = "user"


@dataclass(frozen=True)
class SensorReading:
    sensor_id: str
    metric: str
    value: float
    recorded_at: datetime


class AuthorizationError(PermissionError):
    pass


class UserDirectory:
    """Manage users with default roles and admin-controlled role upgrades."""

    def __init__(self) -> None:
        self._users: Dict[str, User] = {}

    def login(self, email: str) -> User:
        normalized = email.strip().lower()
        if normalized not in self._users:
            role = "admin" if normalized == ADMIN_EMAIL else "user"
            self._users[normalized] = User(email=normalized, role=role)
        return self._users[normalized]

    def promote_to_admin(self, acting_admin_email: str, target_email: str) -> User:
        acting = self.login(acting_admin_email)
        if acting.role != "admin":
            raise AuthorizationError("Only admin can promote users")

        target = self.login(target_email)
        promoted = User(email=target.email, role="admin")
        self._users[target.email] = promoted
        return promoted

    def list_users(self) -> List[User]:
        return sorted(self._users.values(), key=lambda user: user.email)


class SensorAggregator:
    """Collect sensor values from broker and compute per-metric daily averages."""

    def __init__(self) -> None:
        self._readings: List[SensorReading] = []

    def ingest(self, reading: SensorReading) -> None:
        self._readings.append(reading)

    def ingest_many(self, readings: Iterable[SensorReading]) -> None:
        for reading in readings:
            self.ingest(reading)

    def daily_average(self, target_day: date) -> Mapping[str, float]:
        grouped: Dict[str, List[float]] = {}
        for item in self._readings:
            if item.recorded_at.date() != target_day:
                continue
            grouped.setdefault(item.metric, []).append(item.value)
        return {metric: mean(values) for metric, values in grouped.items()}


@dataclass
class AzureCloudClient:
    """Store aggregate metrics to Azure-backed storage endpoint."""

    endpoint: str
    storage: Dict[str, Mapping[str, float]] = field(default_factory=dict)

    def publish_daily_average(self, target_day: date, averages: Mapping[str, float]) -> None:
        self.storage[target_day.isoformat()] = dict(averages)


class DailyMailReporter:
    """Send one summary email per user per day."""

    def __init__(self) -> None:
        self._sent_log: Dict[str, date] = {}

    def send_daily_report(
        self,
        users: Iterable[User],
        averages: Mapping[str, float],
        today: date,
        mail_sender,
    ) -> List[str]:
        sent_to: List[str] = []
        for user in users:
            if self._sent_log.get(user.email) == today:
                continue
            mail_sender(user.email, self._compose_body(today, averages))
            self._sent_log[user.email] = today
            sent_to.append(user.email)
        return sent_to

    @staticmethod
    def _compose_body(today: date, averages: Mapping[str, float]) -> str:
        if not averages:
            detail = "Không có dữ liệu cảm biến trong ngày."
        else:
            detail = "\n".join(
                f"- {metric}: {value:.2f}" for metric, value in sorted(averages.items())
            )
        return (
            f"Tổng hợp chỉ số cảm biến ngày {today.isoformat()}\n"
            f"{detail}"
        )


class ExistingBrokerClient:
    """Simple adapter for already-available broker payloads."""

    @staticmethod
    def parse_payload(payload: Mapping[str, object]) -> SensorReading:
        return SensorReading(
            sensor_id=str(payload["sensor_id"]),
            metric=str(payload["metric"]),
            value=float(payload["value"]),
            recorded_at=datetime.fromisoformat(str(payload["recorded_at"])),
        )
