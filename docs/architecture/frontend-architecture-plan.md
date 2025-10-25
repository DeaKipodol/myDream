# 프론트엔드 아키텍처 및 폴더 구조 설계(MVP, 정적 웹)

본 문서는 AI 고민상담 대화의 분기/체크포인트/경로 전환 아이디어를 프론트엔드에서 즉시 시각화하기 위한 아키텍처 구성과 폴더 구조 계획을 정의한다. 문서는 유지보수성과 시안성을 최우선으로 하며, 필요한 만큼의 디자인 패턴만 적용한다. 문서는 코드 파일 생성을 수행하지 않는다(계획 문서만 생성).

## 1) Overview

목표는 정적 HTML/CSS/JavaScript만으로 다음을 시연하는 것이다. TreeView 클릭 한 번으로 활성 경로를 전환하고, Breadcrumbs/ChatView가 즉시 동기화되며, Checkpoint 생성/복원을 통해 경로 스냅샷을 왕복한다. 초기 단계에서는 백엔드를 사용하지 않는다. 데이터는 브라우저 메모리와 선택적으로 localStorage에서 관리한다.

## 2) 설계 원칙(Principles)

- 예측 가능성: 동일 입력에 동일 결과를 보장하는 단방향 데이터 흐름 유지.
- 느슨한 결합: 알고리즘·상태·뷰를 모듈 경계로 분리.
- 명확한 책임: 경로 계산은 알고리즘 계층, 렌더링은 컴포넌트 계층, 스냅샷은 서비스 계층.
- 테스트 용이성: 순수 함수 우선, 부작용은 경계(Service/Storage)로 격리.
- 접근성/가시성: 키보드 네비게이션과 시각적 하이라이트 기본 제공.
- 점진적 확장: 백엔드/AI 연계는 어댑터 계층으로 후속 추가.

## 3) 적용 디자인 패턴(필요한 만큼)

- 단방향 데이터 흐름(Flux-lite): State Store → View 렌더, View 이벤트 → Action → Reducer/Service → State 업데이트.
- Observer(Pub-Sub): 상태 변경 시 렌더 파이프라인 통지(간단 이벤트 버스).
- Strategy: LCA 엔진 선택(Linear 기본, Binary Lifting 확장 시 교체 가능).
- Memento: 체크포인트 스냅샷(활성 경로·메타의 불변 저장/복원).
- Command(확장): 사용자 행동(전환/복원)을 명령으로 추상화하여 Undo/Redo 여지 마련.
- Repository: 데이터 접근(메모리/localStorage)을 추상화하여 View/알고리즘으로부터 분리.
- Adapter(확장): AI Provider/백엔드 API 연계를 위해 통신 계층을 어댑터화.
- Facade: 서비스 묶음을 단일 API로 노출(checkpointService, shelvesService 등).
- Presenter/Container 분리: 상태 의존 Container와 순수 렌더 Presenter 분리.

## 3-1) 패턴 선택 의도, 기대 효과, 역효과 리스크

- 단방향 데이터 흐름(Flux-lite)
  - 의도: 상태 변경 경로를 단일 방향으로 제한하여 예측 가능성을 높인다.
  - 긍정 효과: 경로 전환 알고리즘이 상태→뷰로 일관되게 반영되어 클릭 한 번의 전환을 보장한다. 디버깅 시 Action 로그만 추적해도 원인을 파악할 수 있다.
  - 리스크: 과도한 액션/리듀서 분리로 보일러플레이트가 늘어날 수 있다. MVP에서는 Store/Action 최소화로 억제한다.

- Observer(Pub-Sub)
  - 의도: 상태 변화에 반응하는 렌더러를 느슨하게 연결한다.
  - 긍정 효과: ChatView/Breadcrumbs/TreeView가 필요한 부분만 갱신되어 성능/가독성이 좋아진다.
  - 리스크: 이벤트 폭증 시 추적이 어려워질 수 있다. 네임스페이스/로거를 도입해 가시성을 확보한다.

- Strategy(LCA 엔진 교체)
  - 의도: 선형 LCA에서 Binary Lifting 등으로 무중단 교체가 가능하게 한다.
  - 긍정 효과: 트리 규모 증가에도 아키텍처 변경 없이 성능 확장이 가능하다.
  - 리스크: 전략 선택 기준이 불명확하면 예측이 어려워진다. 임계값과 로그를 구성으로 고정한다.

- Memento(체크포인트)
  - 의도: 활성 경로와 메타를 불변 스냅샷으로 저장/복원한다.
  - 긍정 효과: 잘못된 논리 누적에서 즉시 복귀가 가능하고, 학습/데모에서 왕복 시연이 쉬워진다.
  - 리스크: 스냅샷 남발로 저장 공간/메모리가 증가한다. 생성 시점 정책과 상한을 둔다.

- Repository
  - 의도: 저장소 접근(메모리/localStorage)을 추상화해 UI·알고리즘을 순수하게 유지한다.
  - 긍정 효과: 저장 방식 교체 시 상위 계층 변경이 최소화된다.
  - 리스크: 얇은 추상화라도 계층이 늘면 학습비용이 생긴다. 인터페이스를 2~3 메서드로 단순화한다.

- Facade
  - 의도: 여러 서비스를 하나의 단순 API로 묶어 호출부를 간결하게 한다.
  - 긍정 효과: 화면 코드는 `services.facade.switchPath()` 같은 한 줄 호출로 읽기 좋아진다.
  - 리스크: 퍼사드가 비대해지면 신뢰도가 떨어진다. 도메인별 소퍼사드로 분할한다.

- Adapter(확장)
  - 의도: AI/백엔드 연계를 교체 가능하게 유지한다.
  - 긍정 효과: 추후 실제 API 연동 시 프론트 핵심 모듈 변경을 최소화한다.
  - 리스크: MVP에서 필요 이상 어댑터화하면 과설계가 된다. 목업 단계에서는 스텁만 둔다.

- Presenter/Container 분리
  - 의도: 렌더는 순수 함수로, 데이터 연동은 컨테이너에서 담당한다.
  - 긍정 효과: 뷰 테스트가 쉬워지고, 재사용성이 높아진다.
  - 리스크: 컴포넌트 수가 많아 보일 수 있다. 핵심 화면에만 적용한다.

잠만,, 중간점검: 패턴은 “문제-해결” 연결이 명확할 때만 적용한다. MVP는 과설계를 피하고, 학습과 확장을 방해하지 않는 최소 집합만 유지한다.

## 3-2) 학생 프로젝트 시나리오와 패턴 효과

시나리오 A: “전환 후 Breadcrumbs가 가끔 틀리게 보인다.”
- 원인: 상태를 여러 컴포넌트가 제각각 보관해 레이스가 발생한다.
- 패턴 적용: Flux-lite로 단일 Store를 도입한다. View는 Store를 구독하고, 모든 갱신은 Action을 통해서만 이뤄진다.
- 결과: Breadcrumbs/ChatView/TreeView가 같은 상태 소스를 읽어 일관되게 렌더링된다.

시나리오 B: “트리가 커지니 전환이 느려진다.”
- 원인: 매 전환마다 깊은 경로 재계산과 전체 리렌더가 발생한다.
- 패턴 적용: Strategy로 LCA 엔진을 선형→Binary Lifting으로 교체 가능하게 한다. Observer로 부분 렌더만 트리거한다.
- 결과: 알고리즘 교체와 부분 갱신으로 체감 지연이 줄어든다.

시나리오 C: “잘못된 추론 누적 후 되돌리기가 어렵다.”
- 원인: 기존 상태 덮어쓰기로 과거 경로를 복원할 수 없다.
- 패턴 적용: Memento로 활성 경로 스냅샷을 남기고 복원 버튼으로 왕복한다.
- 결과: 데모 중 즉시 정상 상태로 복귀 가능, 실수 복구가 빨라진다.

시나리오 D: “localStorage로 세션을 남겼더니 모듈 간 결합이 강해졌다.”
- 원인: 컴포넌트가 직접 localStorage에 접근한다.
- 패턴 적용: Repository/Service로 저장 접근을 캡슐화한다.
- 결과: 저장 구현이 바뀌어도 상위 코드 수정이 최소화된다.

시나리오 E: “컴포넌트가 비대해져 테스트가 어렵다.”
- 원인: 데이터 페치/상태 변경/렌더가 한 파일에 얽혀 있다.
- 패턴 적용: Presenter/Container 분리로 렌더를 순수 함수로 만든다.
- 결과: 렌더 단위 스냅샷 테스트가 쉬워지고, 유지보수가 간단해진다.

시나리오 F: “이벤트가 많아 디버깅이 힘들다.”
- 원인: 무명 이벤트 리스너가 곳곳에 산재한다.
- 패턴 적용: Observer 채널 네임스페이스와 로거를 표준화한다.
- 결과: 콘솔 그룹 로그로 변화 흐름을 추적하기 쉬워진다.

## 3-3) 과도한 패턴 적용의 역효과와 방지 가이드

- 과설계 징후: 인터페이스가 실제 사용처보다 과하게 일반화, 추상 클래스/팩토리가 비어 있음, 파일 수만 증가.
- 방지책: MVP 단계에서는 인터페이스 시그니처를 2~3개로 제한하고, 구현은 한 가지 전략만 제공한다.
- 점진 전략: 패턴 적용 전 기준 성능/가독성 지표를 설정하고, 도입 후 지표 개선이 없으면 되돌린다.

## 4) 모듈 경계와 책임

- algorithms: lca 계산, 경로 재구성(prefix/suffix) 순수 함수 집합.
- state: 전역 Store, Action/Reducer, 구독/알림.
- services: checkpoint/shelves/storage 등 부작용 처리 레이어.
- components: TreeView/Breadcrumbs/ChatView/ControlPanel 등 UI 조각.
- views: App/Layout 등 화면 조합과 라우팅(필요 시) 관리.
- models: Node/Checkpoint 타입·스키마·가드.
- storage: in-memory, localStorage 드라이버.
- lib: 공통 유틸(dom, event, assert, logger).
- styles: 토큰/베이스/컴포넌트/유틸 클래스.
- mocks: 샘플 트리 데이터(A~I) 및 픽스처.

## 5) 폴더 구조 계획(코드 파일은 추후 생성)

프로젝트 루트 기준 제안 트리이다. 문서는 현재 파일만 생성한다.

```
myDream/
  docs/
    architecture/
      frontend-architecture-plan.md     # 본 문서(아키텍처/폴더 계획)
  web/                                  # (추가 예정) 정적 웹 루트
    public/                             # (추가 예정) index.html, 아이콘 등
    src/                                # (추가 예정) 앱 소스
      algorithms/                       # lca.js, path.js 등 순수 알고리즘
      components/                       # TreeView, Breadcrumbs, ChatView ...
      views/                            # App, Layout 등 화면 조립
      state/                            # store.js, actions.js, reducers.js
      services/                         # checkpointService.js, storageService.js
      models/                           # node.model.js, checkpoint.model.js
      storage/                          # memoryDriver.js, localStorageDriver.js
      lib/                              # dom.js, eventBus.js, logger.js, assert.js
      styles/                           # tokens.css, base.css, components.css
      mocks/                            # sampleTree.json, sampleMessages.json
      app.js                            # (추가 예정) 엔트리(번들 없이도 로드)
    tests/                              # (추가 예정) 간단 유닛/스냅샷 테스트
```

잠만,, 중간점검: 초기에 실제 생성되는 항목은 docs/architecture 하위의 문서만이다. web/ 이하 폴더와 파일은 계획 단계에 머문다.

## 6) 상태/이벤트/렌더 파이프라인(요약)

- 입력: 사용자가 TreeView에서 노드를 클릭한다.
- 처리: Action(dispatch) → LCA/경로 재구성(algorithms) → 서비스 후처리(보존 표시/체크포인트 선택) → Store 상태 갱신.
- 출력: 구독된 렌더러가 Breadcrumbs/ChatView/TreeView를 부분 갱신.
- 성능: 변경된 suffix 구간만 하이라이트, 최소 재렌더 정책.

## 7) 네이밍·규칙

- 파일/모듈: 케밥케이스, 클래스/컴포넌트는 파스칼케이스(TreeView.js).
- 함수: 동사-목적어, 순수 함수는 명사형 지양(getPathToRoot, computeLca).
- 상태 키: activePathIds, activeLeafId, checkpoints, shelves, uiFlags.
- 주석: JSDoc 간단 계약(입력/출력/부작용/오류).

## 8) 단계적 구현 순서(코드 생성 시점 가이드)

1단계(기초): algorithms(lca/path) → state(store) → components(Breadcrumbs/ChatView) → TreeView(클릭) → 전환 렌더.

2단계(스냅샷): services(checkpoint/storage) → Checkpoint UI → 복원/왕복 검증.

3단계(가시성/접근성): 하이라이트·애니메이션·키보드 네비게이션·ARIA 라벨.

4단계(옵션): shelves 표시, localStorage 지속화, 간단 테스트.

## 9) 리스크·완화

- 복잡도 증가 리스크: 패턴 남용을 피하고 Flux-lite만 유지. Redux 미도입.
- 성능 리스크: 긴 스레드에 가상 스크롤 도입 여지 확보.
- 유지보수 리스크: 순수 함수·테스트 포인트 중심으로 경계 설정.

## 10) 다음 액션

- 현재 단계: 문서 확정 및 동의.
- 다음 단계: “실행” 지시 수신 후 web/ 이하 골격과 최소 목업(HTML/CSS/JS) 생성.
