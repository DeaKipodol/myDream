"""
AI 클라이언트 테스트 - Mock을 사용한 OpenAI API 테스트.

이 테스트는 실제 API를 호출하지 않고 Mock 객체를 사용하여
비용 없이 안전하게 테스트합니다.
"""

from unittest.mock import MagicMock, Mock, patch

import openai
import pytest

from ai.client import AIClient, create_client


class TestAIClientInit:
    """AIClient 초기화 테스트"""

    def test_init_with_api_key(self):
        """API 키를 직접 전달하여 초기화"""
        client = AIClient(api_key="test-key-123")
        assert client.api_key == "test-key-123"
        assert client.model == "gpt-4"

    def test_init_with_custom_model(self):
        """커스텀 모델로 초기화"""
        client = AIClient(api_key="test-key-123", model="gpt-3.5-turbo")
        assert client.model == "gpt-3.5-turbo"

    @patch.dict("os.environ", {"OPENAI_API_KEY": "env-key-456"})
    def test_init_from_env_variable(self):
        """환경 변수에서 API 키 가져오기"""
        client = AIClient()
        assert client.api_key == "env-key-456"

    @patch.dict("os.environ", {}, clear=True)
    def test_init_without_api_key_raises_error(self):
        """API 키 없이 초기화 시 에러 발생"""
        with pytest.raises(ValueError, match="OPENAI_API_KEY가 설정되지 않았습니다"):
            AIClient()

    def test_is_available_with_key(self):
        """API 키가 있으면 사용 가능"""
        client = AIClient(api_key="test-key")
        assert client.is_available() is True

    @patch.dict("os.environ", {}, clear=True)
    def test_is_available_without_key(self):
        """API 키가 없으면 사용 불가 (초기화 실패)"""
        # 빈 문자열은 None으로 처리되어 ValueError 발생
        with pytest.raises(ValueError, match="OPENAI_API_KEY가 설정되지 않았습니다"):
            AIClient(api_key="")


class TestAIClientAsk:
    """AIClient.ask() 메서드 테스트 (Mock 사용)"""

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_basic_question(self, mock_create):
        """기본 질문 테스트 - 컨텍스트 없음"""
        # Mock 응답 설정
        mock_response = Mock()
        mock_response.choices = [
            Mock(message=Mock(content="Python은 프로그래밍 언어입니다."))
        ]
        mock_create.return_value = mock_response

        # 테스트 실행
        client = AIClient(api_key="test-key")
        response = client.ask("Python이란?")

        # 검증
        assert response == "Python은 프로그래밍 언어입니다."
        mock_create.assert_called_once()

        # API 호출 인자 검증
        call_args = mock_create.call_args
        assert call_args.kwargs["model"] == "gpt-4"
        assert call_args.kwargs["max_tokens"] == 1024
        messages = call_args.kwargs["messages"]
        assert len(messages) == 2  # system + question
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "Python이란?"

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_with_context(self, mock_create):
        """컨텍스트 포함 질문 테스트"""
        # Mock 응답 설정
        mock_response = Mock()
        mock_response.choices = [
            Mock(message=Mock(content="Django는 Python 웹 프레임워크입니다."))
        ]
        mock_create.return_value = mock_response

        # 테스트 실행
        client = AIClient(api_key="test-key")
        context = [
            ("Python이란?", "Python은 프로그래밍 언어입니다."),
            ("특징은?", "간결하고 읽기 쉽습니다."),
        ]
        response = client.ask("Django는?", context=context)

        # 검증
        assert response == "Django는 Python 웹 프레임워크입니다."

        # 컨텍스트가 올바르게 전달되었는지 확인
        call_args = mock_create.call_args
        messages = call_args.kwargs["messages"]
        # system(1) + context(2*2) + question(1) = 6
        assert len(messages) == 6
        assert messages[1]["role"] == "user"
        assert messages[1]["content"] == "Python이란?"
        assert messages[2]["role"] == "assistant"
        assert messages[2]["content"] == "Python은 프로그래밍 언어입니다."
        assert messages[3]["role"] == "user"
        assert messages[3]["content"] == "특징은?"
        assert messages[4]["role"] == "assistant"
        assert messages[5]["role"] == "user"
        assert messages[5]["content"] == "Django는?"

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_with_custom_max_tokens(self, mock_create):
        """커스텀 max_tokens 설정 테스트"""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="답변"))]
        mock_create.return_value = mock_response

        client = AIClient(api_key="test-key")
        client.ask("질문?", max_tokens=500)

        call_args = mock_create.call_args
        assert call_args.kwargs["max_tokens"] == 500

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_strips_whitespace(self, mock_create):
        """응답의 공백 제거 테스트"""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="  답변입니다.  \n"))]
        mock_create.return_value = mock_response

        client = AIClient(api_key="test-key")
        response = client.ask("질문?")

        assert response == "답변입니다."

    def test_ask_empty_question_raises_error(self):
        """빈 질문 시 에러 발생"""
        client = AIClient(api_key="test-key")

        with pytest.raises(ValueError, match="질문이 비어있습니다"):
            client.ask("")

        with pytest.raises(ValueError, match="질문이 비어있습니다"):
            client.ask("   ")


class TestAIClientErrorHandling:
    """AIClient 에러 처리 테스트"""

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_authentication_error(self, mock_create):
        """API 인증 실패 처리"""
        mock_create.side_effect = openai.AuthenticationError(
            "Invalid API key", response=Mock(), body={}
        )

        client = AIClient(api_key="invalid-key")
        with pytest.raises(Exception, match="OpenAI API 인증 실패"):
            client.ask("질문?")

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_rate_limit_error(self, mock_create):
        """API 요청 한도 초과 처리"""
        mock_create.side_effect = openai.RateLimitError(
            "Rate limit exceeded", response=Mock(), body={}
        )

        client = AIClient(api_key="test-key")
        with pytest.raises(Exception, match="OpenAI API 요청 한도 초과"):
            client.ask("질문?")

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_api_error(self, mock_create):
        """일반 API 에러 처리"""
        mock_create.side_effect = openai.APIError(
            "Server error", request=Mock(), body={}
        )

        client = AIClient(api_key="test-key")
        with pytest.raises(Exception, match="OpenAI API 오류"):
            client.ask("질문?")

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_network_error(self, mock_create):
        """네트워크 에러 처리"""
        mock_create.side_effect = Exception("Network connection failed")

        client = AIClient(api_key="test-key")
        with pytest.raises(Exception, match="AI 요청 실패"):
            client.ask("질문?")


class TestCreateClientFactory:
    """create_client() 팩토리 함수 테스트"""

    @patch.dict("os.environ", {"OPENAI_API_KEY": "valid-key"})
    def test_create_client_with_valid_key(self):
        """유효한 API 키로 클라이언트 생성"""
        client = create_client()
        assert client is not None
        assert isinstance(client, AIClient)
        assert client.api_key == "valid-key"

    @patch.dict("os.environ", {}, clear=True)
    def test_create_client_without_key_returns_none(self):
        """API 키 없이 호출 시 None 반환"""
        client = create_client()
        assert client is None


class TestAIClientIntegration:
    """AIClient 통합 시나리오 테스트"""

    @patch("openai.resources.chat.completions.Completions.create")
    def test_conversation_flow(self, mock_create):
        """실제 대화 흐름 시뮬레이션"""
        # 여러 턴의 대화를 시뮬레이션
        responses = [
            "Python은 프로그래밍 언어입니다.",
            "Django는 웹 프레임워크입니다.",
            "Flask는 마이크로 프레임워크입니다.",
        ]

        def create_mock_response(content):
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content=content))]
            return mock_response

        mock_create.side_effect = [create_mock_response(r) for r in responses]

        client = AIClient(api_key="test-key")
        context = []

        # 턴 1
        q1 = "Python이란?"
        a1 = client.ask(q1, context=context)
        assert a1 == "Python은 프로그래밍 언어입니다."
        context.append((q1, a1))

        # 턴 2
        q2 = "Django는?"
        a2 = client.ask(q2, context=context)
        assert a2 == "Django는 웹 프레임워크입니다."
        context.append((q2, a2))

        # 턴 3
        q3 = "Flask는?"
        a3 = client.ask(q3, context=context)
        assert a3 == "Flask는 마이크로 프레임워크입니다."

        # 3번 호출되었는지 확인
        assert mock_create.call_count == 3

        # 마지막 호출에서 전체 컨텍스트가 전달되었는지 확인
        last_call_args = mock_create.call_args
        messages = last_call_args.kwargs["messages"]
        # system(1) + context(2*2) + question(1) = 6
        assert len(messages) == 6

    @patch("openai.resources.chat.completions.Completions.create")
    def test_empty_context_handling(self, mock_create):
        """빈 컨텍스트 처리"""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="답변"))]
        mock_create.return_value = mock_response

        client = AIClient(api_key="test-key")

        # None 컨텍스트
        response1 = client.ask("질문?", context=None)
        assert response1 == "답변"

        # 빈 리스트 컨텍스트
        response2 = client.ask("질문?", context=[])
        assert response2 == "답변"

    @patch("openai.resources.chat.completions.Completions.create")
    def test_long_context_handling(self, mock_create):
        """긴 컨텍스트 처리"""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="답변"))]
        mock_create.return_value = mock_response

        client = AIClient(api_key="test-key")

        # 10턴의 긴 컨텍스트
        context = [(f"질문{i}", f"답변{i}") for i in range(10)]
        response = client.ask("마지막 질문?", context=context)

        assert response == "답변"

        # 컨텍스트가 모두 전달되었는지 확인
        call_args = mock_create.call_args
        messages = call_args.kwargs["messages"]
        # system(1) + context(10*2) + question(1) = 22
        assert len(messages) == 22


class TestAIClientEdgeCases:
    """AIClient 엣지 케이스 테스트"""

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_with_special_characters(self, mock_create):
        """특수 문자 포함 질문 처리"""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="답변"))]
        mock_create.return_value = mock_response

        client = AIClient(api_key="test-key")
        response = client.ask("Python의 @decorator는 무엇인가요?")

        assert response == "답변"
        call_args = mock_create.call_args
        messages = call_args.kwargs["messages"]
        assert messages[-1]["content"] == "Python의 @decorator는 무엇인가요?"

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_with_unicode(self, mock_create):
        """유니코드 문자 처리"""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="네, 한글도 잘 됩니다! 😊"))]
        mock_create.return_value = mock_response

        client = AIClient(api_key="test-key")
        response = client.ask("한글로 질문할 수 있나요? 🤔")

        assert "한글도 잘 됩니다" in response
        assert "😊" in response

    @patch("openai.resources.chat.completions.Completions.create")
    def test_ask_with_very_long_question(self, mock_create):
        """매우 긴 질문 처리"""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="답변"))]
        mock_create.return_value = mock_response

        client = AIClient(api_key="test-key")
        long_question = "질문 " * 1000  # 매우 긴 질문
        response = client.ask(long_question)

        assert response == "답변"
        call_args = mock_create.call_args
        messages = call_args.kwargs["messages"]
        assert messages[-1]["content"] == long_question

    @patch("openai.resources.chat.completions.Completions.create")
    def test_multiple_clients_independent(self, mock_create):
        """여러 클라이언트가 독립적으로 작동"""
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="답변"))]
        mock_create.return_value = mock_response

        client1 = AIClient(api_key="key1", model="gpt-4")
        client2 = AIClient(api_key="key2", model="gpt-3.5-turbo")

        assert client1.api_key == "key1"
        assert client2.api_key == "key2"
        assert client1.model == "gpt-4"
        assert client2.model == "gpt-3.5-turbo"
