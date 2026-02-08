// core/state-machine.js
// C4: StateMachine - 상태 전이 관리

// ===== Import =====
import { EventBus } from './event-bus.js';
import { EVENTS } from './events.js';

// ===== 상태 정의 =====

/**
 * 탭 상태 정의
 */
export const TAB_STATES = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  SYNCING: 'syncing',
});

/**
 * 탭 상태 전이 규칙
 */
export const TAB_TRANSITIONS = Object.freeze({
  [TAB_STATES.IDLE]: {
    LOAD: TAB_STATES.LOADING,
  },
  [TAB_STATES.LOADING]: {
    SUCCESS: TAB_STATES.READY,
    FAIL: TAB_STATES.ERROR,
  },
  [TAB_STATES.READY]: {
    RELOAD: TAB_STATES.LOADING,
    SYNC: TAB_STATES.SYNCING,
  },
  [TAB_STATES.ERROR]: {
    RETRY: TAB_STATES.LOADING,
  },
  [TAB_STATES.SYNCING]: {
    SUCCESS: TAB_STATES.READY,
    FAIL: TAB_STATES.ERROR,
  },
});

/**
 * 패널 상태 정의
 */
export const PANEL_STATES = Object.freeze({
  CLOSED: 'closed',
  OPEN: 'open',
});

/**
 * 패널 상태 전이 규칙
 */
export const PANEL_TRANSITIONS = Object.freeze({
  [PANEL_STATES.CLOSED]: {
    OPEN: PANEL_STATES.OPEN,
  },
  [PANEL_STATES.OPEN]: {
    CLOSE: PANEL_STATES.CLOSED,
  },
});

// ===== 향후 확장 예약 (주석) =====
// export const MODAL_STATES = Object.freeze({ ... });
// export const MODAL_TRANSITIONS = Object.freeze({ ... });
// export function createModalStateMachine(modalId) { ... }

// ===== StateMachine 클래스 =====

/**
 * 상태 머신 클래스
 * 유효한 상태 전이만 허용하고, 잘못된 전이를 방지한다.
 */
export class StateMachine {
  /**
   * @param {Object} config
   * @param {string} config.id - 인스턴스 식별자 (예: 'tab:123', 'panel:tree')
   * @param {string} config.initial - 초기 상태 (예: 'idle', 'closed')
   * @param {Object} config.transitions - 상태별 전이 규칙 (TAB_TRANSITIONS, PANEL_TRANSITIONS 등)
   * @param {Function} [config.onTransition] - 전이 콜백 (선택사항)
   *   - 시그니처: ({ id, action, prevState, nextState }) => void
   */
  constructor({ id, initial, transitions, onTransition }) {
    this.id = id;
    this.state = initial;
    this.transitions = transitions;
    this.onTransition = onTransition;
    this.history = [];
    this.maxHistorySize = 50;
  }

  /**
   * 현재 상태 반환
   * @returns {string} 현재 상태
   */
  getState() {
    return this.state;
  }

  /**
   * 상태 직접 설정 (복원용)
   * 히스토리에 기록하지 않음
   * @param {string} state - 설정할 상태
   */
  setState(state) {
    this.state = state;
  }

  /**
   * 전이 실행
   * @param {string} action - 전이 액션 (예: 'LOAD', 'SUCCESS', 'FAIL')
   * @returns {boolean} 성공 여부
   */
  transition(action) {
    const currentState = this.state;
    const availableTransitions = this.transitions[currentState];

    if (!availableTransitions) {
      console.warn(`[StateMachine:${this.id}] No transitions from state: ${currentState}`);
      return false;
    }

    const nextState = availableTransitions[action];

    if (!nextState) {
      console.warn(`[StateMachine:${this.id}] Invalid action "${action}" from state "${currentState}"`);
      return false;
    }

    // 전이 실행
    const prevState = this.state;
    this.state = nextState;

    // 히스토리 기록
    this._addToHistory(action, prevState, nextState);

    // 콜백 호출 (EventBus 연결 등)
    if (this.onTransition) {
      this.onTransition({
        id: this.id,
        action,
        prevState,
        nextState,
      });
    }

    return true;
  }

  /**
   * 전이 가능 여부 확인
   * @param {string} action - 확인할 액션
   * @returns {boolean} 전이 가능 여부
   */
  canTransition(action) {
    const availableTransitions = this.transitions[this.state];
    return !!(availableTransitions && availableTransitions[action]);
  }

  /**
   * 현재 상태에서 가능한 액션 목록
   * @returns {string[]} 가능한 액션들
   */
  getAvailableActions() {
    const availableTransitions = this.transitions[this.state];
    return availableTransitions ? Object.keys(availableTransitions) : [];
  }

  /**
   * 전이 히스토리 (디버깅용)
   * @returns {Array} 전이 히스토리 복사본
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * 히스토리에 전이 기록 추가 (내부 메서드)
   * @private
   * @param {string} action
   * @param {string} prevState
   * @param {string} nextState
   */
  _addToHistory(action, prevState, nextState) {
    this.history.push({
      action,
      prevState,
      nextState,
      timestamp: Date.now(),
    });

    // 크기 제한 (메모리 관리)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}

// ===== Factory 함수 =====

/**
 * 탭 상태 머신 생성
 * @param {string} tabId - 탭 ID
 * @returns {StateMachine} 탭용 상태 머신 인스턴스
 */
export function createTabStateMachine(tabId) {
  return new StateMachine({
    id: `tab:${tabId}`,
    initial: TAB_STATES.IDLE,
    transitions: TAB_TRANSITIONS,
    onTransition: ({ id, action, prevState, nextState }) => {
      // 상태 변경 이벤트 발행
      EventBus.emit(EVENTS.TAB_STATE_CHANGED, {
        tabId,
        status: nextState,
        prevStatus: prevState,
      });

      // 개발용 로그
      console.log(`[${id}] ${prevState} --[${action}]--> ${nextState}`);
    },
  });
}

/**
 * 패널 상태 머신 생성
 * @param {string} panelId - 패널 ID (예: 'tree', 'advisor', 'docs')
 * @returns {StateMachine} 패널용 상태 머신 인스턴스
 */
export function createPanelStateMachine(panelId) {
  return new StateMachine({
    id: `panel:${panelId}`,
    initial: PANEL_STATES.CLOSED,
    transitions: PANEL_TRANSITIONS,
    // 패널은 이벤트 발행 없음 (필요 시 추가)
  });
}
