import { useState } from "react";
import ConversationsList from "../components/ConversationList";
import Message from "../components/Message";
import ReportModal from "../components/ReportModal";
import "./ChatPage.css";

export default function ChatPage() {
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const handleReportClick = (user) => {
    setReportTarget(user);
    setReportModalOpen(true);
  };

  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        <ConversationsList onSelectConversation={setSelectedConvo} />
      </div>

      <div className="chat-content">
        {selectedConvo ? (
          <>
            {/* Top bar with other user email and report button */}
            <div className="chat-topbar">
              <span className="chat-user-email">{selectedConvo.displayEmail}</span>
              <button
                className="report-btn"
                onClick={() => handleReportClick(selectedConvo)}
              >
                Report
              </button>
            </div>

            {/* Messages component */}
            <Message convoId={selectedConvo.id} />

            {/* Report modal */}
            {reportModalOpen && reportTarget && (
              <ReportModal
                targetUser={reportTarget}
                onClose={() => setReportModalOpen(false)}
              />
            )}
          </>
        ) : (
          <p className="chat-placeholder">Select a conversation to start chatting</p>
        )}
      </div>
    </div>
  );
}
