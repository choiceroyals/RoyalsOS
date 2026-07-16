"use client";
/* eslint-disable react-hooks/refs */

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./page.module.css";
import OrionDeveloperWorkbench from "../components/dashboard/OrionDeveloperWorkbenchShell";
import CineVideoStudio from "../components/dashboard/CineVideoStudio";
import MichaelPRecordsCenter from "../components/dashboard/MichaelPRecordsCenter";
import BrandOperationsCenter from "../components/dashboard/BrandOperationsCenter";
import BrandSwitcher from "../components/dashboard/BrandSwitcher";
import EmployeeDirectory from "../components/dashboard/EmployeeDirectory";
import SecurityAuditCenter from "../components/dashboard/SecurityAuditCenter";
import SystemMaintenanceCenter from "../components/dashboard/SystemMaintenanceCenter";
import SystemErrorReporter from "../components/dashboard/SystemErrorReporter";
import CoreOperationsCenter from "../components/dashboard/CoreOperationsCenter";
import PluginMarketplace from "../components/dashboard/PluginMarketplace";
import SaveCompanyPdfButton from "../components/reports/SaveCompanyPdfButton";
import {
  ROYALOS_EMPLOYEE_PROFILES,
  type RoyalOSEmployeeName,
} from "@/lib/employees/config";

type WorkMode =
  | "Task"
  | "Mission";

type EmployeeName =
  RoyalOSEmployeeName;

type WorkspaceName =
  | "Triple-Hay Concept LLC"
  | "ChoiceRoyals"
  | "Xena Grace"
  | "TD Talk";

type NavigationSection =
  | "Dashboard"
  | "Ifeoluwa"
  | "Nova Studio"
  | "Cine Video Studio"
  | "Michael P Records"
  | "Brands"
  | "Connections"
  | "Security & Audit"
  | "System Care"
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
  | "Settings"
  | "Plugins";

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

const EMPLOYEES =
  ROYALOS_EMPLOYEE_PROFILES.map((profile) => ({
    name: profile.name,
    role: profile.shortRole,
    status: profile.status,
    assignment: profile.assignment,
    image: profile.image,
    initials: profile.initials,
    tone: profile.tone,
  }));

const DASHBOARD_EMPLOYEE_NAMES: EmployeeName[] = [
  "Adedeji",
  "Atlas",
  "Emmy",
  "Michael P",
  "Sentinel",
  "Orion",
];

const DASHBOARD_EMPLOYEES = EMPLOYEES.filter((employee) =>
  DASHBOARD_EMPLOYEE_NAMES.includes(employee.name)
);

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
    section: "Cine Video Studio",
    icon: "▸",
    badge: "NEW",
  },
  {
    section: "Michael P Records",
    icon: "▤",
    badge: "NEW",
  },
  {
    section: "Brands",
    icon: "♛",
    badge: "NEW",
  },
  {
    section: "Connections",
    icon: "⌁",
    badge: "NEW",
  },
  {
    section: "Security & Audit",
    icon: "◈",
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
    section: "Plugins",
    icon: "◉",
    badge: "NEW",
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
const IFEOLUWA_CHAT_HISTORY_STORAGE_KEY =
  "royalos:ifeoluwa:conversation-history:v2";

const LEGACY_IFEOLUWA_CHAT_STORAGE_KEY =
  "royalos:ifeoluwa:private-chat:v1";

const MAX_SAVED_CHAT_MESSAGES = 200;
const MAX_SAVED_IFEOLUWA_CONVERSATIONS = 100;

type IfeoluwaConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  pinned?: boolean;
  archived?: boolean;
};

type StoredIfeoluwaHistory = {
  version: 2;
  activeConversationId: string;
  conversations: IfeoluwaConversation[];
};

type LegacyStoredIfeoluwaChat = {
  version: 1;
  updatedAt: string;
  messages: ChatMessage[];
};

function isValidStoredMessage(
  value: unknown
): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChatMessage>;

  return (
    typeof candidate.id === "string" &&
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function normalizeStoredMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isValidStoredMessage)
    .slice(-MAX_SAVED_CHAT_MESSAGES)
    .map((message) => ({
      ...message,
      imageDataUrl: undefined,
    }));
}

function createConversationTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find(
    (message) => message.role === "user" && message.content.trim()
  );

  if (!firstUserMessage) {
    return "New conversation";
  }

  const compact = firstUserMessage.content.replace(/\s+/g, " ").trim();
  return compact.length <= 46 ? compact : `${compact.slice(0, 43)}...`;
}

function createFreshIfeoluwaConversation(
  openingMessage =
    "We have a fresh private conversation, Ayobami. What is on your mind?"
): IfeoluwaConversation {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: createId(),
        role: "assistant",
        content: openingMessage,
        createdAt: now,
      },
    ],
  };
}

function isValidStoredConversation(
  value: unknown
): value is IfeoluwaConversation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<IfeoluwaConversation>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.messages)
  );
}

function readIfeoluwaConversationHistory(): StoredIfeoluwaHistory {
  const fallbackConversation = createFreshIfeoluwaConversation(
    INITIAL_CHAT_MESSAGES[0].content
  );

  if (typeof window === "undefined") {
    return {
      version: 2,
      activeConversationId: fallbackConversation.id,
      conversations: [fallbackConversation],
    };
  }

  try {
    const savedHistory = window.localStorage.getItem(
      IFEOLUWA_CHAT_HISTORY_STORAGE_KEY
    );

    if (savedHistory) {
      const parsed = JSON.parse(savedHistory) as Partial<StoredIfeoluwaHistory>;
      const conversations = Array.isArray(parsed.conversations)
        ? parsed.conversations
            .filter(isValidStoredConversation)
            .map((conversation) => ({
              ...conversation,
              title:
                conversation.title.trim() ||
                createConversationTitle(conversation.messages),
              messages: normalizeStoredMessages(conversation.messages),
            }))
            .filter((conversation) => conversation.messages.length > 0)
            .sort((first, second) =>
              second.updatedAt.localeCompare(first.updatedAt)
            )
            .slice(0, MAX_SAVED_IFEOLUWA_CONVERSATIONS)
        : [];

      if (conversations.length > 0) {
        const activeConversationId = conversations.some(
          (conversation) => conversation.id === parsed.activeConversationId
        )
          ? String(parsed.activeConversationId)
          : conversations[0].id;

        return {
          version: 2,
          activeConversationId,
          conversations,
        };
      }
    }

    const legacyValue = window.localStorage.getItem(
      LEGACY_IFEOLUWA_CHAT_STORAGE_KEY
    );

    if (legacyValue) {
      const parsedLegacy = JSON.parse(legacyValue) as
        | LegacyStoredIfeoluwaChat
        | ChatMessage[];
      const legacyMessages = normalizeStoredMessages(
        Array.isArray(parsedLegacy) ? parsedLegacy : parsedLegacy?.messages
      );

      if (legacyMessages.length > 0) {
        const createdAt =
          legacyMessages[0]?.createdAt || new Date().toISOString();
        const updatedAt =
          legacyMessages[legacyMessages.length - 1]?.createdAt || createdAt;
        const migratedConversation: IfeoluwaConversation = {
          id: createId(),
          title: createConversationTitle(legacyMessages),
          createdAt,
          updatedAt,
          messages: legacyMessages,
        };

        return {
          version: 2,
          activeConversationId: migratedConversation.id,
          conversations: [migratedConversation],
        };
      }
    }
  } catch (error) {
    console.error(
      "RoyalOS could not read Ifeoluwa conversation history:",
      error
    );
  }

  return {
    version: 2,
    activeConversationId: fallbackConversation.id,
    conversations: [fallbackConversation],
  };
}

function saveIfeoluwaConversationHistory(
  conversations: IfeoluwaConversation[],
  activeConversationId: string
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: StoredIfeoluwaHistory = {
      version: 2,
      activeConversationId,
      conversations: conversations
        .slice()
        .sort((first, second) =>
          second.updatedAt.localeCompare(first.updatedAt)
        )
        .slice(0, MAX_SAVED_IFEOLUWA_CONVERSATIONS)
        .map((conversation) => ({
          ...conversation,
          messages: normalizeStoredMessages(conversation.messages),
        })),
    };

    window.localStorage.setItem(
      IFEOLUWA_CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch (error) {
    console.error(
      "RoyalOS could not save Ifeoluwa conversation history:",
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
    // Reset the image fallback whenever a new avatar source is selected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedSection = params.get("section");
      if (
        requestedSection &&
        NAVIGATION.some((item) => item.section === requestedSection)
      ) {
        setActiveSection(requestedSection as NavigationSection);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const [dashboardIfeoluwaOpen, setDashboardIfeoluwaOpen] =
    useState(false);

  const [ifeoluwaPrivacyMode, setIfeoluwaPrivacyMode] =
    useState(true);

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
    ifeoluwaConversations,
    setIfeoluwaConversations,
  ] = useState<IfeoluwaConversation[]>([]);

  const [
    activeIfeoluwaConversationId,
    setActiveIfeoluwaConversationId,
  ] = useState("");

  const [ifeoluwaHistoryOpen, setIfeoluwaHistoryOpen] = useState(true);
  const [ifeoluwaHistorySearch, setIfeoluwaHistorySearch] = useState("");

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
    novaReferenceMode,
    setNovaReferenceMode,
  ] = useState(false);

  const [
    novaReferenceFiles,
    setNovaReferenceFiles,
  ] = useState<File[]>([]);

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
      // Greeting depends on the browser's local time after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGreeting(
        "Good morning"
      );
    } else if (hour < 17) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGreeting(
        "Good afternoon"
      );
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const savedHistory =
      readIfeoluwaConversationHistory();

    const activeConversation =
      savedHistory.conversations.find(
        (conversation) =>
          conversation.id ===
          savedHistory.activeConversationId
      ) || savedHistory.conversations[0];

    // Restore persisted browser conversation history after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIfeoluwaConversations(
      savedHistory.conversations
    );
    setActiveIfeoluwaConversationId(
      activeConversation.id
    );
    setMessages(
      activeConversation.messages
    );
    setIfeoluwaMemoryReady(true);
  }, []);

  useEffect(() => {
    if (
      !ifeoluwaMemoryReady ||
      !activeIfeoluwaConversationId
    ) {
      return;
    }

    // Synchronize the active conversation snapshot into the persisted history collection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIfeoluwaConversations(
      (previous) => {
        const current = previous.find(
          (conversation) =>
            conversation.id ===
            activeIfeoluwaConversationId
        );

        if (!current) {
          return previous;
        }

        const currentLast =
          current.messages[current.messages.length - 1];
        const nextLast =
          messages[messages.length - 1];
        const messagesUnchanged =
          current.messages.length === messages.length &&
          currentLast?.id === nextLast?.id &&
          currentLast?.content === nextLast?.content;

        if (messagesUnchanged) {
          return previous;
        }

        return previous
          .map((conversation) =>
            conversation.id ===
            activeIfeoluwaConversationId
              ? {
                  ...conversation,
                  title:
                    createConversationTitle(messages),
                  updatedAt:
                    new Date().toISOString(),
                  messages,
                }
              : conversation
          )
          .sort((first, second) =>
            second.updatedAt.localeCompare(
              first.updatedAt
            )
          );
      }
    );
  }, [
    messages,
    ifeoluwaMemoryReady,
    activeIfeoluwaConversationId,
  ]);

  useEffect(() => {
    if (
      !ifeoluwaMemoryReady ||
      !activeIfeoluwaConversationId ||
      ifeoluwaConversations.length === 0
    ) {
      return;
    }

    saveIfeoluwaConversationHistory(
      ifeoluwaConversations,
      activeIfeoluwaConversationId
    );
  }, [
    ifeoluwaConversations,
    activeIfeoluwaConversationId,
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
      const [databaseResponse, localResponse] =
        await Promise.all([
          fetch(
            "/api/tools/images/assets?limit=100&order=newest",
            { cache: "no-store" }
          ),
          fetch(
            "/api/tools/assets?status=active",
            { cache: "no-store" }
          ),
        ]);

      const databaseData =
        (await databaseResponse.json().catch(() => ({}))) as
          AssetGalleryResponse;

      const localData =
        (await localResponse.json().catch(() => ({}))) as {
          assets?: Array<{
            id: string;
            title: string;
            kind: string;
            source: "upload" | "generated";
            mimeType?: string;
            sizeBytes?: number;
            publicUrl: string;
            relativePath?: string;
            createdAt: string;
          }>;
          error?: string;
        };

      const databaseAssets =
        databaseResponse.ok
          ? databaseData.assets ?? []
          : [];

      const localAssets: RoyalOSAsset[] =
        localResponse.ok
          ? (localData.assets ?? []).map((asset) => ({
              id: asset.id,
              asset_id: `local:${asset.id}`,
              title: asset.title,
              asset_type: asset.kind,
              provider:
                asset.source === "generated"
                  ? "nova-local"
                  : "local-upload",
              status: "ready",
              approval_status: "pending",
              mime_type: asset.mimeType ?? null,
              size_bytes: asset.sizeBytes ?? null,
              created_at: asset.createdAt,
              storage_path: asset.relativePath ?? null,
              signed_url: asset.publicUrl,
            }))
          : [];

      if (!databaseResponse.ok && !localResponse.ok) {
        throw new Error(
          databaseData.error ||
            localData.error ||
            "RoyalOS could not load the asset gallery."
        );
      }

      setAssets((previous) => {
        const merged = [
          ...previous,
          ...databaseAssets,
          ...localAssets,
        ];

        const unique = new Map<string, RoyalOSAsset>();

        for (const asset of merged) {
          const key =
            asset.asset_id ||
            asset.storage_path ||
            asset.signed_url ||
            `${asset.title}:${asset.created_at}`;

          const existing = unique.get(key);
          if (!existing || (!existing.signed_url && asset.signed_url)) {
            unique.set(key, asset);
          }
        }

        return Array.from(unique.values()).sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        );
      });

      if (!databaseResponse.ok && localResponse.ok) {
        setAssetError(
          "Local assets loaded. Supabase assets are temporarily unavailable."
        );
      }
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

    if (
      novaReferenceMode &&
      novaReferenceFiles.length === 0
    ) {
      setNovaError(
        "Choose at least one reference image, or switch reference mode off."
      );
      return;
    }

    setNovaLoading(true);
    setNovaError("");

    try {
      if (novaReferenceMode) {
        const form = new FormData();
        form.set("title", novaTitle.trim() || "Nova Reference Image");
        form.set("prompt", prompt);
        form.set("size", novaSize);
        novaReferenceFiles.forEach((file) =>
          form.append("references", file)
        );

        const response = await fetch(
          "/api/nova/reference-generate",
          { method: "POST", body: form }
        );

        const data = (await response.json()) as {
          asset?: {
            id: string;
            title: string;
            kind: string;
            mimeType?: string;
            sizeBytes?: number;
            publicUrl: string;
            relativePath?: string;
            createdAt: string;
          };
          error?: string;
        };

        if (!response.ok || !data.asset) {
          throw new Error(
            data.error ||
              "Nova could not generate the image from the selected references."
          );
        }

        const newAsset: RoyalOSAsset = {
          id: data.asset.id,
          asset_id: `local:${data.asset.id}`,
          title: data.asset.title,
          asset_type: data.asset.kind,
          provider: "openai-reference",
          status: "ready",
          approval_status: "pending",
          mime_type: data.asset.mimeType ?? "image/png",
          size_bytes: data.asset.sizeBytes ?? null,
          created_at: data.asset.createdAt,
          storage_path: data.asset.relativePath ?? null,
          signed_url: data.asset.publicUrl,
        };

        setNovaResult(newAsset);
        setAssets((previous) => [
          newAsset,
          ...previous.filter(
            (asset) => asset.asset_id !== newAsset.asset_id
          ),
        ]);
        setNovaReferenceFiles([]);
        setNovaReferenceMode(false);

        setNotifications((previous) => [
          `${new Date().toLocaleString()} — Nova generated "${newAsset.title}" from reference images.`,
          ...previous,
        ].slice(0, 12));

        return;
      }

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

    const freshConversation =
      createFreshIfeoluwaConversation();

    setIfeoluwaConversations(
      (previous) => [
        freshConversation,
        ...previous,
      ].slice(
        0,
        MAX_SAVED_IFEOLUWA_CONVERSATIONS
      )
    );
    setActiveIfeoluwaConversationId(
      freshConversation.id
    );
    setMessages(
      freshConversation.messages
    );
    setChatError("");
    setIfeoluwaInput("");
    clearIfeoluwaImage();
  }

  function openIfeoluwaConversation(
    conversationId: string
  ) {
    const selectedConversation =
      ifeoluwaConversations.find(
        (conversation) =>
          conversation.id === conversationId
      );

    if (!selectedConversation) {
      return;
    }

    stopVoiceOutput();
    setActiveIfeoluwaConversationId(
      selectedConversation.id
    );
    setMessages(
      selectedConversation.messages
    );
    setChatError("");
    setIfeoluwaInput("");
    clearIfeoluwaImage();
  }

  function togglePinIfeoluwaConversation(conversationId: string) {
    setIfeoluwaConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, pinned: !conversation.pinned, updatedAt: new Date().toISOString() }
          : conversation,
      ),
    );
  }

  function renameIfeoluwaConversation(conversationId: string) {
    const current = ifeoluwaConversations.find((conversation) => conversation.id === conversationId);
    if (!current) return;
    const title = window.prompt("Rename conversation", current.title)?.trim();
    if (!title) return;
    setIfeoluwaConversations((previous) => previous.map((conversation) => conversation.id === conversationId ? { ...conversation, title, updatedAt: new Date().toISOString() } : conversation));
  }

  function deleteIfeoluwaConversation(
    conversationId: string
  ) {
    setIfeoluwaConversations(
      (previous) => {
        const remaining = previous.filter(
          (conversation) =>
            conversation.id !== conversationId
        );

        if (remaining.length === 0) {
          const freshConversation =
            createFreshIfeoluwaConversation();
          setActiveIfeoluwaConversationId(
            freshConversation.id
          );
          setMessages(
            freshConversation.messages
          );
          return [freshConversation];
        }

        if (
          conversationId ===
          activeIfeoluwaConversationId
        ) {
          setActiveIfeoluwaConversationId(
            remaining[0].id
          );
          setMessages(
            remaining[0].messages
          );
        }

        return remaining;
      }
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
    const visibleIfeoluwaConversations = ifeoluwaConversations
      .filter((conversation) => !conversation.archived)
      .filter((conversation) => {
        const query = ifeoluwaHistorySearch.trim().toLowerCase();
        return !query || conversation.title.toLowerCase().includes(query);
      })
      .sort((first, second) => {
        if (Boolean(first.pinned) !== Boolean(second.pinned)) return first.pinned ? -1 : 1;
        return second.updatedAt.localeCompare(first.updatedAt);
      });

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

          <div style={{ display: "flex", gap: 8 }}>
            {expanded ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIfeoluwaHistoryOpen((value) => !value)}
                title={ifeoluwaHistoryOpen ? "Close conversation sidebar" : "Open conversation sidebar"}
              >
                {ifeoluwaHistoryOpen ? "◀ Hide chats" : "☰ Chats"}
              </button>
            ) : null}
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={newPrivateChat}
            >
              ＋ New chat
            </button>
          </div>
        </header>

        {expanded && ifeoluwaHistoryOpen ? (
          <aside
            className={
              styles.chatHistoryPanel
            }
          >
            <div
              className={
                styles.chatHistoryHeader
              }
            >
              <div>
                <strong>Conversation history</strong>
                <span>Open any chat and continue where you stopped.</span>
              </div>

              <button
                type="button"
                onClick={newPrivateChat}
              >
                ＋ New chat
              </button>
            </div>

            <input
              className={styles.chatHistorySearch}
              value={ifeoluwaHistorySearch}
              onChange={(event) => setIfeoluwaHistorySearch(event.target.value)}
              placeholder="Search conversations…"
            />

            <div
              className={
                styles.chatHistoryList
              }
            >
              {visibleIfeoluwaConversations.map(
                (conversation) => (
                  <article
                    key={conversation.id}
                    className={`${styles.chatHistoryItem} ${
                      conversation.id ===
                      activeIfeoluwaConversationId
                        ? styles.chatHistoryItemActive
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={
                        styles.chatHistoryOpen
                      }
                      onClick={() =>
                        openIfeoluwaConversation(
                          conversation.id
                        )
                      }
                    >
                      <strong>
                        {conversation.title}
                      </strong>
                      <span>
                        {conversation.messages.length} messages · {new Date(
                          conversation.updatedAt
                        ).toLocaleDateString()}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={styles.chatHistoryDelete}
                      title={conversation.pinned ? "Unpin conversation" : "Pin conversation"}
                      aria-label={conversation.pinned ? `Unpin ${conversation.title}` : `Pin ${conversation.title}`}
                      onClick={() => togglePinIfeoluwaConversation(conversation.id)}
                    >
                      {conversation.pinned ? "★" : "☆"}
                    </button>

                    <button
                      type="button"
                      className={styles.chatHistoryDelete}
                      title="Rename conversation"
                      aria-label={`Rename ${conversation.title}`}
                      onClick={() => renameIfeoluwaConversation(conversation.id)}
                    >
                      ✎
                    </button>

                    <button
                      type="button"
                      className={
                        styles.chatHistoryDelete
                      }
                      title="Delete conversation"
                      aria-label={`Delete ${conversation.title}`}
                      onClick={() =>
                        deleteIfeoluwaConversation(
                          conversation.id
                        )
                      }
                    >
                      ×
                    </button>
                  </article>
                )
              )}
            </div>
          </aside>
        ) : null}

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

                  {message.role === "assistant" && message.content.trim().length > 80 ? (
                    <SaveCompanyPdfButton
                      content={message.content}
                      workspace={workspace}
                      employee="Ifeoluwa"
                      defaultTitle={`Ifeoluwa Report - ${new Date(message.createdAt).toLocaleDateString()}`}
                      conversationId={activeIfeoluwaConversationId}
                      compact
                    />
                  ) : null}
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

          <section
            style={{
              display: "grid",
              gap: 12,
              padding: 16,
              borderRadius: 14,
              border: "1px solid rgba(248, 211, 109, 0.28)",
              background: "rgba(248, 211, 109, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong style={{ color: "#f8d36d" }}>
                  Generate from a picture
                </strong>
                <p
                  style={{
                    margin: "5px 0 0",
                    color: "rgba(255,255,255,0.68)",
                    fontSize: 13,
                  }}
                >
                  Add product photos, people, logos, sketches, or other reference images for Nova to use.
                </p>
              </div>

              <button
                type="button"
                className={
                  novaReferenceMode
                    ? styles.goldButton
                    : styles.secondaryButton
                }
                onClick={() => {
                  setNovaReferenceMode((current) => !current);
                  setNovaError("");
                }}
              >
                {novaReferenceMode
                  ? "Reference images enabled"
                  : "+ Add picture for generation"}
              </button>
            </div>

            {novaReferenceMode ? (
              <>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(event) =>
                    setNovaReferenceFiles(
                      Array.from(event.target.files ?? []).slice(0, 8)
                    )
                  }
                />

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {novaReferenceFiles.length === 0 ? (
                    <span style={{ color: "rgba(255,255,255,0.58)", fontSize: 13 }}>
                      Choose up to eight reference pictures.
                    </span>
                  ) : (
                    novaReferenceFiles.map((file) => (
                      <span
                        key={`${file.name}-${file.size}`}
                        style={{
                          padding: "7px 10px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.08)",
                          color: "#ffffff",
                          fontSize: 12,
                        }}
                      >
                        {file.name}
                      </span>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </section>

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
              : novaReferenceMode
                ? `Generate with ${novaReferenceFiles.length} reference image${novaReferenceFiles.length === 1 ? "" : "s"}`
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

          {dashboardIfeoluwaOpen ? (
            <div className={styles.dashboardPrivateChatWrap}>
              <div className={styles.dashboardPrivacyBar}>
                <div>
                  <strong>Ifeoluwa private conversation</strong>
                  <span>{ifeoluwaPrivacyMode ? "Message previews are hidden." : "Privacy mode is off."}</span>
                </div>
                <button type="button" onClick={() => setIfeoluwaPrivacyMode((value) => !value)}>
                  {ifeoluwaPrivacyMode ? "Show previews" : "Hide previews"}
                </button>
                <button type="button" onClick={() => setDashboardIfeoluwaOpen(false)}>Close</button>
              </div>
              {ifeoluwaPrivacyMode ? (
                <section className={`${styles.panel} ${styles.privateChatHidden}`}>
                  <Avatar src="/avatars/ifeoluwa.jpg" alt="Ifeoluwa" initials="IF" size="large" />
                  <div>
                    <span>Private conversation protected</span>
                    <h2>Ifeoluwa is ready when you are.</h2>
                    <p>Open the dedicated Ifeoluwa page to read personal messages and full conversation history.</p>
                  </div>
                  <button type="button" className={styles.goldButton} onClick={() => setActiveSection("Ifeoluwa")}>Open private chat</button>
                </section>
              ) : renderChatPanel()}
            </div>
          ) : (
            <section className={`${styles.panel} ${styles.privateChatCompact}`}>
              <Avatar src="/avatars/ifeoluwa.jpg" alt="Ifeoluwa" initials="IF" size="large" />
              <div>
                <span>Private assistant</span>
                <h2>Ifeoluwa chat is closed</h2>
                <p>Personal conversations stay hidden on shared or large-screen dashboards.</p>
              </div>
              <button type="button" className={styles.goldButton} onClick={() => setDashboardIfeoluwaOpen(true)}>Open privately</button>
            </section>
          )}
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

                <SaveCompanyPdfButton
                  content={draft}
                  workspace={workspace}
                  employee={missionResult?.employee ?? employee}
                  defaultTitle={`RoyalOS Executive Briefing - ${new Date().toLocaleDateString()}`}
                  missionId={missionResult?.missionId}
                />
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
      <SystemErrorReporter />
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
            <BrandSwitcher onOpenBrands={() => setActiveSection("Brands")} />
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

            <button
              type="button"
              className={styles.systemStatus}
              onClick={() => setActiveSection("Settings")}
              title="Open Settings and System Care"
            >
              <i />
              System Care Active
            </button>
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
                    "Cine Video Studio"
                  ? (
                      <CineVideoStudio
                        onOpenConnections={() => setActiveSection("Connections")}
                        onOpenApprovals={() => setActiveSection("Approvals")}
                      />
                    )
                  : activeSection ===
                      "Michael P Records"
                    ? <MichaelPRecordsCenter />
                    : activeSection ===
                        "Brands"
                      ? (
                          <BrandOperationsCenter
                            initialView="directory"
                            onOpenEmployees={() => setActiveSection("AI Workforce")}
                          />
                        )
                      : activeSection ===
                          "Connections"
                        ? (
                            <BrandOperationsCenter
                              initialView="connections"
                              onOpenEmployees={() => setActiveSection("AI Workforce")}
                            />
                          )
                        : activeSection ===
                            "Security & Audit"
                          ? <SecurityAuditCenter />
                          : activeSection ===
                              "System Care"
                            ? (
                                <SystemMaintenanceCenter
                                  onOpenOrion={() => setActiveSection("Developer Workbench")}
                                  onOpenSecurity={() => setActiveSection("Security & Audit")}
                                  onOpenMissions={() => setActiveSection("Missions")}
                                />
                              )
                            : activeSection ===
                        "Asset Gallery"
                      ? renderAssetGallery()
                      : activeSection ===
                          "AI Workforce"
                        ? <EmployeeDirectory />
                        : activeSection ===
                            "Developer Workbench"
                          ? (
                              <OrionDeveloperWorkbench />
                            )
                          : activeSection ===
                              "Workspaces"
                            ? <CoreOperationsCenter section="Workspaces" />
                            : activeSection ===
                                "Missions"
                              ? <CoreOperationsCenter section="Missions" />
                              : activeSection ===
                                  "Approvals"
                                ? <CoreOperationsCenter section="Approvals" />
                                : activeSection ===
                                    "Knowledge"
                                  ? <CoreOperationsCenter section="Knowledge" />
                                  : activeSection ===
                                      "Memory"
                                    ? <CoreOperationsCenter section="Memory" />
                                    : activeSection ===
                                        "Messages"
                                      ? <CoreOperationsCenter section="Messages" />
                                      : activeSection ===
                                          "Analytics"
                                        ? <CoreOperationsCenter section="Analytics" />
                                        : activeSection ===
                                            "Plugins"
                                          ? <PluginMarketplace />
                                        : activeSection ===
                                            "Settings"
                                          ? (<>
                                              <CoreOperationsCenter section="Settings" />
                                              <SystemMaintenanceCenter
                                                onOpenOrion={() => setActiveSection("Developer Workbench")}
                                                onOpenSecurity={() => setActiveSection("Security & Audit")}
                                                onOpenMissions={() => setActiveSection("Missions")}
                                              />
                                            </>)
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
            {DASHBOARD_EMPLOYEES.map(
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