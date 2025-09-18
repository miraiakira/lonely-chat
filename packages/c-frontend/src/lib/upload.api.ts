import { apiClient } from './apiClient'

export async function uploadFile(file: File): Promise<{ url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await apiClient.post('/file/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}