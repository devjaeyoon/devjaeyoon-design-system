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
