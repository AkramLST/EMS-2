import { Suspense } from "react";
import SetPasswordClient from "./SetPasswordClient";

export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordClient />
    </Suspense>
  );
}
