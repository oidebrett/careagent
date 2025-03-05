import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { Head } from "./internal-components/Head";
import { ThemeProvider } from "./internal-components/ThemeProvider";
import { DEFAULT_THEME } from "./constants/default-theme";
import ErrorBoundary from "./components/ErrorBoundary";

export const AppWrapper = () => {
	return (
		<ThemeProvider defaultTheme={DEFAULT_THEME}>
			<ErrorBoundary>
				<RouterProvider router={router} />
				<Head />
			</ErrorBoundary>
		</ThemeProvider>
	);
};
