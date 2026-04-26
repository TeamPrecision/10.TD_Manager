import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    subRole?: string | null;
  }
  interface Session {
    user: User & {
      id: string;
      role: string;
      subRole: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    subRole?: string | null;
    id?: string;
  }
}
