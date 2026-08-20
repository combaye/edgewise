import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import App from "./App.jsx";
import "./index.css";

const DAY_MS = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      // keep entries long enough that the persisted cache can rehydrate them
      gcTime: DAY_MS,
    },
  },
});

// Persist the React Query cache to localStorage so a reload restores quotes,
// fundamentals, COT, etc. instantly and revalidates in the background. The
// bulky "history" series are excluded — they already have their own 24h
// localStorage cache (fct:hist:*), so persisting them again would just burn
// quota; on reload their queryFn reads that cache and resolves immediately.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "fct:rq-cache",
  throttleTime: 1000,
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: DAY_MS,
        buster: "v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === "success" && q.queryKey[0] !== "history",
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>
);
