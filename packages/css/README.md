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

TextField의 공개 선택자는 `djy-text-field`, `djy-text-field__label`, `djy-text-field__input`,
`djy-text-field__description`, `djy-text-field__error`다. CSS만 사용하는 경우 레이블과 안내의
접근성 연결도 직접 지정한다.

```html
<div class="djy-text-field">
  <label class="djy-text-field__label" for="email">이메일 (필수)</label>
  <input
    class="djy-text-field__input"
    id="email"
    name="email"
    type="email"
    required
    aria-describedby="email-description email-error"
    aria-invalid="true"
  />
  <p class="djy-text-field__description" id="email-description">연락받을 주소입니다.</p>
  <p class="djy-text-field__error" id="email-error">이메일 주소를 확인해 주세요.</p>
</div>
```

오류가 사라지면 오류 요소와 해당 `aria-describedby` ID, `aria-invalid`를 갱신한다.
입력은 기본 크기 하나를 제공하고 `:focus-visible`, `:disabled`, `[aria-invalid="true"]`를
스타일링한다. `readonly`는 기본 가독성과 포커스·선택을 유지한다.
