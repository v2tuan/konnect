import Conversation from "~/models/conversations";
import ConversationMember from"~/models/conversation_members";
import User from "~/models/user";

const createConversation = async (conversationData, userId) => {
    const {type, memberIds} = conversationData

    const conversationDataToCreate = {
        type,
        messageSeq: 0
    }

    let membersToAdd = []

    if(type === 'cloud'){
        // Kiểm tra đã có cloud conversation chưa

        // Set up conversation data
        conversationData.cloud = {
            ownerId: userId
        }
    }
    else if(type === 'direct'){
        // Kiểm tra recipient có tồn tại không
        if(memberIds.length > 2){
            throw new Error('Tin nhắn trực tiếp chỉ có tối đa 2 thành viên')
        }

        const recipientId = memberIds.find(id => id !== userId)
        const recipient = await User.findById(recipientId)
        if(!recipientId){
            throw new Error('Recipient not found')
        }

        // Kiểm tra không thể tạo conversation với chính mình
        if(userId === recipientId){
            throw new Error('Cannot create a conversation with yourself')
        }

        // Kiểm tra có bị block không

        // Kiểm tra conversation đã tồn tại chưa

        // Set up conversation data
        membersToAdd = [
            {userId: userId, role: 'member'},
            {userId: recipientId, role: 'member'}
        ]
    }
    else if(type === 'group'){
        // Kiểm tra tất cả member có tồn tại không
        // Kiểm tra có user hiện tại trong danh sách không nếu không thì thêm vào
        if(memberIds.length <= 2){
            throw new Error('Không thể tạo nhóm chỉ với 2 thành viên')
        }
        const uniqueMemberIds = [...new Set([userId, ...memberIds])]

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
            conversationId: newConversation._id,
            userId: member.userId,
            role: member.role
        })

        return conversationMember.save()
    })

    await Promise.all(memberPromises)

    return newConversation
}

export const conversationService = {
    createConversation
}