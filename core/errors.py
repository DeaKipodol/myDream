"""에러 코드 정의.

도메인별 에러 코드를 enum으로 관리한다.
각 코드는 "도메인_숫자" 형식을 따른다.
"""

from enum import Enum


class ErrorCode(str, Enum):
    """애플리케이션 에러 코드."""

    # Node
    NODE_NOT_FOUND = "NODE_001"
    NODE_INVALID_PARENT = "NODE_002"

    # Checkpoint
    CHECKPOINT_NAME_INVALID = "CP_001"
    CHECKPOINT_NOT_FOUND = "CP_002"
    CHECKPOINT_DUPLICATE = "CP_003"

    # Path
    PATH_SWITCH_FAILED = "PATH_001"

    # AI Client
    AI_API_ERROR = "AI_001"
    AI_KEY_MISSING = "AI_002"
