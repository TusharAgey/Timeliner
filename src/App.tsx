import { useEffect } from "react";
import { TimelinerPage } from "./pages/TimelinerPage";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

function App() {
  const init = useWorkspaceStore((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <ErrorBoundary>
      <TimelinerPage />
    </ErrorBoundary>
  );
}

export default App;
