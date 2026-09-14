const title = process.argv[2] ?? "";
const conventionalTitle =
  /^(?:feat|fix|docs|refactor|perf|test|build|ci|chore|revert)(?:\([a-z0-9][a-z0-9._/-]*\))?!?: [a-z0-9][\x20-\x7E]*$/u;

if (!conventionalTitle.test(title)) {
  console.error(`Invalid PR title: ${title}`);
  console.error(
    "Use an English Conventional Commit title, for example: feat(button): add loading state",
  );
  process.exit(1);
}
