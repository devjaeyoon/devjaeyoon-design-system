# react

## 디렉토리 개요

React 19용 접근 가능한 UI 컴포넌트를 ESM으로 제공한다. 스타일은 `@devjaeyoon-design-system/css`의 공개
선택자를 사용하되 패키지 코드에서 CSS를 자동 import하지 않는다.

## 컨벤션

- 컴포넌트 props는 native element props를 가능한 한 보존한다.
- 접근성 이름, 키보드 동작, focus-visible 상태를 공개 API의 일부로 취급한다.
- React와 CSS는 번들에 포함하지 않고 peer dependency로 유지한다.

## Dialog 내부 구조

- `Dialog.tsx`는 공개 props, 조합형 컴포넌트, 마크업과 바깥 영역 포인터 판정을 담당한다.
  native `open`과 `closedby`는 내부에서 관리하고, 닫기 정책은 `DialogRoot`의 옵션을 따른다.
- `useDialogLifecycle.ts`는 native 닫기와 React 상태 동기화, StrictMode와 Suspense의 세션 전이를
  관리한다. 초기 포커스와 복귀 예약은 `useDialogFocus.ts`에 둔다.
- `dialog-close.ts`에서 cancel의 허용 여부와 native 동작을 판정한다. 닫기 상태 전이와 자원·포커스
  불변조건은 [TECH.md](./TECH.md)를 따른다.
- `dialog-session.ts`는 document별 모달 스택과 스크롤 잠금, viewport listener를 관리하고,
  `dialog-focus.ts`는 포커스 후보의 유효성을 검사한다.
- `useDialogBodyScroll.ts`에서 스크롤 표시와 자동 tabIndex를 갱신한다. observer와 스크롤 이벤트는
  같은 경계 계산을 사용한다. 본문 내부의 크기 변화를 관찰하되 중첩 Dialog의 하위 트리는 제외한다.
- 내부 모듈은 패키지 공개 entry에서 export하지 않는다. native 닫기·재열기 회귀는 tarball 소비자
  검증에, 상태와 접근성 검증은 Storybook에 둔다.
- native 이벤트와 예약 작업은 commit된 옵션만 참조한다. 부모 세션 열기는 자식 layout effect에서
  실행될 수 있으므로 현재 commit의 callback을 사용해 부모부터 여는 순서를 유지한다.
