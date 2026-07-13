"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./page.module.css";
import OrionDeveloperWorkbench from "../components/dashboard/OrionDeveloperWorkbenchShell";

type WorkMode =
  | "Task"
  | "Mission";

type EmployeeName =
  | "Adedeji"
  | "Atlas"
  | "Emmy"
  | "Nova"
  | "Jack"
  | "Tyson"
  | "Titan"
  | "Janet"
  | "Orion";

type WorkspaceName =
  | "Triple-Hay Concept LLC"
  | "ChoiceRoyals"
  | "Xena Grace"
  | "TD Talk";

type NavigationSection =
  | "Dashboard"
  | "Ifeoluwa"
  | "Nova Studio"
  | "Asset Gallery"
  | "Workspaces"
  | "AI Workforce"
  | "Developer Workbench"
  | "Missions"
  | "Approvals"
  | "Knowledge"
  | "Memory"
  | "Messages"
  | "Analytics"
  | "Settings";

type ChatRole =
  | "user"
  | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  imageDataUrl?: string;
  imageName?: string;
};

type RoyalOSResponse = {
  draft?: string;
  error?: string;
  missionId?: string;
  employee?: string;
  role?: string;
  documentsLoaded?: number;

  memoryRecall?: {
    memoriesFound?: number;
    memoriesSelected?: number;
  };

  collaboration?: {
    participatingEmployees?: string[];
    completedReports?: number;
    failedReports?: number;
    succeeded?: boolean;
  };

  memoryPersistence?: {
    saved?: boolean;
    recordsSaved?: number;
  };

  performance?: {
    totalRequestMs?: number;
  };
};

type IfeoluwaResponse = {
  reply?: string;
  error?: string;
  responseId?: string;
};

type RoyalOSAsset = {
  id?: string;
  asset_id: string;
  title: string;
  description?: string | null;
  asset_type: string;
  provider: string;
  status: string;
  approval_status: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
  storage_path?: string | null;
  signed_url?: string | null;
};

type AssetGalleryResponse = {
  assets?: RoyalOSAsset[];
  error?: string;
};

type NovaImageResult = {
  success?: boolean;
  status?: string;
  output?: {
    assetId?: string;
    title?: string;
    signedUrl?: string;
    storagePath?: string;
    sizeBytes?: number;
    width?: number | null;
    height?: number | null;
  };
  error?: string;
};

type NovaImageResponse = {
  message?: string;
  result?: NovaImageResult;
  error?: string;
  details?: string;
};

type EmployeeCallMessage = {
  id: string;
  speaker: "Ayobami" | EmployeeName;
  content: string;
  createdAt: string;
};

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  length: number;
  [index: number]:
    SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike
  extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike
  extends Event {
  error?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;

  start: () => void;
  stop: () => void;
  abort: () => void;

  onresult:
    | ((
        event: SpeechRecognitionEventLike
      ) => void)
    | null;

  onend:
    | (() => void)
    | null;

  onerror:
    | ((
        event: SpeechRecognitionErrorLike
      ) => void)
    | null;
}

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?:
      SpeechRecognitionConstructor;

    webkitSpeechRecognition?:
      SpeechRecognitionConstructor;
  }
}

const EMPLOYEES: Array<{
  name: EmployeeName;
  role: string;
  status: string;
  assignment: string;
  image: string;
  initials: string;
  tone:
    | "blue"
    | "green"
    | "gold"
    | "purple"
    | "neutral";
}> = [
  {
    name: "Adedeji",
    role: "Chief of Staff",
    status: "Coordinating",
    assignment:
      "Executive mission coordination",
    image:
      "/avatars/adedeji.jpg",
    initials: "AD",
    tone: "blue",
  },
  {
    name: "Atlas",
    role:
      "Research & Business Intelligence",
    status: "Researching",
    assignment:
      "Market and competitive analysis",
    image:
      "/avatars/atlas.jpg",
    initials: "AT",
    tone: "green",
  },
  {
    name: "Emmy",
    role:
      "Marketing & Content Strategy",
    status: "Preparing Strategy",
    assignment:
      "Campaign and audience planning",
    image:
      "/avatars/emmy.jpg",
    initials: "EM",
    tone: "purple",
  },
  {
    name: "Titan",
    role: "Operations",
    status: "Building Plan",
    assignment:
      "Operational launch planning",
    image:
      "/avatars/titan.jpg",
    initials: "TI",
    tone: "gold",
  },
  {
    name: "Tyson",
    role:
      "Data & Business Intelligence",
    status: "Analyzing",
    assignment:
      "Measurement and performance",
    image:
      "/avatars/tyson.jpg",
    initials: "TY",
    tone: "green",
  },
  {
    name: "Orion",
    role:
      "Technology & AI Systems",
    status: "Reviewing",
    assignment:
      "Technical architecture",
    image:
      "/avatars/orion.jpg",
    initials: "OR",
    tone: "blue",
  },
  {
    name: "Nova",
    role: "Creative Direction",
    status: "Available",
    assignment:
      "Ready for assignment",
    image:
      "/avatars/nova.jpg",
    initials: "NO",
    tone: "neutral",
  },
  {
    name: "Jack",
    role:
      "Media & Video Production",
    status: "Available",
    assignment:
      "Ready for assignment",
    image:
      "/avatars/jack.jpg",
    initials: "JA",
    tone: "neutral",
  },
  {
    name: "Janet",
    role:
      "Customer Experience",
    status: "Available",
    assignment:
      "Ready for assignment",
    image:
      "/avatars/janet.jpg",
    initials: "JN",
    tone: "neutral",
  },
];

const NAVIGATION: Array<{
  section: NavigationSection;
  icon: string;
  badge?: string;
}> = [
  {
    section: "Dashboard",
    icon: "⌂",
  },
  {
    section: "Ifeoluwa",
    icon: "✦",
    badge: "NEW",
  },
  {
    section: "Nova Studio",
    icon: "✧",
    badge: "NEW",
  },
  {
    section: "Asset Gallery",
    icon: "▧",
  },
  {
    section: "Workspaces",
    icon: "▦",
  },
  {
    section: "AI Workforce",
    icon: "♙",
  },
  {
    section: "Developer Workbench",
    icon: "</>",
    badge: "NEW",
  },
  {
    section: "Missions",
    icon: "◉",
  },
  {
    section: "Approvals",
    icon: "✓",
    badge: "3",
  },
  {
    section: "Knowledge",
    icon: "▤",
  },
  {
    section: "Memory",
    icon: "◫",
  },
  {
    section: "Messages",
    icon: "✉",
  },
  {
    section: "Analytics",
    icon: "▥",
  },
  {
    section: "Settings",
    icon: "⚙",
  },
];

const ACTIVE_MISSIONS = [
  {
    title:
      "Cybersecurity Webinar Launch",
    workspace: "ChoiceRoyals",
    progress: 65,
    status: "In Progress",
  },
  {
    title:
      "Q2 Business Growth Strategy",
    workspace:
      "Triple-Hay Concept LLC",
    progress: 40,
    status: "In Progress",
  },
  {
    title:
      "AI Course Production Pipeline",
    workspace: "ChoiceRoyals",
    progress: 25,
    status: "Planning",
  },
  {
    title:
      "Xena Grace Music Marketing Plan",
    workspace: "Xena Grace",
    progress: 70,
    status: "In Progress",
  },
];

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "initial-ifeoluwa",
    role: "assistant",
    content:
      "Good evening, Ayobami. I am here with you. We can talk naturally, think through an idea, organize your priorities, or turn a conversation into a RoyalOS mission.",
    createdAt: "",
  },
];
const IFEOLUWA_CHAT_STORAGE_KEY =
  "royalos:ifeoluwa:private-chat:v1";

const MAX_SAVED_CHAT_MESSAGES = 200;

type StoredIfeoluwaChat = {
  version: 1;
  updatedAt: string;
  messages: ChatMessage[];
};

function isValidStoredMessage(
  value: unknown
): value is ChatMessage {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as Partial<ChatMessage>;

  return (
    typeof candidate.id === "string" &&
    (
      candidate.role === "user" ||
      candidate.role === "assistant"
    ) &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function readIfeoluwaChatMemory(): ChatMessage[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const savedValue =
      window.localStorage.getItem(
        IFEOLUWA_CHAT_STORAGE_KEY
      );

    if (!savedValue) {
      return [];
    }

    const parsed =
      JSON.parse(savedValue) as
        | StoredIfeoluwaChat
        | ChatMessage[];

    const possibleMessages =
      Array.isArray(parsed)
        ? parsed
        : parsed?.messages;

    if (
      !Array.isArray(
        possibleMessages
      )
    ) {
      return [];
    }

    return possibleMessages
      .filter(isValidStoredMessage)
      .slice(
        -MAX_SAVED_CHAT_MESSAGES
      );
  } catch (error) {
    console.error(
      "RoyalOS could not read Ifeoluwa private chat memory:",
      error
    );

    window.localStorage.removeItem(
      IFEOLUWA_CHAT_STORAGE_KEY
    );

    return [];
  }
}

function saveIfeoluwaChatMemory(
  messages: ChatMessage[]
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    const payload:
      StoredIfeoluwaChat = {
        version: 1,

        updatedAt:
          new Date().toISOString(),

        messages:
          messages
            .slice(
              -MAX_SAVED_CHAT_MESSAGES
            )
            .map((message) => ({
              ...message,
              imageDataUrl:
                undefined,
            })),
      };

    window.localStorage.setItem(
      IFEOLUWA_CHAT_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch (error) {
    console.error(
      "RoyalOS could not save Ifeoluwa private chat memory:",
      error
    );
  }
}
function createId(): string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID === "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function formatTime(
  value: string
): string {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function formatDuration(
  milliseconds?: number
): string {
  if (!milliseconds) {
    return "—";
  }

  const totalSeconds =
    Math.round(
      milliseconds / 1000
    );

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const seconds =
    totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

function Avatar({
  src,
  alt,
  initials,
  size = "medium",
}: {
  src: string;
  alt: string;
  initials: string;
  size?:
    | "small"
    | "medium"
    | "large"
    | "hero";
}) {
  const [failed, setFailed] =
    useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const sizeClass =
    styles[
      `avatar${size
        .charAt(0)
        .toUpperCase()}${size.slice(
        1
      )}`
    ];

  return (
    <div
      className={`${styles.avatar} ${sizeClass}`}
      aria-label={alt}
    >
      {failed ? (
        <span>
          {initials}
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display =
              "none";

            setFailed(true);
          }}
        />
      )}
    </div>
  );
}

function StatusDot({
  tone,
}: {
  tone:
    | "blue"
    | "green"
    | "gold"
    | "purple"
    | "neutral";
}) {
  return (
    <span
      className={`${styles.statusDot} ${
        styles[
          `status${tone
            .charAt(0)
            .toUpperCase()}${tone.slice(
            1
          )}`
        ]
      }`}
    />
  );
}

export default function Home() {
  const [activeSection, setActiveSection] =
    useState<NavigationSection>(
      "Dashboard"
    );

  const [greeting, setGreeting] =
    useState(
      "Welcome back"
    );

  const [idea, setIdea] =
    useState("");

  const [
    workspace,
    setWorkspace,
  ] =
    useState<WorkspaceName>(
      "ChoiceRoyals"
    );

  const [
    employee,
    setEmployee,
  ] =
    useState<EmployeeName>(
      "Adedeji"
    );

  const [mode, setMode] =
    useState<WorkMode>(
      "Mission"
    );

  const [draft, setDraft] =
    useState("");

  const [
    missionLoading,
    setMissionLoading,
  ] =
    useState(false);

  const [
    missionError,
    setMissionError,
  ] =
    useState("");

  const [
    missionResult,
    setMissionResult,
  ] =
    useState<RoyalOSResponse | null>(
      null
    );

  const [
    notifications,
    setNotifications,
  ] =
    useState<string[]>([]);

  const [
    messages,
    setMessages,
  ] =
    useState<ChatMessage[]>(
      INITIAL_CHAT_MESSAGES
    );

  const [
    ifeoluwaMemoryReady,
    setIfeoluwaMemoryReady,
  ] = useState(false);

  const [
    ifeoluwaInput,
    setIfeoluwaInput,
  ] =
    useState("");

  const [
    chatLoading,
    setChatLoading,
  ] =
    useState(false);

  const chatLoadingRef =
    useRef(false);

  const [
    chatError,
    setChatError,
  ] =
    useState("");

  const [
    listening,
    setListening,
  ] =
    useState(false);

  const [
    voiceReplies,
    setVoiceReplies,
  ] =
    useState(true);

  const [
    ifeoluwaCallActive,
    setIfeoluwaCallActive,
  ] = useState(false);

  const ifeoluwaCallActiveRef =
    useRef(false);

  const [
    ifeoluwaImage,
    setIfeoluwaImage,
  ] = useState<File | null>(
    null
  );

  const [
    ifeoluwaImagePreview,
    setIfeoluwaImagePreview,
  ] = useState("");

  const ifeoluwaFileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    selectedCallEmployee,
    setSelectedCallEmployee,
  ] =
    useState<EmployeeName>(
      "Adedeji"
    );

  const [
    employeeCallActive,
    setEmployeeCallActive,
  ] = useState(false);

  const employeeCallActiveRef =
    useRef(false);

  const [
    employeeCallLoading,
    setEmployeeCallLoading,
  ] = useState(false);

  const employeeCallLoadingRef =
    useRef(false);

  const [
    employeeCallListening,
    setEmployeeCallListening,
  ] = useState(false);

  const [
    employeeCallError,
    setEmployeeCallError,
  ] = useState("");

  const [
    employeeCallMessages,
    setEmployeeCallMessages,
  ] = useState<EmployeeCallMessage[]>([]);

  const employeeRecognitionRef =
    useRef<SpeechRecognitionInstance | null>(
      null
    );

  const [
    novaPrompt,
    setNovaPrompt,
  ] = useState("");

  const [
    novaTitle,
    setNovaTitle,
  ] = useState("");

  const [
    novaSize,
    setNovaSize,
  ] = useState(
    "1024x1024"
  );

  const [
    novaQuality,
    setNovaQuality,
  ] = useState(
    "medium"
  );

  const [
    novaPurpose,
    setNovaPurpose,
  ] = useState(
    "general"
  );

  const [
    novaLoading,
    setNovaLoading,
  ] = useState(false);

  const [
    novaError,
    setNovaError,
  ] = useState("");

  const [
    novaResult,
    setNovaResult,
  ] = useState<RoyalOSAsset | null>(
    null
  );

  const [
    assets,
    setAssets,
  ] = useState<RoyalOSAsset[]>([]);

  const [
    assetsLoading,
    setAssetsLoading,
  ] = useState(false);

  const [
    assetError,
    setAssetError,
  ] = useState("");

  const [
    assetSearch,
    setAssetSearch,
  ] = useState("");

  const [
    uploadFile,
    setUploadFile,
  ] = useState<File | null>(
    null
  );

  const [
    uploadTitle,
    setUploadTitle,
  ] = useState("");

  const [
    uploadLoading,
    setUploadLoading,
  ] = useState(false);

  const recognitionRef =
    useRef<SpeechRecognitionInstance | null>(
      null
    );

  const chatEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      setGreeting(
        "Good morning"
      );
    } else if (hour < 17) {
      setGreeting(
        "Good afternoon"
      );
    } else {
      setGreeting(
        "Good evening"
      );
    }
  }, []);

  useEffect(() => {
    chatLoadingRef.current =
      chatLoading;
  }, [chatLoading]);

  useEffect(() => {
    employeeCallLoadingRef.current =
      employeeCallLoading;
  }, [employeeCallLoading]);

  useEffect(() => {
    const savedMessages =
      readIfeoluwaChatMemory();

    if (
      savedMessages.length > 0
    ) {
      setMessages(
        savedMessages
      );
    }

    setIfeoluwaMemoryReady(
      true
    );
  }, []);

  useEffect(() => {
    if (
      !ifeoluwaMemoryReady
    ) {
      return;
    }

    saveIfeoluwaChatMemory(
      messages
    );
  }, [
    messages,
    ifeoluwaMemoryReady,
  ]);

  useEffect(() => {
    chatEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [
    messages,
    chatLoading,
  ]);

  useEffect(() => {
    return () => {
      recognitionRef.current
        ?.abort();

      employeeRecognitionRef.current
        ?.abort();

      if (
        typeof window !==
        "undefined"
      ) {
        window.speechSynthesis
          ?.cancel();
      }
    };
  }, []);

  const activeEmployees =
    useMemo(
      () =>
        EMPLOYEES.filter(
          (person) =>
            person.status !==
            "Available"
        ).length,
      []
    );

  function speakReply(
    text: string,
    onEnd?: () => void
  ) {
    if (
      !voiceReplies ||
      typeof window ===
        "undefined" ||
      !window.speechSynthesis
    ) {
      onEnd?.();
      return;
    }

    window.speechSynthesis
      .cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang =
      "en-US";

    utterance.onend =
      () => onEnd?.();

    utterance.onerror =
      () => onEnd?.();

    window.speechSynthesis
      .speak(utterance);
  }

  function stopVoiceOutput() {
    ifeoluwaCallActiveRef.current =
      false;
    employeeCallActiveRef.current =
      false;

    setIfeoluwaCallActive(false);
    setEmployeeCallActive(false);

    if (
      typeof window !==
      "undefined"
    ) {
      window.speechSynthesis
        ?.cancel();
    }

    recognitionRef.current
      ?.abort();

    employeeRecognitionRef.current
      ?.abort();

    setListening(false);
    setEmployeeCallListening(false);
  }

  async function sendIfeoluwaMessage(
    suppliedMessage?: string
  ) {
    const typedMessage =
      (
        suppliedMessage ??
        ifeoluwaInput
      ).trim();

    const attachedImage =
      ifeoluwaImagePreview;

    const attachedImageName =
      ifeoluwaImage?.name;

    const attachedImageMimeType =
      ifeoluwaImage?.type;

    const message =
      typedMessage ||
      (
        attachedImage
          ? "Ifeoluwa, please read, explain, and analyze this image."
          : ""
      );

    if (
      !message ||
      chatLoadingRef.current
    ) {
      return;
    }

    const userMessage:
      ChatMessage = {
        id: createId(),
        role: "user",
        content: message,
        createdAt:
          new Date().toISOString(),
        imageDataUrl:
          attachedImage ||
          undefined,
        imageName:
          attachedImageName,
      };

    const updatedConversation = [
      ...messages,
      userMessage,
    ];

    const conversationHistory =
      updatedConversation.slice(
        -14
      );

    setMessages(
      updatedConversation
    );

    setIfeoluwaInput("");
    setIfeoluwaImage(null);
    setIfeoluwaImagePreview("");
    setChatError("");
    setChatLoading(true);

    try {
      const response =
        await fetch(
          "/api/ifeoluwa/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                message,

                history:
                  conversationHistory.map(
                    (item) => ({
                      role:
                        item.role,

                      content:
                        item.content,
                    })
                  ),

                workspace,

                imageDataUrl:
                  attachedImage ||
                  undefined,

                imageMimeType:
                  attachedImageMimeType,

                imageName:
                  attachedImageName,
              }),
          }
        );

      const data =
        (await response.json()) as
          IfeoluwaResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Ifeoluwa could not respond."
        );
      }

      const reply =
        data.reply?.trim();

      if (!reply) {
        throw new Error(
          "Ifeoluwa returned an empty response."
        );
      }

      const assistantMessage:
        ChatMessage = {
          id: createId(),
          role: "assistant",
          content: reply,
          createdAt:
            new Date().toISOString(),
        };

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

      speakReply(
        reply,
        () => {
          if (
            ifeoluwaCallActiveRef.current
          ) {
            window.setTimeout(
              () =>
                beginIfeoluwaListening(),
              350
            );
          }
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ifeoluwa could not respond.";

      setChatError(
        errorMessage
      );
    } finally {
      setChatLoading(false);
    }
  }

  function beginIfeoluwaListening() {
    if (
      typeof window ===
        "undefined" ||
      chatLoading
    ) {
      return;
    }

    const Recognition =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;

    if (!Recognition) {
      setChatError(
        "Voice recognition is not available in this browser. Chrome or Microsoft Edge is recommended."
      );
      ifeoluwaCallActiveRef.current =
        false;
      setIfeoluwaCallActive(false);
      return;
    }

    recognitionRef.current
      ?.abort();

    const recognition =
      new Recognition();

    recognition.lang =
      "en-US";
    recognition.continuous =
      false;
    recognition.interimResults =
      false;

    recognition.onresult =
      (event) => {
        let transcript = "";

        for (
          let index = 0;
          index <
          event.results.length;
          index += 1
        ) {
          transcript +=
            event.results[
              index
            ][0]?.transcript ??
            "";
        }

        const cleanedTranscript =
          transcript.trim();

        if (cleanedTranscript) {
          setIfeoluwaInput(
            cleanedTranscript
          );

          void sendIfeoluwaMessage(
            cleanedTranscript
          );
        }
      };

    recognition.onerror =
      (event) => {
        setListening(false);

        if (
          event.error ===
          "not-allowed"
        ) {
          setChatError(
            "Microphone permission was denied. Allow microphone access and try again."
          );
          ifeoluwaCallActiveRef.current =
            false;
          setIfeoluwaCallActive(false);
        } else if (
          event.error !==
          "no-speech"
        ) {
          setChatError(
            "The microphone could not understand the conversation. Please try again."
          );
        }
      };

    recognition.onend =
      () => {
        setListening(false);

        if (
          ifeoluwaCallActiveRef.current &&
          !chatLoadingRef.current
        ) {
          window.setTimeout(
            () =>
              beginIfeoluwaListening(),
            500
          );
        }
      };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function startVoiceConversation() {
    if (
      ifeoluwaCallActiveRef.current
    ) {
      ifeoluwaCallActiveRef.current =
        false;
      setIfeoluwaCallActive(false);
      recognitionRef.current
        ?.abort();
      setListening(false);
      return;
    }

    setChatError("");
    window.speechSynthesis
      ?.cancel();

    ifeoluwaCallActiveRef.current =
      true;
    setIfeoluwaCallActive(true);
    beginIfeoluwaListening();
  }

  function clearIfeoluwaImage() {
    setIfeoluwaImage(
      null
    );

    setIfeoluwaImagePreview(
      ""
    );

    if (
      ifeoluwaFileInputRef.current
    ) {
      ifeoluwaFileInputRef.current.value =
        "";
    }
  }

  function handleIfeoluwaImage(
    file: File | null
  ) {
    setChatError("");

    if (!file) {
      clearIfeoluwaImage();
      return;
    }

    const supportedTypes =
      new Set([
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
      ]);

    if (
      !supportedTypes.has(
        file.type
      )
    ) {
      setChatError(
        "Please choose a PNG, JPEG, WebP, or GIF image for Ifeoluwa."
      );

      clearIfeoluwaImage();
      return;
    }

    if (
      file.size >
      8 * 1024 * 1024
    ) {
      setChatError(
        "The image is larger than 8 MB. Choose a smaller image."
      );

      clearIfeoluwaImage();
      return;
    }

    setIfeoluwaImage(
      file
    );

    const reader =
      new FileReader();

    reader.onload =
      () => {
        const result =
          typeof reader.result ===
            "string"
            ? reader.result
            : "";

        if (!result) {
          setChatError(
            "RoyalOS could not prepare this image. Please choose another one."
          );

          clearIfeoluwaImage();
          return;
        }

        setIfeoluwaImagePreview(
          result
        );
      };

    reader.onerror =
      () => {
        setChatError(
          "RoyalOS could not read this image file."
        );

        clearIfeoluwaImage();
      };

    reader.readAsDataURL(
      file
    );
  }

  async function sendEmployeeCallMessage(
    transcript: string
  ) {
    const message =
      transcript.trim();

    if (
      !message ||
      employeeCallLoadingRef.current
    ) {
      return;
    }

    setEmployeeCallMessages(
      (previous) => [
        ...previous,
        {
          id: createId(),
          speaker: "Ayobami",
          content: message,
          createdAt:
            new Date().toISOString(),
        },
      ]
    );

    setEmployeeCallLoading(true);
    setEmployeeCallError("");

    try {
      const response =
        await fetch(
          "/api/royalos",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                idea: message,
                workspace,
                employee:
                  selectedCallEmployee,
                mode: "Task",
              }),
          }
        );

      const data =
        (await response.json()) as
          RoyalOSResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            `${selectedCallEmployee} could not respond.`
        );
      }

      const reply =
        data.draft?.trim() ||
        `${selectedCallEmployee} returned no spoken response.`;

      setEmployeeCallMessages(
        (previous) => [
          ...previous,
          {
            id: createId(),
            speaker:
              selectedCallEmployee,
            content: reply,
            createdAt:
              new Date().toISOString(),
          },
        ]
      );

      speakReply(
        reply,
        () => {
          if (
            employeeCallActiveRef.current
          ) {
            window.setTimeout(
              () =>
                beginEmployeeListening(),
              350
            );
          }
        }
      );
    } catch (error) {
      setEmployeeCallError(
        error instanceof Error
          ? error.message
          : `${selectedCallEmployee} could not respond.`
      );
    } finally {
      setEmployeeCallLoading(false);
    }
  }

  function beginEmployeeListening() {
    if (
      typeof window ===
        "undefined" ||
      employeeCallLoading
    ) {
      return;
    }

    const Recognition =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;

    if (!Recognition) {
      setEmployeeCallError(
        "Voice recognition is not available in this browser."
      );
      employeeCallActiveRef.current =
        false;
      setEmployeeCallActive(false);
      return;
    }

    employeeRecognitionRef.current
      ?.abort();

    const recognition =
      new Recognition();

    recognition.lang =
      "en-US";
    recognition.continuous =
      false;
    recognition.interimResults =
      false;

    recognition.onresult =
      (event) => {
        let transcript = "";

        for (
          let index = 0;
          index <
          event.results.length;
          index += 1
        ) {
          transcript +=
            event.results[
              index
            ][0]?.transcript ??
            "";
        }

        if (
          transcript.trim()
        ) {
          void sendEmployeeCallMessage(
            transcript.trim()
          );
        }
      };

    recognition.onerror =
      (event) => {
        setEmployeeCallListening(false);

        if (
          event.error ===
          "not-allowed"
        ) {
          setEmployeeCallError(
            "Microphone permission was denied."
          );
          employeeCallActiveRef.current =
            false;
          setEmployeeCallActive(false);
        }
      };

    recognition.onend =
      () => {
        setEmployeeCallListening(false);

        if (
          employeeCallActiveRef.current &&
          !employeeCallLoadingRef.current
        ) {
          window.setTimeout(
            () =>
              beginEmployeeListening(),
            500
          );
        }
      };

    employeeRecognitionRef.current =
      recognition;

    try {
      recognition.start();
      setEmployeeCallListening(true);
    } catch {
      setEmployeeCallListening(false);
    }
  }

  function toggleEmployeeCall() {
    if (
      employeeCallActiveRef.current
    ) {
      employeeCallActiveRef.current =
        false;
      setEmployeeCallActive(false);
      employeeRecognitionRef.current
        ?.abort();
      window.speechSynthesis
        ?.cancel();
      setEmployeeCallListening(false);
      return;
    }

    employeeCallActiveRef.current =
      true;
    setEmployeeCallActive(true);
    setEmployeeCallError("");
    beginEmployeeListening();
  }

  async function loadAssets() {
    setAssetsLoading(true);
    setAssetError("");

    try {
      const response =
        await fetch(
          "/api/tools/images/assets",
          {
            cache: "no-store",
          }
        );

      const data =
        (await response.json()) as
          AssetGalleryResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "RoyalOS could not load the asset gallery."
        );
      }

      setAssets(
        data.assets ??
          []
      );
    } catch (error) {
      setAssetError(
        error instanceof Error
          ? error.message
          : "RoyalOS could not load the asset gallery."
      );
    } finally {
      setAssetsLoading(false);
    }
  }

  async function generateNovaImage() {
    const prompt =
      novaPrompt.trim();

    if (!prompt) {
      setNovaError(
        "Tell Nova what image to create."
      );
      return;
    }

    setNovaLoading(true);
    setNovaError("");

    try {
      const response =
        await fetch(
          "/api/tools/images",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                prompt,
                title:
                  novaTitle.trim() ||
                  undefined,
                purpose:
                  novaPurpose,
                size:
                  novaSize,
                quality:
                  novaQuality,
                background:
                  "opaque",
                workspace,
                employee:
                  "Nova",
                mode:
                  "Task",
              }),
          }
        );

      const data =
        (await response.json()) as
          NovaImageResponse;

      if (
        !response.ok ||
        !data.result
          ?.success
      ) {
        throw new Error(
          data.error ||
            data.details ||
            data.result
              ?.error ||
            "Nova could not generate the image."
        );
      }

      const output =
        data.result.output;

      if (
        !output?.assetId ||
        !output.signedUrl
      ) {
        throw new Error(
          "Nova generated the image but no preview link was returned."
        );
      }

      const newAsset:
        RoyalOSAsset = {
          asset_id:
            output.assetId,
          title:
            output.title ||
            novaTitle ||
            "Nova Generated Image",
          asset_type:
            "image",
          provider:
            "openai",
          status:
            "ready",
          approval_status:
            "pending",
          mime_type:
            "image/png",
          size_bytes:
            output.sizeBytes ??
            null,
          created_at:
            new Date().toISOString(),
          storage_path:
            output.storagePath ??
            null,
          signed_url:
            output.signedUrl,
        };

      setNovaResult(
        newAsset
      );
      setAssets(
        (previous) => [
          newAsset,
          ...previous.filter(
            (asset) =>
              asset.asset_id !==
              newAsset.asset_id
          ),
        ]
      );

      setNotifications(
        (previous) => [
          `${new Date().toLocaleString()} — Nova generated "${newAsset.title}".`,
          ...previous,
        ].slice(0, 12)
      );
    } catch (error) {
      setNovaError(
        error instanceof Error
          ? error.message
          : "Nova could not generate the image."
      );
    } finally {
      setNovaLoading(false);
    }
  }

  async function uploadRoyalOSAsset() {
    if (!uploadFile) {
      setAssetError(
        "Choose an image or file to upload."
      );
      return;
    }

    setUploadLoading(true);
    setAssetError("");

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        uploadFile
      );

      if (
        uploadTitle.trim()
      ) {
        formData.append(
          "title",
          uploadTitle.trim()
        );
      }

      formData.append(
        "workspace",
        workspace
      );

      formData.append(
        "employee",
        "Nova"
      );

      const response =
        await fetch(
          "/api/tools/assets/upload",
          {
            method: "POST",
            body:
              formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "RoyalOS could not upload the file."
        );
      }

      setUploadFile(null);
      setUploadTitle("");
      await loadAssets();
    } catch (error) {
      setAssetError(
        error instanceof Error
          ? error.message
          : "RoyalOS could not upload the file."
      );
    } finally {
      setUploadLoading(false);
    }
  }

  async function downloadAsset(
    url: string,
    filename: string
  ) {
    try {
      const response =
        await fetch(url);

      if (!response.ok) {
        throw new Error(
          "Download failed."
        );
      }

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        objectUrl;
      anchor.download =
        filename;
      document.body.appendChild(
        anchor
      );
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(
        objectUrl
      );
    } catch (error) {
      setAssetError(
        error instanceof Error
          ? error.message
          : "RoyalOS could not download the file."
      );
    }
  }

  async function assignWork() {
    const preparedIdea =
      idea.trim();

    if (!preparedIdea) {
      setMissionError(
        "Boss, give RoyalOS a mission or task first."
      );

      return;
    }

    const startedAt =
      new Date()
        .toLocaleString();

    setNotifications(
      (previous) => [
        `${startedAt} — Boss assigned ${mode}: ${preparedIdea}`,
        `${startedAt} — ${employee} started coordination.`,
        ...previous,
      ].slice(0, 12)
    );

    setMissionLoading(true);
    setMissionError("");
    setDraft("");
    setMissionResult(null);

    try {
      const response =
        await fetch(
          "/api/royalos",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                idea:
                  preparedIdea,

                workspace,

                employee,

                mode,
              }),
          }
        );

      const data =
        (await response.json()) as
          RoyalOSResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "RoyalOS could not complete the mission."
        );
      }

      setDraft(
        data.draft ||
          "RoyalOS completed the request but returned no briefing."
      );

      setMissionResult(data);

      setNotifications(
        (previous) => [
          `${new Date().toLocaleString()} — RoyalOS completed mission ${
            data.missionId ??
            ""
          }.`,

          ...previous,
        ].slice(0, 12)
      );
    } catch (error) {
      setMissionError(
        error instanceof Error
          ? error.message
          : "RoyalOS could not complete the request."
      );
    } finally {
      setMissionLoading(false);
    }
  }

  function sendConversationToMission() {
    const recentConversation =
      messages
        .slice(-6)
        .map(
          (message) =>
            `${
              message.role ===
              "user"
                ? "Ayobami"
                : "Ifeoluwa"
            }: ${
              message.content
            }`
        )
        .join("\n\n");

    setIdea(
      `Review the following private discussion summary and turn only the relevant business ideas into an actionable RoyalOS mission. Do not include unrelated personal details.\n\n${recentConversation}`
    );

    setMode("Mission");
    setEmployee(
      "Adedeji"
    );
    setActiveSection(
      "Dashboard"
    );

    setNotifications(
      (previous) => [
        `${new Date().toLocaleString()} — Ifeoluwa prepared a proposed RoyalOS mission for CEO review.`,
        ...previous,
      ].slice(0, 12)
    );
  }

  function newPrivateChat() {
    stopVoiceOutput();

    const freshConversation:
      ChatMessage[] = [
        {
          id: createId(),
          role: "assistant",
          content:
            "We have a fresh private conversation, Ayobami. What is on your mind?",
          createdAt:
            new Date().toISOString(),
        },
      ];

    setMessages(
      freshConversation
    );

    setChatError("");
    setIfeoluwaInput("");

    saveIfeoluwaChatMemory(
      freshConversation
    );
  }

  function handleChatSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    void sendIfeoluwaMessage();
  }

  function renderChatPanel(
    expanded = false
  ) {
    return (
      <section
        className={`${styles.panel} ${styles.chatPanel} ${
          expanded
            ? styles.chatExpanded
            : ""
        }`}
      >
        <header
          className={
            styles.panelHeader
          }
        >
          <div
            className={
              styles.panelTitleGroup
            }
          >
            <Avatar
              src="/avatars/ifeoluwa.jpg"
              alt="Ifeoluwa"
              initials="IF"
              size="small"
            />

            <div>
              <div
                className={
                  styles.chatHeadingLine
                }
              >
                <h2>
                  Talk to Ifeoluwa
                </h2>

                <span
                  className={
                    styles.privateBadge
                  }
                >
                  Private conversation
                </span>
              </div>

              <p>
                Personal Adviser,
                Wellness & Life Coach
              </p>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={
              newPrivateChat
            }
          >
            ＋ New chat
          </button>
        </header>

        <div
          className={
            styles.chatIdentity
          }
        >
          <Avatar
            src="/avatars/ifeoluwa.jpg"
            alt="Ifeoluwa"
            initials="IF"
            size="large"
          />

          <div>
            <h3>
              Ifeoluwa ✨
            </h3>

            <p>
              Talk naturally.
              Think through ideas.
              Get honest guidance.
              Turn clarity into action.
            </p>
          </div>

          <span
            className={
              styles.onlineBadge
            }
          >
            ● Online
          </span>
        </div>

        <div
          className={
            styles.quickActions
          }
        >
          {[
            "Think this through",
            "Plan my day",
            "Help me decide",
            "Give me ideas",
            "Wellness check",
          ].map(
            (action) => (
              <button
                key={action}
                type="button"
                onClick={() =>
                  setIfeoluwaInput(
                    action
                  )
                }
              >
                {action}
              </button>
            )
          )}
        </div>

        <div
          className={
            styles.chatMessages
          }
        >
          {messages.map(
            (message) => (
              <div
                key={
                  message.id
                }
                className={`${styles.messageRow} ${
                  message.role ===
                  "user"
                    ? styles.messageUserRow
                    : styles.messageAssistantRow
                }`}
              >
                {message.role ===
                  "assistant" && (
                  <Avatar
                    src="/avatars/ifeoluwa.jpg"
                    alt="Ifeoluwa"
                    initials="IF"
                    size="small"
                  />
                )}

                <div
                  className={`${styles.messageBubble} ${
                    message.role ===
                    "user"
                      ? styles.userBubble
                      : styles.assistantBubble
                  }`}
                >
                  <div
                    className={
                      styles.messageMeta
                    }
                  >
                    <strong>
                      {message.role ===
                      "user"
                        ? "Ayobami"
                        : "Ifeoluwa"}
                    </strong>

                   {message.createdAt ? (
                     <span>
                      {formatTime(
                        message.createdAt
                      )}
                    </span>
                    ) : null}
                  </div>

                  {message.imageDataUrl ? (
                    <img
                      src={
                        message.imageDataUrl
                      }
                      alt={
                        message.imageName ||
                        "Attached image"
                      }
                      style={{
                        width: "100%",
                        maxWidth: 320,
                        borderRadius: 12,
                        marginBottom: 10,
                      }}
                    />
                  ) : null}

                  <p>
                    {
                      message.content
                    }
                  </p>
                </div>

                {message.role ===
                  "user" && (
                  <Avatar
                    src="/avatars/ayobami.jpg"
                    alt="Ayobami"
                    initials="AA"
                    size="small"
                  />
                )}
              </div>
            )
          )}

          {chatLoading && (
            <div
              className={`${styles.messageRow} ${styles.messageAssistantRow}`}
            >
              <Avatar
                src="/avatars/ifeoluwa.jpg"
                alt="Ifeoluwa"
                initials="IF"
                size="small"
              />

              <div
                className={`${styles.messageBubble} ${styles.assistantBubble}`}
              >
                <div
                  className={
                    styles.typingIndicator
                  }
                >
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div
            ref={
              chatEndRef
            }
          />
        </div>

        {chatError && (
          <div
            className={
              styles.inlineError
            }
          >
            {chatError}
          </div>
        )}

        {ifeoluwaImagePreview ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "88px minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 14,
              width: "100%",
              padding: 14,
              margin:
                "12px 0",
              border:
                "1px solid rgba(248, 211, 109, 0.38)",
              borderRadius: 16,
              background:
                "rgba(248, 211, 109, 0.08)",
              boxSizing:
                "border-box",
            }}
          >
            <img
              src={
                ifeoluwaImagePreview
              }
              alt={
                ifeoluwaImage
                  ?.name ||
                "Image for Ifeoluwa"
              }
              style={{
                width: 88,
                height: 88,
                objectFit: "cover",
                borderRadius: 12,
                border:
                  "1px solid rgba(255,255,255,0.14)",
              }}
            />

            <div
              style={{
                minWidth: 0,
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#ffffff",
                  fontSize: 14,
                  overflow: "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {
                  ifeoluwaImage
                    ?.name
                }
              </strong>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  color:
                    "rgba(255,255,255,0.74)",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                The picture is attached.
                Type your question below,
                or press Send to ask
                Ifeoluwa to analyze it.
              </p>
            </div>

            <button
              type="button"
              onClick={
                clearIfeoluwaImage
              }
              style={{
                minWidth: 82,
                minHeight: 40,
                padding:
                  "9px 13px",
                borderRadius: 10,
                border:
                  "1px solid rgba(255,255,255,0.14)",
                background:
                  "rgba(255,255,255,0.06)",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Remove
            </button>
          </div>
        ) : null}

        <input
          ref={
            ifeoluwaFileInputRef
          }
          type="file"
          accept="image/*"
          hidden
          onChange={(event) =>
            handleIfeoluwaImage(
              event.target
                .files?.[0] ??
                null
            )
          }
        />

        <form
          className={
            styles.chatComposer
          }
          onSubmit={
            handleChatSubmit
          }
          style={{
            display: "grid",
            gridTemplateColumns:
              "48px 48px minmax(0, 1fr) 52px",
            alignItems: "end",
            gap: 10,
            width: "100%",
            padding: 12,
            border:
              "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            background:
              "rgba(8, 12, 20, 0.92)",
            boxSizing:
              "border-box",
            overflow:
              "visible",
          }}
        >
          <button
            type="button"
            onClick={() =>
              ifeoluwaFileInputRef.current
                ?.click()
            }
            title="Attach a picture for Ifeoluwa"
            aria-label="Attach a picture for Ifeoluwa"
            style={{
              width: 48,
              height: 48,
              display: "grid",
              placeItems:
                "center",
              borderRadius: 12,
              border:
                ifeoluwaImagePreview
                  ? "1px solid rgba(248, 211, 109, 0.72)"
                  : "1px solid rgba(255,255,255,0.14)",
              background:
                ifeoluwaImagePreview
                  ? "rgba(248, 211, 109, 0.18)"
                  : "rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: 21,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            📎
          </button>

          <button
            type="button"
            onClick={
              startVoiceConversation
            }
            title={
              listening
                ? "Stop listening"
                : "Start voice conversation"
            }
            aria-label={
              listening
                ? "Stop listening"
                : "Start voice conversation"
            }
            style={{
              width: 48,
              height: 48,
              display: "grid",
              placeItems:
                "center",
              borderRadius: 12,
              border:
                listening
                  ? "1px solid rgba(111, 211, 255, 0.85)"
                  : "1px solid rgba(255,255,255,0.14)",
              background:
                listening
                  ? "rgba(111, 211, 255, 0.18)"
                  : "rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            {listening
              ? "■"
              : "🎙"}
          </button>

          <textarea
            value={
              ifeoluwaInput
            }
            onChange={(
              event
            ) =>
              setIfeoluwaInput(
                event.target
                  .value
              )
            }
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                  "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();

                if (
                  !chatLoading &&
                  (
                    ifeoluwaInput.trim() ||
                    ifeoluwaImagePreview
                  )
                ) {
                  void sendIfeoluwaMessage();
                }
              }
            }}
            placeholder={
              listening
                ? "Listening…"
                : ifeoluwaImagePreview
                  ? "Ask Ifeoluwa what you want her to read or explain…"
                  : "Type a message to Ifeoluwa…"
            }
            rows={2}
            style={{
              display: "block",
              width: "100%",
              minWidth: 0,
              minHeight: 48,
              maxHeight: 160,
              padding:
                "12px 14px",
              borderRadius: 12,
              border:
                "1px solid rgba(255,255,255,0.14)",
              background:
                "rgba(255,255,255,0.07)",
              color: "#ffffff",
              caretColor:
                "#f8d36d",
              fontSize: 15,
              lineHeight: 1.45,
              fontFamily:
                "inherit",
              outline: "none",
              resize: "vertical",
              boxSizing:
                "border-box",
              overflowY: "auto",
              opacity: 1,
            }}
          />

          <button
            type="submit"
            disabled={
              chatLoading ||
              (
                !ifeoluwaInput.trim() &&
                !ifeoluwaImagePreview
              )
            }
            title={
              ifeoluwaImagePreview &&
              !ifeoluwaInput.trim()
                ? "Send the image to Ifeoluwa for analysis"
                : "Send message"
            }
            aria-label="Send to Ifeoluwa"
            style={{
              width: 52,
              height: 48,
              display: "grid",
              placeItems:
                "center",
              borderRadius: 12,
              border: "none",
              background:
                chatLoading ||
                (
                  !ifeoluwaInput.trim() &&
                  !ifeoluwaImagePreview
                )
                  ? "rgba(248, 211, 109, 0.28)"
                  : "#f8d36d",
              color:
                chatLoading ||
                (
                  !ifeoluwaInput.trim() &&
                  !ifeoluwaImagePreview
                )
                  ? "rgba(255,255,255,0.55)"
                  : "#121722",
              cursor:
                chatLoading ||
                (
                  !ifeoluwaInput.trim() &&
                  !ifeoluwaImagePreview
                )
                  ? "not-allowed"
                  : "pointer",
              fontSize: 22,
              fontWeight: 900,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            {chatLoading
              ? "…"
              : "➤"}
          </button>
        </form>

        <div
          className={
            styles.voiceControls
          }
        >
          <button
            type="button"
            className={`${styles.voiceConversationButton} ${
              listening
                ? styles.voiceConversationActive
                : ""
            }`}
            onClick={
              startVoiceConversation
            }
          >
            {ifeoluwaCallActive
              ? listening
                ? "● Live call — listening"
                : chatLoading
                  ? "● Live call — Ifeoluwa is thinking"
                  : "● Live call — speaking"
              : "☎ Start live call"}
          </button>

          <label
            className={
              styles.voiceToggle
            }
          >
            <input
              type="checkbox"
              checked={
                voiceReplies
              }
              onChange={(
                event
              ) =>
                setVoiceReplies(
                  event.target
                    .checked
                )
              }
            />

            <span>
              Spoken replies
            </span>
          </label>

          <button
            type="button"
            className={
              styles.stopVoiceButton
            }
            onClick={
              stopVoiceOutput
            }
          >
            Stop audio
          </button>
        </div>

        <div
          className={
            styles.chatMissionActions
          }
        >
          <button
            type="button"
            onClick={() => {
              setMode(
                "Task"
              );

              sendConversationToMission();
            }}
          >
            Create a task
          </button>

          <button
            type="button"
            onClick={
              sendConversationToMission
            }
          >
            Create a mission
          </button>

          <button
            type="button"
            className={
              styles.goldButton
            }
            onClick={
              sendConversationToMission
            }
          >
            Send to RoyalOS
          </button>
        </div>
      </section>
    );
  }

  function renderNovaStudio() {
    return (
      <section
        className={
          styles.panel
        }
      >
        <header
          className={
            styles.panelHeader
          }
        >
          <div>
            <h2>
              Nova Image Studio
            </h2>
            <p>
              Generate professional
              images and save them
              permanently in RoyalOS.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={() => {
              setActiveSection(
                "Asset Gallery"
              );
              void loadAssets();
            }}
          >
            Open Asset Gallery
          </button>
        </header>

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          <input
            value={novaTitle}
            onChange={(event) =>
              setNovaTitle(
                event.target.value
              )
            }
            placeholder="Internal asset title"
          />

          <textarea
            value={novaPrompt}
            onChange={(event) =>
              setNovaPrompt(
                event.target.value
              )
            }
            rows={8}
            placeholder="Tell Nova exactly what image to generate..."
          />

          <div
            className={
              styles.missionControls
            }
          >
            <label>
              <span>
                Purpose
              </span>
              <select
                value={
                  novaPurpose
                }
                onChange={(event) =>
                  setNovaPurpose(
                    event.target.value
                  )
                }
              >
                <option value="general">
                  General
                </option>
                <option value="social_post">
                  Social post
                </option>
                <option value="website_banner">
                  Website banner
                </option>
                <option value="music_artwork">
                  Music artwork
                </option>
                <option value="book_cover">
                  Book cover
                </option>
                <option value="video_thumbnail">
                  Video thumbnail
                </option>
                <option value="promotional_flyer">
                  Promotional flyer
                </option>
              </select>
            </label>

            <label>
              <span>
                Size
              </span>
              <select
                value={
                  novaSize
                }
                onChange={(event) =>
                  setNovaSize(
                    event.target.value
                  )
                }
              >
                <option value="1024x1024">
                  Square
                </option>
                <option value="1024x1536">
                  Portrait
                </option>
                <option value="1536x1024">
                  Landscape
                </option>
              </select>
            </label>

            <label>
              <span>
                Quality
              </span>
              <select
                value={
                  novaQuality
                }
                onChange={(event) =>
                  setNovaQuality(
                    event.target.value
                  )
                }
              >
                <option value="low">
                  Low
                </option>
                <option value="medium">
                  Medium
                </option>
                <option value="high">
                  High
                </option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className={
              styles.assignButton
            }
            disabled={
              novaLoading
            }
            onClick={() =>
              void generateNovaImage()
            }
          >
            {novaLoading
              ? "Nova is creating the image…"
              : "Generate with Nova"}
          </button>

          {novaError ? (
            <div
              className={
                styles.inlineError
              }
            >
              {novaError}
            </div>
          ) : null}

          {novaResult
            ?.signed_url ? (
            <article
              style={{
                display: "grid",
                gap: 14,
                paddingTop: 12,
              }}
            >
              <img
                src={
                  novaResult
                    .signed_url
                }
                alt={
                  novaResult.title
                }
                style={{
                  width: "100%",
                  maxWidth: 760,
                  borderRadius: 18,
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className={
                    styles.goldButton
                  }
                  onClick={() =>
                    void downloadAsset(
                      novaResult
                        .signed_url!,
                      `${novaResult.title}.png`
                    )
                  }
                >
                  Download image
                </button>

                <button
                  type="button"
                  className={
                    styles.secondaryButton
                  }
                  onClick={() =>
                    window.open(
                      novaResult
                        .signed_url!,
                      "_blank"
                    )
                  }
                >
                  Open full size
                </button>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    );
  }

  function renderAssetGallery() {
    const visibleAssets =
      assets.filter(
        (asset) => {
          const query =
            assetSearch
              .trim()
              .toLowerCase();

          if (!query) {
            return true;
          }

          return [
            asset.title,
            asset.asset_type,
            asset.provider,
            asset.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );

    return (
      <>
        <section
          className={
            styles.panel
          }
        >
          <header
            className={
              styles.panelHeader
            }
          >
            <div>
              <h2>
                RoyalOS Asset Gallery
              </h2>
              <p>
                Upload images and
                files, preview saved
                assets, and download
                completed work.
              </p>
            </div>

            <button
              type="button"
              className={
                styles.secondaryButton
              }
              onClick={() =>
                void loadAssets()
              }
            >
              Refresh
            </button>
          </header>

          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <input
              value={
                uploadTitle
              }
              onChange={(event) =>
                setUploadTitle(
                  event.target
                    .value
                )
              }
              placeholder="Optional asset title"
            />

            <input
              type="file"
              onChange={(event) =>
                setUploadFile(
                  event.target
                    .files?.[0] ??
                    null
                )
              }
            />

            <button
              type="button"
              className={
                styles.assignButton
              }
              disabled={
                uploadLoading
              }
              onClick={() =>
                void uploadRoyalOSAsset()
              }
            >
              {uploadLoading
                ? "Uploading…"
                : "Upload to RoyalOS"}
            </button>

            <input
              type="search"
              value={
                assetSearch
              }
              onChange={(event) =>
                setAssetSearch(
                  event.target.value
                )
              }
              placeholder="Search assets..."
            />

            {assetError ? (
              <div
                className={
                  styles.inlineError
                }
              >
                {assetError}
              </div>
            ) : null}
          </div>
        </section>

        <section
          className={
            styles.panel
          }
          style={{
            marginTop: 18,
          }}
        >
          <header
            className={
              styles.panelHeader
            }
          >
            <div>
              <h2>
                Asset Library
              </h2>
              <p>
                {assetsLoading
                  ? "Loading assets…"
                  : `${visibleAssets.length} asset(s) available`}
              </p>
            </div>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 16,
            }}
          >
            {visibleAssets.map(
              (asset) => (
                <article
                  key={
                    asset.asset_id
                  }
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: 14,
                    border:
                      "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    background:
                      "rgba(255,255,255,0.03)",
                  }}
                >
                  {asset.asset_type ===
                    "image" &&
                  asset.signed_url ? (
                    <img
                      src={
                        asset.signed_url
                      }
                      alt={
                        asset.title
                      }
                      style={{
                        width: "100%",
                        aspectRatio:
                          "1 / 1",
                        objectFit:
                          "cover",
                        borderRadius: 12,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        aspectRatio:
                          "1 / 1",
                        display: "grid",
                        placeItems:
                          "center",
                        borderRadius: 12,
                        background:
                          "rgba(255,255,255,0.05)",
                        fontWeight: 700,
                      }}
                    >
                      {
                        asset.asset_type
                      }
                    </div>
                  )}

                  <strong>
                    {asset.title}
                  </strong>

                  <small>
                    {asset.provider} ·{" "}
                    {asset.status}
                  </small>

                  {asset.signed_url ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            asset
                              .signed_url!,
                            "_blank"
                          )
                        }
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        className={
                          styles.goldButton
                        }
                        onClick={() =>
                          void downloadAsset(
                            asset
                              .signed_url!,
                            asset.title
                          )
                        }
                      >
                        Download
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            )}
          </div>
        </section>
      </>
    );
  }

  function renderWorkforceCalls() {
    const selectedEmployee =
      EMPLOYEES.find(
        (person) =>
          person.name ===
          selectedCallEmployee
      ) ??
      EMPLOYEES[0];

    return (
      <section
        className={
          styles.panel
        }
      >
        <header
          className={
            styles.panelHeader
          }
        >
          <div>
            <h2>
              AI Employee Call Center
            </h2>
            <p>
              Hold a continuous
              hands-free voice
              conversation with any
              RoyalOS employee.
            </p>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          <label>
            <span>
              Choose employee
            </span>
            <select
              value={
                selectedCallEmployee
              }
              onChange={(event) => {
                employeeCallActiveRef.current =
                  false;
                setEmployeeCallActive(
                  false
                );
                employeeRecognitionRef.current
                  ?.abort();
                setSelectedCallEmployee(
                  event.target
                    .value as
                    EmployeeName
                );
              }}
            >
              {EMPLOYEES.map(
                (person) => (
                  <option
                    key={
                      person.name
                    }
                    value={
                      person.name
                    }
                  >
                    {person.name} —{" "}
                    {person.role}
                  </option>
                )
              )}
            </select>
          </label>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 18,
              borderRadius: 16,
              background:
                "rgba(255,255,255,0.04)",
            }}
          >
            <Avatar
              src={
                selectedEmployee
                  .image
              }
              alt={
                selectedEmployee
                  .name
              }
              initials={
                selectedEmployee
                  .initials
              }
              size="large"
            />

            <div
              style={{
                flex: 1,
              }}
            >
              <h3
                style={{
                  margin: 0,
                }}
              >
                {
                  selectedEmployee
                    .name
                }
              </h3>
              <p>
                {
                  selectedEmployee
                    .role
                }
              </p>
            </div>

            <button
              type="button"
              className={
                employeeCallActive
                  ? styles.stopVoiceButton
                  : styles.goldButton
              }
              onClick={
                toggleEmployeeCall
              }
            >
              {employeeCallActive
                ? "End call"
                : "☎ Start call"}
            </button>
          </div>

          <div
            style={{
              minHeight: 320,
              maxHeight: 520,
              overflowY: "auto",
              display: "grid",
              gap: 12,
              padding: 16,
              borderRadius: 16,
              background:
                "rgba(0,0,0,0.18)",
            }}
          >
            {employeeCallMessages.length ===
            0 ? (
              <p>
                Start the call and
                speak naturally.
                RoyalOS will listen,
                respond aloud, then
                listen again.
              </p>
            ) : (
              employeeCallMessages.map(
                (message) => (
                  <div
                    key={
                      message.id
                    }
                    style={{
                      justifySelf:
                        message.speaker ===
                        "Ayobami"
                          ? "end"
                          : "start",
                      maxWidth:
                        "78%",
                      padding:
                        "12px 14px",
                      borderRadius: 14,
                      background:
                        message.speaker ===
                        "Ayobami"
                          ? "rgba(245,196,81,0.16)"
                          : "rgba(111,211,255,0.12)",
                    }}
                  >
                    <strong>
                      {
                        message.speaker
                      }
                    </strong>
                    <p
                      style={{
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {
                        message.content
                      }
                    </p>
                  </div>
                )
              )
            )}

            {employeeCallLoading ? (
              <p>
                {
                  selectedCallEmployee
                }{" "}
                is thinking…
              </p>
            ) : null}
          </div>

          <div>
            <strong>
              {employeeCallActive
                ? employeeCallListening
                  ? "● Listening now"
                  : employeeCallLoading
                    ? "● Employee is thinking"
                    : "● Employee is speaking"
                : "○ Call ended"}
            </strong>
          </div>

          {employeeCallError ? (
            <div
              className={
                styles.inlineError
              }
            >
              {
                employeeCallError
              }
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  function renderDashboard() {
    return (
      <>
        <section
          className={
            styles.hero
          }
        >
          <div
            className={
              styles.heroIdentity
            }
          >
            <Avatar
              src="/avatars/ayobami.jpg"
              alt="Ayobami, Founder and CEO"
              initials="AA"
              size="hero"
            />

            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                ROYALOS EXECUTIVE
                COMMAND
              </p>

              <h1>
                {greeting},{" "}
                <span>
                  Ayobami.
                </span>
              </h1>

              <h2>
                Founder & CEO ·
                Triple-Hay
                Concept LLC
              </h2>

              <p
                className={
                  styles.systemOnline
                }
              >
                <span />
                RoyalOS is online
                and all systems
                are operational.
              </p>
            </div>
          </div>

          <blockquote>
            “Leadership is not
            about being in
            charge. It is about
            taking care of those
            in your charge.”

            <strong>
              — Ayobami
            </strong>
          </blockquote>
        </section>

        <section
          className={
            styles.metricsGrid
          }
        >
          <article>
            <span
              className={
                styles.metricIcon
              }
            >
              🚀
            </span>

            <div>
              <p>
                Active Missions
              </p>
              <strong>
                4
              </strong>
              <small>
                In progress
              </small>
            </div>
          </article>

          <article>
            <span
              className={
                styles.metricIcon
              }
            >
              👥
            </span>

            <div>
              <p>
                Employees Working
              </p>
              <strong>
                {activeEmployees}
              </strong>
              <small>
                Active now
              </small>
            </div>
          </article>

          <article>
            <span
              className={
                styles.metricIcon
              }
            >
              ✓
            </span>

            <div>
              <p>
                Approvals Required
              </p>
              <strong>
                3
              </strong>
              <small>
                Awaiting you
              </small>
            </div>
          </article>

          <article>
            <span
              className={
                styles.metricIcon
              }
            >
              ▤
            </span>

            <div>
              <p>
                Briefings Ready
              </p>
              <strong>
                {draft
                  ? 1
                  : 0}
              </strong>
              <small>
                Ready for review
              </small>
            </div>
          </article>

          <article>
            <span
              className={
                styles.metricIcon
              }
            >
              🧠
            </span>

            <div>
              <p>
                Memories Added
              </p>
              <strong>
                {missionResult
                  ?.memoryPersistence
                  ?.recordsSaved ??
                  0}
              </strong>
              <small>
                Latest mission
              </small>
            </div>
          </article>
        </section>

        <section
          className={
            styles.dashboardSplit
          }
        >
          <div
            className={
              styles.dashboardLeft
            }
          >
            <section
              className={
                styles.panel
              }
            >
              <header
                className={
                  styles.panelHeader
                }
              >
                <div>
                  <h2>
                    Active Missions
                  </h2>

                  <p>
                    Current RoyalOS
                    execution
                  </p>
                </div>

                <button
                  type="button"
                  className={
                    styles.textButton
                  }
                  onClick={() =>
                    setActiveSection(
                      "Missions"
                    )
                  }
                >
                  View all
                </button>
              </header>

              <div
                className={
                  styles.missionList
                }
              >
                {ACTIVE_MISSIONS.map(
                  (
                    mission
                  ) => (
                    <article
                      key={
                        mission.title
                      }
                      className={
                        styles.missionItem
                      }
                    >
                      <div
                        className={
                          styles.missionItemTop
                        }
                      >
                        <div>
                          <strong>
                            {
                              mission.title
                            }
                          </strong>

                          <span>
                            {
                              mission.workspace
                            }
                          </span>
                        </div>

                        <small>
                          {
                            mission.status
                          }
                        </small>
                      </div>

                      <div
                        className={
                          styles.progressTrack
                        }
                      >
                        <span
                          style={{
                            width: `${mission.progress}%`,
                          }}
                        />
                      </div>

                      <div
                        className={
                          styles.progressLabel
                        }
                      >
                        {
                          mission.progress
                        }
                        %
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>

            <section
              className={
                styles.panel
              }
            >
              <header
                className={
                  styles.panelHeader
                }
              >
                <div>
                  <h2>
                    Mission Command
                  </h2>

                  <p>
                    Assign work to
                    the integrated
                    RoyalOS API
                  </p>
                </div>

                <span
                  className={
                    styles.apiBadge
                  }
                >
                  /api/royalos
                </span>
              </header>

              <div
                className={
                  styles.missionForm
                }
              >
                <textarea
                  value={idea}
                  onChange={(
                    event
                  ) =>
                    setIdea(
                      event.target
                        .value
                    )
                  }
                  placeholder="Describe the mission, task, idea, challenge, or decision..."
                  rows={5}
                />

                <div
                  className={
                    styles.missionControls
                  }
                >
                  <label>
                    <span>
                      Workspace
                    </span>

                    <select
                      value={
                        workspace
                      }
                      onChange={(
                        event
                      ) =>
                        setWorkspace(
                          event.target
                            .value as
                            WorkspaceName
                        )
                      }
                    >
                      <option>
                        Triple-Hay
                        Concept LLC
                      </option>
                      <option>
                        ChoiceRoyals
                      </option>
                      <option>
                        Xena Grace
                      </option>
                      <option>
                        TD Talk
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>
                      Lead employee
                    </span>

                    <select
                      value={
                        employee
                      }
                      onChange={(
                        event
                      ) =>
                        setEmployee(
                          event.target
                            .value as
                            EmployeeName
                        )
                      }
                    >
                      {EMPLOYEES.map(
                        (
                          person
                        ) => (
                          <option
                            key={
                              person.name
                            }
                          >
                            {
                              person.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span>
                      Work mode
                    </span>

                    <select
                      value={
                        mode
                      }
                      onChange={(
                        event
                      ) =>
                        setMode(
                          event.target
                            .value as
                            WorkMode
                        )
                      }
                    >
                      <option>
                        Mission
                      </option>
                      <option>
                        Task
                      </option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  className={
                    styles.assignButton
                  }
                  disabled={
                    missionLoading
                  }
                  onClick={() =>
                    void assignWork()
                  }
                >
                  {missionLoading
                    ? "RoyalOS team is working…"
                    : "Assign to RoyalOS"}
                </button>

                {missionError && (
                  <div
                    className={
                      styles.inlineError
                    }
                  >
                    {
                      missionError
                    }
                  </div>
                )}
              </div>
            </section>
          </div>

          {renderChatPanel()}
        </section>

        {(draft ||
          missionLoading) && (
          <section
            className={`${styles.panel} ${styles.briefingPanel}`}
          >
            <header
              className={
                styles.panelHeader
              }
            >
              <div>
                <h2>
                  Executive Briefing
                </h2>

                <p>
                  RoyalOS integrated
                  mission response
                </p>
              </div>

              {missionResult
                ?.missionId && (
                <span
                  className={
                    styles.apiBadge
                  }
                >
                  Mission{" "}
                  {
                    missionResult.missionId
                  }
                </span>
              )}
            </header>

            {missionLoading ? (
              <div
                className={
                  styles.workingState
                }
              >
                <div
                  className={
                    styles.spinner
                  }
                />

                <div>
                  <strong>
                    RoyalOS employees
                    are working
                    independently.
                  </strong>

                  <p>
                    The Brain is
                    routing the
                    mission,
                    employees are
                    preparing reports,
                    and the Executive
                    Synthesizer will
                    combine the work.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={
                    styles.briefingMeta
                  }
                >
                  <span>
                    Lead:{" "}
                    {missionResult
                      ?.employee ??
                      employee}
                  </span>

                  <span>
                    Employees:{" "}
                    {missionResult
                      ?.collaboration
                      ?.participatingEmployees
                      ?.join(
                        ", "
                      ) ||
                      "Executive routing"}
                  </span>

                  <span>
                    Duration:{" "}
                    {formatDuration(
                      missionResult
                        ?.performance
                        ?.totalRequestMs
                    )}
                  </span>

                  <span>
                    Memory saved:{" "}
                    {missionResult
                      ?.memoryPersistence
                      ?.saved
                      ? "Yes"
                      : "No"}
                  </span>
                </div>

                <pre
                  className={
                    styles.briefingContent
                  }
                >
                  {draft}
                </pre>
              </>
            )}
          </section>
        )}

        <section
          className={
            styles.systemCards
          }
        >
          <article>
            <span>
              ▤
            </span>

            <div>
              <p>
                Knowledge Index
              </p>
              <strong>
                36
              </strong>
              <small>
                Documents indexed
              </small>
            </div>
          </article>

          <article>
            <span>
              🧠
            </span>

            <div>
              <p>
                Memory Engine
              </p>
              <strong>
                {
                  missionResult
                    ?.memoryRecall
                    ?.memoriesSelected ??
                  0
                }
              </strong>
              <small>
                Memories recalled
              </small>
            </div>
          </article>

          <article>
            <span>
              ϟ
            </span>

            <div>
              <p>
                System Performance
              </p>
              <strong>
                100%
              </strong>
              <small>
                Systems operational
              </small>
            </div>
          </article>

          <article>
            <span>
              ▦
            </span>

            <div>
              <p>
                Company
              </p>
              <strong>
                Triple-Hay
              </strong>
              <small>
                All workspaces active
              </small>
            </div>
          </article>
        </section>
      </>
    );
  }

  function renderPlaceholder() {
    return (
      <section
        className={`${styles.panel} ${styles.placeholderPanel}`}
      >
        <span
          className={
            styles.placeholderIcon
          }
        >
          ◈
        </span>

        <h1>
          {activeSection}
        </h1>

        <p>
          This RoyalOS module
          is ready for the next
          connection phase.
        </p>

        <button
          type="button"
          className={
            styles.goldButton
          }
          onClick={() =>
            setActiveSection(
              "Dashboard"
            )
          }
        >
          Return to dashboard
        </button>
      </section>
    );
  }

  return (
    <main
      className={
        styles.appShell
      }
    >
      <aside
        className={
          styles.sidebar
        }
      >
        <div
          className={
            styles.brand
          }
        >
          <span>
            ♛
          </span>

          <div>
            <strong>
              ROYALOS
            </strong>

            <small>
              Executive Operating
              System
            </small>
          </div>
        </div>

        <nav
          className={
            styles.navigation
          }
        >
          {NAVIGATION.map(
            (item) => (
              <button
                type="button"
                key={
                  item.section
                }
                className={
                  activeSection ===
                  item.section
                    ? styles.navActive
                    : ""
                }
                onClick={() => {
                  setActiveSection(
                    item.section
                  );

                  if (
                    item.section ===
                    "Asset Gallery"
                  ) {
                    void loadAssets();
                  }
                }}
              >
                <span
                  className={
                    styles.navIcon
                  }
                >
                  {item.icon}
                </span>

                <span>
                  {
                    item.section
                  }
                </span>

                {item.badge && (
                  <small>
                    {
                      item.badge
                    }
                  </small>
                )}
              </button>
            )
          )}
        </nav>

        <div
          className={
            styles.sidebarSpacer
          }
        />

        <div
          className={
            styles.ceoCard
          }
        >
          <Avatar
            src="/avatars/ayobami.jpg"
            alt="Ayobami, CEO"
            initials="AA"
            size="medium"
          />

          <div>
            <strong>
              Ayobami
            </strong>

            <span>
              Founder & CEO
            </span>

            <small>
              ● CEO Mode
            </small>
          </div>
        </div>
      </aside>

      <section
        className={
          styles.mainColumn
        }
        style={
          activeSection ===
          "Dashboard"
            ? undefined
            : {
                gridColumn:
                  "2 / -1",
                minWidth: 0,
              }
        }
      >
        <header
          className={
            styles.topbar
          }
        >
          <div>
            <span
              className={
                styles.breadcrumb
              }
            >
              RoyalOS /{" "}
              {activeSection}
            </span>
          </div>

          <div
            className={
              styles.topbarActions
            }
          >
            <div
              className={
                styles.searchBox
              }
            >
              ⌕
              <input
                type="search"
                placeholder="Search RoyalOS..."
              />
            </div>

            <button
              type="button"
              className={
                styles.iconButton
              }
            >
              ♧
            </button>

            <span
              className={
                styles.systemStatus
              }
            >
              <i />
              Systems Online
            </span>
          </div>
        </header>

        <div
          className={
            styles.content
          }
        >
          {activeSection ===
          "Dashboard"
            ? renderDashboard()
            : activeSection ===
                "Ifeoluwa"
              ? renderChatPanel(
                  true
                )
              : activeSection ===
                  "Nova Studio"
                ? renderNovaStudio()
                : activeSection ===
                    "Asset Gallery"
                  ? renderAssetGallery()
                  : activeSection ===
                      "AI Workforce"
                    ? renderWorkforceCalls()
                    : activeSection ===
                        "Developer Workbench"
                      ? (
                          <OrionDeveloperWorkbench />
                        )
                      : renderPlaceholder()}
        </div>
      </section>

      {activeSection ===
      "Dashboard" ? (
      <aside
          className={
            styles.workforcePanel
          }
        >
          <header>
            <div>
              <h2>
                AI Workforce
              </h2>
  
              <p>
                Live executive status
              </p>
            </div>
  
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "AI Workforce"
                )
              }
            >
              View team
            </button>
          </header>
  
          <div
            className={
              styles.employeeList
            }
          >
            {EMPLOYEES.map(
              (person) => (
                <article
                  key={
                    person.name
                  }
                  className={
                    styles.employeeCard
                  }
                >
                  <Avatar
                    src={
                      person.image
                    }
                    alt={
                      person.name
                    }
                    initials={
                      person.initials
                    }
                    size="small"
                  />
  
                  <div
                    className={
                      styles.employeeIdentity
                    }
                  >
                    <strong>
                      {
                        person.name
                      }
                    </strong>
  
                    <span>
                      {
                        person.role
                      }
                    </span>
  
                    <small>
                      {
                        person.assignment
                      }
                    </small>
                  </div>
  
                  <div
                    className={
                      styles.employeeStatus
                    }
                  >
                    <StatusDot
                      tone={
                        person.tone
                      }
                    />
  
                    <span>
                      {
                        person.status
                      }
                    </span>
                  </div>
                </article>
              )
            )}
          </div>
  
          <section
            className={
              styles.notificationPanel
            }
          >
            <header>
              <h3>
                Activity
              </h3>
  
              <span>
                {
                  notifications.length
                }
              </span>
            </header>
  
            {notifications.length >
            0 ? (
              notifications
                .slice(0, 4)
                .map(
                  (
                    notification,
                    index
                  ) => (
                    <p
                      key={`${notification}-${index}`}
                    >
                      {
                        notification
                      }
                    </p>
                  )
                )
            ) : (
              <p>
                RoyalOS is ready
                for your next
                instruction.
              </p>
            )}
          </section>
        </aside>
      ) : null}
    </main>
  );
}