# devjaeyoon-design-system - 기술 상세

## 런타임과 workspace

- Node.js: `.node-version`과 root `engines`의 `24.18.0`
- pnpm: root `packageManager`와 `engines`의 `11.18.0`
- workspace: `packages/*`, `apps/*`
- 공통 의존성: `pnpm-workspace.yaml`의 strict catalog
- install: `pnpm install --frozen-lockfile`
- task runner/cache: Turborepo, local `.turbo/cache`만 사용

pnpm은 workspace와 의존성을, Turbo는 작업 순서와 cache를 담당한다. `turbo prune`, remote
cache, package별 Turbo 설정은 사용하지 않는다.

## 작업 그래프

```text
@devjaeyoon-design-system/design-token
    ↓
@devjaeyoon-design-system/css
    ↓
@devjaeyoon-design-system/react
    ↓
Starlight + Storybook (@devjaeyoon-design-system/docs)
    ↓
apps/docs/pages-dist
```

- `build`: 내부 패키지 `^build` 뒤에 실행하고 `dist/**`를 cache한다.
- `typecheck`, `test`: 내부 패키지 build 뒤에 실행한다.
- `build:storybook`: 공개 패키지 build 뒤에 실행하고 `storybook-static/**`를 cache한다.
- `build:pages`: 동일 workspace의 Starlight/Storybook build 뒤에 artifact를 조립한다.
- `pack:check`: 해당 패키지 build 뒤 publint, attw, pack dry-run을 실행한다. React 패키지는
  React/CSS tarball을 독립 임시 앱에 설치해 공개 타입, production build, SSR, Chromium
  상호작용과 계산 스타일도 검사한다.
- `dev`, `storybook`: persistent이며 cache하지 않는다.
- `test:stories`: Vitest browser mode와 Playwright Chromium을 사용한다.

## 공개 패키지

세 패키지는 npm에 공개하며 ESM만 Vite library mode로 build하고 `tsc`가 선언 파일을 생성한다.
CJS와 legacy bundle은 만들지 않는다. 각 manifest는 공개 access와 공식 npm registry를
`publishConfig`에 고정한다.

- `design-token`: 플랫폼 독립 토큰과 light/dark semantic map
- `css`: design-token build 결과를 읽어 값이 내장된 CSS와 side-effect ESM entry 생성
- `react`: React 19와 CSS를 peer로 두며 CSS를 자동 import하지 않는 컴포넌트

모든 공개 manifest는 `type`, `exports`, `types`, `files`, `license`, `repository`, `homepage`,
`bugs`, `keywords`, `sideEffects`를 명시한다. root 및 패키지마다 MIT LICENSE를 포함한다.

## TypeScript와 Biome

공통 TypeScript 설정은 `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`, `isolatedModules`를 활성화한다. `any`와 `as unknown`은 승인 없이 사용하지
않고 type import에는 `type` 키워드를 쓴다.

Biome가 format, lint, import 정리를 담당한다. ESLint와 Prettier는 사용하지 않는다.

## 문서와 Storybook

Starlight는 한국어 개념·설치·foundation·원칙·접근성·사용 가이드를 담당한다. 원칙 문서는 공통
기준과 이유를, 컴포넌트 문서는 선택 기준·기본값·상태별 동작을 포함한 API 계약과 소비자의
책임을 설명한다. 사용 계약 설명과 최소 사용 예제는 Starlight에 둔다.

Storybook은 상태·variant의 시각적 조합, controls, 상태 전환·키보드 조작 예제와 자동 검증을
담당한다. 전체 상태 갤러리와 상호작용 예제는 Starlight에 중복 구현하지 않고 링크한다.
light/dark와 axe 검사도 Storybook에서 수행하며 `parameters.a11y.test` 기본값은 `error`다.

Pages base path는 `/devjaeyoon-design-system/`, Storybook production base는
`/devjaeyoon-design-system/storybook/`이다. `build:pages`가 두 정적 산출물을 하나의
`pages-dist`로 조립하고, 모든 절대 asset·navigation URL이 저장소 base path 아래에 있는지
검증한다.

## CI와 release

전체 `pnpm check`는 PR과 수동 실행에서만 단일 Ubuntu job으로 실행한다. pnpm store,
Playwright Chromium, Turbo cache를 재사용하고 동일 PR의 이전 실행을 취소한다. 모든 외부
GitHub Action은 commit SHA로 고정한다.

`PUBLIC_RELEASE_ENABLED`가 정확히 `true`이고 repository가 public일 때만 다음이 실행된다.

- Changesets version PR
- 패키지 검증 성공과 npm environment 승인 뒤 OIDC publish 및 GitHub Release 생성
- GitHub Pages deploy

구체적인 최초 공개 순서와 외부 GitHub/npm 설정은 root `README.md`를 따른다.
