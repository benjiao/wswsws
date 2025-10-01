'use client';

export default function FrontPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>wswsws frontend</h1>
      <ul>
        <li>
          <a href="/treatments">Treatments</a>
        </li>
        <li>
            <a href={`${process.env.NEXT_PUBLIC_API_URL}/admin`} target="_blank" rel="noopener noreferrer">
              Admin
            </a>
        </li>
      </ul>
    </div>
  );
}