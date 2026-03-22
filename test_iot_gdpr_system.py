from datetime import date, datetime
from unittest import TestCase

from iot_gdpr_system import (
    ADMIN_EMAIL,
    AuthorizationError,
    DailyMailReporter,
    ExistingBrokerClient,
    SensorAggregator,
    SensorReading,
    UserDirectory,
)


class UserDirectoryTests(TestCase):
    def test_default_roles_follow_requirement(self) -> None:
        directory = UserDirectory()

        admin = directory.login(ADMIN_EMAIL)
        user = directory.login("user@example.com")

        self.assertEqual("admin", admin.role)
        self.assertEqual("user", user.role)

    def test_only_admin_can_promote(self) -> None:
        directory = UserDirectory()
        directory.login("user@example.com")
        with self.assertRaises(AuthorizationError):
            directory.promote_to_admin("user@example.com", "other@example.com")

        promoted = directory.promote_to_admin(ADMIN_EMAIL, "other@example.com")
        self.assertEqual("admin", promoted.role)


class SensorAndMailTests(TestCase):
    def test_daily_average_and_send_once_per_day(self) -> None:
        aggregator = SensorAggregator()
        aggregator.ingest_many(
            [
                SensorReading("wokwi-1", "temperature", 36.0, datetime(2026, 3, 22, 7, 0)),
                SensorReading("wokwi-1", "temperature", 38.0, datetime(2026, 3, 22, 10, 0)),
                SensorReading("wokwi-2", "heart_rate", 80.0, datetime(2026, 3, 22, 11, 0)),
                SensorReading("wokwi-2", "heart_rate", 100.0, datetime(2026, 3, 22, 12, 0)),
                SensorReading("wokwi-2", "heart_rate", 70.0, datetime(2026, 3, 21, 12, 0)),
            ]
        )

        averages = aggregator.daily_average(date(2026, 3, 22))
        self.assertEqual(37.0, averages["temperature"])
        self.assertEqual(90.0, averages["heart_rate"])

        reporter = DailyMailReporter()
        sent_messages = []

        def sender(to_email: str, body: str) -> None:
            sent_messages.append((to_email, body))

        users = [
            UserDirectory().login("user1@example.com"),
            UserDirectory().login("user2@example.com"),
        ]
        first_send = reporter.send_daily_report(users, averages, date(2026, 3, 22), sender)
        second_send = reporter.send_daily_report(users, averages, date(2026, 3, 22), sender)

        self.assertEqual(["user1@example.com", "user2@example.com"], first_send)
        self.assertEqual([], second_send)
        self.assertEqual(2, len(sent_messages))
        self.assertIn("temperature", sent_messages[0][1])

    def test_broker_payload_parsing(self) -> None:
        reading = ExistingBrokerClient.parse_payload(
            {
                "sensor_id": "wokwi-3",
                "metric": "spo2",
                "value": "98.5",
                "recorded_at": "2026-03-22T07:00:00",
            }
        )

        self.assertEqual("wokwi-3", reading.sensor_id)
        self.assertEqual("spo2", reading.metric)
        self.assertEqual(98.5, reading.value)
