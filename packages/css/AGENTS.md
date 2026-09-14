# css

## 디렉토리 개요

`design-token` 산출물을 build-time에 읽어 CSS 변수와 컴포넌트 스타일을 생성한다. 소비자에게
디자인 토큰 런타임 의존성을 노출하지 않는다.

## 컨벤션

- 공개 CSS 선택자는 `djy-` 접두사를 사용한다.
- 테마 계약은 `data-theme="light"`, `data-theme="dark"`, 속성 없음(system)으로 유지한다.
- 생성 파일은 직접 수정하지 않고 토큰 또는 `src/styles.css`를 수정한다.
