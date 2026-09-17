import "@devjaeyoon-design-system/css";
import "./preview.css";

import type { Decorator, Preview } from "@storybook/react-vite";

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.body.dataset.theme = theme;

  return (
    <div className="djy-story-canvas">
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Component theme",
      toolbar: {
        icon: "paintbrush",
        items: [
          { title: "Light", value: "light" },
          { title: "Dark", value: "dark" },
        ],
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  parameters: {
    a11y: {
      test: "error",
    },
    controls: {
      expanded: true,
    },
    layout: "fullscreen",
  },
};

export default preview;
