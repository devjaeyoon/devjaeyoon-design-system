# React 패키지 기술 상세

## Dialog 닫기 정책의 소유권

`DialogRoot`의 `closeOnEscape`와 `closeOnInteractOutside`가 사용자 닫기 정책을 결정한다.
`DialogContentProps`는 native `open`과 `closedby`를 제외한다. 런타임 spread로 전달된 `closedby`도
마크업에서 뒤에 지정하는 `closedby="closerequest"`로 덮어쓴다. native light dismiss가 Root의
바깥 영역 포인터 처리와 동시에 실행되거나 Root의 옵션을 우회하면 안 된다.
`closeOnEscape=false`여도 native `closedby="none"`으로 바꾸지 않는다. cancel 이벤트를 기존
경로에서 처리해 `onCancel`, `requestClose(result)`의 취소와 결과값, controlled 거부를 보존한다.

## Dialog 닫기 상태

`dialog-close.ts`는 DOM을 변경하지 않고 cancel 이벤트의 허용 여부, native 기본 동작과 복원
여부를 판정한다. `useDialogLifecycle.ts`는 그 결과로 native API와 React 상태 변경 요청을 실행한다.
닫기 요청은 controlled 소유자가 `open=false`를 commit하기 전까지 세션 종료를 의미하지 않는다.

| 단계 | 의미 | 닫기 요청 여부 |
| --- | --- | --- |
| `idle` | 처리 중인 cancel이 없다. 마지막 cancel의 허용·차단 결정만 보존한다. | 없음 |
| `cancel-pending` | cancel 결정과 요청 상태(`none`·`pending`·`sent`), native 닫기 후 복원 여부, 직전 포커스를 보존한다. | `request="sent"`일 때 이미 요청함 |
| `native-close-requested` | native close를 소유자에게 요청했다. | 이미 요청함 |

| 입력 | native 동작 | React 요청·후속 처리 |
| --- | --- | --- |
| 취소 가능한 Escape 허용 | 기본 닫기 취소 | `onOpenChange(false)` 요청. 소유자가 거부하면 native 모달을 유지한다. |
| 취소 가능한 cancel 차단 | 기본 닫기 취소 | 닫기를 요청하지 않는다. |
| 명시적인 `requestClose(result)` 허용 | 기본 닫기 허용 | native `returnValue` 기록 후 close 이벤트 또는 다음 task에서 한 번 요청한다. 소유자가 거부하면 같은 세션을 복원한다. |
| 취소할 수 없는 cancel | 기본 닫기가 진행될 수 있음 | 이전 차단 결정을 존중한다. `open=true`가 유지되면 native close 뒤 세션을 복원한다. |
| 직접 `close()` 또는 `<form method="dialog">` | 이미 native 닫기 발생 | 한 번 요청하고 microtask에서 commit된 `open`을 확인해 종료하거나 복원한다. |
| 직접 native 닫기 직후 Suspense 숨김 | native 닫기는 완료됐지만 close 이벤트가 아직 도착하지 않을 수 있음 | 숨김 전이에서 같은 세션의 요청을 한 번 전달한다. 거부되면 숨김 상태를 유지하고 reveal에서 입력과 마지막 포커스를 복원한다. |
| native close에서 전달하지 못한 요청 | 기본 동작 이후 | 다음 task에서 `pending` 요청을 한 번 전달한다. Suspense로 세션이 숨겨져도 요청을 누락하지 않는다. |
| 요청 처리 전 Suspense reveal | native 열기 보류 | 요청 전달 후 React commit을 확인한다. `open=false`이면 종료하고, `open=true`와 실제 visibility가 유지되면 같은 세션을 복원한다. |
| native 닫기가 뒤따르지 않은 cancel | 모달이 계속 열려 있음 | 다음 task에서 요청을 처리한 뒤 `idle`로 전환한다. 요청·복원·포커스 정보는 버리고 마지막 차단 결정은 보존한다. |
| 새 세션 열기·처리 완료된 세션 복원 성공 또는 세션 종료 | 상태 초기화 | 같은 세션의 미처리 닫기 요청을 reveal 때문에 버리지 않는다. |

cancel 만료 작업은 자신이 만든 상태가 여전히 현재 상태이고 native 모달이 열린 경우에만
적용한다. 새로운 cancel이나 세션의 상태를 오래된 timer가 덮어쓰면 안 된다.
기본 닫기를 허용하는 trusted cancel은 요청을 `pending`으로 기록한다. `onOpenChange`가
`flushSync`로 상태를 반영해도 native 결과를 기록하기 전에 내부 `close()`가 실행되지 않게 한다.
Escape와 합성 cancel은 기존처럼 즉시 요청한다.
close 이벤트와 task의 요청 전달은 같은 경로를 사용한다. callback을 실행하기 전에 전달 완료를
기록하며, 세션과 cancel 작업의 식별자가 일치할 때만 처리한다. 새 cancel이나 종료된 세션의
예약 작업은 현재 요청을 덮어쓰거나 새 세션을 닫을 수 없다.

trusted native 요청은 세션과 cancel 작업을 연결한 token으로 추적한다. 요청을 전달한 뒤 내부
state에도 token을 반영해, controlled 소유자가 상태를 변경하지 않아도 후속 commit을 확보한다.
현재 commit의 부모 열기 callback은 이 token을 포함하므로 자식 layout effect도 부모의 닫기
결정을 반영한 뒤 모달 순서를 복원한다. 실제로 숨겨진 동안의 token 갱신은 모달을 열지 않는다.
복원 열기를 취소해도 이미 전달한 닫기 요청을 다시 보내지 않는다.

직접 native 닫기 뒤 숨김 전이에서는 `idle` 상태만 요청 대상으로 삼는다. cancel 계획과 이미
전달한 요청은 각자의 기존 경로를 유지한다. native 결과값이 기록된 뒤 요청하므로 `returnValue`를
보존하지만, Suspense가 겹치는 직접 닫기와 `requestClose(result)`에서는 `onOpenChange(false)`가
지연된 `onClose`보다 먼저 호출될 수 있다. 두 callback의 순서보다 결과값 기록과 요청당 한 번
전달을 보장한다.
지연된 transition이 수락되면 이미 복원된 모달을 다시 닫아야 한다. 이 최종 닫기는 별도의 실제
native 이벤트이므로 `onClose`를 전달한다. 즉시 reveal의 불필요한 재열기·재닫기에서 발생하는
중복과 구분하며, 이때도 상태 변경 요청과 세션 종료 callback은 추가로 전달하지 않는다.

## 세션과 내부 close 이벤트

| 세션 전이 | 자원·callback 처리 |
| --- | --- |
| 열기 성공 → `active` | document 모달 스택에 등록하고 배경 스크롤 잠금과 viewport listener를 소유한다. |
| `active` → `suspended` | 포커스와 React 입력을 보존하고 native 모달과 document 자원을 일시 해제한다. 닫기 callback은 호출하지 않는다. |
| `suspended` → `active` | 미처리 native 요청과 그 요청 이후 commit을 먼저 확인하고, 부모부터 열어 모달 순서와 document 자원, 기존 포커스를 복원한다. |
| `active`·`suspended` → `finalized` | 자원을 해제하고 `onCloseAutoFocus`를 한 번 호출한다. 같은 세션을 다시 종료하지 않는다. |

모든 내부 native 닫기는 `closeNativeDialog`를 거친다. 모달이 열려 있을 때만 이유를 큐에 넣고
`close()`를 호출한다. native close 이벤트가 지연되어 도착하므로 새 세션을 열거나 종료해도 이
큐를 초기화하지 않는다.

| 내부 닫기 이유 | `onClose` 전달 | 상태 변경 요청 |
| --- | --- | --- |
| `finalize` | 전달함 | 추가 요청 없음 |
| `suspend` | 전달하지 않음 | 없음 |
| `reorder` | 전달하지 않음 | 없음 |

## 열기 Trigger의 수명

`DialogRoot`의 `pendingOpeningTriggerRef`는 닫힌 Root에서 취소되지 않은 Trigger 클릭이 만든
열기 요청의 임시 기록이다. 이미 열린 Root의 Trigger 클릭은 다음 세션을 위한 기록을 만들지
않는다.

`openSession`은 새 세션을 생성할 때 임시 기록을 `session.trigger`에 저장하고, `showModal()` 전에
한 번 소비한다. 최초 native 열기가 취소되어도 소비한 기록을 되살리지 않는다. 이후 Trigger 클릭은
새 기록을 만들며, 이전 세션을 종료한 뒤 상태로 직접 열면 이전 Trigger가 다음 세션에 전달되지
않는다.

Suspense reveal과 native 닫기 거부는 같은 세션을 복원하므로 `session.trigger`를 유지하고 임시
기록을 다시 소비하지 않는다. 종료 cleanup은 공유 기록을 초기화하지 않는다. 이전 세션의 지연된
종료가 빠르게 다시 여는 새 요청의 Trigger를 지우면 안 된다.

## 유지해야 하는 순서와 불변조건

- native 이벤트와 예약 작업은 commit된 옵션을 사용한다. 자식 layout effect가 부모를 열 때는
  해당 commit의 부모 callback을 사용한다.
- native 닫기를 거부한 controlled 세션은 입력, 모달 순서, 배경 스크롤 잠금을 보존한다.
  복원할 수 없는 열기 취소에서 이미 닫기를 요청했다면 같은 요청을 다시 보내지 않는다.
- 배경 스크롤은 overflow 관련 선언만 저장·복원한다. 변수 표현식, 축별 우선순위와 논리 축의
  순서를 보존하며 다른 인라인 스타일 변경은 유지한다. 변수 축약 속성의 한 축을 덮어써 CSSOM이
  원래 표현식을 빈 longhand로만 제공하면 해당 축의 계산값과 우선순위를 복원한다.
- `DialogVisibility`는 보이는 상태에서 포커스를 먼저 캡처하고, microtask의 generation 검사로
  StrictMode 재연결과 Suspense 숨김을 구분한다. unmount cleanup도 재연결되지 않은 세션만 종료한다.
- 포커스 복귀는 native 복귀와 중첩 cleanup 뒤 animation frame에서 실행한다. 새 세션, 새 모달,
  애플리케이션이 이동한 포커스를 덮어쓰지 않는다. 부모·자식 동시 종료에서는 부모 복귀 대상도
  유효해질 때까지 기다린다.

## 본문 크기 관찰

`useDialogBodyScroll.ts`의 ResizeObserver 하나로 본문의 content-box와 같은 Dialog에 속한
하위 요소의 border-box를 관찰한다. 본문 크기 변화만 기존 포커스 가시성 보정을 실행하고,
하위 콘텐츠의 높이·padding·border transition은 스크롤 표시와 자동 tabIndex를 갱신한다.
고정 크기 wrapper 안의 변화도 관찰하며 중첩 `<dialog>`와 그 하위 트리는 제외한다.

초기 하위 트리를 등록한 뒤 MutationObserver의 childList 기록에서 제거·추가된 하위 트리만
관찰 해제·등록한다. 텍스트·속성 변경, resource load/error, viewport와 스크롤 이벤트도 같은
계산을 사용한다. 1px 경계 허용과 명시적 tabIndex 우선순위를 유지하고 속성은 값이 달라질 때만
쓴다. 자동 tabIndex 변경만 있는 mutation은 재계산하지 않는다. cleanup에서 observer와 listener를
해제하며 Suspense reveal과 재열기 시 새로 등록한다. polling이나 transition 완료 이벤트에
의존하지 않는다.

## 검증

`pnpm check`는 타입, 단위 테스트, Chromium Storybook, build와 tarball 소비자 검증을 실행한다.
닫기 상태 변경 시에는 소비자의 실제 native 이벤트 순서도 검증한다. Firefox와 WebKit은
`DS_TEST_BROWSER`를 지정해 Storybook과 React `pack:check`를 실행한다.

특히 controlled 닫기 거부, `requestClose(result)`, 이전 close 이벤트 뒤 재열기, 중첩 부모 닫기
거부, StrictMode, Suspense와 지연된 transition, 포커스 복귀·스크롤 잠금 복원을 유지한다.
동기 상태 반영과 즉시 재열기, native 요청과 Suspense의 동시 발생, overflow 변수의 동적 변경과
축별 우선순위도 tarball 소비자에서 검증한다.
직접 `close()`와 폼 제출 뒤 Suspense 숨김에서는 닫기 수락·거부, 빠른 reveal과 즉시 새 세션
열기를 검증한다. 요청 횟수, native 결과값, 입력·포커스 복원과 스크롤 잠금 해제를 확인한다.
`requestClose()`의 cancel에서 Suspense를 숨긴 뒤 같은 턴에 `flushSync`로 reveal하는 사례도
검증한다. Promise resolve와 지속된 fallback을 따로 검사하며, 동기 상태 반영·즉시 재열기·중첩
부모 닫기·복원 취소·unmount에서도 요청과 native callback이 중복되지 않아야 한다.
순수 닫기 판정의 단위 테스트는 trusted 요청의 지연 전달, 차단 결정 유지, 요청 완료의 멱등성과
만료 후 요청·포커스 정보 제거를 검사한다.
여러 Trigger를 사용하는 세션에서는 프로그램 방식 재열기의 복귀 대상이 이전 클릭 이력에
영향받지 않는지 검사한다. 같은 세션의 Suspense·native 복원, 동기 종료 후 다른 Trigger로 재열기,
최초 native 열기 취소, 명시적 복귀 대상과 이미 열린 Root의 Trigger 클릭도 검증한다.
런타임 `closedby="any"`·`"none"` spread에서도 Root의 바깥 영역·Escape 옵션, controlled 닫기
거부와 요청 횟수를 실제 포인터·키보드 이벤트로 검증한다. 타입과 SSR에서도 내부 소유권을 검사한다.
Storybook은 고정 wrapper 안의 높이·padding·border CSS transition을 중간에 정지해 스크롤 표시와
자동 tabIndex를 검사한다. 증가·감소, 취소·제거·재삽입, 명시적 tabIndex, 중첩 Dialog, StrictMode,
Suspense와 닫기·재열기를 함께 검증한다.
