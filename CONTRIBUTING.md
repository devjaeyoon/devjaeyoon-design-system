# 개발 및 리뷰 가이드

PR에는 변경 이유, 최종 동작, 검증 근거를 남긴다. 나중에 저장소를 읽는 사람이 해당 결정을
이해할 수 있을 정도로 작성하고, 변경 규모에 맞춰 설명의 길이를 조절한다.

## 브랜치와 PR

- 최신 `main`에서 작업 목적에 맞는 브랜치를 만든다.
- 하나의 변경을 완성하는 구현·사용처 수정·회귀 검사는 같은 PR에 포함한다.
- 독립적인 기능이나 저장소 운영 개선은 별도 브랜치와 PR로 분리한다.
- 커밋과 PR 제목은 영어 Conventional Commits 형식(`type(scope): subject`)으로 작성한다.
- PR 본문은 한국어를 기본으로 하고 [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)을 따른다.
- 검토 중 범위가 달라졌다면 제목과 본문을 최종 변경에 맞게 갱신한다.

## 검증과 변경 이력

변경에 맞는 검증을 실행하고 명령과 결과를 PR 본문에 기록한다. 전체 품질 검사는
`pnpm check`를 사용한다. 실행하지 못한 검증은 그 이유를 남긴다.

UI 변경에는 필요한 전후 화면이나 Storybook 링크를 첨부하고, light/dark·키보드 조작·접근성
등 영향을 받는 동작을 확인한다. 버그 수정은 가능하면 수정 전 실패와 수정 후 통과를 함께
기록한다.

공개 패키지의 산출물이 바뀌면 `pnpm changeset`으로 변경 이력을 추가한다. 토큰 변경이 생성
CSS에 영향을 주면 `design-token`과 `css`를 함께 포함한다. 문서·테스트·CI만 바뀌는 PR은
changeset이 필요하지 않으며, PR 본문에 불필요한 이유를 적는다.

## CodeRabbit 연결

1. [CodeRabbit 시작 안내](https://docs.coderabbit.ai/getting-started/quickstart)에 따라 GitHub
   계정을 연결하고, GitHub App의 접근 대상에 이 저장소를 선택한다.
2. 저장소 루트의 [`.coderabbit.yaml`](.coderabbit.yaml)을 PR 브랜치에 포함한다. CodeRabbit은
   리뷰 대상 브랜치의 설정을 사용한다. `main`에 병합하면 이후 새 브랜치에서도 설정을 이어받는다.
3. `main`을 대상으로 초안이 아닌 PR을 열고 CodeRabbit의 리뷰가 게시되는지 확인한다.
   추가 커밋을 push하면 변경분을 다시 검토한다. 필요하면 PR 댓글에 `@coderabbitai review`로
   리뷰를 요청한다.

설정은 한국어 리뷰와 간결한 walkthrough를 사용한다. 자동 요약은 리뷰 댓글에 게시하고,
작성자가 PR 본문에 변경 이유와 검증 근거를 기록한다. `AGENTS.md`는 자동으로 인식하며,
`TECH.md`와 이 가이드도 리뷰 기준에 포함한다.

GitHub App 연결과 사용할 리뷰 기능의 활성화는 계정에서 진행해야 한다. 설정 파일 추가만으로
앱 설치나 구독이 완료되는 것은 아니다. 구체적인 동작은
[설정 파일 안내](https://docs.coderabbit.ai/getting-started/yaml-configuration)와
[자동 리뷰 안내](https://docs.coderabbit.ai/configuration/auto-review)를 참고한다.

## 리뷰와 병합

리뷰 의견을 검토해 필요한 수정을 반영하고, 채택하지 않은 주요 의견에는 이유를 댓글로 남긴다.
병합 전에는 PR의 CI·제목 검사 결과와 최종 diff를 확인한다. CodeRabbit 의견과 검증 근거를
함께 검토해 작성자가 병합 여부를 결정한다.

PR 제목과 본문을 최종 상태로 정리한 뒤 squash merge한다. 독립적인 PR 하나가 의미 있는
커밋 하나로 남도록 유지한다.

PR 템플릿은 기본 브랜치에 병합된 후 새 PR에 자동으로 적용된다. 기존 PR의 본문은 필요에 따라
직접 갱신한다. 자세한 적용 방법은
[GitHub 문서](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)를 참고한다.
