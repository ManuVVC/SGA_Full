import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SGA - Jefe de Almacén",
  description: "Dashboard de gestión para el Jefe de Almacén",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AppRouterCacheProvider>
          <Providers>
            <DashboardLayout>
              {children}
            </DashboardLayout>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
