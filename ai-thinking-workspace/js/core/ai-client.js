/**
 * ========================================
 * AI 클라이언트 추상화
 *
 * LLM API 연결 지점을 단일화합니다.
 * 현재는 목업 응답, 나중에 실제 API로 교체.
 * ========================================
 */

class AIClient {
  constructor() {
    this.mode = 'mock'; // 'mock' | 'openai' | 'anthropic' | 'custom'
    this.apiKey = null;
    this.endpoint = null;
  }

  /**
   * API 설정
   * @param {Object} config - { mode, apiKey, endpoint }
   */
  configure(config) {
    this.mode = config.mode || 'mock';
    this.apiKey = config.apiKey || null;
    this.endpoint = config.endpoint || null;
    console.log('[AIClient] 설정됨:', this.mode);
  }

  /**
   * 채팅 응답 생성
   * @param {string} message - 사용자 메시지
   * @param {Object} options - { mode: 'standard'|'persona', experts: [...], history: [...] }
   * @returns {Promise<Object>} AI 응답 메시지 객체
   */
  async chat(message, options = {}) {
    const { mode = 'standard', experts = [], history = [] } = options;

    console.log('[AIClient] chat 호출:', { message, mode, expertsCount: experts.length });

    // 모드에 따라 분기
    switch (this.mode) {
      case 'openai':
        return this._callOpenAI(message, options);
      case 'anthropic':
        return this._callAnthropic(message, options);
      case 'custom':
        return this._callCustom(message, options);
      default:
        return this._mockResponse(message, options);
    }
  }

  /**
   * 목업 응답 생성 (개발용)
   */
  async _mockResponse(message, options) {
    const { mode = 'standard', experts = [] } = options;

    // 시뮬레이션 딜레이 (실제 API 느낌)
    await this._delay(800 + Math.random() * 400);

    if (mode === 'persona' && experts.length > 0) {
      // 페르소나 모드: 각 전문가별 응답
      return {
        type: 'ai',
        mode: 'persona',
        experts: experts.map(e => ({
          id: e.id,
          emoji: e.emoji,
          name: e.name,
          color: e.color,
          content: this._generateExpertResponse(message, e)
        })),
        timestamp: Date.now()
      };
    }

    // 표준 1:1 모드
    return {
      type: 'ai',
      content: this._generateStandardResponse(message),
      timestamp: Date.now()
    };
  }

  /**
   * 표준 모드 응답 생성 (목업)
   */
  _generateStandardResponse(message) {
    return `
      <p>"${message}"에 대해 분석해드릴게요.</p>

      <p>이 주제는 여러 관점에서 접근할 수 있습니다. 먼저 핵심 요소들을 정리해보면:</p>

      <p><strong>1. 현황 분석</strong></p>
      <p>현재 상황을 파악하고 주요 변수들을 식별하는 것이 중요합니다. 데이터 기반의 접근이 효과적인 의사결정에 도움이 됩니다.</p>

      <p><strong>2. 전략적 고려사항</strong></p>
      <p>목표 달성을 위해서는 단기적 성과와 장기적 비전 사이의 균형이 필요합니다. 리소스 배분과 우선순위 설정이 핵심입니다.</p>

      <p><strong>3. 실행 방안</strong></p>
      <p>구체적인 액션 아이템을 도출하고 타임라인을 설정하세요. 작은 승리들을 쌓아가면서 모멘텀을 유지하는 것이 좋습니다.</p>

      <p>더 깊이 탐색하고 싶은 부분이 있다면 해당 주제로 가지를 만들어 집중적으로 분석해볼 수 있어요.</p>
    `;
  }

  /**
   * 전문가 응답 생성 (목업)
   */
  _generateExpertResponse(message, expert) {
    const templates = {
      analyst: `<p>데이터 관점에서 "${message}"를 분석하면, 정량적 지표와 트렌드를 먼저 파악해야 합니다.</p>
        <p>현재 데이터를 기반으로 의사결정을 내리는 것이 리스크를 줄이는 방법입니다.</p>`,
      designer: `<p>디자인 관점에서 "${message}"를 보면, 사용자 경험과 시각적 일관성이 중요합니다.</p>
        <p>직관적인 인터페이스와 명확한 정보 계층 구조를 고려해보세요.</p>`,
      marketer: `<p>마케팅 관점에서 "${message}"를 분석하면, 타겟 고객과 채널 전략이 핵심입니다.</p>
        <p>고객 여정을 고려한 접근이 ROI를 높이는 방법입니다.</p>`,
      strategist: `<p>전략적 관점에서 "${message}"를 보면, 장기적 비전과 단기 실행의 균형이 필요합니다.</p>
        <p>경쟁 환경과 내부 역량을 함께 고려해야 합니다.</p>`,
      critic: `<p>"${message}"에 대해 비판적으로 검토하면, 몇 가지 잠재적 위험 요소가 있습니다.</p>
        <p>낙관적 가정들을 재검토하고, 최악의 시나리오도 준비해야 합니다.</p>`
    };

    const defaultResponse = `<p>${expert.name} 관점에서 "${message}"에 대한 의견입니다.</p>
      <p>이 주제를 ${expert.name}의 시각으로 분석하면, 다양한 측면을 고려해야 합니다.</p>`;

    return templates[expert.id] || defaultResponse;
  }

  /**
   * OpenAI API 호출 (TODO)
   */
  async _callOpenAI(message, options) {
    // TODO: 실제 OpenAI API 연동
    console.log('[AIClient] OpenAI API 호출 (미구현)');
    return this._mockResponse(message, options);
  }

  /**
   * Anthropic API 호출 (TODO)
   */
  async _callAnthropic(message, options) {
    // TODO: 실제 Anthropic API 연동
    console.log('[AIClient] Anthropic API 호출 (미구현)');
    return this._mockResponse(message, options);
  }

  /**
   * 커스텀 엔드포인트 호출 (TODO)
   */
  async _callCustom(message, options) {
    // TODO: 커스텀 백엔드 API 연동
    console.log('[AIClient] Custom API 호출 (미구현)');
    return this._mockResponse(message, options);
  }

  /**
   * 딜레이 유틸리티
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 싱글톤 인스턴스
const aiClient = new AIClient();

// 전역 노출
window.aiClient = aiClient;

export { aiClient, AIClient };
