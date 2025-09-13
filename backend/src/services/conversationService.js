import Conversation from "~/models/conversations";
import ConversationMember from "~/models/conversation_members";
import User from "~/models/user";
import FriendShip from "~/models/friendships";
import mongoose from "mongoose";
import { messageService } from "./messageService";

const createConversation = async (conversationData, userId) => {
    const { type, memberIds } = conversationData

    const conversationDataToCreate = {
        type,
        messageSeq: 0
    }

    let membersToAdd = []

    if (type === 'cloud') {
        // Kiểm tra đã có cloud conversation chưa

        // Set up conversation data
        conversationData.cloud = {
            ownerId: userId
        }

        membersToAdd = [
            { userId: userId, role: 'owner' }
        ]
    }
    else if (type === 'direct') {
        // Kiểm tra recipient có tồn tại không
        if (memberIds.length > 2) {
            throw new Error('Tin nhắn trực tiếp chỉ có tối đa 2 thành viên')
        }

        const recipientId = memberIds.find(id => id !== userId)
        const recipient = await User.findById(recipientId)
        
        if (!recipient) {
            throw new Error('Recipient not found')
        }

        // Kiểm tra không thể tạo conversation với chính mình
        if (userId === recipientId) {
            throw new Error('Cannot create a conversation with yourself')
        }

        // Kiểm tra có bị block không

        // Kiểm tra conversation đã tồn tại chưa
        const existingConversation = await Conversation.findOne({
            type: 'direct',
            $or: [
                { 'direct.userA': userId, 'direct.userB': recipientId },
                { 'direct.userA': recipientId, 'direct.userB': userId }
            ]
        });

        if (existingConversation) {
            return
        }

        // Set up conversation data
        conversationData.direct = {
            userA: userId,
            userB: recipientId
        };

        // Set up conversation data
        membersToAdd = [
            { userId: userId, role: 'member' },
            { userId: recipientId, role: 'member' }
        ]
    }
    else if (type === 'group') {
        // Kiểm tra tất cả member có tồn tại không
        // Kiểm tra có user hiện tại trong danh sách không nếu không thì thêm vào
        const uniqueMemberIds = [...new Set([userId, ...memberIds])]

        if (uniqueMemberIds.length <= 2) {
            throw new Error('Không thể tạo nhóm chỉ với 2 thành viên')
        }

        // Set up conversation data
        conversationData.group = {
            name: 'New Group',
            avatarURL: '/'
        }

        membersToAdd = uniqueMemberIds.map(id => ({
            userId: id,
            role: id === userId ? 'admin' : 'member'
        }))
    }

    // ============================= TẠO CONVERSATION ================================
    const newConversation = await Conversation.create(conversationData)
    await newConversation.save()

    // Thêm member vào conversation
    const memberPromises = membersToAdd.map(member => {
        const conversationMember = new ConversationMember({
            conversation: newConversation._id,
            userId: member.userId,
            role: member.role
        })

        return conversationMember.save()
    })

    await Promise.all(memberPromises)

    return newConversation
}

// Get Conversation
const getConversation = async (page, limit, userId) => {
    const memberRecords = await ConversationMember.find({ userId })
        .populate({
            path: 'conversation',
            populate: [
                {
                    path: 'lastMessage.senderId',
                    select: 'fullName userName avatarUrl'
                }
            ]
        })
        .sort({ 'conversation.createdAt': -1 })
        .limit(limit)
        .skip((page - 1) * limit)

    console.log(memberRecords)

    const conversations = await Promise.all(
        memberRecords.map(async (member) => {
            const conversation = member.conversation
            let conversationData = {
                id: conversation._id,
                type: conversation.type,
                lastMessage: conversation.lastMessage,
                messageSeq: conversation.messageSeq,
                updatedAt: conversation.updatedAt
            }

            // Xử lý theo từng loại conversation
            if (conversation.type === 'direct') {
                // Tìm user còn lại trong cuộc trò chuyện
                const members = await ConversationMember.find({ conversation: conversation._id })
                const otherUserId = members.find(user => user.userId !== userId).userId
                const otherUser = await User.findById(otherUserId)

                // Get friendship
                const friendship = await FriendShip.findOne({
                    $or: [
                        { profileRequest: otherUserId, profileAccept: userId },
                        { profileRequest: userId, profileAcept: otherUserId }
                    ]
                })

                conversationData.direct = {
                    otherUser: {
                        id: otherUser._id,
                        fullName: otherUser.fullName,
                        userName: otherUser.username,
                        avatarURL: otherUser.avatarUrl,
                        status: otherUser.status,
                        friendship: friendship ? true : false
                    }
                }

                conversationData.displayName = otherUser.fullName,
                    conversationData.conversationAvatarUrl = otherUser.avatarUrl
            }
            else if (conversation.type === 'group') {
                // Đếm số thành viên

                conversationData.group = {
                    name: conversation.group.name,
                    avatarURL: conversation.group.avatarURL
                }

                conversationData.displayName = conversation.group.name
                conversationData.conversationAvatarUrl = conversation.group.avatarUrl
            }
            else if (conversation.type === 'cloud') {
                conversationData.displayName = 'Your Cloud',
                    conversationData.conversationAvatarUrl = 'https://cdn-icons-png.flaticon.com/512/8038/8038388.png'
            }

            return conversationData
        })
    )

    return conversations
}

const fetchConversationDetail = async (userId, conversationId, limit = 30, beforeSeq) => {
    try {
        if (!mongoose.isValidObjectId(conversationId)) {
            throw new Error('Invalid conversationId')
        }

        const convo = await Conversation.findById(conversationId).lean()
        if (!convo) throw new Error('Conversation not found')

        if (typeof messageService.assertCanAccessConversation === 'function')
            await assertCanAccessConversation(userId, convo)

        const messages = await messageService.listMessages({ userId, conversationId, limit, beforeSeq})

        //Tính cursor cho phân trang lần tới (keyset pagination)
        // listMessages trả items theo thứ tự tăng dần (oldest -> newest) do docs.reverse()
        // => để lấy trang cũ hơn, ta dùng seq nhỏ nhất hiện tại (items[0].seq)

        const nextBeforeSeq = messages.length > 0 ? messages[0].seq : null

        //chuan hoa payload tra ve
        return {
            conversation: {
                _id: convo._id,
                type: convo.type,
                direct: convo.direct || null,
                group: convo.group || null,
                cloud: convo.group || null,
                lastMessage: convo.lastMessage || null,
                createdAt: convo.createdAt,
                updatedAt: convo.updatedAt
            },
            messages,
            pageInfo: {
                limit,
                beforeSeq,
                nextBeforeSeq
            }
        }
    } catch (error) {
        throw new Error(error)
    }
}

export const conversationService = {
    createConversation,
    getConversation,
    fetchConversationDetail
}