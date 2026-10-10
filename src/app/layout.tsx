import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rustlings Web — A little Rust, every day",
  description: "Learn Rust with the official Rustlings exercises. Write, compile and run Rust in your browser with WebAssembly. Progress stays on your device.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
