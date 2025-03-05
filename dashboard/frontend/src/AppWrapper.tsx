import { ErrorBoundary } from "react-error-boundary";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { Head } from "./internal-components/Head";
import { ThemeProvider } from "./internal-components/ThemeProvider";
import { DEFAULT_THEME } from "./constants/default-theme";
import { Suspense } from "react";

const ErrorFallback = ({ error }: { error: Error }) => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-red-600">Something went wrong</h2>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    </div>
  );
};

export const AppWrapper = () => {
  return (
    <ThemeProvider defaultTheme={DEFAULT_THEME}>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error) => {
          console.error(
            "Caught error in AppWrapper",
            error.message,
            error.stack,
          );
        }}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen">
            <p className="text-gray-500">Loading...</p>
          </div>
        }>
          <RouterProvider router={router} />
          <Head />
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  );
};
