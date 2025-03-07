import { lazy, type ReactNode, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { userRoutes } from "./user-routes";
import { ErrorBoundary } from "react-error-boundary";
import { AnomalyDetail } from "./components/AnomalyDetail";

const ErrorFallback = ({ error }: { error: Error }) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-red-600">Error Loading Anomaly Details</h2>
      <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Retry
      </button>
    </div>
  );
};

export const SuspenseWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      {children}
    </Suspense>
  );
};

const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const SomethingWentWrongPage = lazy(
  () => import("./pages/SomethingWentWrongPage"),
);

export const router = createBrowserRouter(
  [
    ...userRoutes,
    {
      path: "*",
      element: (
        <SuspenseWrapper>
          <NotFoundPage />
        </SuspenseWrapper>
      ),
      errorElement: (
        <SuspenseWrapper>
          <SomethingWentWrongPage />
        </SuspenseWrapper>
      ),
    },
    {
      path: "/anomaly/:id",
      element: (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <AnomalyDetail />
        </ErrorBoundary>
      )
    }
  ]
);
