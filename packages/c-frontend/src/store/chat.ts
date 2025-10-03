import { create } from "zustand";
import type { Conversation, Message } from "@/lib/chat.api";
import {
  getConversations as apiGetConversations,
  getMessages as apiGetMessages,
  sendMessage as apiSendMessage,
  markRead as apiMarkRead,
} from "@/lib/chat.api";
import { apiClient } from "@/lib/apiClient";

// helpers for safe mapping from unknown backend payloads
const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === "object" && val !== null;
const getStringField = (
  obj: Record<string, unknown>,
  key: string
): string | undefined => {
  const v = obj[key];
  if (typeof v === "string" || typeof v === "number") return String(v);
  return undefined;
};

const toFriend = (u: unknown): Friend => {
  if (!isRecord(u)) return { id: "", name: "" };
  const id = getStringField(u, "id") ?? "";
  const username = getStringField(u, "username");
  const profile = isRecord(u["profile"])
    ? (u["profile"] as Record<string, unknown>)
    : undefined;
  const nickname = profile ? getStringField(profile, "nickname") : undefined;
  const avatar =
    profile && typeof profile["avatar"] === "string"
      ? (profile["avatar"] as string)
      : undefined;
  const name = nickname ?? username ?? id;
  return { id, name, avatar };
};

const toFriendRequest = (it: unknown): FriendRequest => {
  if (!isRecord(it))
    return { id: "", from: { id: "", name: "" }, to: { id: "", name: "" } };
  const id = getStringField(it, "id") ?? "";
  const fromUser = isRecord(it["fromUser"])
    ? (it["fromUser"] as Record<string, unknown>)
    : {};
  const toUser = isRecord(it["toUser"])
    ? (it["toUser"] as Record<string, unknown>)
    : {};
  return { id, from: toFriend(fromUser), to: toFriend(toUser) };
};

const getStatus = (e: unknown): number | undefined =>
  (e as { response?: { status?: number } }).response?.status;
const getErrorMessage = (e: unknown): string =>
  (e as Error)?.message ?? String(e);

// 占位：好友/发现功能尚未接入后端，先保留空列表与空操作，避免打断UI
interface Friend {
  id: string;
  name: string;
  avatar?: string;
}
interface FriendRequest {
  id: string;
  from: Friend;
  to: Friend;
}

interface ChatState {
  // conversations
  q: string;
  convs: Conversation[];
  activeId: string | null;

  // messages
  messages: Message[];
  draft: string;

  // friends and discover (暂为占位)
  peopleQ: string;
  friends: Friend[];
  found: Friend[];
  inboundReqs: FriendRequest[];

  // computed header info
  getActiveConv: () => Conversation | null;
  getIsDirectStart: () => boolean;
  getDirectUserId: () => string | null;
  getDirectUserName: () => string | null;
  getHeaderName: () => string;
  getHeaderAvatar: () => string | undefined;

  // actions
  init: () => Promise<void>;
  setQ: (q: string) => void;
  setPeopleQ: (q: string) => void;
  setActive: (id: string) => Promise<void>;
  setDraft: (t: string) => void;
  send: (userId: string) => Promise<Message | null>;
  searchPeople: () => Promise<void>;
  addFriend: (id: string) => Promise<void>;
  accept: (reqId: string) => Promise<void>;
  decline: (reqId: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  refreshLists: () => Promise<void>;
  receive: (msg: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  q: "",
  convs: [],
  activeId: null,
  messages: [],
  draft: "",
  peopleQ: "",
  friends: [],
  found: [],
  inboundReqs: [],

  // computed header info
  getActiveConv: () => {
    const { convs, activeId } = get();
    return convs.find((c) => c.id === activeId) || null;
  },
  getIsDirectStart: () => {
    const { activeId } = get();
    return !!activeId && activeId.startsWith("direct:");
  },
  getDirectUserId: () => {
    const { activeId } = get();
    const isDirectStart = !!activeId && activeId.startsWith("direct:");
    return isDirectStart ? (activeId as string).split(":")[1] : null;
  },
  getDirectUserName: () => {
    const { friends } = get();
    const isDirectStart = get().getIsDirectStart();
    const directUserId = get().getDirectUserId();
    if (!isDirectStart || !directUserId) return null;
    const f = friends.find((x) => x.id === directUserId);
    return f?.name || `用户 ${directUserId}`;
  },
  getHeaderName: () => {
    const activeConv = get().getActiveConv();
    const directUserName = get().getDirectUserName();
    return activeConv?.name || directUserName || "";
  },
  getHeaderAvatar: () => {
    const activeConv = get().getActiveConv();
    const { friends } = get();
    const isDirectStart = get().getIsDirectStart();
    const directUserId = get().getDirectUserId();

    if (activeConv?.avatar) return activeConv.avatar;
    if (isDirectStart && directUserId) {
      const f = friends.find((x) => x.id === directUserId);
      return f?.avatar;
    }
    return undefined;
  },

  init: async () => {
    try {
      const [cs, friendsRaw, inboundRaw]: [Conversation[], unknown, unknown] =
        await Promise.all([
          apiGetConversations(),
          apiClient
            .get("/friend/list")
            .then((r) => r.data)
            .catch(() => []),
          apiClient
            .get("/friend/requests", { params: { direction: "in" } })
            .then((r) => r.data)
            .catch(() => []),
        ]);
      const friendsMapped: Friend[] = Array.isArray(friendsRaw)
        ? friendsRaw.map(toFriend)
        : [];
      const inboundReqs: FriendRequest[] = Array.isArray(inboundRaw)
        ? inboundRaw.map(toFriendRequest)
        : [];

      const activeId = cs[0]?.id || null;
      set({ convs: cs, activeId, friends: friendsMapped, inboundReqs });

      if (activeId) {
        try {
          const ms = await apiGetMessages(activeId);
          set({ messages: ms });
          // 进入会话即标记已读
          void apiMarkRead(activeId).catch(() => {});
          // 本地清零未读
          set(({ convs }) => ({
            convs: convs.map((c) =>
              c.id === activeId ? { ...c, unread: 0 } : c
            ),
          }));
        } catch (e: unknown) {
          if (getStatus(e) === 401) {
            set({ messages: [] });
          } else {
            console.warn("[chat.init] getMessages failed:", getErrorMessage(e));
            set({ messages: [] });
          }
        }
      } else {
        set({ messages: [] });
      }
    } catch (e: unknown) {
      if (getStatus(e) === 401) {
        set({
          convs: [],
          activeId: null,
          messages: [],
          friends: [],
          inboundReqs: [],
        });
      } else {
        console.warn("[chat.init] failed:", getErrorMessage(e));
        set({
          convs: [],
          activeId: null,
          messages: [],
          friends: [],
          inboundReqs: [],
        });
      }
    }
  },

  setQ: (q: string) => set({ q }),
  setPeopleQ: (peopleQ: string) => set({ peopleQ }),
  setActive: async (id: string) => {
    // 支持从好友列表直接发起会话：activeId 形如 "direct:<userId>" 时，不请求历史记录，等首次发送后切换到真实会话
    if (id.startsWith("direct:")) {
      set({ activeId: id, messages: [] });
      return;
    }
    try {
      const ms = await apiGetMessages(id);
      set({ activeId: id, messages: ms });
      // 标记已读并清零
      void apiMarkRead(id).catch(() => {});
      set(({ convs }) => ({
        convs: convs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
      }));
    } catch (e: unknown) {
      if (getStatus(e) === 401) {
        set({ activeId: id, messages: [] });
      } else {
        console.warn(
          "[chat.setActive] getMessages failed:",
          getErrorMessage(e)
        );
        set({ activeId: id, messages: [] });
      }
    }
  },
  setDraft: (draft: string) => set({ draft }),

  send: async (_userId: string) => {
    const { activeId, draft, messages } = get();
    if (!activeId) return null;
    const content = draft.trim();
    if (!content) return null;
    try {
      // 如果是从好友列表临时发起（direct:<userId>），则使用 toUserId 发送，后端会创建/找到直聊会话
      if (activeId.startsWith("direct:")) {
        const toUserId = activeId.split(":")[1];
        const msg = await apiSendMessage({ toUserId, content });
        // 切换到真实会话并刷新列表
        set({ draft: "", activeId: msg.convId, messages: [...messages, msg] });
        void get().refreshLists();
        return msg;
      }
      // 常规：在已有会话里发送
      const msg = await apiSendMessage({ convId: activeId, content });
      set({ draft: "", messages: [...messages, msg] });
      return msg;
    } catch (e: unknown) {
      if (getStatus(e) === 401) {
        console.warn("[chat.send] unauthorized");
      } else {
        console.warn("[chat.send] failed:", getErrorMessage(e));
      }
      return null;
    }
  },

  // 接入后端用户搜索接口（带头像）
  searchPeople: async () => {
    const { peopleQ } = get();
    const q = (peopleQ || "").trim();
    if (!q) {
      set({ found: [] });
      return;
    }
    try {
      const res = await apiClient.get("/user/search", {
        params: { q, limit: 20 },
      });
      const users = Array.isArray(res.data) ? res.data : [];
      const found: Friend[] = users.map(toFriend);
      set({ found });
    } catch (e: unknown) {
      if (getStatus(e) === 401) {
        set({ found: [] });
      } else {
        console.warn("[chat.searchPeople] failed:", getErrorMessage(e));
        set({ found: [] });
      }
    }
  },
  addFriend: async (id: string) => {
    try {
      await apiClient.post("/friend/request", { toUserId: Number(id) });
      // 发送后刷新收到的申请（对方收到，我们本端应在“发出的申请”里；此处先刷新入站+出站一起）
      const [inbound, outbound, friends]: [unknown, unknown, unknown] =
        await Promise.all([
          apiClient
            .get("/friend/requests", { params: { direction: "in" } })
            .then((r) => r.data),
          apiClient
            .get("/friend/requests", { params: { direction: "out" } })
            .then((r) => r.data),
          apiClient.get("/friend/list").then((r) => r.data),
        ]);
      const inboundReqs: FriendRequest[] = Array.isArray(inbound)
        ? inbound.map(toFriendRequest)
        : [];
      const friendsMapped: Friend[] = Array.isArray(friends)
        ? friends.map(toFriend)
        : [];
      set({ inboundReqs: inboundReqs, friends: friendsMapped });
    } catch (e: unknown) {
      if (getStatus(e) === 401) return;
      console.warn("[chat.addFriend] failed:", getErrorMessage(e));
    }
  },
  accept: async (reqId: string) => {
    try {
      await apiClient.post(`/friend/accept/${reqId}`);
      const [inbound, friends]: [unknown, unknown] = await Promise.all([
        apiClient
          .get("/friend/requests", { params: { direction: "in" } })
          .then((r) => r.data),
        apiClient.get("/friend/list").then((r) => r.data),
      ]);
      const inboundReqs: FriendRequest[] = Array.isArray(inbound)
        ? inbound.map(toFriendRequest)
        : [];
      const friendsMapped: Friend[] = Array.isArray(friends)
        ? friends.map(toFriend)
        : [];
      set({ inboundReqs, friends: friendsMapped });
    } catch (e: unknown) {
      if (getStatus(e) === 401) return;
      console.warn("[chat.accept] failed:", getErrorMessage(e));
    }
  },
  decline: async (reqId: string) => {
    try {
      await apiClient.post(`/friend/decline/${reqId}`);
      const inbound: unknown = await apiClient
        .get("/friend/requests", { params: { direction: "in" } })
        .then((r) => r.data);
      const inboundReqs: FriendRequest[] = Array.isArray(inbound)
        ? inbound.map(toFriendRequest)
        : [];
      set({ inboundReqs });
    } catch (e: unknown) {
      if (getStatus(e) === 401) return;
      console.warn("[chat.decline] failed:", getErrorMessage(e));
    }
  },
  removeFriend: async (id: string) => {
    try {
      await apiClient.delete(`/friend/${Number(id)}`);
      const friends: unknown = await apiClient
        .get("/friend/list")
        .then((r) => r.data);
      const friendsMapped: Friend[] = Array.isArray(friends)
        ? friends.map(toFriend)
        : [];
      set({ friends: friendsMapped });
    } catch (e: unknown) {
      if (getStatus(e) === 401) return;
      console.warn("[chat.removeFriend] failed:", getErrorMessage(e));
    }
  },
  refreshLists: async () => {
    try {
      const [convs, friends, inbound]: [Conversation[], unknown, unknown] =
        await Promise.all([
          apiGetConversations(),
          apiClient.get("/friend/list").then((r) => r.data),
          apiClient
            .get("/friend/requests", { params: { direction: "in" } })
            .then((r) => r.data),
        ]);
      const friendsMapped: Friend[] = Array.isArray(friends)
        ? friends.map(toFriend)
        : [];
      const inboundReqs: FriendRequest[] = Array.isArray(inbound)
        ? inbound.map(toFriendRequest)
        : [];
      set({ convs, friends: friendsMapped, inboundReqs });
    } catch (e: unknown) {
      if (getStatus(e) === 401) {
        set({ convs: [], friends: [], inboundReqs: [] });
      } else {
        console.warn("[chat.refreshLists] failed:", getErrorMessage(e));
        set({ convs: [], friends: [], inboundReqs: [] });
      }
    }
  },
  receive: (msg: Message) => {
    const { activeId, messages, convs } = get();

    // 如果当前处于临时直聊（direct:<userId>）并且正好是该用户发来的消息，
    // 则切换到真实会话并立刻展示消息
    if (activeId && activeId.startsWith("direct:")) {
      const uid = activeId.split(":")[1];
      if (uid && uid === msg.senderId) {
        set({ activeId: msg.convId, messages: [...messages, msg] });
        // 同步刷新会话列表，确保新会话出现并置顶
        void get().refreshLists();
        return;
      }
    }

    // 更新当前对话消息
    if (activeId === msg.convId) {
      set({ messages: [...messages, msg] });
    }

    // 更新会话列表的 last 与 unread
    const idx = convs.findIndex((c) => c.id === msg.convId);
    if (idx >= 0) {
      const next = convs.slice();
      // unread：若当前非该会话，则 +1
      const unreadInc = activeId === msg.convId ? 0 : 1;
      next[idx] = {
        ...next[idx],
        last:
          msg.content || (msg.images && msg.images.length > 0 ? "[图片]" : ""),
        unread: (next[idx].unread || 0) + unreadInc,
      };
      // 移动到顶部
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      set({ convs: next });
    } else {
      // 不在列表中（例如直聊首次出现），刷新一次列表
      void get().refreshLists();
    }
  },
}));
