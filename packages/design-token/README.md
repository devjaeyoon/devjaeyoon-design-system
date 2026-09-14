# @devjaeyoon-design-system/design-token

devjaeyoon 디자인 시스템의 DTCG 2025.10 기반 primitive 및 semantic 토큰 패키지다. 현재는
최초 공개 전이므로 private 패키지로 유지한다.

```ts
import {
  primitiveTokens,
  semanticTokens,
  textStyles,
  themes,
} from "@devjaeyoon-design-system/design-token";

const brand = themes.light["color-bg-brand-solid"];
const gutter = semanticTokens["space-layout-gutter"];
const body = textStyles["typography-body-md-regular"];
```

root entry는 reference가 해소된 CSS 값만 제공한다. 원본 DTCG tree와 reference가 필요하면
`@devjaeyoon-design-system/design-token/definitions`를 사용한다. 원본 JSON은
`@devjaeyoon-design-system/design-token/definitions/*.json` subpath로 제공한다.

```ts
import { lightThemeDefinition } from "@devjaeyoon-design-system/design-token/definitions";
import lightJson from "@devjaeyoon-design-system/design-token/definitions/light.json" with {
  type: "json",
};
```
