import NextAuth from "next-auth";
import { authOptions } from '@/app/utils/auth';

// Create the NextAuth handler with the auth options
const handler = NextAuth(authOptions);

// Export the handler for GET and POST requests
export { handler as GET, handler as POST }; 