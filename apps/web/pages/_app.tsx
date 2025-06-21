import type { AppProps } from "next/app";
import "../src/app/globals.css";

// Force all pages to be dynamic
export const config = {
  runtime: "nodejs",
  unstable_runtimeJS: false,
};

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

// Disable static optimization
MyApp.getInitialProps = async () => {
  return {
    pageProps: {},
  };
};
