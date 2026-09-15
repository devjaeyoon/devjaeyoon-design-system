# @devjaeyoon-design-system/react

React 19용 devjaeyoon 디자인 시스템 컴포넌트다. CSS는 자동으로 포함하지 않으므로 앱
엔트리에서 별도로 import한다.

```tsx
import "@devjaeyoon-design-system/css";
import { Button } from "@devjaeyoon-design-system/react";

export function Example() {
  return <Button variant="primary">저장</Button>;
}
```

`TextField`는 레이블·설명·오류를 native input에 연결한다. 값 관리와 검증은 폼에서 담당하며,
`value`/`onChange` 또는 `defaultValue`를 사용할 수 있다.

```tsx
import { TextField } from "@devjaeyoon-design-system/react";

<TextField
  label="이메일"
  type="email"
  name="email"
  autoComplete="email"
  description="연락받을 주소를 입력해 주세요."
  defaultValue="jaeyoon@example.com"
  required
/>;
```

`type`은 `text`(기본값), `email`, `password`, `search`, `tel`, `url`을 지원한다.
`TextFieldProps`, `TextFieldType`을 export하며 숫자형 `size` 등 native props를 보존한다.
`ref`, `className`, `style`은 실제 input에 적용한다. 전체 레이아웃은 바깥 요소에서 조절한다.
`error`가 있으면 설명과 함께 연결하고 `aria-invalid`를 설정한다. 포커스 이동과 결과 알림은
소비자가 처리한다.

[TextField 가이드](https://devjaeyoon.github.io/devjaeyoon-design-system/components/text-field/)와
[프로필 수정 폼 예제](https://devjaeyoon.github.io/devjaeyoon-design-system/storybook/?path=/story/examples-profileform--save)를 참고한다.
