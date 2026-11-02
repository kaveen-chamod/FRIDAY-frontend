import { useEffect, useRef } from "react";
import { Languages, MessageSquareText, Sparkles } from "lucide-react";

export default function ConversationFeed({ messages, text, setText, onSend, connected, busy }) {
  const bottom = useRef(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  function submit(event) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    onSend(text.trim());
  }
  return (
    <section className="panel conversation-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">MULTILINGUAL CHANNEL</span><h2>CONVERSATION</h2></div>
        <span className="language-chip"><Languages size={14} /> EN · සිං · SI</span>
      </div>
      <div className="transcript-feed">
        {messages.length === 0 ? (
          <div className="empty-conversation"><span><Sparkles size={17} /></span><b>CHANNEL READY</b><p>Connect live voice to speak, or send a text message to begin.</p><small>ENGLISH · SINHALA · SINGLISH</small></div>
        ) : messages.map((message, index) => (
          <article className={`transcript-message ${message.role}`} key={`${message.id || index}`}>
            <div className="message-meta"><span>{message.role === "assistant" ? "F.R.I.D.A.Y." : "YOU"}</span><time>{message.time || "NOW"}</time></div>
            <p>{message.text}</p>
          </article>
        ))}
        <div ref={bottom} />
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <MessageSquareText size={16} />
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder={connected ? "Send a text message..." : "Connect backend to send a message..."} aria-label="Message F.R.I.D.A.Y." />
        <button type="submit" disabled={!text.trim() || busy} aria-label="Send message"><span>↗</span></button>
      </form>
      <div className="conversation-foot"><span className={connected ? "online" : ""}><i /> {connected ? "LIVE SESSION ACTIVE" : "NO ACTIVE SESSION"}</span><span>PRIVATE CHANNEL</span></div>
    </section>
  );
}
