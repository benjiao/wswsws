'use client';

export default function FrontPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <ul>

        <li>
            <a href={`${process.env.NEXT_PUBLIC_API_URL}/admin`} target="_blank" rel="noopener noreferrer">
              Admin
            </a>
        </li>
      </ul>
    </div>
  );
}