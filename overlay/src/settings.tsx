import React from "react";
import ReactDOM from "react-dom/client";
import Settings from "./SettingsApp.tsx";
import "./index.css";

// biome-ignore lint/style/noNonNullAssertion: Create vite react-ts template
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Settings />
	</React.StrictMode>,
);
