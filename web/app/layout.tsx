// app/layout.tsx
import Link from 'next/link';
import './globals.css'; // optional CSS

export const metadata = {
  title: 'My App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', height: '100vh' }}>
          {/* Sidebar */}
            <nav className="w-52 bg-gray-600 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Menu</h2>
              <ul className="list-none p-0 space-y-2">
                <li>
                  <Link href="/" className="text-white hover:text-gray-300 transition px-2 py-1 block">Home</Link>
                </li>
                <li>
                  <Link href="/patients" className="text-white hover:text-gray-300 transition px-2 py-1 block">Patients</Link>
                </li>
                <li>
                  <Link href="/treatments" className="text-white hover:text-gray-300 transition px-2 py-1 block">Treatments</Link>
                </li>
              </ul>
            </nav>

          {/* Main content */}
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}