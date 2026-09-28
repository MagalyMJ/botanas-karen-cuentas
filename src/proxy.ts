import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protege todo excepto la API de auth, archivos estáticos y los archivos de la PWA.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|sw.js).*)",
  ],
};
