import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { pagesBasePath, pagesOrigin, storybookUrl } from "./src/site-config";

const repositoryUrl = "https://github.com/devjaeyoon/devjaeyoon-design-system";

export default defineConfig({
  site: pagesOrigin,
  base: pagesBasePath,
  integrations: [
    react(),
    starlight({
      title: "devjaeyoon design system",
      description: "일관되고 접근 가능한 제품 경험을 위한 디자인 시스템",
      locales: {
        root: {
          label: "한국어",
          lang: "ko-KR",
        },
      },
      social: [{ icon: "github", label: "GitHub", href: repositoryUrl }],
      head: [
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://cdn.jsdelivr.net",
            crossorigin: "anonymous",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css",
          },
        },
      ],
      customCss: ["./src/styles/starlight.css"],
      sidebar: [
        {
          label: "시작하기",
          items: [
            { label: "소개", link: "/" },
            { label: "설치", link: "/getting-started/" },
          ],
        },
        {
          label: "Foundation",
          items: [{ label: "디자인 토큰", link: "/foundations/design-tokens/" }],
        },
        {
          label: "원칙",
          items: [
            { label: "설계 원칙", link: "/principles/design-principles/" },
            { label: "접근성", link: "/principles/accessibility/" },
          ],
        },
        {
          label: "컴포넌트",
          items: [
            { label: "Button", link: "/components/button/" },
            { label: "TextField", link: "/components/text-field/" },
          ],
        },
        {
          label: "실험실",
          items: [{ label: "Storybook", link: storybookUrl }],
        },
      ],
    }),
  ],
});
