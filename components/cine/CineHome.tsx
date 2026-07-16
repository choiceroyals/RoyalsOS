"use client";
import styles from "./CineWorkspace.module.css";

type Props = { onOpen: (tool: string) => void };
const tools = [
  ["video", "Video Studio", "Create ads, shorts, music videos and branded campaigns."],
  ["voice", "Text to Speech", "Generate narration, podcasts and long-form audio."],
  ["voice", "Voice Lab", "Manage saved voices and authorized voice clones."],
  ["editor", "Cine Editor", "CapCut-inspired timeline, captions, logos, audio and export roadmap."],
  ["assets", "Asset Library", "Browse uploaded, generated and brand assets without crowding the project form."],
  ["library", "Recent Projects", "Continue planned, rendering and completed productions."],
];
export default function CineHome({ onOpen }: Props) {
  return <div className={styles.toolPage}><div className={styles.pageHeader}><div><span className={styles.eyebrow}>RoyalOS Creative Department</span><h2>All tools</h2><p>Choose a focused workspace instead of working inside one crowded form.</p></div></div><div className={styles.toolGrid}>{tools.map(([id,title,description]) => <button key={title} className={styles.toolCard} onClick={() => onOpen(id)}><span className={styles.toolIcon}>✦</span><strong>{title}</strong><small>{description}</small><b>Open tool →</b></button>)}</div></div>;
}
