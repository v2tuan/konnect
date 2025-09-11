import Conversation from "~/models/conversations"
import { MAX_LIMIT_MESSAGE } from "~/utils/constant"
import { messageService } from "./messageService"
import Message from "~/models/messages"
import mongoose from "mongoose"

const fetchCloudConversation = async (
  userId,
  { limit = 30, beforeSeq } = {}
) => {
  try {
    // neu chua co hoi thoai thi tao cloud conversation dau tien
    let convo = await Conversation.findOne({ type: "cloud", "cloud.ownerId": userId })
    if (!convo) {
      convo = await Conversation.create({
        type: "cloud",
        cloud: { ownerId: userId }
      })
    }

    // goi message service de list ra message
    const _limit = Math.min(Number(limit) || 30, MAX_LIMIT_MESSAGE)
    const messages = await messageService.listMessages({
      userId,
      conversationId: String(convo._id),
      limit: _limit,
      beforeSeq
    })

    // load tin nhan cu hon
    const earliest = messages[0]
    const hasMore =
      !!earliest &&
      (await Message.exists({
        conversationId: new mongoose.Types.ObjectId(convo._id),
        seq: { $lt: earliest.seq }
      }).lean())

    const nextBeforeSeq = earliest ? earliest.seq : undefined

    return {
      conversation: convo.toObject?.() ?? convo,
      messages,
      paging: {
        hasMore: !!hasMore,
        nextBeforeSeq
      }
    }
  } catch (error) {
    // giữ nguyên stack cho dễ debug
    throw error instanceof Error ? error : new Error(String(error))
  }
}

export const cloudService = {
  fetchCloudConversation
}