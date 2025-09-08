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

export const conversationController = {
    createConversation
}