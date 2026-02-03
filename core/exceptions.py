"""커스텀 예외 클래스 계층.

모든 애플리케이션 예외는 AppError를 상속한다.
각 예외는 error_code 속성으로 ErrorCode와 연결된다.
"""

from core.errors import ErrorCode


class AppError(Exception):
    """애플리케이션 기본 예외."""

    def __init__(self, message: str, error_code: ErrorCode | None = None):
        super().__init__(message)
        self.error_code = error_code


# --- Node ---

class NodeError(AppError):
    """노드 관련 예외 기본 클래스."""


class NodeNotFoundError(NodeError):
    """노드를 찾을 수 없음."""

    def __init__(self, message: str = "노드를 찾을 수 없습니다"):
        super().__init__(message, ErrorCode.NODE_NOT_FOUND)


class NodeValidationError(NodeError):
    """노드 유효성 검증 실패."""

    def __init__(self, message: str = "노드 유효성 검증에 실패했습니다"):
        super().__init__(message, ErrorCode.NODE_INVALID_PARENT)


# --- Checkpoint ---

class CheckpointError(AppError):
    """체크포인트 관련 예외 기본 클래스."""


class CheckpointNotFoundError(CheckpointError):
    """체크포인트를 찾을 수 없음."""

    def __init__(self, message: str = "체크포인트를 찾을 수 없습니다"):
        super().__init__(message, ErrorCode.CHECKPOINT_NOT_FOUND)


class CheckpointNameError(CheckpointError):
    """체크포인트 이름 관련 오류."""

    def __init__(self, message: str = "유효하지 않은 체크포인트 이름입니다"):
        super().__init__(message, ErrorCode.CHECKPOINT_NAME_INVALID)


# --- Path ---

class PathError(AppError):
    """경로 관련 예외 기본 클래스."""


class PathSwitchError(PathError):
    """경로 전환 실패."""

    def __init__(self, message: str = "경로 전환에 실패했습니다"):
        super().__init__(message, ErrorCode.PATH_SWITCH_FAILED)


# --- AI Client ---

class AIClientError(AppError):
    """AI 클라이언트 관련 예외 기본 클래스."""


class AIKeyMissingError(AIClientError):
    """API 키 누락."""

    def __init__(self, message: str = "API 키가 설정되지 않았습니다"):
        super().__init__(message, ErrorCode.AI_KEY_MISSING)


class AIResponseError(AIClientError):
    """AI 응답 오류."""

    def __init__(self, message: str = "AI 응답 처리 중 오류가 발생했습니다"):
        super().__init__(message, ErrorCode.AI_API_ERROR)
