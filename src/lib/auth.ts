import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider, { type EmailConfig } from 'next-auth/providers/email';
import { Resend } from 'resend';

import { prisma } from '@/lib/prisma';

import type { NextAuthOptions } from 'next-auth';

// Simple dev email provider: log codes to console instead of sending
function createDevEmailProvider(config: EmailConfig) {
  return EmailProvider({
    ...config,
    async sendVerificationRequest({ identifier: email }) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const normalizedEmail = email.trim().toLowerCase();

      await prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token: code,
          expires: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Dev-friendly: log code instead of sending real email
      // eslint-disable-next-line no-console
      console.log(
        `\x1b[33m[DEV EMAIL]\x1b[0m Verification code for ${normalizedEmail}: ${code}\x1b[0m`,
      );
    },
  });
}

// Resend client for production email sending
const resend =
  process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    process.env.NODE_ENV === 'development'
      ? createDevEmailProvider({
          server: '',
          from: process.env.EMAIL_FROM || 'noreply@example.com',
        } as EmailConfig)
      : EmailProvider({
          server: '',
          from: process.env.EMAIL_FROM,
          async sendVerificationRequest({ identifier: email, provider }) {
            if (!resend) {
              throw new Error('Resend not configured');
            }

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const normalizedEmail = email.trim().toLowerCase();

            await prisma.verificationToken.create({
              data: {
                identifier: normalizedEmail,
                token: code,
                expires: new Date(Date.now() + 10 * 60 * 1000),
              },
            });

            const appName = process.env.APP_NAME || 'Dia Balance';

            const { error } = await resend.emails.send({
              from: provider.from,
              to: [email],
              subject: `Your verification code for ${appName}`,
              html: `
                <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #111827; text-align: center; margin-bottom: 24px;">${appName}</h2>
                  <p>Your login verification code is:</p>
                  <div style="background-color: #F3F4F6; padding: 16px; text-align: center; margin: 16px 0; border-radius: 8px;">
                    <span style="font-size: 32px; font-weight: 600; letter-spacing: 0.3em; color: #2563EB;">${code}</span>
                  </div>
                  <p style="font-size: 14px; color: #4B5563;">This code will expire in 10 minutes.</p>
                  <p style="font-size: 14px; color: #6B7280;">If you did not request this code, you can safely ignore this email.</p>
                </div>
              `,
              text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
            });

            if (error) {
              console.error('Resend error:', error);
              throw new Error(`Failed to send email: ${error.message}`);
            }
          },
        }),
    CredentialsProvider({
      id: 'email-code',
      name: 'Email Code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Verification Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;

        const normalizedEmail = credentials.email.trim().toLowerCase();

        try {
          const verificationToken = await prisma.verificationToken.findFirst({
            where: {
              identifier: normalizedEmail,
              token: credentials.code,
              expires: {
                gt: new Date(),
              },
            },
          });

          if (!verificationToken) {
            console.error('Invalid or expired verification code for:', normalizedEmail);
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          });

          if (!user?.isActive) {
            console.error('User not found or inactive:', normalizedEmail);
            return null;
          }

          await prisma.verificationToken.delete({
            where: { token: verificationToken.token },
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };
        } catch (error) {
          console.error('Credentials provider error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Attach user id to token for easier access
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (token as any).userId = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (session.user && (token as any).userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = (token as any).userId;
      }
      return session;
    },
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { isActive: true },
      });

      const isAllowed = existingUser?.isActive ?? false;
      if (!isAllowed) {
        console.error('SignIn: user not found or inactive', email);
      }
      return isAllowed;
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true',
};
