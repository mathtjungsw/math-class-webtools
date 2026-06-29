"""
학생 과제 웹툴용 Windows 로컬 PDF 변환 서버.

필수 패키지 설치:
    python -m pip install fastapi uvicorn python-multipart pywin32

실행:
    python local_converter_server.py
"""

import shutil
import tempfile
import traceback
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.background import BackgroundTask


HOST = "127.0.0.1"
PORT = 8765
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".hwp", ".hwpx"}


def conversion_hint(extension: str) -> str:
    if extension == ".docx":
        return "Microsoft Word가 설치되어 있고 문서를 열 수 있는지 확인해 주세요."
    if extension == ".pptx":
        return "Microsoft PowerPoint가 설치되어 있고 파일을 열 수 있는지 확인해 주세요."
    if extension in {".hwp", ".hwpx"}:
        return "한컴오피스 한글 설치 여부와 한글 보안 승인 창을 확인해 주세요."
    if extension == ".pdf":
        return "파일이 손상되지 않은 PDF인지 확인해 주세요."
    return "지원 확장자는 PDF, DOCX, PPTX, HWP, HWPX입니다."


class ConversionError(Exception):
    """Office 문서를 PDF로 변환하지 못했을 때 발생하는 오류."""


class OfficeConverter:
    """Windows에 설치된 Office/Hancom 프로그램의 COM 자동화를 사용한다."""

    @staticmethod
    def convert_to_pdf(src_path: str, out_dir: str) -> str:
        source = Path(src_path).resolve()
        output_dir = Path(out_dir).resolve()
        extension = source.suffix.lower()

        if extension == ".pdf":
            return str(source)
        if extension not in SUPPORTED_EXTENSIONS:
            raise ConversionError(f"지원하지 않는 파일 형식입니다: {extension}")

        output_dir.mkdir(parents=True, exist_ok=True)
        output_pdf = output_dir / f"{source.stem}.pdf"

        try:
            import pythoncom  # type: ignore
        except ImportError as exc:
            raise ConversionError(
                "pywin32가 설치되어 있지 않아 Office 문서를 변환할 수 없습니다."
            ) from exc

        pythoncom.CoInitialize()
        try:
            if extension == ".docx":
                OfficeConverter._docx_to_pdf(str(source), str(output_pdf))
            elif extension == ".pptx":
                OfficeConverter._pptx_to_pdf(str(source), str(output_pdf))
            else:
                OfficeConverter._hwp_to_pdf(str(source), str(output_pdf))
        finally:
            pythoncom.CoUninitialize()

        if not output_pdf.exists() or output_pdf.stat().st_size == 0:
            raise ConversionError(f"PDF 변환 결과가 생성되지 않았습니다: {source.name}")

        return str(output_pdf)

    @staticmethod
    def _docx_to_pdf(src: str, out_pdf: str) -> None:
        try:
            import win32com.client  # type: ignore
        except ImportError as exc:
            raise ConversionError(
                "pywin32가 설치되어 있지 않아 DOCX를 변환할 수 없습니다."
            ) from exc

        word = None
        document = None
        try:
            word = win32com.client.DispatchEx("Word.Application")
            word.Visible = False
            word.DisplayAlerts = 0
            document = word.Documents.Open(
                FileName=str(Path(src).resolve()),
                ConfirmConversions=False,
                ReadOnly=True,
                AddToRecentFiles=False,
                Visible=False,
            )
            document.ExportAsFixedFormat(
                OutputFileName=str(Path(out_pdf).resolve()),
                ExportFormat=17,
            )
        except Exception as exc:
            raise ConversionError(f"DOCX -> PDF 변환 실패: {exc}") from exc
        finally:
            if document is not None:
                try:
                    document.Close(False)
                except Exception:
                    pass
            if word is not None:
                try:
                    word.Quit()
                except Exception:
                    pass

    @staticmethod
    def _pptx_to_pdf(src: str, out_pdf: str) -> None:
        try:
            import win32com.client  # type: ignore
        except ImportError as exc:
            raise ConversionError(
                "pywin32가 설치되어 있지 않아 PPTX를 변환할 수 없습니다."
            ) from exc

        powerpoint = None
        presentation = None
        try:
            powerpoint = win32com.client.DispatchEx("PowerPoint.Application")
            presentation = powerpoint.Presentations.Open(
                str(Path(src).resolve()),
                WithWindow=False,
            )
            presentation.SaveAs(str(Path(out_pdf).resolve()), 32)
        except Exception as exc:
            raise ConversionError(f"PPTX -> PDF 변환 실패: {exc}") from exc
        finally:
            if presentation is not None:
                try:
                    presentation.Close()
                except Exception:
                    pass
            if powerpoint is not None:
                try:
                    powerpoint.Quit()
                except Exception:
                    pass

    @staticmethod
    def _hwp_to_pdf(src: str, out_pdf: str) -> None:
        try:
            import win32com.client as win32  # type: ignore
        except ImportError as exc:
            raise ConversionError(
                "pywin32가 설치되어 있지 않아 HWP/HWPX를 변환할 수 없습니다."
            ) from exc

        hwp = None
        try:
            hwp = win32.gencache.EnsureDispatch("HWPFrame.HwpObject")
            try:
                hwp.RegisterModule("FilePathCheckDLL", "AutomationModule")
            except Exception:
                pass
            hwp.Open(str(Path(src).resolve()))
            hwp.SaveAs(str(Path(out_pdf).resolve()), "PDF", "")
        except Exception as exc:
            raise ConversionError(
                "HWP/HWPX -> PDF 변환 실패. "
                "한컴오피스 설치 여부와 보안 승인 창을 확인해 주세요. "
                f"원인: {exc}"
            ) from exc
        finally:
            if hwp is not None:
                try:
                    hwp.Quit()
                except Exception:
                    pass


app = FastAPI(title="Local Assignment Converter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "message": "local converter running"}


@app.post("/convert")
def convert(file: UploadFile = File(...)) -> Response:
    original_name = file.filename or ""
    extension = Path(original_name).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        return JSONResponse(
            status_code=400,
            content={
                "ok": False,
                "filename": original_name,
                "error": f"지원하지 않는 파일 형식입니다: {extension or '(확장자 없음)'}",
                "hint": conversion_hint(extension),
            },
        )

    temp_dir = Path(tempfile.mkdtemp(prefix="assignment_converter_"))
    source_path = temp_dir / f"source{extension}"

    try:
        try:
            with source_path.open("wb") as destination:
                shutil.copyfileobj(file.file, destination)
        finally:
            file.file.close()

        if source_path.stat().st_size == 0:
            raise ConversionError("업로드된 파일이 비어 있습니다.")

        pdf_path = OfficeConverter.convert_to_pdf(str(source_path), str(temp_dir))
        download_stem = Path(original_name).stem or "converted"

        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=f"{download_stem}.pdf",
            background=BackgroundTask(shutil.rmtree, temp_dir, ignore_errors=True),
        )
    except ConversionError as exc:
        traceback.print_exc()
        shutil.rmtree(temp_dir, ignore_errors=True)
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "filename": original_name,
                "error": str(exc),
                "hint": conversion_hint(extension),
            },
        )
    except Exception as exc:
        traceback.print_exc()
        shutil.rmtree(temp_dir, ignore_errors=True)
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "filename": original_name,
                "error": f"파일 변환 중 오류가 발생했습니다: {exc}",
                "hint": conversion_hint(extension),
            },
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
