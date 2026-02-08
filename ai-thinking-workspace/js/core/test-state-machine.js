// test-state-machine.js
// C4 StateMachine 단독 테스트

import {
  StateMachine,
  TAB_STATES,
  TAB_TRANSITIONS,
  PANEL_STATES,
  PANEL_TRANSITIONS,
  createTabStateMachine,
  createPanelStateMachine,
} from './state-machine.js';

console.log('=== C4 StateMachine 테스트 시작 ===\n');

// ===== 테스트 1: 기본 전이 =====
console.log('테스트 1: 기본 전이');
const sm = new StateMachine({
  id: 'test-1',
  initial: TAB_STATES.IDLE,
  transitions: TAB_TRANSITIONS,
});

console.log('초기 상태:', sm.getState()); // 'idle'
console.log('LOAD 전이 가능?', sm.canTransition('LOAD')); // true
console.log('LOAD 전이 실행:', sm.transition('LOAD')); // true
console.log('현재 상태:', sm.getState()); // 'loading'
console.log('');

// ===== 테스트 2: 잘못된 전이 =====
console.log('테스트 2: 잘못된 전이');
console.log('LOAD 다시 실행 (이미 loading):', sm.canTransition('LOAD')); // false
console.log('RETRY 실행 가능? (loading에서 불가):', sm.canTransition('RETRY')); // false
console.log('');

// ===== 테스트 3: 정상 전이 체인 =====
console.log('테스트 3: 정상 전이 체인 (LOADING → READY → RELOAD)');
console.log('SUCCESS 전이:', sm.transition('SUCCESS')); // true
console.log('현재 상태:', sm.getState()); // 'ready'
console.log('RELOAD 전이:', sm.transition('RELOAD')); // true
console.log('현재 상태:', sm.getState()); // 'loading'
console.log('');

// ===== 테스트 4: 에러 복구 플로우 =====
console.log('테스트 4: 에러 복구 플로우');
console.log('FAIL 전이:', sm.transition('FAIL')); // true
console.log('현재 상태:', sm.getState()); // 'error'
console.log('RETRY 가능?', sm.canTransition('RETRY')); // true
console.log('RETRY 전이:', sm.transition('RETRY')); // true
console.log('현재 상태:', sm.getState()); // 'loading'
console.log('');

// ===== 테스트 5: getAvailableActions() =====
console.log('테스트 5: getAvailableActions()');
sm.transition('SUCCESS'); // → ready
console.log('READY 상태에서 가능한 액션:', sm.getAvailableActions()); // ['RELOAD', 'SYNC']
console.log('');

// ===== 테스트 6: 히스토리 =====
console.log('테스트 6: 히스토리');
const history = sm.getHistory();
console.log(`히스토리 개수: ${history.length}`);
console.log('마지막 3개 전이:');
history.slice(-3).forEach((entry) => {
  console.log(`  ${entry.prevState} --[${entry.action}]--> ${entry.nextState}`);
});
console.log('');

// ===== 테스트 7: setState (복원용) =====
console.log('테스트 7: setState (복원용)');
console.log('현재 상태:', sm.getState()); // 'ready'
sm.setState(TAB_STATES.ERROR);
console.log('setState 후:', sm.getState()); // 'error'
console.log('히스토리 개수 (변경 없음):', sm.getHistory().length); // 이전과 동일
console.log('');

// ===== 테스트 8: onTransition 콜백 =====
console.log('테스트 8: onTransition 콜백');
let callbackCalled = false;
const sm2 = new StateMachine({
  id: 'test-callback',
  initial: TAB_STATES.IDLE,
  transitions: TAB_TRANSITIONS,
  onTransition: ({ id, action, prevState, nextState }) => {
    callbackCalled = true;
    console.log(`  콜백 호출됨: ${id} | ${prevState} → ${nextState}`);
  },
});
sm2.transition('LOAD');
console.log('콜백 호출 여부:', callbackCalled); // true
console.log('');

// ===== 테스트 9: createTabStateMachine 팩토리 =====
console.log('테스트 9: createTabStateMachine 팩토리');
const tabSm = createTabStateMachine('tab-123');
console.log('초기 상태:', tabSm.getState()); // 'idle'
console.log('ID:', tabSm.id); // 'tab:tab-123'
tabSm.transition('LOAD');
console.log('LOAD 후 상태:', tabSm.getState()); // 'loading'
console.log('');

// ===== 테스트 10: createPanelStateMachine 팩토리 =====
console.log('테스트 10: createPanelStateMachine 팩토리');
const panelSm = createPanelStateMachine('tree');
console.log('초기 상태:', panelSm.getState()); // 'closed'
console.log('ID:', panelSm.id); // 'panel:tree'
console.log('OPEN 전이:', panelSm.transition('OPEN')); // true
console.log('OPEN 후 상태:', panelSm.getState()); // 'open'
console.log('CLOSE 전이:', panelSm.transition('CLOSE')); // true
console.log('CLOSE 후 상태:', panelSm.getState()); // 'closed'
console.log('');

// ===== 테스트 11: 패널 토글 패턴 =====
console.log('테스트 11: 패널 토글 패턴');
const panel = createPanelStateMachine('advisor');
for (let i = 1; i <= 3; i++) {
  const currentState = panel.getState();
  const action = currentState === PANEL_STATES.CLOSED ? 'OPEN' : 'CLOSE';
  panel.transition(action);
  console.log(`  ${i}번째 토글: ${currentState} → ${panel.getState()}`);
}
console.log('');

console.log('=== 모든 테스트 완료 ✅ ===');
