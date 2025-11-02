import FriendShip from "~/models/friendships"
import User from "~/models/user"
import { toOid } from "~/utils/formatter"
import mongoose from "mongoose"

const getFriendRequests = async ({ receiveUserId, page, limit }) => {
  try {
    if (!mongoose.isValidObjectId(receiveUserId)) {
      throw new Error("Invalid receiveUserId")
    }
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
    console.error("Error in getFriendRequests:", error.message)
    throw new Error("Failed to fetch friend requests")
  }
}

const submitRequest = async ({ requesterUserId, receiveUserId }) => {
  try {
    const from = toOid(requesterUserId)
    const to = toOid(receiveUserId)

    if (!from || !to) throw new Error("Invalid user id")
    if (String(from) === String(to)) throw new Error("Cannot send request to yourself")

    // Kiểm tra tồn tại user
    const [uFrom, uTo] = await Promise.all([
      User.findById(from).lean(),
      User.findById(to).lean()
    ])
    if (!uFrom || !uTo || uFrom._destroy || uTo._destroy) {
      throw new Error("User not found or deactivated")
    }

    const existingPending = await FriendShip.findOne({
      status: "pending",
      $or: [
        { profileRequest: from, profileReceive: to },
        { profileRequest: to, profileReceive: from }
      ]
    }).lean()

    if (existingPending) {
      // ⬇️ BUMP updatedAt để FE thấy "vừa xong"
      await FriendShip.updateOne(
        { _id: existingPending._id },
        { $set: { updatedAt: new Date() } }
      )

      return {
        ok: true,
        message: "Request already exists",
        requestId: String(existingPending._id),
        action: 'bumped' // ⬅️ THÊM CỜ NÀY
      }
    }

    // Tạo mới
    const doc = await FriendShip.create({
      profileRequest: from,
      profileReceive: to,
      status: "pending"
    })

    return {
      ok: true,
      message: "Friend request sent",
      requestId: String(doc._id),
      action: 'created' // ⬅️ THÊM CỜ NÀY
    }
  } catch (error) {
    throw new Error(error)
  }
}

// Cập nhật trạng thái lời mời: accept | delete
const updateStatusRequest = async ({ requestId, action, actingUserId }) => {
  try {
    if (!requestId || !action) throw new Error("Missing requestId or action")
    
    // Validate requestId
    if (!mongoose.isValidObjectId(requestId)) {
      throw new Error("Invalid requestId")
    }
    const rid = new mongoose.Types.ObjectId(requestId)
    
    // Validate actingUserId
    if (!mongoose.isValidObjectId(actingUserId)) {
      throw new Error("Invalid actingUserId")
    }
    const uid = new mongoose.Types.ObjectId(actingUserId)
    
    const reqDoc = await FriendShip.findById(rid)
    if (!reqDoc) throw new Error("Request not found")
    
    // Chỉ receiver mới được accept; delete có thể là receiver (từ chối) hoặc requester (huỷ)
    const isReceiver = String(reqDoc.profileReceive) === String(uid)
    const isRequester = String(reqDoc.profileRequest) === String(uid)
    
    if (action === "accept") {
      if (!isReceiver) throw new Error("Only receiver can accept this request")
      if (reqDoc.status !== "pending") throw new Error("Request is not pending")
      
      reqDoc.status = "accepted"
      reqDoc.updatedAt = new Date()
      await reqDoc.save()
      
      return { ok: true, message: "Friend request accepted", requestId: String(reqDoc._id) }
    }
    
    if (action === "delete") {
      // delete: nếu pending -> xóa; nếu rejected cũng có thể xóa "dọn rác"
      if (!(isReceiver || isRequester)) throw new Error("Not allowed to delete this request")
      await FriendShip.deleteOne({ _id: rid })
      return { ok: true, message: "Request deleted" }
    }
    
    throw new Error("Unsupported action")
  } catch (error) {
    // Improved: Log the error for debugging, but don't expose internals
    console.error("Error in updateStatusRequest:", error.message)
    throw new Error("Failed to update friend request status")
  }
}

// Hỗ trợ tìm kiếm theo q (fullName/username), phân trang
const getAllFriends = async ({ userId, page = 1, limit = 20, q = "" }) => {
  try {
    const uid = toOid(userId)
    const userCollection = User.collection.name

    // match accepted và có tham gia
    const matchStage = {
      $match: {
        status: "accepted",
        $or: [{ profileRequest: uid }, { profileReceive: uid }]
      }
    }

    const addFriendIdStage = {
      $addFields: {
        friendId: {
          $cond: [
            { $eq: ["$profileRequest", uid] },
            "$profileReceive",
            "$profileRequest"
          ]
        }
      }
    }

    const lookupStage = {
      $lookup: {
        from: userCollection,
        localField: "friendId",
        foreignField: "_id",
        as: "friend",
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
          { $match: { _destroy: { $ne: true } } },
          ...(q
            ? [{
                $match: {
                  $or: [
                    { fullName: { $regex: q, $options: "i" } },
                    { username: { $regex: q, $options: "i" } }
                  ]
                }
              }]
            : [])
        ]
      }
    }

    const pipeline = [
      matchStage,
      { $sort: { updatedAt: -1, createdAt: -1 } },
      addFriendIdStage,
      lookupStage,
      { $unwind: "$friend" },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          updatedAt: 1,
          "friend._id": 1,
          "friend.fullName": 1,
          "friend.username": 1,
          "friend.avatarUrl": 1,
          "friend.status": 1
        }
      },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]

    const rows = await FriendShip.aggregate(pipeline).allowDiskUse(true).exec()

    const data = rows.map(doc => ({
      id: String(doc._id),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      friend: {
        id: String(doc.friend._id),
        fullName: doc.friend.fullName,
        username: doc.friend.username,
        avatarUrl: doc.friend.avatarUrl,
        status: doc.friend.status
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

const isFriend = async (fromId, toId) => {
  try {
    if (!fromId || !toId || String(fromId) === String(toId)) {
      return { isFriend: false }
    }

    const a = toOid(fromId)
    const b = toOid(toId)

    const exists = await FriendShip.exists({
      status: 'accepted',
      $or: [
        { profileRequest: a, profileReceive: b },
        { profileRequest: b, profileReceive: a }
      ]
    })

    return { isFriend: !!exists }
  } catch (error) {
    throw new Error()
  }
}

const getFriendRelation = async (meId, otherId) => {
  const uid = toOid(meId)
  const oid = toOid(otherId)

  const fs = await FriendShip.findOne({
    $or: [
      { profileRequest: uid, profileReceive: oid },
      { profileRequest: oid, profileReceive: uid }
    ]
  }).lean()

  if (!fs) return { status: 'none' }

  const direction = String(fs.profileRequest) === String(uid) ? 'outgoing' : 'incoming'
  // status có thể là: 'pending' | 'accepted' | 'blocked' | ...
  return {
    status: fs.status,
    direction,                  // 'outgoing'/'incoming'
    requestId: fs._id,
    createdAt: fs.createdAt,
    updatedAt: fs.updatedAt
  }
}

const removeFriend = async ({ userId, friendUserId }) => {
  try {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(friendUserId)) {
      throw new Error("Invalid user id")
    }
    const uid = toOid(userId)
    const fid = toOid(friendUserId)

    // Chỉ cần 1 trong 2 người gọi là đủ, xoá quan hệ 'accepted'
    const removed = await FriendShip.findOneAndDelete({
      status: "accepted",
      $or: [
        { profileRequest: uid, profileReceive: fid },
        { profileRequest: fid, profileReceive: uid }
      ]
    }).lean()

    if (!removed) {
      // Không phải bạn bè hoặc không tồn tại
      return { ok: false, message: "Friendship not found or already removed" }
    }

    return {
      ok: true,
      message: "Friend removed",
      friendshipId: String(removed._id)
    }
  } catch (error) {
    console.error("Error in removeFriend:", error?.message || error)
    throw new Error("Failed to remove friend")
  }
}


export const contactService = {
  getFriendRequests,
  submitRequest,
  updateStatusRequest,
  getAllFriends,
  isFriend,
  getFriendRelation,
  removeFriend
}