import "./NotificationBadge.css";

export default function NotificationBadge({ count }) {
    if (!count || count === 0) return null;

    // Display 9+ for counts over 9
    const displayCount = count > 9 ? "9+" : count;

    return (
        <span className="notification-badge">
            {displayCount}
        </span>
    );
}