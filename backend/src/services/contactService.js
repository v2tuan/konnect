import FriendShip from "~/models/friendships"
import User from "~/models/user"
import { toOid } from "~/utils/formatter"

const getFriendRequests = async ({ receiveUserId, page, limit }) => {
  try {
    const uid = toOid(receiveUserId)
    console.log(uid)

    const userCollection = User.collection.name

    const pipeline = [
      { $match: { profileReceive: uid, status: 'pending' }},
      //moi nhat len dau
      { $sort: { createdAt: -1 }},
      //aggregate nguoi gui request
      {
        $lookup: {
          from: userCollection,
          localField: 'profileRequest',
          foreignField: '_id',
          as: 'requester',
          //project: chi lay cac truong mong muon
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                username: 1,
                avatarUrl: 1,
                status: 1,
                _destroy: 1
              }
            },
            { $match: { destroy: { $ne: true }}}
          ]
        }
      },
      { $unwind: '$requester' },
      // ban than minh
      {
        $lookup: {
          from: userCollection,
          localField: "profileReceive",
          foreignField: "_id",
          as: "receiver",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                username: 1,
                avatarUrl: 1,
                status: 1,
                _destroy: 1
              }
            },
            { $match: { _destroy: { $ne: true } } }
          ]
        }
      },
      { $unwind: "$receiver" },
      // Chỉ giữ trường cần thiết
      {
        $project: {
          _id: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          "requester._id": 1,
          "requester.fullName": 1,
          "requester.username": 1,
          "requester.avatarUrl": 1,
          "requester.status": 1,
          "receiver._id": 1,
          "receiver.fullName": 1,
          "receiver.username": 1,
          "receiver.avatarUrl": 1,
          "receiver.status": 1
        }
      },

      // Phân trang
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]

    const rows = await FriendShip.aggregate(pipeline).allowDiskUse(true).exec()

    const data = rows.map((doc) => ({
      id: String(doc._id),
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      requester: {
        id: String(doc.requester._id),
        fullName: doc.requester.fullName,
        username: doc.requester.username,
        avatarUrl: doc.requester.avatarUrl,
        status: doc.requester.status
      },
      receiver: {
        id: String(doc.receiver._id),
        fullName: doc.receiver.fullName,
        username: doc.receiver.username,
        avatarUrl: doc.receiver.avatarUrl,
        status: doc.receiver.status
      }
    }))

    return {
      data,
      page,
      limit,
      hasNext: data.length === limit
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const contactService = {
  getFriendRequests
}