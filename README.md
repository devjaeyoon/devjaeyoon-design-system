# devjaeyoon-design-system

프론트엔드 개발자 이재윤의 디자인 시스템이다. 디자인 토큰, CSS, React 컴포넌트와 한국어
문서·Storybook을 하나의 pnpm/Turborepo 모노레포에서 관리한다.

## 패키지

| 패키지 | 역할 | 현재 상태 |
| --- | --- | --- |
| `@devjaeyoon-design-system/design-token` | primitive·semantic 토큰 ESM | `0.0.0`, private |
| `@devjaeyoon-design-system/css` | 테마 변수와 컴포넌트 CSS | `0.0.0`, private |
| `@devjaeyoon-design-system/react` | React 19 컴포넌트 ESM | `0.0.0`, private |

React 패키지는 CSS를 자동으로 불러오지 않는다.

```tsx
import "@devjaeyoon-design-system/css";
import { Button } from "@devjaeyoon-design-system/react";

export function Example() {
  return <Button>저장</Button>;
}
```

테마는 `data-theme="light"` 또는 `data-theme="dark"`로 고정한다. 속성이 없으면
`prefers-color-scheme`을 따르며 명시한 속성이 시스템 설정보다 우선한다.

## 개발

Node.js `24.18.0`, pnpm `11.18.0`이 필요하다.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

주요 명령:

| 명령 | 설명 |
| --- | --- |
| `pnpm dev:docs` | Starlight 개발 서버 |
| `pnpm dev:storybook` | Storybook 개발 서버 |
| `pnpm format` / `pnpm format:check` | Biome format·import 정리 적용/검사 |
| `pnpm lint` | Biome lint |
| `pnpm typecheck` | 모든 workspace 타입 검사 |
| `pnpm test` | 단위 테스트 |
| `pnpm test:stories` | Chromium story render·interaction·axe 검사 |
| `pnpm build` | 패키지, Starlight, Storybook 전체 build |
| `pnpm build:packages` | 세 공개 패키지만 build |
| `pnpm build:pages` | Pages용 Starlight + Storybook artifact 조립 |
| `pnpm pack:check` | publint, Are the Types Wrong, pack dry-run |
| `pnpm check` | 위 품질 검사를 정의된 순서로 모두 실행 |

Turbo remote cache는 사용하지 않는다. 로컬 캐시는 `.turbo/cache`에 저장하고 CI에서는 GitHub
Actions cache로만 재사용한다.

개발은 기능 브랜치에서 시작해 PR의 CI와 제목 검사를 통과한 뒤 squash merge한다. 커밋과 PR
제목은 영어 Conventional Commits 형식(`type(scope): subject`)으로 작성한다.

## Changesets

공개 산출물이 바뀌는 PR은 `pnpm changeset`을 실행한다. 문서·테스트·CI만 바뀌면 필요하지
않다. 토큰 변경이 생성 CSS를 바꾸면 `design-token`과 `css`를 함께 선택한다. 세 패키지는
fixed/linked 그룹 없이 독립 버전으로 관리한다.
CSS가 React의 peer 범위를 벗어나면 peer 범위를 갱신하고 React를 최소 patch로 함께 올린다.

저장소가 비공개인 동안 GitHub repository variable `PUBLIC_RELEASE_ENABLED`는 만들지 않거나
`false`로 둔다. 이 상태에서는 version PR, npm publish, Pages deploy job이 모두 건너뛰어진다.

## 최초 공개 체크리스트

1. npm `@devjaeyoon-design-system` scope 소유권과 2FA를 확인한다.
2. GitHub 저장소를 public으로 전환한다.
3. 세 패키지에서 `private`를 제거한다.
4. 세 패키지에 `publishConfig.access: "public"`을 추가한다.
5. 누적 changeset을 `pnpm version-packages`로 소비한 뒤 세 패키지 버전을 각각 `0.1.0`으로
   맞춘다.
6. 제한된 일회성 npm token으로 각 패키지를 최초 공개한다.
7. 각 npm 패키지에 이 저장소의 `release.yml`을 trusted publisher로 등록한다.
8. bootstrap token과 임시 GitHub secret을 제거한다.
9. GitHub repository variable `PUBLIC_RELEASE_ENABLED=true`를 설정한다.

이후 Changesets version PR을 squash merge하면 `release.yml`이 `npm` environment 승인을 기다린
뒤 OIDC provenance로 변경된 패키지만 publish하고 package tag와 GitHub Release를 만든다.

## GitHub 저장소 설정

공개 시 다음 설정은 GitHub UI에서 적용해야 한다.

- `main` ruleset: PR 필수, 승인 0명, `CI / check`와 `PR title / validate` 필수
- squash merge만 허용하고 force push·branch deletion 차단
- merge 후 head branch 자동 삭제
- `npm` environment에 required reviewer 등록
- Pages source를 GitHub Actions로 설정
- Renovate GitHub App을 설치하고 weekly grouped PR 설정은 `renovate.json`에 맡김

custom domain, 유료 CI·호스팅, Chromatic, 원격 Turbo cache는 사용하지 않는다.

## 라이선스

[MIT](./LICENSE)
