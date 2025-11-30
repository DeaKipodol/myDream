"""
AI 클라이언트 모듈.

OpenAI API를 사용하여 AI 응답을 생성합니다.
"""

import os
from typing import Optional, List, Dict
from openai import OpenAI
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()


class AIClient:
    """OpenAI API 클라이언트."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        AI 클라이언트 초기화.

        Args:
            api_key: OpenAI API 키 (None이면 환경 변수에서 읽음)
            model: 사용할 GPT 모델 (None이면 환경 변수 또는 기본값)
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError(
                "OPENAI_API_KEY가 설정되지 않았습니다. "
                ".env 파일을 생성하거나 환경 변수를 설정하세요."
            )

        self.model = model or os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        self.client = OpenAI(api_key=self.api_key)
        self.conversation_history: List[Dict[str, str]] = []

    def ask(self, question: str, system_prompt: Optional[str] = None) -> str:
        """
        AI에게 질문하고 답변을 받습니다.

        Args:
            question: 사용자 질문
            system_prompt: 시스템 프롬프트 (선택사항)

        Returns:
            AI의 답변

        Example:
            >>> client = AIClient()
            >>> answer = client.ask("Python이 뭐야?")
            >>> print(answer)
        """
        try:
            # 대화 히스토리에 현재 질문 추가
            self.conversation_history.append({
                "role": "user",
                "content": question
            })

            # 시스템 프롬프트 포함한 메시지 구성
            messages = []
            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            else:
                messages.append({
                    "role": "system",
                    "content": "당신은 친절하고 도움이 되는 AI 어시스턴트입니다."
                })

            messages.extend(self.conversation_history)

            # API 호출
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=1024,
                messages=messages
            )

            # 응답 추출
            answer = response.choices[0].message.content

            # 대화 히스토리에 AI 답변 추가
            self.conversation_history.append({
                "role": "assistant",
                "content": answer
            })

            return answer

        except Exception as e:
            return f"❌ AI 응답 생성 중 오류 발생: {str(e)}"

    def ask_with_context(
        self,
        question: str,
        context: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        컨텍스트를 포함하여 AI에게 질문합니다.

        Args:
            question: 사용자 질문
            context: 이전 대화 맥락
            system_prompt: 시스템 프롬프트

        Returns:
            AI의 답변

        Example:
            >>> client = AIClient()
            >>> context = "이전 대화: ..."
            >>> answer = client.ask_with_context("그럼 변수는?", context)
        """
        full_question = f"{context}\n\n현재 질문: {question}"
        return self.ask(full_question, system_prompt)

    def reset_history(self):
        """대화 히스토리를 초기화합니다."""
        self.conversation_history = []

    def get_history_length(self) -> int:
        """현재 대화 히스토리 길이를 반환합니다."""
        return len(self.conversation_history)
