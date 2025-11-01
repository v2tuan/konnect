import { User } from "@/components/user-table";
import axiosClient from "@/lib/axiosClient"

export const login = async (email: string, password: string): Promise<{ message: string; token: string }> => {
  const res = await axiosClient.post('/auth/login', { email, password })
  return { message: res.data.message, token: res.data.token }
}

export const logout = async (): Promise<{ message: string }> => {
  const res = await axiosClient.post('/auth/logout')
  return res.data
}

export const getUserStatistics = async (
  from?: string,
  to?: string
): Promise<{ date: string; count: number }[]> => {
  const params = new URLSearchParams()
  if (from) params.append("from", from)
  if (to) params.append("to", to)

  const res = await axiosClient.get(`/users/statistics?${params.toString()}`)
  return res.data
}

export const getTotalUsers = async (): Promise<number> => {
  const res = await axiosClient.get("/users/total")
  return res.data
}

export const getNewUsersCount = async (since: string): Promise<number> => {
  const params = new URLSearchParams()
  params.append("since", since)
  const res = await axiosClient.get(`/users/new-count?${params.toString()}`)
  return res.data
}

export const getNewUserStatistics = async (
  since: string
): Promise<{
  currentCount: number;
  previousCount: number;
  percentageChange: number;
  trend: 'increase' | 'decrease' | 'no change';
}> => {
  const params = new URLSearchParams()
  params.append("since", since)
  const res = await axiosClient.get(`/users/new-stats?${params.toString()}`)
  return res.data
}

export const findUsersWithFilter = async (filter: {
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sort?: 'asc' | 'desc';
}): Promise<{
  total: number;
  page: number;
  totalPages: number;
  users: User[];
}> => {
  const params = new URLSearchParams()
  if (filter.search) params.append("search", filter.search)
  if (filter.startDate) params.append("startDate", filter.startDate)
  if (filter.endDate) params.append("endDate", filter.endDate)
  if (filter.page) params.append("page", filter.page.toString())
  if (filter.limit) params.append("limit", filter.limit.toString())
  if (filter.sortBy) params.append("sortBy", filter.sortBy)
  if (filter.sort) params.append("sort", filter.sort)
  const res = await axiosClient.get(`/users/filter?${params.toString()}`)
  return res.data
}

export const deleteUser = async (id: string): Promise<User | null> => {
  const res = await axiosClient.delete(`/users/${id}`)
  return res.data
}

export const restoreUser = async (id: string): Promise<User | null> => {
  const res = await axiosClient.post(`/users/${id}/restore`)
  return res.data
}

export const getUserById = async (id: string): Promise<User | null> => {
  const res = await axiosClient.get(`/users/${id}`)
  return res.data
}