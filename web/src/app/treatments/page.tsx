'use client';
import { Breadcrumb} from 'antd';

export default function FrontPage() {
  return (
    <div>
      <Breadcrumb items={[
        {
          title: <a href="/"><span role="img" aria-label="home">🏠</span></a>,
        },
        {
          title: <a>Treatments</a>,
        },
      ]} />

      <h1>Treatments</h1>
      <div>Show calendar here</div>
      <ul>
        <li>
          <a href="/treatments/schedules">Treatment Schedules</a>
        </li>
        <li>
          <a href="/treatments/session/yesterday">Yesterday's Sessions</a>
        </li>
        <li>
          <a href="/treatments/session">Today's Sessions</a>
        </li>
      </ul>
    </div>
  );
}