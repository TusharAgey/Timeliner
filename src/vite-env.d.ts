/// <reference types="vite/client" />

declare global {
  interface FileSystemHandle {
    kind: 'file' | 'directory'
    name: string
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    getFile(): Promise<File>
    createWritable(): Promise<FileSystemWritableFileStream>
  }

  interface FileSystemWritableFileStream {
    write(data: string): Promise<void>
    close(): Promise<void>
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  }
}

export {}
