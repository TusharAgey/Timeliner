import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isFileSystemSupported,
  verifyPermission,
  chooseWorkspaceFolder,
  getPersistedWorkspaceHandle,
  clearPersistedWorkspaceHandle,
  writeJson,
  deleteJson,
  readJson,
  createWorkspaceScaffold,
  loadWorkspaceFromHandle,
  saveWorkspaceToHandle,
} from "../fileSystem";
import type { WorkspaceData } from "../../models/types";

// Mock idb-keyval
const idbStore: Record<string, unknown> = {};
vi.mock("idb-keyval", () => ({
  set: vi.fn(async (key: string, value: unknown) => {
    idbStore[key] = value;
  }),
  get: vi.fn(async (key: string) => idbStore[key] ?? undefined),
  del: vi.fn(async (key: string) => {
    delete idbStore[key];
  }),
}));

// --- Fake File System handles ---
const makeWritable = () => {
  let content = "";
  return {
    write: vi.fn(async (data: string) => {
      content += data;
    }),
    close: vi.fn(async () => {}),
    getContent: () => content,
  };
};

const makeFileHandle = (initialContent = "") => {
  let content = initialContent;
  const writable = makeWritable();
  return {
    getFile: vi.fn(async () => ({
      size: content.length,
      text: vi.fn(async () => content),
    })),
    createWritable: vi.fn(async () => writable),
    _writable: writable,
    _setContent: (c: string) => {
      content = c;
    },
  };
};

interface FakeDirHandle {
  getFileHandle: ReturnType<typeof vi.fn>;
  getDirectoryHandle: ReturnType<typeof vi.fn>;
  removeEntry: ReturnType<typeof vi.fn>;
  entries: ReturnType<typeof vi.fn>;
  _fileHandles: Record<string, ReturnType<typeof makeFileHandle>>;
  _subDirs: Record<string, FakeDirHandle>;
}

const makeDirHandle = (files: Record<string, unknown> = {}): FakeDirHandle => {
  const fileHandles: Record<string, ReturnType<typeof makeFileHandle>> = {};
  const subDirs: Record<string, FakeDirHandle> = {};

  for (const [name, content] of Object.entries(files)) {
    fileHandles[name] = makeFileHandle(
      typeof content === "string" ? content : JSON.stringify(content, null, 2),
    );
  }
  return {
    getFileHandle: vi.fn(async (name: string, opts?: { create?: boolean }) => {
      if (!fileHandles[name] && opts?.create) {
        fileHandles[name] = makeFileHandle("");
      }
      if (!fileHandles[name]) throw new Error("File not found");
      return fileHandles[name];
    }),
    getDirectoryHandle: vi.fn(
      async (name: string, opts?: { create?: boolean }) => {
        if (!subDirs[name] && opts?.create) {
          subDirs[name] = makeDirHandle();
        }
        if (!subDirs[name]) throw new Error("Dir not found");
        return subDirs[name];
      },
    ),
    removeEntry: vi.fn(async (name: string) => {
      delete fileHandles[name];
    }),
    entries: vi.fn(async function* () {
      for (const name of Object.keys(fileHandles)) {
        yield [name, fileHandles[name]];
      }
    }),
    _fileHandles: fileHandles,
    _subDirs: subDirs,
  };
};

const makeSeedData = (): WorkspaceData => ({
  workspace: {
    id: "ws-1",
    name: "Test Workspace",
    projectIds: ["proj-1"],
    tabs: [{ id: "tab-1", name: "Tab 1", projectIds: ["proj-1"] }],
  },
  projects: [
    {
      id: "proj-1",
      name: "Project 1",
      slug: "project-1",
      description: "",
      milestones: [],
      tasks: [],
    },
  ],
  people: [{ id: "person-1", name: "Alice", role: "Developer" }],
  labels: [],
});

describe("isFileSystemSupported", () => {
  it("returns false when showDirectoryPicker is unavailable", () => {
    expect(isFileSystemSupported()).toBe(false);
  });

  it("returns true when showDirectoryPicker is available", () => {
    (window as unknown as Record<string, unknown>).showDirectoryPicker =
      vi.fn();
    expect(isFileSystemSupported()).toBe(true);
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
  });
});

describe("verifyPermission", () => {
  it("returns true when queryPermission is granted", async () => {
    const handle = {
      queryPermission: vi.fn(async () => "granted"),
    };
    expect(await verifyPermission(handle as never)).toBe(true);
  });

  it("requests permission when not granted", async () => {
    const handle = {
      queryPermission: vi.fn(async () => "prompt"),
      requestPermission: vi.fn(async () => "granted"),
    };
    expect(await verifyPermission(handle as never)).toBe(true);
    expect(handle.requestPermission).toHaveBeenCalled();
  });

  it("returns false when permission is denied", async () => {
    const handle = {
      queryPermission: vi.fn(async () => "prompt"),
      requestPermission: vi.fn(async () => "denied"),
    };
    expect(await verifyPermission(handle as never)).toBe(false);
  });
});

describe("chooseWorkspaceFolder", () => {
  it("throws when File System Access API is unavailable", async () => {
    await expect(chooseWorkspaceFolder()).rejects.toThrow(
      "File System Access API is unavailable",
    );
  });

  it("persists the chosen handle", async () => {
    const handle = { name: "ws" };
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi.fn(
      async () => handle,
    );
    const result = await chooseWorkspaceFolder();
    expect(result).toBe(handle);
    expect(idbStore["timeliner.workspace-handle"]).toBe(handle);
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
  });
});

describe("getPersistedWorkspaceHandle", () => {
  beforeEach(() => {
    delete idbStore["timeliner.workspace-handle"];
  });

  it("returns null when no handle is persisted", async () => {
    expect(await getPersistedWorkspaceHandle()).toBeNull();
  });

  it("returns the handle when permission is granted", async () => {
    const handle = {
      queryPermission: vi.fn(async () => "granted"),
    };
    idbStore["timeliner.workspace-handle"] = handle;
    expect(await getPersistedWorkspaceHandle()).toBe(handle);
  });

  it("returns null when permission is denied", async () => {
    const handle = {
      queryPermission: vi.fn(async () => "denied"),
    };
    idbStore["timeliner.workspace-handle"] = handle;
    expect(await getPersistedWorkspaceHandle()).toBeNull();
  });
});

describe("clearPersistedWorkspaceHandle", () => {
  it("removes the persisted handle", async () => {
    idbStore["timeliner.workspace-handle"] = { name: "ws" };
    await clearPersistedWorkspaceHandle();
    expect(idbStore["timeliner.workspace-handle"]).toBeUndefined();
  });
});

describe("writeJson", () => {
  it("writes serialized data to a file", async () => {
    const dir = makeDirHandle();
    await writeJson(dir as never, "data.json", { hello: "world" });
    const fh = dir._fileHandles["data.json"];
    expect(fh).toBeDefined();
    expect(fh._writable.getContent()).toContain('"hello": "world"');
  });
});

describe("deleteJson", () => {
  it("removes an entry from the directory", async () => {
    const dir = makeDirHandle({ "data.json": "{}" });
    await deleteJson(dir as never, "data.json");
    expect(dir._fileHandles["data.json"]).toBeUndefined();
  });
});

describe("readJson", () => {
  it("reads and parses a file through the schema", async () => {
    const dir = makeDirHandle({ "data.json": { id: "x", name: "X" } });
    const schema = { parse: vi.fn((v: unknown) => v) };
    const result = await readJson(dir as never, "data.json", schema);
    expect(result).toEqual({ id: "x", name: "X" });
    expect(schema.parse).toHaveBeenCalled();
  });
});

describe("createWorkspaceScaffold", () => {
  it("creates workspace, lookups, and project files", async () => {
    const handle = makeDirHandle();
    const data = makeSeedData();
    await createWorkspaceScaffold(handle as never, data);
    expect(handle._fileHandles["workspace.json"]).toBeDefined();
    const lookups = handle._subDirs["lookups"];
    expect(lookups._fileHandles["people.json"]).toBeDefined();
    expect(lookups._fileHandles["labels.json"]).toBeDefined();
    const projects = handle._subDirs["projects"];
    expect(projects._fileHandles["project-1.json"]).toBeDefined();
  });
});

describe("loadWorkspaceFromHandle", () => {
  it("loads workspace, people, labels, and projects", async () => {
    const data = makeSeedData();
    const handle = makeDirHandle({
      "workspace.json": data.workspace,
    });
    const lookups = makeDirHandle({
      "people.json": data.people,
      "labels.json": data.labels,
    });
    const projects = makeDirHandle({
      "project-1.json": data.projects[0],
    });
    handle._subDirs["lookups"] = lookups;
    handle._subDirs["projects"] = projects;

    const result = await loadWorkspaceFromHandle(handle as never);
    expect(result.workspace.id).toBe("ws-1");
    expect(result.people).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].slug).toBe("project-1");
  });
});

describe("saveWorkspaceToHandle", () => {
  it("writes all workspace data to files", async () => {
    const handle = makeDirHandle();
    const data = makeSeedData();
    await saveWorkspaceToHandle(handle as never, data);
    expect(handle._fileHandles["workspace.json"]).toBeDefined();
    const lookups = handle._subDirs["lookups"];
    expect(lookups._fileHandles["people.json"]).toBeDefined();
    expect(lookups._fileHandles["labels.json"]).toBeDefined();
    const projects = handle._subDirs["projects"];
    expect(projects._fileHandles["project-1.json"]).toBeDefined();
  });
});
