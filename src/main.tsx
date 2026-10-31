import { createRoot } from "react-dom/client";
import "./style.css";
const root = createRoot(document.getElementById("root")!);
import("./features/App")
  .then(({ App }) => root.render(<App />))
  .catch((error) =>
    root.render(
      <main>
        <h1>Practice setup unavailable</h1>
        <p>{String(error)}</p>
        <p>
          No capture was saved. Follow the local setup instructions; do not
          point this build at production.
        </p>
      </main>,
    ),
  );
