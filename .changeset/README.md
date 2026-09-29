# Changesets

공개 산출물이 바뀌는 PR은 `pnpm changeset`으로 changeset을 추가한다.

- `design-token`의 토큰 원천·생성기 변경은 `@devjaeyoon-design-system/design-token`과
  `@devjaeyoon-design-system/css`를 함께 선택한다.
- `css` 또는 `react` 공개 API와 산출물 변경은 해당 패키지를 선택한다.
- 공개 패키지의 `README.md`는 npm 배포물에 포함되므로 해당 패키지를 선택한다. `design-token`
  README만 변경한 경우 `css`를 선택할 필요는 없다.
- `css` 버전이 React의 peer 범위를 벗어나면 peer 범위를 갱신하고 `react`를 최소 patch로
  함께 선택한다.
- 저장소·문서 사이트의 문서, 테스트, CI, 내부 도구만 바뀌면 changeset은 필요하지 않다.
- 세 패키지는 독립적으로 버전 관리하며 fixed/linked 그룹을 사용하지 않는다.
- 비공개 `@devjaeyoon-design-system/docs`는 Changesets 대상에서 제외한다.
