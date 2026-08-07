import { useEffect } from "react";
import { TimelinerPage } from "./pages/TimelinerPage";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { Toaster } from "./components/ui/Toaster";
import { OfflineIndicator } from "./components/ui/OfflineIndicator";

function App() {
  const init = useWorkspaceStore((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <ErrorBoundary>
      <TimelinerPage />
      <Toaster />
      <OfflineIndicator />
    </ErrorBoundary>
  );
}

export default App;
