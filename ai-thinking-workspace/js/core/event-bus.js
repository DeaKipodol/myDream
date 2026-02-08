// core/event-bus.js

/**
 * EventBus - 이벤트 기반 모듈 간 통신 시스템
 *
 * 역할:
 * - 모듈 간 느슨한 결합 통신
 * - 이벤트 발행/구독 패턴
 * - 디버깅을 위한 로깅 및 히스토리
 */

class EventBusClass {
  constructor() {
    this.subscribers = {};      // { [event]: Set<callback> }
    this.history = [];          // [{ event, data, timestamp }]
    this.loggingEnabled = false;
    this.maxHistorySize = 100;
  }

  // ===== 발행 =====

  /**
   * 이벤트 발행
   * @param {string} event - 이벤트 이름 (EVENTS 상수 사용)
   * @param {any} data - 전달할 데이터
   */
  emit(event, data = {}) {
    // 로깅
    if (this.loggingEnabled) {
      console.log(`[EventBus] ${event}`, data);
    }

    // 히스토리 저장
    this._addToHistory(event, data);

    // 구독자 호출
    const callbacks = this.subscribers[event];
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for "${event}":`, error);
      }
    });
  }

  // ===== 구독 =====

  /**
   * 이벤트 구독
   * @param {string} event - 이벤트 이름
   * @param {(data: any) => void} callback - 콜백 함수
   * @returns {() => void} unsubscribe 함수
   */
  on(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = new Set();
    }

    this.subscribers[event].add(callback);

    // unsubscribe 함수 반환
    return () => this.off(event, callback);
  }

  /**
   * 일회성 구독 (한 번 실행 후 자동 해제)
   * @param {string} event
   * @param {(data: any) => void} callback
   * @returns {() => void} unsubscribe 함수
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };

    return this.on(event, wrapper);
  }

  /**
   * 구독 해제
   * @param {string} event
   * @param {(data: any) => void} callback
   */
  off(event, callback) {
    const callbacks = this.subscribers[event];
    if (callbacks) {
      callbacks.delete(callback);

      // 빈 Set 정리
      if (callbacks.size === 0) {
        delete this.subscribers[event];
      }
    }
  }

  /**
   * 특정 이벤트의 모든 구독 해제
   * @param {string} event
   */
  offAll(event) {
    delete this.subscribers[event];
  }

  /**
   * 모든 구독 해제
   */
  reset() {
    this.subscribers = {};
    this.history = [];
  }

  // ===== 디버깅 =====

  /**
   * 로깅 활성화/비활성화
   * @param {boolean} enabled
   */
  enableLogging(enabled) {
    this.loggingEnabled = enabled;
  }

  /**
   * 모든 구독자 조회 (디버깅용)
   * @returns {Object} { [event]: callback[] }
   */
  getSubscribers() {
    const result = {};
    for (const [event, callbacks] of Object.entries(this.subscribers)) {
      result[event] = Array.from(callbacks);
    }
    return result;
  }

  /**
   * 이벤트 히스토리 조회 (디버깅용)
   * @param {number} limit - 최근 n개
   * @returns {Array} [{ event, data, timestamp }]
   */
  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }

  /**
   * 이벤트 구독자 수 확인
   * @param {string} event
   * @returns {number}
   */
  getListenerCount(event) {
    return this.subscribers[event]?.size || 0;
  }

  /**
   * 등록된 모든 이벤트 목록
   * @returns {string[]}
   */
  getRegisteredEvents() {
    return Object.keys(this.subscribers);
  }

  // ===== 내부 메서드 =====

  /**
   * 히스토리에 이벤트 추가
   * @private
   */
  _addToHistory(event, data) {
    this.history.push({
      event,
      data,
      timestamp: Date.now(),
    });

    // 크기 제한
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}

// 싱글톤 인스턴스
export const EventBus = new EventBusClass();

// 디버깅용 전역 노출
if (typeof window !== 'undefined') {
  window.__EventBus = EventBus;
}

/* ========================================
   테스트 (브라우저 콘솔에서)
   ========================================

// 1. 기본 사용
import { EventBus } from './core/event-bus.js';

EventBus.on('test', (data) => {
  console.log('Received:', data);
});

EventBus.emit('test', { msg: 'hello' });


// 2. 일회성 구독
EventBus.once('init', () => {
  console.log('Initialized!');
});

EventBus.emit('init');
EventBus.emit('init'); // 두 번째는 무시됨


// 3. 구독 해제
const unsubscribe = EventBus.on('test', () => {
  console.log('Test event');
});

unsubscribe();


// 4. 로깅 활성화
EventBus.enableLogging(true);
EventBus.emit('test', { foo: 'bar' });
// [EventBus] test { foo: 'bar' }


// 5. 디버깅
console.log(EventBus.getSubscribers());
console.log(EventBus.getHistory(5));
console.log(EventBus.getListenerCount('test'));
console.log(EventBus.getRegisteredEvents());

*/
