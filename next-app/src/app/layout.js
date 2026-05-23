import './globals.css';

export const metadata = {
  title: 'Attendance Pro',
  description: 'Next-Gen Attendance Management Platform with Role-Based Access Control',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
