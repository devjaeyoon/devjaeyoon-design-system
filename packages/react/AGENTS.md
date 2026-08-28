# react

## 디렉토리 개요

React 19용 접근 가능한 UI 컴포넌트를 ESM으로 제공한다. 스타일은 `@devjaeyoon-design-system/css`의 공개
선택자를 사용하되 패키지 코드에서 CSS를 자동 import하지 않는다.

## 컨벤션

- 컴포넌트 props는 native element props를 가능한 한 보존한다.
- 접근성 이름, 키보드 동작, focus-visible 상태를 공개 API의 일부로 취급한다.
- React와 CSS는 번들에 포함하지 않고 peer dependency로 유지한다.
