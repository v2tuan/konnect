import axiosClient from "@/lib/axiosClient"

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