import Conversation from "~/models/conversations"

const fetchCloudConversation = async (userId) => {
  try {
    const convo = await Conversation.findOne({ type: 'cloud', 'cloud.ownerId': userId })
    if (!convo) {
      convo = await Conversation.create({
        type: 'cloud',
        cloud: { ownerId: userId }
      })
    }
    return convo
  } catch (error) {
    throw new Error(error)
  }
}

export const cloudService = {
  fetchCloudConversation
}