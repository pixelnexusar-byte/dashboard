import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyApNcK0OUs5Gycdi0MyA8SqckhIgt1GOGQ",
  authDomain: "nefa-dashboard.firebaseapp.com",
  projectId: "nefa-dashboard",
  storageBucket: "nefa-dashboard.firebasestorage.app",
  messagingSenderId: "908540474545",
  appId: "1:908540474545:web:75631643e881e530a41e90",
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const basePath = "empresa_nefa/datos";
export function friendlyError(error: unknown): string {
  const code = String((error as { code?: string })?.code || "");
  if (code.includes("permission-denied"))
    return "Firebase rechazó el acceso a los datos. Revisá los permisos de Firestore de este proyecto.";
  if (
    code.includes("operation-not-allowed") ||
    code.includes("admin-restricted-operation")
  )
    return "El acceso anónimo está deshabilitado. Activá Authentication → Sign-in method → Anonymous en Firebase.";
  if (code.includes("unauthorized-domain"))
    return "Este dominio no está autorizado en Firebase Authentication.";
  if (code.includes("network") || code.includes("unavailable"))
    return "No se pudo conectar. Revisá tu conexión y volvé a intentar.";
  return (
    ((error as Error)?.message || "Ocurrió un error al guardar los datos.") +
    (code ? ` (${code})` : "")
  );
}
