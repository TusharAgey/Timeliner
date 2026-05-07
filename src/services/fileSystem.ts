import { del, get, set } from 'idb-keyval'
import {
  labelSchema,
  personSchema,
  projectSchema,
  workspaceSchema,
  type Label,
  type Person,
  type Project,
  type Workspace,
  type WorkspaceData,
} from '../models/types'

const HANDLE_KEY = 'timeliner.workspace-handle'
const WORKSPACE_FILE = 'workspace.json'

type FileSystemPermissionMode = 'read' | 'readwrite'
type FileSystemHandlePermissionDescriptorLike = { mode?: FileSystemPermissionMode }
type PermissionCapableHandle = FileSystemHandle & {
  queryPermission?: (descriptor?: FileSystemHandlePermissionDescriptorLike) => Promise<PermissionState>
  requestPermission?: (descriptor?: FileSystemHandlePermissionDescriptorLike) => Promise<PermissionState>
}

type WindowWithFSAccess = Window & typeof globalThis & {
  showDirectoryPicker?: (options?: { mode?: FileSystemPermissionMode }) => Promise<FileSystemDirectoryHandle>
}

export type WorkspaceFolderHandle = FileSystemDirectoryHandle

const readTextFile = async (fileHandle: FileSystemFileHandle) => {
  const file = await fileHandle.getFile()
  return file.text()
}

export const isFileSystemSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window

export const verifyPermission = async (handle: PermissionCapableHandle) => {
  const options: FileSystemHandlePermissionDescriptorLike = { mode: 'readwrite' }
  if ((await handle.queryPermission?.(options)) === 'granted') return true
  return (await handle.requestPermission?.(options)) === 'granted'
}

export const chooseWorkspaceFolder = async () => {
  if (!isFileSystemSupported()) throw new Error('File System Access API is unavailable in this browser.')

  const picker = (window as WindowWithFSAccess).showDirectoryPicker
  if (!picker) throw new Error('Directory picker is not available.')

  const handle = await picker({ mode: 'readwrite' })
  await set(HANDLE_KEY, handle)
  return handle
}

export const getPersistedWorkspaceHandle = async () => {
  const handle = await get<WorkspaceFolderHandle>(HANDLE_KEY)
  if (!handle) return null
  const granted = await verifyPermission(handle)
  return granted ? handle : null
}

export const clearPersistedWorkspaceHandle = async () => del(HANDLE_KEY)

const ensureFile = async (dir: FileSystemDirectoryHandle, name: string, initialData: unknown) => {
  const fileHandle = await dir.getFileHandle(name, { create: true })
  const file = await fileHandle.getFile()
  if (file.size === 0) {
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(initialData, null, 2))
    await writable.close()
  }
  return fileHandle
}

export const writeJson = async (dir: FileSystemDirectoryHandle, fileName: string, data: unknown) => {
  const fileHandle = await dir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

export const readJson = async <T>(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  schema: { parse: (value: unknown) => T },
) => {
  const fileHandle = await dir.getFileHandle(fileName)
  const text = await readTextFile(fileHandle)
  return schema.parse(JSON.parse(text))
}

export const createWorkspaceScaffold = async (handle: WorkspaceFolderHandle, data: WorkspaceData) => {
  const projectsDir = await handle.getDirectoryHandle('projects', { create: true })
  const lookupsDir = await handle.getDirectoryHandle('lookups', { create: true })

  await ensureFile(handle, WORKSPACE_FILE, data.workspace)
  await ensureFile(lookupsDir, 'people.json', data.people)
  await ensureFile(lookupsDir, 'labels.json', data.labels)

  await Promise.all(data.projects.map((project) => ensureFile(projectsDir, `${project.slug}.json`, project)))
}

export const loadWorkspaceFromHandle = async (handle: WorkspaceFolderHandle): Promise<WorkspaceData> => {
  const projectsDir = await handle.getDirectoryHandle('projects', { create: true })
  const lookupsDir = await handle.getDirectoryHandle('lookups', { create: true })
  const workspace = await readJson<Workspace>(handle, WORKSPACE_FILE, workspaceSchema)
  const people = await readJson<Person[]>(lookupsDir, 'people.json', personSchema.array())
  const labels = await readJson<Label[]>(lookupsDir, 'labels.json', labelSchema.array())

  const projects: Project[] = []
  for await (const [name] of projectsDir.entries()) {
    if (name.endsWith('.json')) {
      projects.push(await readJson<Project>(projectsDir, name, projectSchema))
    }
  }

  return { workspace, projects, people, labels }
}

export const saveWorkspaceToHandle = async (handle: WorkspaceFolderHandle, data: WorkspaceData) => {
  const projectsDir = await handle.getDirectoryHandle('projects', { create: true })
  const lookupsDir = await handle.getDirectoryHandle('lookups', { create: true })

  await writeJson(handle, WORKSPACE_FILE, data.workspace)
  await writeJson(lookupsDir, 'people.json', data.people)
  await writeJson(lookupsDir, 'labels.json', data.labels)
  await Promise.all(data.projects.map((project) => writeJson(projectsDir, `${project.slug}.json`, project)))
}
