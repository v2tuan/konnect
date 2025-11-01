import { StatusCodes } from "http-status-codes";
import { storyService } from "~/services/storyService";

const createStory = async (req, res, next) => {
    try {
        const storyData = req.body;
        const newStory = await storyService.createStory({ ...storyData, userId: req.userId, file: req.file });
        res.status(StatusCodes.CREATED).json(newStory);
    }
    catch (error) {
        next(error);
    }
};

const getStoriesByUserIds = async (req, res, next) => {
    try {
        const { userIds } = req.query;
        const stories = await storyService.getStoryByUserIds(userIds);
        res.status(StatusCodes.OK).json(stories);
    }
    catch (error) {
        next(error);
    }
};

const getStoriesByFriends = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1
        const limit = parseInt(req.query.limit, 10) || 10
        const data = await storyService.getStoriesByFriends({ userId: req.userId, page, limit })
        res.status(StatusCodes.OK).json(data)
    }
    catch (error) {
        next(error)
    }
}

export const storyController = {
    createStory,
    getStoriesByUserIds,
    getStoriesByFriends
};