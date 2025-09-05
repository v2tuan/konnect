import { StatusCodes } from "http-status-codes"
import { cloudService } from "~/services/cloudService"

const fetchCloudConversation = async (req, res,next) => {
  try {
    const userId = req.userId
    const cloudConversation = await cloudService.fetchCloudConversation(userId)
    return res.status(StatusCodes.OK).json(cloudConversation)
  } catch (error) {
    next(error)
  }
}

export const cloudController = {
  fetchCloudConversation
}