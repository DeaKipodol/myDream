/**
 * Core 모듈 C3: Events
 *
 * 모든 이벤트 이름 상수 정의
 *
 * 사용법:
 *   import { EVENTS } from './core/events.js';
 *   EventBus.emit(EVENTS.TAB_SWITCHED, { tabId, prevTabId, workspaceId });
 *
 * @module core/events
 */

/**
 * 이벤트 상수 정의
 * Object.freeze로 불변성 보장
 */
export const EVENTS = Object.freeze({
  // ===== Tab =====
  TAB_CREATED: 'tab:created',
  TAB_SWITCHED: 'tab:switched',
  TAB_CLOSED: 'tab:closed',
  TAB_NEW_REQUESTED: 'tab:new-requested',
  TAB_STATE_CHANGED: 'tab:state-changed',

  // ===== SidePanel =====
  SIDEPANEL_OPEN: 'sidepanel:open',
  SIDEPANEL_CLOSE: 'sidepanel:close',
  SIDEPANEL_WORKSPACE_SELECT: 'sidepanel:workspace-select',

  // ===== EdgeDock =====
  EDGEDOCK_SHOW: 'edgedock:show',
  EDGEDOCK_HIDE: 'edgedock:hide',
  EDGEDOCK_PANEL_OPEN: 'edgedock:panel-open',
  EDGEDOCK_PANEL_CLOSE: 'edgedock:panel-close',
  EDGEDOCK_ITEM_ADDED: 'edgedock:item-added',
  EDGEDOCK_ITEM_REMOVED: 'edgedock:item-removed',

  // ===== ChatHeader =====
  CHATHEADER_NAVIGATE: 'chatheader:navigate',
  CHATHEADER_BRANCH: 'chatheader:branch',
  CHATHEADER_MENU: 'chatheader:menu',

  // ===== Node =====
  NODE_CHANGED: 'node:changed',
  NODE_CREATED: 'node:created',
  NODE_DELETED: 'node:deleted',
  NODE_SWITCHED: 'node:switched',

  // ===== Workspace =====
  WORKSPACE_CREATED: 'workspace:created',
  WORKSPACE_SWITCHED: 'workspace:switched',
  WORKSPACE_UPDATED: 'workspace:updated',
  WORKSPACE_DELETED: 'workspace:deleted',
  WORKSPACE_RESTORED: 'workspace:restored',
  WORKSPACE_PERMANENTLY_DELETED: 'workspace:permanently-deleted',
  TRASH_EMPTIED: 'trash:emptied',

  // ===== Message =====
  MESSAGE_ADDED: 'message:added',

  // ===== App =====
  APP_INITIALIZED: 'app:initialized',
  APP_ERROR: 'app:error',
  APP_BEFORE_UNLOAD: 'app:before-unload',

  // ===== 향후 추가 예정 (Part B) - 주석만 =====
  // CHECKPOINT_SAVED: 'checkpoint:saved',
  // CHECKPOINT_LOADED: 'checkpoint:loaded',
  // CHECKPOINT_LIST_UPDATED: 'checkpoint:list-updated',
  // AI_STREAM_START: 'ai:stream:start',
  // AI_STREAM_CHUNK: 'ai:stream:chunk',
  // AI_STREAM_END: 'ai:stream:end',
  // AI_STREAM_ERROR: 'ai:stream:error',
  // TREE_PATH_SWITCHED: 'tree:path:switched',
  // TREE_UPDATED: 'tree:updated',
});

/**
 * 이벤트 payload 타입 정의 (문서용, 런타임 검증 없음)
 * TypeScript 스타일로 타입 표기
 */
export const EVENT_PAYLOADS = {
  // Tab
  [EVENTS.TAB_CREATED]: '{ tabId: string, workspaceId: string, workspaceName: string }',
  [EVENTS.TAB_SWITCHED]: '{ tabId: string, prevTabId: string | null, workspaceId: string }',
  [EVENTS.TAB_CLOSED]: '{ tabId: string, workspaceId: string }',
  [EVENTS.TAB_NEW_REQUESTED]: '{}',
  [EVENTS.TAB_STATE_CHANGED]: '{ tabId: string, status: string, prevStatus: string }',

  // SidePanel
  [EVENTS.SIDEPANEL_OPEN]: '{}',
  [EVENTS.SIDEPANEL_CLOSE]: '{}',
  [EVENTS.SIDEPANEL_WORKSPACE_SELECT]: '{ workspaceId: string, workspaceName: string }',

  // EdgeDock
  [EVENTS.EDGEDOCK_SHOW]: '{}',
  [EVENTS.EDGEDOCK_HIDE]: '{}',
  [EVENTS.EDGEDOCK_PANEL_OPEN]: '{ panelId: string }',
  [EVENTS.EDGEDOCK_PANEL_CLOSE]: '{ panelId: string }',
  [EVENTS.EDGEDOCK_ITEM_ADDED]: '{ side: "left" | "right", item: DockItem }',
  [EVENTS.EDGEDOCK_ITEM_REMOVED]: '{ itemId: string }',

  // ChatHeader
  [EVENTS.CHATHEADER_NAVIGATE]: '{ nodeId: string }',
  [EVENTS.CHATHEADER_BRANCH]: '{ nodeId: string }',
  [EVENTS.CHATHEADER_MENU]: '{ nodeId: string, action: string }',

  // Node
  [EVENTS.NODE_CHANGED]: '{ nodeId: string, nodeName: string, path: string[] }',
  [EVENTS.NODE_CREATED]: '{ nodeId: string, parentId: string }',
  [EVENTS.NODE_DELETED]: '{ nodeId: string }',
  [EVENTS.NODE_SWITCHED]: '{ workspaceId: string, nodeId: string }',

  // Workspace
  [EVENTS.WORKSPACE_CREATED]: '{ workspace: Workspace }',
  [EVENTS.WORKSPACE_SWITCHED]: '{ workspaceId: string, workspace: Workspace }',
  [EVENTS.WORKSPACE_UPDATED]: '{ workspace: Workspace }',
  [EVENTS.WORKSPACE_DELETED]: '{ workspaceId: string }',

  // Message
  [EVENTS.MESSAGE_ADDED]: '{ workspaceId: string, message: Message }',

  // App
  [EVENTS.APP_INITIALIZED]: '{}',
  [EVENTS.APP_ERROR]: '{ error: Error, context: string }',
  [EVENTS.APP_BEFORE_UNLOAD]: '{}',
};

/**
 * 이벤트 존재 확인 (디버깅용)
 *
 * @param {string} eventName - 확인할 이벤트 이름
 * @returns {boolean} 유효한 이벤트이면 true
 *
 * @example
 * isValidEvent('tab:switched')  // true
 * isValidEvent('tab:swtched')   // false (오타)
 */
export function isValidEvent(eventName) {
  return Object.values(EVENTS).includes(eventName);
}

/**
 * 모든 이벤트 목록 반환 (디버깅용)
 *
 * @returns {Array<{constant: string, event: string, payload: string}>}
 *
 * @example
 * console.table(getAllEvents());
 * // constant: 'TAB_CREATED'
 * // event: 'tab:created'
 * // payload: '{ tabId: string, ... }'
 */
export function getAllEvents() {
  return Object.entries(EVENTS).map(([key, value]) => ({
    constant: key,
    event: value,
    payload: EVENT_PAYLOADS[value] || 'unknown',
  }));
}
