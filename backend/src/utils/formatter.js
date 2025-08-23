export const pickUser = (user) => {
  if (!user) return {}
  return pickUser(user, ['_id', 'phone', 'email', 'avatarUrl', 'fullName', 'dateOfBirth', 'bio', 'createdAt', 'updatedAt'])
}