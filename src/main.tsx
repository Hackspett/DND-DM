import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import App from "./app.component";
import "@mantine/core/styles.css";
import "./global.styles.css";

const theme = createTheme({
  primaryColor: "dndGreen",
  colors: {
    dark: [
      "#e8e7df",
      "#c5c6bc",
      "#a5a79a",
      "#858779",
      "#66685b",
      "#45483d",
      "#30332b",
      "#191b17",
      "#141612",
      "#111310",
    ],
    dndGreen: [
      "#f4f7e9",
      "#e6eccf",
      "#d8e1b5",
      "#cad79b",
      "#c4d58b",
      "#a5b66e",
      "#829452",
      "#606f3b",
      "#3d4925",
      "#202719",
    ],
  },
  fontFamily: '"DM Sans", sans-serif',
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} forceColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
