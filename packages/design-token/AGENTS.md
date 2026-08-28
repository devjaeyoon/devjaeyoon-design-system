# design-token

## 디렉토리 개요

플랫폼에 독립적인 primitive와 semantic 디자인 토큰을 ESM으로 제공한다. CSS 변수 생성의
단일 소스이며 브라우저 API나 React에 의존하지 않는다.

## 컨벤션

- 토큰 이름은 의미 중심으로 작성하고 기존 공개 키를 임의로 변경하지 않는다.
- light/dark semantic 토큰은 항상 같은 키 집합을 유지한다.
- 토큰 변경이 CSS 산출물에 반영되면 `design-token`과 `css` changeset을 함께 작성한다.
