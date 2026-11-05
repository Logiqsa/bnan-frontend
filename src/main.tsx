import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import App from "./App.tsx";
import "./index.css";
import { installUserTimeZoneFormatting, TIME_ZONE_CHANGE_EVENT } from "./contexts/TimeZoneContext";

function Root() {
  const [, renderTimeZone] = useState(0);
  useEffect(() => {
    const render = () => renderTimeZone((value) => value + 1);
    window.addEventListener(TIME_ZONE_CHANGE_EVENT, render);
    return () => window.removeEventListener(TIME_ZONE_CHANGE_EVENT, render);
  }, []);
  return <App />;
}

installUserTimeZoneFormatting();
createRoot(document.getElementById("root")!).render(<Root />);
