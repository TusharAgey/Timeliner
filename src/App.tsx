import { useEffect } from "react";
import { TimelinerPage } from "./pages/TimelinerPage";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { Toaster } from "./components/ui/Toaster";

function App() {
  const init = useWorkspaceStore((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <ErrorBoundary>
      <TimelinerPage />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
