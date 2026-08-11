import { useEffect } from "react";
import { TimelinerPage } from "./pages/TimelinerPage";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { Toaster } from "./components/ui/Toaster";
import { OfflineIndicator } from "./components/ui/OfflineIndicator";
import { usePerformanceMode } from "./lib/performanceMode";

function App() {
  const init = useWorkspaceStore((state) => state.init);
  const performanceMode = usePerformanceMode();

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <ErrorBoundary>
      <TimelinerPage
        optimizedMode={performanceMode.optimized}
        onToggleOptimizedMode={performanceMode.toggleMode}
      />
      <Toaster />
      <OfflineIndicator />
    </ErrorBoundary>
  );
}

export default App;
