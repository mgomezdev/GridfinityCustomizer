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


class TestSliceModel:
    def test_returns_none_when_config_missing(self, tmp_path):
        from slicer import slice_model
        result = slice_model("/some/model.stl", str(tmp_path / "missing.json"))
        assert result is None

    def test_returns_none_when_stl_missing(self, tmp_path):
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        result = slice_model(str(tmp_path / "missing.stl"), str(config))
        assert result is None

    def test_returns_none_when_orca_not_on_path(self, tmp_path):
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        # Create a dummy STL so the stl_path check passes
        stl = tmp_path / "model.stl"
        stl.write_bytes(b"solid test\nendsolid test\n")
        with patch("slicer.shutil.which", return_value=None):
            result = slice_model(str(stl), str(config))
        assert result is None

    def test_returns_none_on_nonzero_exit(self, tmp_path):
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        stl = tmp_path / "model.stl"
        stl.write_bytes(b"solid test\nendsolid test\n")
        mock_proc = MagicMock(returncode=1, stderr="slicing error")
        with patch("slicer.shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", return_value=mock_proc):
            result = slice_model(str(stl), str(config))
        assert result is None

    def test_returns_dict_on_success(self, tmp_path, monkeypatch):
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        stl = tmp_path / "model.stl"
        stl.write_bytes(b"solid test\nendsolid test\n")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        gcode = (
            "; filament used [g] = 18.72\n"
            "; estimated printing time (normal mode) = 1h 48m\n"
        )

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            with open(out_path, "w") as f:
                f.write(gcode)
            return MagicMock(returncode=0)

        with patch("slicer.shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            result = slice_model(str(stl), str(config))

        assert result == {"filamentGrams": 18.72, "printTimeSeconds": 6480}

    def test_returns_none_when_filament_line_missing(self, tmp_path, monkeypatch):
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        stl = tmp_path / "model.stl"
        stl.write_bytes(b"solid test\nendsolid test\n")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        gcode = "; estimated printing time (normal mode) = 45m\n"

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            with open(out_path, "w") as f:
                f.write(gcode)
            return MagicMock(returncode=0)

        with patch("slicer.shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            result = slice_model(str(stl), str(config))

        assert result is None

    def test_returns_none_when_time_line_missing(self, tmp_path, monkeypatch):
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        stl = tmp_path / "model.stl"
        stl.write_bytes(b"solid test\nendsolid test\n")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        gcode = "; filament used [g] = 5.0\n"

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            with open(out_path, "w") as f:
                f.write(gcode)
            return MagicMock(returncode=0)

        with patch("slicer.shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            result = slice_model(str(stl), str(config))

        assert result is None

    def test_cleans_up_temp_gcode_on_success(self, tmp_path, monkeypatch):
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        stl = tmp_path / "model.stl"
        stl.write_bytes(b"solid test\nendsolid test\n")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        gcode = (
            "; filament used [g] = 10.0\n"
            "; estimated printing time (normal mode) = 5m\n"
        )
        written_path = []

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            written_path.append(out_path)
            with open(out_path, "w") as f:
                f.write(gcode)
            return MagicMock(returncode=0)

        with patch("slicer.shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            result = slice_model(str(stl), str(config))

        assert result is not None
        assert written_path, "subprocess.run was not called"
        assert not os.path.exists(written_path[0]), "temp gcode was not cleaned up"

    def test_cleans_up_temp_gcode_on_failure(self, tmp_path, monkeypatch):
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        stl = tmp_path / "model.stl"
        stl.write_bytes(b"solid test\nendsolid test\n")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        written_path = []

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            written_path.append(out_path)
            with open(out_path, "w") as f:
                f.write("")  # empty gcode — parse will fail
            return MagicMock(returncode=0)

        with patch("slicer.shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            slice_model(str(stl), str(config))

        assert written_path, "subprocess.run was not called"
        assert not os.path.exists(written_path[0]), "temp gcode was not cleaned up on failure"

    def test_returns_none_on_timeout(self, tmp_path, monkeypatch):
        import subprocess as _subprocess
        from slicer import slice_model
        config = tmp_path / "config.json"
        config.write_text("{}")
        stl = tmp_path / "model.stl"
        stl.write_bytes(b"solid test\nendsolid test\n")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        with patch("slicer.shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=_subprocess.TimeoutExpired(cmd=[], timeout=120)):
            result = slice_model(str(stl), str(config))

        assert result is None
