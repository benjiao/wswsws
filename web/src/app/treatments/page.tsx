'use client';

export default function FrontPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Treatments</h1>
      <div>Show calendar here</div>
      <ul>
        <li>
          <a href="/treatments/session">Today's Sessions</a>
        </li>
      </ul>
    </div>
  );
}