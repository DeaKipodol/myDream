// Ambient declarations to aid editor when node_modules types are not loaded
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export type ReactNode = any;
  export const useEffect: any;
  export const useState: any;
  export const useMemo: any;
  const React: any;
  export default React;
}

declare module "next" {
  export type Metadata = any;
}

declare module "zustand" {
  export function create<T>(initializer: any): any;
}


