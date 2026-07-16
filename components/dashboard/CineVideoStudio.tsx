"use client";

import { useState } from "react";
import CineVideoGenerator from "./CineVideoGenerator";
import RoyalOSAssetGallery from "./RoyalOSAssetGallery";
import CineHome from "../cine/CineHome";
import VoiceStudio from "../cine/VoiceStudio";
import styles from "../cine/CineWorkspace.module.css";

type Props = { onOpenConnections?: () => void; onOpenApprovals?: () => void };
type Tool = "home"|"video"|"voice"|"editor"|"assets"|"library"|"queue"|"templates";

export default function CineVideoStudio(props: Props) {
  const [tool, setTool] = useState<Tool>("home");
  const navigation: Array<[Tool,string]> = [
    ["home","Home"],["video","Video Studio"],["voice","Voice Studio"],["editor","Cine Editor"],
    ["assets","Assets"],["library","Recent Projects"],["queue","Production Queue"],["templates","Templates"],
  ];
  function content() {
    if (tool === "home") return <CineHome onOpen={(id) => setTool(id as Tool)} />;
    if (tool === "video") return <CineVideoGenerator {...props} />;
    if (tool === "voice") return <VoiceStudio />;
    if (tool === "assets") return <RoyalOSAssetGallery />;
    if (tool === "library") return <CineVideoGenerator {...props} />;
    return <div className={styles.placeholder}><div><strong>{tool === "editor" ? "Cine Editor" : tool === "queue" ? "Production Queue" : "Templates"}</strong><span>{tool === "editor" ? "CapCut-style timeline editing is staged for the native FFmpeg/Remotion renderer. Current projects can export a CapCut-ready media package." : "This workspace is prepared and will activate as production records are created."}</span></div></div>;
  }
  return <div className={styles.workspace}>
    <aside className={styles.side}><div className={styles.brand}>Cine Studio</div><button className={styles.create} onClick={() => setTool("video")}>＋ Create new</button><div className={styles.group}>CREATE WITH AI</div><nav className={styles.nav}>{navigation.slice(0,4).map(([id,label]) => <button key={id} data-active={tool===id} onClick={() => setTool(id)}>{label}</button>)}</nav><div className={styles.group}>PROJECTS & ASSETS</div><nav className={styles.nav}>{navigation.slice(4).map(([id,label]) => <button key={id} data-active={tool===id} onClick={() => setTool(id)}>{label}</button>)}</nav></aside>
    <main className={styles.content}>{content()}</main>
  </div>;
}
