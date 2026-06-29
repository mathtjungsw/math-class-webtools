"""local_converter_server.py의 health 및 파일 변환을 확인하는 간단한 클라이언트."""

import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path


SERVER_URL = os.environ.get("LOCAL_CONVERTER_URL", "http://127.0.0.1:8765")


def test_health() -> bool:
    try:
        with urllib.request.urlopen(f"{SERVER_URL}/health", timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
        passed = data == {"ok": True, "message": "local converter running"}
        print(f"[{'PASS' if passed else 'FAIL'}] /health: {data}")
        return passed
    except Exception as exc:
        print(f"[FAIL] /health: {exc}")
        return False


def test_convert(file_path: Path) -> bool:
    boundary = uuid.uuid4().hex
    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{file_path.name}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    body += file_path.read_bytes()
    body += f"\r\n--{boundary}--\r\n".encode("ascii")

    request = urllib.request.Request(
        f"{SERVER_URL}/convert",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = response.read()
            response_type = response.headers.get_content_type()
        passed = response_type == "application/pdf" and result.startswith(b"%PDF")
        if passed:
            output_path = file_path.with_name(f"{file_path.stem}_converted.pdf")
            output_path.write_bytes(result)
            print(f"[PASS] {file_path.name} -> {output_path}")
        else:
            print(f"[FAIL] {file_path.name}: PDF 응답이 아닙니다.")
        return passed
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        print(f"[FAIL] {file_path.name}: HTTP {exc.code} {error_body}")
        return False
    except Exception as exc:
        print(f"[FAIL] {file_path.name}: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="*", type=Path)
    args = parser.parse_args()

    passed = test_health()
    for file_path in args.files:
        if not file_path.is_file():
            print(f"[FAIL] 파일 없음: {file_path}")
            passed = False
            continue
        passed = test_convert(file_path) and passed
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
