# docs

## 디렉토리 개요

Starlight 기반 한국어 가이드와 `@storybook/react-vite` 기반 컴포넌트 탐색 환경을 함께
운영한다. 두 빌드는 Pages artifact에서 각각 루트와 `/storybook/` 경로로 조립된다.

## 파일 작성 컨벤션

- 문서는 역할 중심 도메인으로 분리하고, 새로운 문서 영역 추가 시 sidebar 매핑을 갱신한다.
- MDX 파일명은 `kebab-case`를 사용하고 문서는 한국어를 기본으로 작성한다.
- 컴포넌트 상태·controls·interaction은 Storybook에 두고 Starlight에 중복 작성하지 않는다.
- 모든 story는 기본 렌더링과 axe 검사를 통과해야 하며 상호작용은 `play`로 검증한다.
