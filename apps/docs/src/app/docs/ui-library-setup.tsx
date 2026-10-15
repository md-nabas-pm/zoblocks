/**
 * Ant Design and Material UI setup, per React framework.
 *
 * Each follows that library's own Next.js guide — antd's
 * (ant.design/docs/react/use-with-next) and MUI's
 * (mui.com/material-ui/integrations/nextjs) — and adds one thing, the
 * ZoBlocks bridge, inside the library's theme provider. The libraries' SSR
 * setup is not optional decoration: without it Next.js sends the first
 * screen with no antd or MUI styles and the page flickers.
 *
 * Every variant was built on 28 Sep 2026 (Next.js 16.3, antd 6.6, MUI 9.4)
 * and its server-rendered HTML checked for two things: the library's CSS in
 * the page, and the bridge's `--zb-accent` equal to the app's own primary
 * colour rather than the library default. That check found the one line
 * neither guide mentions: on the **Pages Router**, Next.js leaves packages
 * external during SSR, the ESM-only bridge then loads a second copy of
 * antd/MUI, and it reads the default theme — while antd's own style
 * extraction comes back empty for the same reason. `transpilePackages`
 * bundles them into one copy and fixes both.
 */

import { CodeBlock } from "@/components/site/code-block";
import { DocTabs } from "@/components/site/doc-tabs";
import { PmCommand } from "@/components/site/pm-command";
import { C, Callout } from "@/components/site/docs-shell";

const note = "text-sm leading-relaxed text-graphite";
const link = "text-ink underline underline-offset-2";

/** Said once per bridged style, because it is the one thing a bridge will not do. */
function ClinicalColours() {
  return (
    <Callout>
      Clinical status colours — critical, high, low — always stay ZoBlocks&rsquo;s, whatever your
      theme says, because they are tested for contrast and colour blindness.
    </Callout>
  );
}

export function ZoBlocksStyle() {
  return (
    <p className={note}>
      The default look, with nothing to install or wrap. The <C>zoblocks-tokens.css</C> import from
      step 4 is all it needs, and it works the same in Next.js and Vite. Use this when your app has
      no other component library, or when you want ZoBlocks&rsquo;s own design.
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Ant Design                                                         */
/* ------------------------------------------------------------------ */

const ANTD_APP_PROVIDERS = `"use client";

import { ConfigProvider } from "antd";
import { AntdBridge } from "@zoblocks/bridge-antd";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#7c3aed", borderRadius: 10 } }}>
      <AntdBridge>{children}</AntdBridge>
    </ConfigProvider>
  );
}`;

const ANTD_APP_LAYOUT = `import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Providers } from "./providers";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}`;

const ANTD_PAGES_CONFIG = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["antd", "@ant-design/cssinjs", "@zoblocks/bridge-antd"],
};

export default nextConfig;`;

const ANTD_PAGES_DOCUMENT = `import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import Document, { Head, Html, Main, NextScript } from "next/document";
import type { DocumentContext } from "next/document";

const MyDocument = () => (
  <Html lang="en">
    <Head />
    <body>
      <Main />
      <NextScript />
    </body>
  </Html>
);

MyDocument.getInitialProps = async (ctx: DocumentContext) => {
  const cache = createCache();
  const originalRenderPage = ctx.renderPage;
  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) => (props) => (
        <StyleProvider cache={cache}>
          <App {...props} />
        </StyleProvider>
      ),
    });

  const initialProps = await Document.getInitialProps(ctx);
  const style = extractStyle(cache, true);
  return {
    ...initialProps,
    styles: (
      <>
        {initialProps.styles}
        <style dangerouslySetInnerHTML={{ __html: style }} />
      </>
    ),
  };
};

export default MyDocument;`;

const ANTD_PAGES_APP = `import type { AppProps } from "next/app";
import { ConfigProvider } from "antd";
import { AntdBridge } from "@zoblocks/bridge-antd";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#7c3aed", borderRadius: 10 } }}>
      <AntdBridge>
        <Component {...pageProps} />
      </AntdBridge>
    </ConfigProvider>
  );
}`;

const ANTD_VITE = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import { AntdBridge } from "@zoblocks/bridge-antd";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: "#7c3aed", borderRadius: 10 } }}>
      <AntdBridge>
        <App />
      </AntdBridge>
    </ConfigProvider>
  </StrictMode>,
);`;

/* ------------------------------------------------------------------ */
/* Material UI                                                        */
/* ------------------------------------------------------------------ */

const MUI_APP_THEME = `"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: { primary: { main: "#7c3aed" } },
  shape: { borderRadius: 10 },
});

export default theme;`;

const MUI_APP_LAYOUT = `import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { MuiBridge } from "@zoblocks/bridge-mui";
import theme from "../theme";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <MuiBridge>{children}</MuiBridge>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}`;

const MUI_PAGES_CONFIG = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@zoblocks/bridge-mui"],
};

export default nextConfig;`;

const MUI_PAGES_DOCUMENT = `import { Html, Head, Main, NextScript } from "next/document";
import type { DocumentContext, DocumentProps } from "next/document";
import {
  DocumentHeadTags,
  documentGetInitialProps,
  type DocumentHeadTagsProps,
} from "@mui/material-nextjs/v16-pagesRouter";

export default function MyDocument(props: DocumentProps & DocumentHeadTagsProps) {
  return (
    <Html lang="en">
      <Head>
        <DocumentHeadTags {...props} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

MyDocument.getInitialProps = async (ctx: DocumentContext) => {
  return documentGetInitialProps(ctx);
};`;

const MUI_PAGES_APP = `import type { AppProps } from "next/app";
import { AppCacheProvider } from "@mui/material-nextjs/v16-pagesRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MuiBridge } from "@zoblocks/bridge-mui";
import "@/styles/globals.css";

const theme = createTheme({
  palette: { primary: { main: "#7c3aed" } },
  shape: { borderRadius: 10 },
});

export default function App(props: AppProps) {
  const { Component, pageProps } = props;
  return (
    <AppCacheProvider {...props}>
      <ThemeProvider theme={theme}>
        <MuiBridge>
          <Component {...pageProps} />
        </MuiBridge>
      </ThemeProvider>
    </AppCacheProvider>
  );
}`;

const MUI_VITE = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MuiBridge } from "@zoblocks/bridge-mui";
import App from "./App";
import "./index.css";

const theme = createTheme({
  palette: { primary: { main: "#7c3aed" } },
  shape: { borderRadius: 10 },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <MuiBridge>
        <App />
      </MuiBridge>
    </ThemeProvider>
  </StrictMode>,
);`;

const MUI_CORE = "@mui/material @emotion/react @emotion/styled @zoblocks/bridge-mui";

/* ------------------------------------------------------------------ */
/* Components                                                         */
/* ------------------------------------------------------------------ */

export function AntdSetup() {
  return (
    <div className="space-y-4">
      <p className={note}>
        For an app that already uses Ant Design. <C>AntdBridge</C> reads your <C>ConfigProvider</C>{" "}
        theme and hands its primary colour, radius and font to ZoBlocks. The Next.js setup follows{" "}
        <a href="https://ant.design/docs/react/use-with-next" rel="noopener" className={link}>
          Ant Design&rsquo;s own guide
        </a>
        , with the bridge added. Pick your framework:
      </p>
      <DocTabs
        label="React framework"
        tabs={[
          {
            id: "app",
            label: "Next.js App Router",
            content: (
              <div className="space-y-3">
                <PmCommand
                  commands={[{ add: "antd @ant-design/nextjs-registry @zoblocks/bridge-antd" }]}
                />
                <CodeBlock title="src/app/providers.tsx" language="tsx" code={ANTD_APP_PROVIDERS} />
                <CodeBlock title="src/app/layout.tsx" language="tsx" code={ANTD_APP_LAYOUT} />
                <p className={note}>
                  <C>AntdRegistry</C> puts antd&rsquo;s styles into the server-rendered page, so it
                  does not flash unstyled. Keep your existing fonts and metadata in the layout.
                </p>
              </div>
            ),
          },
          {
            id: "pages",
            label: "Next.js Pages Router",
            content: (
              <div className="space-y-3">
                <PmCommand commands={[{ add: "antd @ant-design/cssinjs @zoblocks/bridge-antd" }]} />
                <CodeBlock title="next.config.ts" language="ts" code={ANTD_PAGES_CONFIG} />
                <CodeBlock
                  title="src/pages/_document.tsx"
                  language="tsx"
                  code={ANTD_PAGES_DOCUMENT}
                />
                <CodeBlock title="src/pages/_app.tsx" language="tsx" code={ANTD_PAGES_APP} />
                <p className={note}>
                  <C>transpilePackages</C> is required on the Pages Router. Without it the server
                  renders antd unstyled and ZoBlocks with antd&rsquo;s default theme instead of
                  yours.
                </p>
              </div>
            ),
          },
          {
            id: "vite",
            label: "Vite",
            content: (
              <div className="space-y-3">
                <PmCommand commands={[{ add: "antd @zoblocks/bridge-antd" }]} />
                <CodeBlock title="src/main.tsx" language="tsx" code={ANTD_VITE} />
              </div>
            ),
          },
        ]}
      />
      <ClinicalColours />
    </div>
  );
}

export function MuiSetup() {
  return (
    <div className="space-y-4">
      <p className={note}>
        For an app that already uses Material UI. <C>MuiBridge</C> reads your <C>ThemeProvider</C>{" "}
        theme and hands its primary colour, radius and font to ZoBlocks. The Next.js setup follows{" "}
        <a href="https://mui.com/material-ui/integrations/nextjs/" rel="noopener" className={link}>
          Material UI&rsquo;s own guide
        </a>
        , with the bridge added. Pick your framework:
      </p>
      <DocTabs
        label="React framework"
        tabs={[
          {
            id: "app",
            label: "Next.js App Router",
            content: (
              <div className="space-y-3">
                <PmCommand
                  commands={[{ add: `${MUI_CORE} @mui/material-nextjs @emotion/cache` }]}
                />
                <CodeBlock title="src/theme.ts" language="ts" code={MUI_APP_THEME} />
                <CodeBlock title="src/app/layout.tsx" language="tsx" code={MUI_APP_LAYOUT} />
                <p className={note}>
                  <C>AppRouterCacheProvider</C> puts MUI&rsquo;s styles into the server-rendered
                  page. <C>enableCssLayer</C> lets your Tailwind classes override MUI&rsquo;s. On
                  Next.js 15, import from <C>v15-appRouter</C>.
                </p>
              </div>
            ),
          },
          {
            id: "pages",
            label: "Next.js Pages Router",
            content: (
              <div className="space-y-3">
                <PmCommand
                  commands={[
                    { add: `${MUI_CORE} @mui/material-nextjs @emotion/cache @emotion/server` },
                  ]}
                />
                <CodeBlock title="next.config.ts" language="ts" code={MUI_PAGES_CONFIG} />
                <CodeBlock
                  title="src/pages/_document.tsx"
                  language="tsx"
                  code={MUI_PAGES_DOCUMENT}
                />
                <CodeBlock title="src/pages/_app.tsx" language="tsx" code={MUI_PAGES_APP} />
                <p className={note}>
                  <C>transpilePackages</C> is required on the Pages Router, or the server renders
                  ZoBlocks with MUI&rsquo;s default theme instead of yours. On Next.js 15, import
                  from <C>v15-pagesRouter</C>.
                </p>
              </div>
            ),
          },
          {
            id: "vite",
            label: "Vite",
            content: (
              <div className="space-y-3">
                <PmCommand commands={[{ add: MUI_CORE }]} />
                <CodeBlock title="src/main.tsx" language="tsx" code={MUI_VITE} />
              </div>
            ),
          },
        ]}
      />
      <ClinicalColours />
    </div>
  );
}
