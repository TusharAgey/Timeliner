import { useEffect } from "react";
import { TimelinerPage } from "./pages/TimelinerPage";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { useTheme } from "./hooks/useTheme";

function App() {
  const init = useWorkspaceStore((state) => state.init);

  // Initialize theme on mount (sets data-theme attribute on <html>)
  useTheme();

  useEffect(() => {
    void init();
  }, [init]);

  return <TimelinerPage />;
}

export default App;
