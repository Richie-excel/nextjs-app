import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { User } from './lib/definitions';
import postgres from 'postgres';
import bcrypt from 'bcrypt';
 
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export const getUser =  async (email: string): Promise <User | undefined> =>{
    try {
        const user = await sql<User[]> `SELECT * FROM users WHERE email = ${email}`;
        return user[0];
        
    } catch (error) {
        console.error('Error fetching user:', error);
    }

} 
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
            const { email, password } = parsedCredentials.data;
            const user = await getUser(email);

            if(!user) return null;

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return null;

            return user;
        }

        return null;
      },
    }),

  ],
});