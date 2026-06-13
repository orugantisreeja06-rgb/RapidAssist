import { useEffect, useState } from "react";
import { notificationService } from "../services/notificationService.js";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    const data = await notificationService.list();
    setItems(data.notifications || []);
    setUnread(data.unreadCount || 0);
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    await notificationService.markAllRead();
    load();
  };

  return (
    <div className="page narrow">
      <div className="section-heading">
        <span className="eyebrow">{unread} unread</span>
        <h1>Notifications</h1>
      </div>
      <button className="btn btn-secondary" onClick={markAll}>Mark all read</button>
      <div className="list">
        {items.map((item) => (
          <article className={`list-item ${item.isRead ? "" : "unread"}`} key={item._id}>
            <div className="row between">
              <strong>{item.title}</strong>
              <span className="pill">{item.type}</span>
            </div>
            <p>{item.message}</p>
            {!item.isRead && <button className="btn btn-secondary" onClick={async () => { await notificationService.markRead(item._id); load(); }}>Mark read</button>}
          </article>
        ))}
        {!items.length && <p className="empty">No notifications yet.</p>}
      </div>
    </div>
  );
}
