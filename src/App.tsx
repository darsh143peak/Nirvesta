import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { routes } from "./routes";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {routes.map((route) => {
          const element = route.protected ? (
            <ProtectedRoute>
              <route.element />
            </ProtectedRoute>
          ) : (
            <route.element />
          );

          return <Route key={route.path} path={route.path} element={element} />;
        })}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
