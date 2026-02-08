// ========================================
// 샘플 데이터 - AI 생각 작업공간
// ========================================

const WORKSPACES = {
  marketing: {
    id: 'marketing',
    title: '마케팅 전략 기획',
    icon: '🎯',
    currentNode: 'newsletter',
    previousNode: 'channel',  // 바로 직전 노드
    tree: {
      id: 'root',
      text: '마케팅 전략을 짜고 싶어',
      conversation: {
        question: '우리 제품의 마케팅 전략을 어떻게 짜야 할까요?',
        answer: '효과적인 마케팅 전략을 위해서는 먼저 타겟 고객 분석, 채널 선정, 예산 계획이 필요합니다.'
      },
      children: [
        {
          id: 'target',
          text: '타겟 고객 분석',
          conversation: {
            question: '타겟 고객을 어떻게 분석하면 좋을까요?',
            answer: '연령대별로 세분화하여 분석하는 것을 추천합니다. 20대와 30대는 구매 패턴이 다릅니다.'
          },
          children: [
            {
              id: 'target-20s',
              text: '20대 초반 분석',
              badge: 'complete',
              conversation: {
                question: '20대 초반 타겟은 어떤 특징이 있나요?',
                answer: '소셜 미디어 활용도가 높고, 트렌드에 민감하며, 비주얼 콘텐츠를 선호합니다.'
              }
            },
            {
              id: 'target-30s',
              text: '30대 직장인 분석',
              badge: 'complete',
              conversation: {
                question: '30대 직장인 타겟은 어떤 특징이 있나요?',
                answer: '구매력이 높고, 전문성 있는 콘텐츠를 선호하며, 시간 효율성을 중요시합니다.'
              }
            }
          ]
        },
        {
          id: 'channel',
          text: '채널 전략',
          badge: '진행중',
          active: true,
          conversation: {
            question: '어떤 채널이 우리 제품에 가장 효과적일까?',
            answer: '타겟 분석 결과를 바탕으로 인스타그램, 링크드인, 뉴스레터 3가지 채널을 추천드립니다.'
          },
          children: [
            {
              id: 'instagram',
              text: '인스타그램 전략',
              conversation: {
                question: '인스타그램은 어떻게 활용하면 좋을까요?',
                answer: '숏폼 콘텐츠와 릴스를 활용하여 20대 타겟에게 도달할 수 있습니다.'
              }
            },
            {
              id: 'linkedin',
              text: '링크드인 전략',
              conversation: {
                question: '링크드인은 B2B에 효과적인가요?',
                answer: '네, 30대 직장인과 B2B 의사결정자에게 도달하기에 최적의 채널입니다.'
              }
            },
            {
              id: 'newsletter',
              text: '뉴스레터 전략',
              active: true,
              conversation: {
                question: '뉴스레터로 어떻게 리드를 육성하나요?',
                answer: '주간 인사이트와 가치 있는 콘텐츠로 구독자와의 관계를 지속적으로 강화할 수 있습니다.'
              }
            }
          ]
        },
        {
          id: 'budget',
          text: '예산 계획',
          conversation: {
            question: '마케팅 예산은 어떻게 배분해야 하나요?',
            answer: '채널별 ROI를 고려하여 인스타그램 40%, 링크드인 30%, 뉴스레터 30%로 배분하는 것을 추천합니다.'
          }
        }
      ]
    },
    messages: [
      {
        type: 'user',
        content: '어떤 채널이 우리 제품에 가장 효과적일까?'
      },
      {
        type: 'ai',
        content: `<p>타겟 분석 결과를 바탕으로 3가지 채널을 추천드립니다:</p>
        <div class="ai-list">
          <div class="ai-list-item">
            <span class="list-icon">📱</span>
            <span><strong>인스타그램</strong> - 20대 비주얼 콘텐츠</span>
          </div>
          <div class="ai-list-item">
            <span class="list-icon">💼</span>
            <span><strong>링크드인</strong> - B2B 타겟</span>
          </div>
          <div class="ai-list-item">
            <span class="list-icon">📧</span>
            <span><strong>뉴스레터</strong> - 리드 너처링</span>
          </div>
        </div>
        <p>각 채널별로 가지를 만들어 더 깊이 탐색해보세요!</p>`,
        branches: [
          { id: 'instagram', text: '🌿 인스타그램 전략 탐색' },
          { id: 'linkedin', text: '🌿 링크드인 전략 탐색' },
          { id: 'newsletter', text: '🌿 뉴스레터 전략 탐색', active: true }
        ]
      }
    ],
    perspectives: [
      {
        id: 'marketer',
        emoji: '🎯',
        name: '마케터',
        text: '"ROI 중심으로 인스타그램을 추천합니다. 타겟 도달률이 가장 높습니다."',
        color: '#ef4444',
        active: true
      },
      {
        id: 'analyst',
        emoji: '📊',
        name: '데이터 분석가',
        text: '"현재 트렌드상 숏폼 콘텐츠 성과가 3배 높습니다."',
        color: '#3b82f6'
      },
      {
        id: 'devil',
        emoji: '😈',
        name: '악마의 변호인',
        text: '"인스타그램 광고 비용이 급증 중입니다. 대안을 고려하세요."',
        color: '#10b981'
      }
    ]
  },
  
  report: {
    id: 'report',
    title: '시장 보고서 분석',
    icon: '📊',
    currentNode: 'graph',
    previousNode: 'root',
    tree: {
      id: 'root',
      text: '시장 보고서.pdf 분석',
      conversation: {
        question: '이 시장 보고서를 분석해줘',
        answer: '보고서의 핵심 내용을 요약하거나, 특정 그래프를 해석하거나, 경쟁사 분석을 진행할 수 있습니다.'
      },
      children: [
        {
          id: 'summary',
          text: '전체 요약 요청',
          conversation: {
            question: '전체 보고서를 요약해줘',
            answer: '2024년 시장은 23% 성장했으며, AI 기반 솔루션 수요가 주요 성장 동력입니다.'
          }
        },
        {
          id: 'graph',
          text: '3페이지 그래프 해석',
          badge: '📎',
          active: true,
          conversation: {
            question: '3페이지에 있는 성장률 그래프 분석해줘',
            answer: '2024년 시장 성장률 23% 기록. 3분기에 최고치 28% 달성했습니다.'
          }
        },
        {
          id: 'competitor',
          text: '경쟁사 비교 분석',
          conversation: {
            question: '주요 경쟁사와 우리의 차이점은?',
            answer: '경쟁사 대비 AI 기술력은 우위에 있으나, 시장 점유율은 개선이 필요합니다.'
          }
        }
      ]
    },
    messages: [
      {
        type: 'user',
        content: '3페이지에 있는 성장률 그래프 분석해줘'
      },
      {
        type: 'ai',
        content: `<p>3페이지 그래프를 분석한 결과입니다:</p>
        <div class="ai-list">
          <div class="ai-list-item">
            <span class="list-icon">📈</span>
            <span>2024년 시장 성장률 <strong>23%</strong> 기록</span>
          </div>
          <div class="ai-list-item">
            <span class="list-icon">🤖</span>
            <span><strong>AI 기반 솔루션</strong> 수요가 주요 성장 동력</span>
          </div>
          <div class="ai-list-item">
            <span class="list-icon">📊</span>
            <span>3분기 최고치 28% 달성</span>
          </div>
        </div>
        <p>📎 <em>우측 패널에서 원본 위치 확인 가능</em></p>`
      }
    ],
    perspectives: [],
    sources: [
      {
        id: 'source1',
        icon: '📄',
        name: '시장 보고서.pdf',
        page: 'p. 3',
        content: `2023년 대비 전체 시장 규모는 약 15% 성장하였으며, 특히 B2B 영역에서 두드러진 성장세를 보였다. 다음 그래프는 2024년 분기별 성장률을 나타낸다. <span class="source-highlight">2024년 시장 성장률은 전년 대비 23%를 기록했으며, 이는 AI 기반 솔루션 수요 급증에 기인한다.</span> 세부적으로 살펴보면, 1분기에는 18%의 성장률을 보였으나...`
      }
    ]
  },
  
  react: {
    id: 'react',
    title: 'React 학습',
    icon: '📚',
    currentNode: 'q3',
    previousNode: 'q2',
    tree: {
      id: 'root',
      text: 'React 기초 공부',
      conversation: {
        question: 'React를 어떻게 공부하면 좋을까요?',
        answer: '컴포넌트의 개념부터 시작해서 주요 훅들을 하나씩 익히는 것을 추천합니다.'
      },
      children: [
        {
          id: 'component',
          text: '컴포넌트 이해',
          conversation: {
            question: '컴포넌트가 정확히 뭔가요?',
            answer: '컴포넌트는 UI를 구성하는 독립적이고 재사용 가능한 코드 조각입니다.'
          }
        },
        {
          id: 'useEffect',
          text: 'useEffect 훅',
          active: true,
          conversation: {
            question: 'useEffect는 언제 사용하나요?',
            answer: '컴포넌트의 사이드 이펙트(API 호출, 구독 등)를 처리할 때 사용합니다.'
          },
          children: [
            {
              id: 'q1',
              text: '의존성 배열이 뭐야?',
              icon: 'Q',
              conversation: {
                question: '의존성 배열이 뭐야?',
                answer: 'useEffect가 언제 재실행될지 결정하는 값들의 배열입니다.'
              }
            },
            {
              id: 'q2',
              text: 'cleanup 함수는 언제 실행?',
              icon: 'Q',
              conversation: {
                question: 'cleanup 함수는 언제 실행되나요?',
                answer: '컴포넌트가 언마운트되거나 effect가 재실행되기 전에 실행됩니다.'
              }
            },
            {
              id: 'q3',
              text: '무한 루프 해결법?',
              icon: 'Q',
              active: true,
              conversation: {
                question: 'useEffect에서 무한 루프가 발생하는데 어떻게 해결해?',
                answer: '의존성 배열을 올바르게 설정하거나 useCallback/useMemo로 값을 메모이제이션하세요.'
              }
            }
          ]
        },
        {
          id: 'useState',
          text: 'useState 훅',
          conversation: {
            question: 'useState는 어떻게 사용하나요?',
            answer: 'const [state, setState] = useState(initialValue) 형태로 상태를 관리합니다.'
          }
        }
      ]
    },
    messages: [
      {
        type: 'user',
        content: 'useEffect에서 무한 루프가 발생하는데 어떻게 해결해?'
      },
      {
        type: 'ai',
        content: `<p>useEffect 무한 루프의 주요 원인과 해결법입니다:</p>
        <div class="ai-list">
          <div class="ai-list-item">
            <span class="list-icon">🔄</span>
            <span><strong>원인:</strong> 의존성 배열에 매 렌더링마다 변하는 값 포함</span>
          </div>
          <div class="ai-list-item">
            <span class="list-icon">✅</span>
            <span><strong>해결 1:</strong> 빈 배열 []로 마운트 시에만 실행</span>
          </div>
          <div class="ai-list-item">
            <span class="list-icon">✅</span>
            <span><strong>해결 2:</strong> useCallback으로 함수 메모이제이션</span>
          </div>
          <div class="ai-list-item">
            <span class="list-icon">✅</span>
            <span><strong>해결 3:</strong> useMemo로 객체/배열 메모이제이션</span>
          </div>
        </div>`
      }
    ],
    perspectives: [
      {
        id: 'beginner',
        emoji: '🌱',
        name: '입문자',
        text: '"의존성 배열을 빈 배열로 두면 컴포넌트 마운트 시 한 번만 실행됩니다."',
        color: '#22c55e',
        active: true
      },
      {
        id: 'expert',
        emoji: '🧙',
        name: '전문가',
        text: '"useCallback과 useMemo를 적절히 활용하면 성능 최적화도 함께 달성할 수 있습니다."',
        color: '#8b5cf6'
      }
    ]
  }
};

// 현재 활성 작업공간
let currentWorkspace = 'marketing';

// 작업공간 가져오기
function getWorkspace(id) {
  return WORKSPACES[id || currentWorkspace];
}

// 작업공간 변경
function setWorkspace(id) {
  if (WORKSPACES[id]) {
    currentWorkspace = id;
    return true;
  }
  return false;
}

// 모든 작업공간 목록 가져오기 (새 모듈 시스템용)
function getWorkspaces() {
  return Object.values(WORKSPACES).map(ws => ({
    id: ws.id,
    name: ws.title,
    icon: ws.icon
  }));
}

// ID로 작업공간 가져오기 (새 모듈 시스템용)
function getWorkspaceById(id) {
  const ws = WORKSPACES[id];
  if (!ws) return null;
  return {
    id: ws.id,
    name: ws.title,
    icon: ws.icon,
    tree: ws.tree,
    messages: ws.messages,
    perspectives: ws.perspectives
  };
}
