'use client';

export default function FrontPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Treatments</h1>
      <ul>
        <li>
          <a href="/treatments/prep">Prep</a>
        </li>
        <li>
          <a href="/treatments/give">Give</a>
        </li>
      </ul>
    </div>
  );
}