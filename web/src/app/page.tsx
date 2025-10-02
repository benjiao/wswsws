'use client';
import Link from 'next/link';

export default function FrontPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <ul>
        <li>Treatments</li>
        <ul>
          <li><Link href="/treatments/sessions/today">Today</Link></li>
          <li><Link href="/treatments/sessions/yesterday">Yesterday</Link></li>
          <li><Link href="/treatments/sessions">Sessions</Link></li>
          <li><Link href="/treatments/schedules">Schedules</Link></li>
        </ul>
        <li>Patients</li>
        <li>Prescriptions</li>
        <li>Inventory</li>
        <ul>
          <li>Medicines</li>
          <li>Supplies</li>
          <li>Analysis</li>
        </ul>
        <li>
            <a href={`${process.env.NEXT_PUBLIC_API_URL}/admin`} target="_blank" rel="noopener noreferrer">
              Admin
            </a>
        </li>
      </ul>
    </div>
  );
}