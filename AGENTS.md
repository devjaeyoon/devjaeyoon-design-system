# AGENTS.md

AI 어시스턴트가 이 저장소에서 작업할 때 참고하는 가이드.

## 프로젝트 개요

devjaeyoon-design-system은 devjaeyoon의 디자인 시스템이다. 기술적 상세는 TECH.md를 참고한다.

## AGENTS.md 역할

각 폴더의 `AGENTS.md`는 **해당 폴더의 개요와 컨벤션**을 설명한다.

### AGENTS.md가 필요한 디렉토리

핵심 도메인/패키지 폴더에는 AGENTS.md를 두고, 생성물/의존성 폴더(`node_modules`, `dist` 등)에는 두지 않는다.

## 문서 역할 분리

| 문서        | 역할                           | 대상        |
| ----------- | ------------------------------ | ----------- |
| `AGENTS.md` | 폴더 개요 + 컨벤션             | AI 에이전트 |
| `TECH.md`   | 기술 상세, 아키텍처, 명령어    | AI 에이전트 |
| `README.md` | 패키지 소개, 사용법, 개발 방법 | 사람        |

각 패키지/폴더별 세부 규칙은 해당 디렉토리의 `AGENTS.md`에 명시되어 있으며, 해당 경로에서 작업할 때만 읽힌다.

## Git 규칙

- **커밋 메시지는 반드시 영어로 작성**한다. Conventional Commits 형식을 따른다: `type(scope): subject`
  - 예: `feat(button): add loading state`, `fix(tooltip): correct z-index`, `docs: update component rules`
- **PR 제목도 반드시 영어로 작성**한다. 커밋 메시지와 동일한 Conventional Commits 형식을 따른다.
