"""
OpenAI API 클라이언트 모듈.

이 모듈은 OpenAI GPT API와 통신하여 AI 응답을 생성합니다.
"""

import os
from typing import List, Optional, Tuple

import openai
from openai import OpenAI


class AIClient:
    """
    OpenAI API를 사용한 AI 응답 생성 클래스.

    환경 변수 OPENAI_API_KEY가 필요합니다.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4"):
        """
        AIClient 초기화.

        Args:
            api_key: OpenAI API 키 (None이면 환경 변수에서 가져옴)
            model: 사용할 GPT 모델 (기본값: gpt-4)

        Raises:
            ValueError: API 키가 없는 경우
        """
        # 빈 문자열도 None으로 처리
        if api_key == "":
            api_key = None

        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

        self.model = model
        self.client = OpenAI(api_key=self.api_key)

    def ask(
        self,
        question: str,
        context: Optional[List[Tuple[str, str]]] = None,
        max_tokens: int = 1024,
    ) -> str:
        """
        AI에게 질문하고 응답을 받습니다.

        Args:
            question: 사용자의 질문
            context: 대화 컨텍스트 [(질문, 답변), ...] 형식
            max_tokens: 최대 응답 토큰 수

        Returns:
            AI의 응답 문자열

        Raises:
            Exception: API 호출 실패 시

        Example:
            >>> client = AIClient()
            >>> response = client.ask("Python이란?")
            >>> print(response)
            Python은 프로그래밍 언어입니다...

            >>> # 컨텍스트 포함
            >>> context = [("Python이란?", "Python은 언어입니다.")]
            >>> response = client.ask("Django는?", context=context)
        """
        if not question or not question.strip():
            raise ValueError("질문이 비어있습니다.")

        # 메시지 구성
        messages = [
            {"role": "system", "content": "당신은 친절하고 정확한 AI 어시스턴트입니다."}
        ]

        # 컨텍스트 추가
        if context:
            for q, a in context:
                messages.append({"role": "user", "content": q})
                messages.append({"role": "assistant", "content": a})

        # 현재 질문 추가
        messages.append({"role": "user", "content": question})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )

            return response.choices[0].message.content.strip()

        except openai.AuthenticationError:
            raise Exception("OpenAI API 인증 실패: API 키를 확인하세요.")
        except openai.RateLimitError:
            raise Exception("OpenAI API 요청 한도 초과: 잠시 후 다시 시도하세요.")
        except openai.APIError as e:
            raise Exception(f"OpenAI API 오류: {e}")
        except Exception as e:
            raise Exception(f"AI 요청 실패: {e}")

    def is_available(self) -> bool:
        """
        AI 클라이언트가 사용 가능한지 확인합니다.

        Returns:
            API 키가 설정되어 있으면 True
        """
        return bool(self.api_key)


def create_client() -> Optional[AIClient]:
    """
    AIClient 인스턴스를 생성합니다.

    API 키가 없으면 None을 반환합니다.

    Returns:
        AIClient 인스턴스 또는 None

    Example:
        >>> client = create_client()
        >>> if client:
        ...     response = client.ask("Python이란?")
    """
    try:
        return AIClient()
    except ValueError:
        return None
