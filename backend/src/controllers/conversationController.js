const { StatusCodes } = require("http-status-codes")
const { conversationService } = require("~/services/conversationService")

const createConversation = async (req, res, next) => {
    try {
        const newConversation = await conversationService.createConversation(req.body, req.userId)
        res.status(StatusCodes.CREATED).json({
            data: newConversation
        })
    }
    catch (error) {
        next(error)
    }
}

const getConversation = async (req, res, next) => {
    try {
        const { page, limit } = req.query
        const userId = req.userId

        const conversations = await conversationService.getConversation(page, limit, userId)
        res.status(StatusCodes.OK).json({
            data: conversations
        })
    }
    catch (error) {
        next(error)
    }
}

const fetchConversationDetail = async (req, res, next) => {
    try {
        const userId = req.userId
        const conversationId = req.params.conversationId

        const result = await conversationService.fetchConversationDetail(userId, conversationId)
        return res.status(StatusCodes.OK).json(result)
    } catch (error) {
        next(error)
    }
}

export const conversationController = {
    createConversation,
    getConversation,
    fetchConversationDetail
}