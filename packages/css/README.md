# @devjaeyoon-design-system/css

토큰 기반 CSS 변수와 컴포넌트 스타일을 제공한다. 애플리케이션 엔트리에서 한 번 명시적으로
불러온다.

```ts
import "@devjaeyoon-design-system/css";
```

속성이 없으면 기본적으로 시스템 색상 설정을 따른다. `data-theme="light"` 또는
`data-theme="dark"`로 테마를 고정할 수 있다.

사용자에게 테마 선택 기능을 제공한다면 `applyThemePreference`로 선택값을 적용한다. `"system"`은
`data-theme` 속성을 제거해 다시 시스템 설정을 따르게 한다.

```ts
import {
  applyThemePreference,
  type ThemePreference,
} from "@devjaeyoon-design-system/css";

const preference: ThemePreference = "system";

applyThemePreference(document.documentElement, preference);
```
