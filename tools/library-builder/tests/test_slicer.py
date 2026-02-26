import os
import pytest
from unittest.mock import MagicMock, patch


class TestParseTimeStr:
    def test_hours_minutes_seconds(self):
        from slicer import _parse_time_str
        assert _parse_time_str("1h 23m 45s") == 5025

    def test_minutes_seconds(self):
        from slicer import _parse_time_str
        assert _parse_time_str("23m 45s") == 1425

    def test_seconds_only(self):
        from slicer import _parse_time_str
        assert _parse_time_str("45s") == 45

    def test_hours_only(self):
        from slicer import _parse_time_str
        assert _parse_time_str("2h") == 7200

    def test_empty_string_returns_none(self):
        from slicer import _parse_time_str
        assert _parse_time_str("") is None

    def test_non_time_string_returns_none(self):
        from slicer import _parse_time_str
        assert _parse_time_str("not a time") is None


class TestCleanupStaleTempFiles:
    def test_creates_dir_when_absent(self, tmp_path, monkeypatch):
        target = str(tmp_path / "orca-slice")
        monkeypatch.setattr("slicer.TEMP_DIR", target)
        from slicer import cleanup_stale_temp_files
        cleanup_stale_temp_files()
        assert os.path.isdir(target)

    def test_wipes_existing_files(self, tmp_path, monkeypatch):
        target = tmp_path / "orca-slice"
        target.mkdir()
        (target / "stale.gcode").write_text("old data")
        monkeypatch.setattr("slicer.TEMP_DIR", str(target))
        from slicer import cleanup_stale_temp_files
        cleanup_stale_temp_files()
        assert os.path.isdir(str(target))
        assert list(target.iterdir()) == []
