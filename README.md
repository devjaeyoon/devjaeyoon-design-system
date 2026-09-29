# devjaeyoon-design-system

프론트엔드 개발자 이재윤의 디자인 시스템이다. 디자인 토큰, CSS, React 컴포넌트와 한국어
문서·Storybook을 하나의 pnpm/Turborepo 모노레포에서 관리한다.

## 패키지

| 패키지 | 역할 | 현재 상태 |
| --- | --- | --- |
| `@devjaeyoon-design-system/design-token` | primitive·semantic 토큰 ESM | npm 공개 |
| `@devjaeyoon-design-system/css` | 테마 변수와 컴포넌트 CSS | npm 공개 |
| `@devjaeyoon-design-system/react` | React 19 컴포넌트 ESM | npm 공개 |

React 패키지는 CSS를 자동으로 불러오지 않는다.

```tsx
import "@devjaeyoon-design-system/css";
import { Button } from "@devjaeyoon-design-system/react";

export function Example() {
  return <Button>저장</Button>;
}
```

테마는 `<html>`의 `data-theme="light"` 또는 `data-theme="dark"`로 고정한다. 속성이 없으면
`prefers-color-scheme`을 따르며 명시한 속성이 시스템 설정보다 우선한다.

## 개발

Node.js `24.18.0`, pnpm `11.18.0`이 필요하다.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @devjaeyoon-design-system/docs exec playwright install chromium
pnpm check
```

Linux에서 Chromium의 시스템 라이브러리가 부족하면
`pnpm --filter @devjaeyoon-design-system/docs exec playwright install --with-deps chromium`으로
설치한다. CI는 이 옵션을 사용한다.

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
| `pnpm check` | 아래 순서로 품질 검사 실행 |

`pnpm check`는 `format:check` → `lint` → `typecheck` → `test` → `test:stories` → `build` →
`pack:check`를 순서대로 실행한다. Pages artifact 조립과 경로 검증은 `pnpm build:pages`로
별도 실행한다. CI의 changeset coverage 검사는 버전 PR을 제외한 PR에서 별도 단계로 실행하며,
base 브랜치와 PR의 커밋 차이를 기준으로 필요한 changeset을 확인한다.

Turbo remote cache는 사용하지 않는다. 로컬 캐시는 `.turbo/cache`에 저장하고 CI에서는 GitHub
Actions cache로만 재사용한다.

개발은 기능 브랜치에서 시작해 PR의 CI와 제목 검사를 통과한 뒤 squash merge한다. 커밋과 PR
제목은 영어 Conventional Commits 형식(`type(scope): subject`)으로 작성한다.

## Changesets

공개 산출물이 바뀌는 PR은 `pnpm changeset`을 실행한다. 공개 패키지의 README는 npm 배포물에
포함되므로 해당 패키지의 changeset이 필요하다. 저장소·문서 사이트의 문서, 테스트, CI만 바뀌면
필요하지 않다. 토큰 원천이나 생성기 변경은 `design-token`과 `css`를 함께 선택한다. 세 패키지는
fixed/linked 그룹 없이 독립 버전으로 관리한다.
CSS가 React의 peer 범위를 벗어나면 peer 범위를 갱신하고 React를 최소 patch로 함께 올린다.

GitHub repository variable `PUBLIC_RELEASE_ENABLED`가 정확히 `true`이고 저장소가 public일 때만
version PR, npm publish, Pages deploy job이 실행된다.

## 릴리스

공개 패키지 변경 PR에 changeset을 추가하고 `main`에 병합하면 `Version packages` workflow가
버전 PR을 만든다. 해당 PR의 CI를 확인하고 squash merge하면 `Release packages` workflow가
공개 패키지를 빌드·검증한다. 검증이 성공한 뒤 `npm` environment 배포를 승인하면 변경된
패키지를 OIDC provenance로 npm에 publish하고 GitHub Release를 생성한다. 장기 npm access
token이나 GitHub npm secret은 사용하지 않는다.

OIDC publish를 위해 세 npm 패키지의 trusted publisher를 owner `devjaeyoon`, repository
`devjaeyoon-design-system`, workflow `release.yml`, environment `npm`으로 등록해 유지한다.

Pages는 `main` push 시 별도 workflow가 Starlight와 Storybook을 빌드해 배포한다.

## GitHub 저장소 설정

공개 저장소의 운영 설정은 GitHub UI에서 확인하고 유지한다.

- `main` ruleset: PR 필수, 승인 0명, `CI / check`와 `PR title / validate` 필수
- squash merge만 허용하고 force push·branch deletion 차단
- merge 후 head branch 자동 삭제
- `npm` environment에 required reviewer를 등록하고 self-review 허용
- Pages source를 GitHub Actions로 설정
- Renovate GitHub App을 설치하고 weekly grouped PR 설정은 `renovate.json`에 맡김

custom domain, 유료 CI·호스팅, Chromatic, 원격 Turbo cache는 사용하지 않는다.

## 라이선스

[MIT](./LICENSE)
